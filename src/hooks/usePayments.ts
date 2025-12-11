import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getStoredReferralCode, clearStoredReferralCode } from "./useReferral";

export interface Payment {
  id: string;
  user_id: string;
  card_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  provider_reference: string | null;
  evidence_url: string | null;
  status: string;
  created_at: string;
}

export type PaymentMethod = 'GCASH' | 'MAYA' | 'QRPH' | 'PH_BANK' | 'INTL_CARD' | 'INTL_BANK' | 'CASH' | 'ADMIN_OVERRIDE';
export type UserPaymentMethod = Exclude<PaymentMethod, 'ADMIN_OVERRIDE'>;

export function useCardPayments(cardId: string) {
  return useQuery({
    queryKey: ["card-payments", cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("card_id", cardId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!cardId,
  });
}

export function useSubmitPayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      cardId,
      planId,
      amount,
      paymentMethod,
      providerReference,
      evidenceUrl,
    }: {
      cardId: string;
      planId: string;
      amount: number;
      paymentMethod: PaymentMethod;
      providerReference?: string;
      evidenceUrl?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Insert payment record
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: user.id,
          card_id: cardId,
          plan_id: planId,
          amount,
          payment_method: paymentMethod,
          provider_reference: providerReference || null,
          evidence_url: evidenceUrl || null,
          status: "paid", // For dev, auto-mark as paid
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update card as paid
      const { error: cardError } = await supabase
        .from("cards")
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
          plan_id: planId,
        })
        .eq("id", cardId);

      if (cardError) throw cardError;

      // Check if plan is referral-eligible and activate referral access
      const { data: plan } = await supabase
        .from("card_plans")
        .select("referral_eligible")
        .eq("id", planId)
        .single();

      if (plan?.referral_eligible) {
        // Check if user already has a referral code
        const { data: profile } = await supabase
          .from("profiles")
          .select("referral_code")
          .eq("id", user.id)
          .single();

        const newCode = profile?.referral_code || `CEX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        await supabase
          .from("profiles")
          .update({
            has_referral_access: true,
            referral_code: newCode,
          })
          .eq("id", user.id);
      }

      // Handle referral tracking
      const referralCode = getStoredReferralCode();
      if (referralCode) {
        // Find referrer by code
        const { data: referrer } = await supabase
          .from("profiles")
          .select("id")
          .eq("referral_code", referralCode)
          .single();

        if (referrer && referrer.id !== user.id) {
          // Create referral record
          await supabase.from("referrals").insert({
            referrer_user_id: referrer.id,
            referred_user_id: user.id,
            referred_card_id: cardId,
            payment_id: payment.id,
            plan_id: planId,
            status: "pending",
          });
        }

        clearStoredReferralCode();
      }

      return payment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["card-payments", variables.cardId] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      queryClient.invalidateQueries({ queryKey: ["referral-profile"] });
      toast.success("Payment processed successfully!");
    },
    onError: (error) => {
      console.error("Payment error:", error);
      toast.error("Failed to process payment");
    },
  });
}

export function useAdminOverridePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cardId,
      userId,
      planId,
      amount,
      isPaid,
    }: {
      cardId: string;
      userId: string;
      planId: string;
      amount: number;
      isPaid: boolean;
    }) => {
      if (isPaid) {
        // Create admin override payment record
        await supabase.from("payments").insert({
          user_id: userId,
          card_id: cardId,
          plan_id: planId,
          amount,
          payment_method: "ADMIN_OVERRIDE",
          status: "paid",
        });

        // Update card as paid with admin override
        await supabase
          .from("cards")
          .update({
            is_paid: true,
            paid_at: new Date().toISOString(),
            paid_overridden_by_admin: true,
            plan_id: planId,
          })
          .eq("id", cardId);

        // Activate referral access if plan is eligible
        const { data: plan } = await supabase
          .from("card_plans")
          .select("referral_eligible")
          .eq("id", planId)
          .single();

        if (plan?.referral_eligible) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("referral_code")
            .eq("id", userId)
            .single();

          const newCode = profile?.referral_code || `CEX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

          await supabase
            .from("profiles")
            .update({
              has_referral_access: true,
              referral_code: newCode,
            })
            .eq("id", userId);
        }
      } else {
        // Mark as unpaid
        await supabase
          .from("cards")
          .update({
            is_paid: false,
            paid_at: null,
            paid_overridden_by_admin: false,
          })
          .eq("id", cardId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      queryClient.invalidateQueries({ queryKey: ["admin-cards"] });
      toast.success("Payment status updated");
    },
    onError: (error) => {
      console.error("Admin override error:", error);
      toast.error("Failed to update payment status");
    },
  });
}

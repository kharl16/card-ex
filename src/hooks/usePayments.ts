import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { clearStoredReferralCode } from "./useReferral";

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

      // Handle referral tracking - use referred_by_user_id from profile (set at signup)
      // Only create referral if plan is referral-eligible
      if (plan?.referral_eligible) {
        const { data: buyerProfile } = await supabase
          .from("profiles")
          .select("referred_by_user_id")
          .eq("id", user.id)
          .single();

        if (buyerProfile?.referred_by_user_id) {
          // Create referral record linking referrer to this purchase
          await supabase.from("referrals").insert({
            referrer_user_id: buyerProfile.referred_by_user_id,
            referred_user_id: user.id,
            referred_card_id: cardId,
            payment_id: payment.id,
            plan_id: planId,
            status: "pending",
          });
        }
      }

      // Clear any stored referral code from localStorage (cleanup)
      clearStoredReferralCode();

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
        const { data: payment } = await supabase.from("payments").insert({
          user_id: userId,
          card_id: cardId,
          plan_id: planId,
          amount,
          payment_method: "ADMIN_OVERRIDE",
          status: "paid",
        }).select().single();

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

        // Check if plan is referral-eligible
        const { data: plan } = await supabase
          .from("card_plans")
          .select("referral_eligible, code")
          .eq("id", planId)
          .single();

        // Only proceed if plan is referral-eligible and not Personal
        if (plan?.referral_eligible && plan.code?.toLowerCase() !== "personal") {
          // Fetch the TARGET USER's profile (NOT the admin's)
          const { data: targetUserProfile } = await supabase
            .from("profiles")
            .select("referral_code, referred_by_user_id")
            .eq("id", userId)
            .single();

          // Generate a UNIQUE referral code for this user if they don't have one
          // IMPORTANT: Always generate a new unique code, never reuse anyone else's code
          let newReferralCode = targetUserProfile?.referral_code;
          if (!newReferralCode) {
            // Generate unique CEX-XXXXXX code
            newReferralCode = `CEX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          }

          // Update the TARGET USER's profile with referral access
          await supabase
            .from("profiles")
            .update({
              has_referral_access: true,
              referral_code: newReferralCode,
            })
            .eq("id", userId);

          // Create referral row
          // If user was referred by someone, use that referrer
          // If not referred by anyone (e.g., admin-created user), use admin as referrer
          const referrerUserId = targetUserProfile?.referred_by_user_id;
          
          if (referrerUserId) {
            // Check if referral already exists
            const { data: existingReferral } = await supabase
              .from("referrals")
              .select("id")
              .eq("referrer_user_id", referrerUserId)
              .eq("referred_user_id", userId)
              .maybeSingle();

            if (!existingReferral) {
              await supabase.from("referrals").insert({
                referrer_user_id: referrerUserId,
                referred_user_id: userId,
                referred_card_id: cardId,
                payment_id: payment?.id ?? null,
                plan_id: planId,
                status: "pending",
              });
            } else {
              // Update existing referral with card and payment info
              await supabase
                .from("referrals")
                .update({
                  referred_card_id: cardId,
                  payment_id: payment?.id ?? null,
                  plan_id: planId,
                })
                .eq("id", existingReferral.id);
            }
          }
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
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      queryClient.invalidateQueries({ queryKey: ["referral-profile"] });
      queryClient.invalidateQueries({ queryKey: ["my-referrals"] });
      toast.success("Payment status updated");
    },
    onError: (error) => {
      console.error("Admin override error:", error);
      toast.error("Failed to update payment status");
    },
  });
}

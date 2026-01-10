import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Referral {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referred_card_id: string | null;
  payment_id: string | null;
  plan_id: string | null;
  status: string;
  created_at: string;
  referred_profile?: {
    full_name: string | null;
  };
  referred_card?: {
    id: string;
    slug: string;
    full_name: string | null;
  };
  plan?: {
    name: string;
    profit: number;
  };
  payment?: {
    status: string;
    amount: number;
  };
}

export function useReferralProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["referral-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("referral_code, has_referral_access, referred_by_user_id")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    // Ensure fresh data on mount and focus - important after admin override
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale
  });
}

export function useMyReferrer() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-referrer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // First get the current user's referred_by_user_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("referred_by_user_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.referred_by_user_id) return null;

      // Then fetch the referrer's profile
      const { data: referrer, error: referrerError } = await supabase
        .from("profiles")
        .select("id, full_name, referral_code")
        .eq("id", profile.referred_by_user_id)
        .single();

      if (referrerError) return null;
      return referrer;
    },
    enabled: !!user?.id,
  });
}

export function useMyReferrals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-referrals", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get referrals where I am the referrer
      const { data: referrals, error } = await supabase
        .from("referrals")
        .select(`
          *,
          plan:card_plans(name, profit)
        `)
        .eq("referrer_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch referred user profiles separately
      const referredUserIds = referrals?.map(r => r.referred_user_id) || [];
      if (referredUserIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", referredUserIds);

      // Fetch referred cards (the cards owned by referred users)
      const referredCardIds = referrals?.filter(r => r.referred_card_id).map(r => r.referred_card_id) || [];
      const { data: cards } = referredCardIds.length > 0 
        ? await supabase
            .from("cards")
            .select("id, slug, full_name")
            .in("id", referredCardIds)
        : { data: [] };

      // Fetch payment statuses
      const paymentIds = referrals?.filter(r => r.payment_id).map(r => r.payment_id) || [];
      const { data: payments } = paymentIds.length > 0
        ? await supabase
            .from("payments")
            .select("id, status, amount")
            .in("id", paymentIds)
        : { data: [] };

      // Combine data
      return referrals?.map(ref => ({
        ...ref,
        referred_profile: profiles?.find(p => p.id === ref.referred_user_id),
        referred_card: cards?.find(c => c.id === ref.referred_card_id),
        payment: payments?.find(p => p.id === ref.payment_id),
      })) as Referral[];
    },
    enabled: !!user?.id,
    // Keep data fresh
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
  });
}

// Store referral code from URL in localStorage
export function storeReferralCode(code: string) {
  localStorage.setItem("cardex_referral_code", code);
}

// Get stored referral code
export function getStoredReferralCode(): string | null {
  return localStorage.getItem("cardex_referral_code");
}

// Clear stored referral code after use
export function clearStoredReferralCode() {
  localStorage.removeItem("cardex_referral_code");
}

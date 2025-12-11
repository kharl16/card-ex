import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CardPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  retail_price: number;
  wholesale_price: number;
  profit: number;
  referral_eligible: boolean;
  has_reseller_access: boolean;
  is_active: boolean;
}

export function useCardPlans() {
  return useQuery({
    queryKey: ["card-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_plans")
        .select("*")
        .eq("is_active", true)
        .order("retail_price", { ascending: true });

      if (error) throw error;
      return data as CardPlan[];
    },
  });
}

export function useCardPlan(planId: string | null) {
  return useQuery({
    queryKey: ["card-plan", planId],
    queryFn: async () => {
      if (!planId) return null;
      const { data, error } = await supabase
        .from("card_plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (error) throw error;
      return data as CardPlan;
    },
    enabled: !!planId,
  });
}

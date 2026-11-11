import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FreeAccessLock {
  locked: boolean;
  cardId: string | null;
  endedAt: string | null;
}

/**
 * Whether the signed-in member's 7-day free access ended without activation.
 * The database decides (paid members, admins and active free weeks are never locked).
 * A failed check never locks the member out; server-side gates still apply.
 */
export function useFreeAccessLock(userId: string | null | undefined, skip: boolean) {
  return useQuery({
    queryKey: ["free-access-lock", userId],
    enabled: !!userId && !skip,
    staleTime: 30_000,
    refetchInterval: 5 * 60_000,
    queryFn: async (): Promise<FreeAccessLock> => {
      const { data, error } = await supabase.rpc("get_free_access_lock" as any);
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as
        | { locked?: boolean; card_id?: string | null; ended_at?: string | null }
        | undefined;
      return {
        locked: row?.locked === true,
        cardId: row?.card_id ?? null,
        endedAt: row?.ended_at ?? null,
      };
    },
  });
}

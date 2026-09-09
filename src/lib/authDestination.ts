import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Resolves the correct first screen after authentication completes. */
export async function resolveAuthenticatedDestination(user: User): Promise<string> {
  const { data: card, error } = await supabase
    .from("cards")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[Auth] Could not resolve post-confirmation destination:", error.message);
    return "/dashboard";
  }

  return card ? "/dashboard" : "/onboarding";
}
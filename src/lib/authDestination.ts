import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Path of a member's own card page (the card editor). */
export const cardHomePath = (cardId: string) => `/cards/${cardId}/edit`;

/**
 * Resolves the first screen after sign-in or setup: the member's own card page.
 * Members without a card go to setup; any lookup failure falls back to the Dashboard.
 */
export async function resolveAuthenticatedDestination(user: User): Promise<string> {
  const { data: card, error } = await supabase
    .from("cards")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_template", false)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[Auth] Could not resolve post-sign-in destination:", error.message);
    return "/dashboard";
  }

  return card ? cardHomePath(card.id) : "/onboarding";
}

/**
 * Where to go after sign-in. An explicit return page wins; the default
 * Dashboard is replaced by the member's card page. Never waits longer than `timeoutMs`.
 */
export async function resolveSignInDestination(user: User, requested: string, timeoutMs = 4000): Promise<string> {
  if (requested !== "/dashboard") return requested;
  try {
    return await Promise.race([
      resolveAuthenticatedDestination(user),
      new Promise<string>((resolve) => setTimeout(() => resolve("/dashboard"), timeoutMs)),
    ]);
  } catch {
    return "/dashboard";
  }
}

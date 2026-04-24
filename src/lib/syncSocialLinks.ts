/**
 * Sync social_links (JSONB on cards) to the card_links table.
 *
 * The card_links table is consumed by some legacy paths (e.g., older vCard
 * generation, integrations). Whenever the editor saves social_links on a card,
 * we mirror those rows to card_links so both stay in sync.
 *
 * Strategy: replace-all for the "social" subset of kinds. We only delete rows
 * whose kind is one of the social kinds (or `custom` representing extra socials),
 * leaving non-social card_links (phone, sms, email, url contact buttons) intact.
 */

import { supabase } from "@/integrations/supabase/client";
import type { SocialLink } from "@/components/SocialMediaLinks";

type CardLinkKind =
  | "phone"
  | "sms"
  | "email"
  | "url"
  | "whatsapp"
  | "messenger"
  | "telegram"
  | "viber"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "x"
  | "youtube"
  | "linkedin"
  | "custom";

const ALLOWED_KINDS = new Set<CardLinkKind>([
  "whatsapp",
  "messenger",
  "telegram",
  "viber",
  "facebook",
  "instagram",
  "tiktok",
  "x",
  "youtube",
  "linkedin",
  "url",
  "custom",
]);

// Kinds we manage from the social_links editor. Anything in card_links with
// these kinds will be cleared on sync (then re-inserted from social_links).
const SOCIAL_KINDS: CardLinkKind[] = [
  "whatsapp",
  "messenger",
  "telegram",
  "viber",
  "facebook",
  "instagram",
  "tiktok",
  "x",
  "youtube",
  "linkedin",
  "custom",
];

function normalizeKind(rawKind: string): CardLinkKind {
  const k = (rawKind || "").toLowerCase();
  if (ALLOWED_KINDS.has(k as CardLinkKind)) return k as CardLinkKind;
  // Unknown platforms (snapchat, threads, pinterest, discord, etc.) → custom
  return "custom";
}

/**
 * Mirror the given social_links list into the card_links table for cardId.
 * Safe to call on every save — it only touches social-kind rows.
 */
export async function syncSocialLinksToCardLinks(
  cardId: string,
  links: SocialLink[]
): Promise<{ ok: boolean; error?: unknown }> {
  if (!cardId) return { ok: false, error: "Missing cardId" };

  try {
    // 1) Remove all existing social-kind rows for this card.
    const { error: deleteError } = await supabase
      .from("card_links")
      .delete()
      .eq("card_id", cardId)
      .in("kind", SOCIAL_KINDS);

    if (deleteError) throw deleteError;

    // 2) Re-insert from social_links.
    const rows = (links || [])
      .filter((l) => l && l.value && l.label)
      .map((link, index) => ({
        card_id: cardId,
        kind: normalizeKind(link.kind),
        label: link.label,
        value: link.value,
        icon: link.icon || null,
        sort_index: index,
      }));

    if (rows.length === 0) return { ok: true };

    const { error: insertError } = await supabase
      .from("card_links")
      .insert(rows);

    if (insertError) throw insertError;

    return { ok: true };
  } catch (error) {
    console.error("[syncSocialLinksToCardLinks] failed:", error);
    return { ok: false, error };
  }
}

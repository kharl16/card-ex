import type { Tables } from "@/integrations/supabase/types";
import { profileToVCardV3, type Profile } from "./canonicalVCard";
import { supabase } from "@/integrations/supabase/client";

type CardData = Tables<"cards">;

export interface AdditionalContact {
  id: string;
  kind: "email" | "phone" | "url" | "custom";
  label: string;
  value: string;
}

// Map CardData to canonical Profile format
function mapCardToProfile(card: CardData, additionalContacts?: AdditionalContact[]): Profile {
  // Process additional contacts
  const additionalEmails: Profile["emails"] = [];
  const additionalPhones: Profile["phones"] = [];
  const additionalWebsites: Profile["websites"] = [];

  const socials: Profile["socials"] = {};

  const detectSocialFromUrl = (url: string): keyof NonNullable<Profile["socials"]> | null => {
    try {
      const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
      if (host.includes("facebook.com") || host === "fb.com" || host === "m.me") return "facebook";
      if (host.includes("instagram.com")) return "instagram";
      if (host.includes("tiktok.com")) return "tiktok";
      if (host.includes("youtube.com") || host === "youtu.be") return "youtube";
      if (host.includes("linkedin.com")) return "linkedin";
      if (host.includes("twitter.com") || host.includes("x.com")) return "twitter";
      if (host.includes("wa.me") || host.includes("whatsapp.com")) return "whatsapp";
    } catch { /* not a URL */ }
    return null;
  };

  if (additionalContacts) {
    for (const contact of additionalContacts) {
      if (!contact.value) continue;

      if (contact.kind === "email") {
        additionalEmails.push({
          type: "OTHER",
          value: contact.value,
          label: contact.label,
        });
      } else if (contact.kind === "phone") {
        additionalPhones.push({ type: "OTHER", value: contact.value });
      } else if (contact.kind === "url") {
        // If URL points to a known social network, route to socials so
        // contacts apps display the platform name (Facebook, Instagram, etc.)
        // instead of a generic "Website" label.
        const detected = detectSocialFromUrl(contact.value);
        if (detected) {
          socials[detected] = contact.value;
        } else {
          additionalWebsites.push({
            type: "OTHER",
            value: contact.value,
            label: contact.label,
          });
        }
      }
      // Note: 'custom' links are intentionally NOT mapped to ADR. Work info
      // is conveyed exclusively via TITLE + ORG (card.title + card.company).
    }
  }

  return {
    prefix: card.prefix || undefined,
    first_name: card.first_name || "",
    middle_name: card.middle_name || undefined,
    last_name: card.last_name || "",
    suffix: card.suffix || undefined,
    org: card.company || undefined,
    title: card.title || undefined,
    email: card.email || undefined,
    emails: additionalEmails.length > 0 ? additionalEmails : undefined,
    phones: card.phone
      ? [{ type: "CELL", value: card.phone }, ...additionalPhones]
      : additionalPhones.length > 0
        ? additionalPhones
        : undefined,
    website: card.website || undefined,
    websites: additionalWebsites.length > 0 ? additionalWebsites : undefined,
    // No address/addresses emitted — card.location is free-text region
    // and would mislabel as "Work" in contacts apps.
    // Notes intentionally omitted — bio is shown on the card, not the contact entry.
    socials: Object.keys(socials).length > 0 ? socials : undefined,
    photo_url: card.avatar_url || undefined,
    uid: `cardex-${card.id}`,
  };
}


// Simple front-end rate limiter for downloads
let lastVCardDownloadAt: number | null = null;

/**
 * Generate the vCard text.
 * Also validates the card is published.
 */
export async function generateVCard(card: CardData, additionalContacts?: AdditionalContact[]): Promise<string> {
  if (!card.is_published) {
    throw new Error("Cannot generate vCard for an unpublished card.");
  }

  const profile = mapCardToProfile(card, additionalContacts);
  return await profileToVCardV3(profile);
}

/**
 * Ensure there is a vcard_url for this card:
 *  - generates the vCard
 *  - uploads to Supabase Storage ("vcards" bucket)
 *  - updates cards.vcard_url
 *  - returns the public URL (or null on failure)
 */
export async function ensureVCardUrl(card: CardData, additionalContacts?: AdditionalContact[]): Promise<string | null> {
  // Generate vCard content (throws if not published)
  const vcardContent = await generateVCard(card, additionalContacts);

  const safeName =
    card.full_name
      ?.trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]/g, "") || "contact";

  const filePath = `cards/${card.id}/${safeName}.vcf`;

  // Upload to Supabase Storage; upsert so latest data always overwrites
  const { error: uploadError } = await supabase.storage
    .from("vcards") // 🔹 change "vcards" if your bucket name is different
    .upload(filePath, vcardContent, {
      cacheControl: "3600",
      upsert: true,
      contentType: "text/vcard;charset=utf-8",
    });

  if (uploadError) {
    console.error("Failed to upload vCard to Supabase:", uploadError);
    return null;
  }

  // Get public URL
  const { data: publicData } = supabase.storage.from("vcards").getPublicUrl(filePath);

  const publicUrl = publicData?.publicUrl;
  if (!publicUrl) {
    console.error("No public URL returned for vCard file:", filePath);
    return null;
  }

  // Save vcard_url into the cards table
  const { error: updateError } = await supabase.from("cards").update({ vcard_url: publicUrl }).eq("id", card.id);

  if (updateError) {
    console.error("Failed to update card with vcard_url:", updateError);
  }

  return publicUrl;
}

/**
 * Download the vCard:
 *  - rate-limited (5 seconds)
 *  - requires published card
 *  - uses the permanent Supabase URL (and updates vcard_url)
 *  - falls back to blob download if something goes wrong
 */
export async function downloadVCard(card: CardData, additionalContacts?: AdditionalContact[]): Promise<void> {
  const now = Date.now();

  // Rate limit: 1 download every 5 seconds from this tab
  if (lastVCardDownloadAt && now - lastVCardDownloadAt < 5000) {
    console.warn("vCard download rate-limited");
    return;
  }
  lastVCardDownloadAt = now;

  try {
    // Try to get / generate a permanent URL
    const publicUrl = await ensureVCardUrl(card, additionalContacts);

    if (publicUrl) {
      const link = document.createElement("a");
      link.href = publicUrl;
      link.download = card.full_name?.trim().replace(/\s+/g, "-") || "contact.vcf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
  } catch (err) {
    console.error("Error ensuring vcard_url, falling back to blob:", err);
  }

  // Fallback: local blob download if any step failed
  try {
    const vcardContent = await generateVCard(card, additionalContacts);
    const blob = new Blob([vcardContent], {
      type: "text/vcard;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = card.full_name?.trim().replace(/\s+/g, "-") || "contact.vcf";
    link.href = url;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Final vCard generation failed:", err);
  }
}

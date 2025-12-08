import type { Tables } from "@/integrations/supabase/types";
import { profileToVCardV3, type Profile } from "./canonicalVCard";
import { supabase } from "@/integrations/supabase/client";

type CardData = Tables<"cards">;

export interface AdditionalContact {
  id: string;
  kind: string;
  value: string;
  label?: string;
}

function mapCardToProfile(card: CardData, additionalContacts?: AdditionalContact[]): Profile {
  // Build phones array
  const phones: Profile['phones'] = [];
  if (card.phone) {
    phones.push({ type: 'CELL', value: card.phone });
  }
  // Add additional phones
  additionalContacts?.filter(c => c.kind === 'phone').forEach(c => {
    phones.push({ type: 'OTHER', value: c.value });
  });

  // Build emails array
  const emails: Profile['emails'] = [];
  additionalContacts?.filter(c => c.kind === 'email').forEach(c => {
    emails.push({ type: 'OTHER', value: c.value, label: c.label });
  });

  // Build websites array
  const websites: Profile['websites'] = [];
  additionalContacts?.filter(c => c.kind === 'url').forEach(c => {
    websites.push({ type: 'OTHER', value: c.value, label: c.label });
  });

  // Build addresses array from additional locations
  const addresses: Profile['addresses'] = [];
  additionalContacts?.filter(c => c.kind === 'custom' || c.kind === 'location').forEach(c => {
    addresses.push({ street: c.value, type: 'OTHER', label: c.label });
  });

  // Parse card.theme for socials if available
  let socials: Profile['socials'] = {};
  if (card.theme && typeof card.theme === 'object') {
    const theme = card.theme as Record<string, unknown>;
    if (theme.socialLinks && Array.isArray(theme.socialLinks)) {
      const socialLinks = theme.socialLinks as Array<{ platform: string; url: string }>;
      socialLinks.forEach(link => {
        const platform = link.platform?.toLowerCase();
        if (platform === 'facebook') socials!.facebook = link.url;
        else if (platform === 'instagram') socials!.instagram = link.url;
        else if (platform === 'tiktok') socials!.tiktok = link.url;
        else if (platform === 'youtube') socials!.youtube = link.url;
        else if (platform === 'linkedin') socials!.linkedin = link.url;
        else if (platform === 'twitter' || platform === 'x') socials!.twitter = link.url;
        else if (platform === 'whatsapp') socials!.whatsapp = link.url;
      });
    }
  }

  return {
    prefix: card.prefix || undefined,
    first_name: card.first_name || '',
    middle_name: card.middle_name || undefined,
    last_name: card.last_name || '',
    suffix: card.suffix || undefined,
    org: card.company || undefined,
    title: card.title || undefined,
    email: card.email || undefined,
    emails: emails.length > 0 ? emails : undefined,
    phones: phones.length > 0 ? phones : undefined,
    website: card.website || undefined,
    websites: websites.length > 0 ? websites : undefined,
    address: card.location ? { street: card.location, type: 'WORK' } : undefined,
    addresses: addresses.length > 0 ? addresses : undefined,
    photo_url: card.avatar_url || undefined,
    socials: Object.keys(socials).length > 0 ? socials : undefined,
    notes: card.bio || undefined,
    uid: card.id,
  };
}

export async function generateVCard(card: CardData, additionalContacts?: AdditionalContact[]): Promise<string> {
  const profile = mapCardToProfile(card, additionalContacts);
  return await profileToVCardV3(profile);
}

export async function downloadVCard(card: CardData, additionalContacts?: AdditionalContact[]): Promise<void> {
  const vcardContent = await generateVCard(card, additionalContacts);

  const safeName =
    card.full_name
      ?.trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]/g, "") || "contact";

  const filePath = `cards/${card.id}/${safeName}.vcf`;

  // 1) Upload vCard text to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("vcards")
    .upload(filePath, vcardContent, {
      cacheControl: "3600",
      upsert: true,
      contentType: "text/vcard;charset=utf-8",
    });

  if (uploadError) {
    console.error("Failed to upload vCard:", uploadError);
    // Fallback: still let the user download via blob so UX is not broken
    const blob = new Blob([vcardContent], {
      type: "text/vcard;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  // 2) Get public URL from Storage
  const { data: publicData } = supabase.storage.from("vcards").getPublicUrl(filePath);

  const publicUrl = publicData?.publicUrl;

  // 3) Save vcard_url in the cards table
  if (publicUrl) {
    const { error: updateError } = await supabase.from("cards").update({ vcard_url: publicUrl }).eq("id", card.id);

    if (updateError) {
      console.error("Failed to update card with vcard_url:", updateError);
    }
  }

  // 4) Trigger the actual download for the user
  if (publicUrl) {
    const link = document.createElement("a");
    link.href = publicUrl;
    link.download = `${safeName}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // Fallback again: blob download if somehow no URL
    const blob = new Blob([vcardContent], {
      type: "text/vcard;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

import type { Tables } from "@/integrations/supabase/types";
import { profileToVCardV3, type Profile } from "./canonicalVCard";

type CardData = Tables<"cards">;

// Map CardData to canonical Profile format
function mapCardToProfile(card: CardData): Profile {
  return {
    prefix: card.prefix || undefined,
    first_name: card.first_name || '',
    middle_name: card.middle_name || undefined,
    last_name: card.last_name || '',
    suffix: card.suffix || undefined,
    org: card.company || undefined,
    title: card.title || undefined,
    email: card.email || undefined,
    phones: card.phone ? [{ type: 'CELL', value: card.phone }] : undefined,
    website: card.website || undefined,
    address: card.location ? { street: card.location, type: 'WORK' } : undefined,
    notes: card.bio || undefined,
    photo_url: card.avatar_url || undefined,
    uid: `cardex-${card.id}`,
  };
}

export async function generateVCard(card: CardData): Promise<string> {
  const profile = mapCardToProfile(card);
  return await profileToVCardV3(profile);
}

export async function downloadVCard(card: CardData): Promise<void> {
  const vcardContent = await generateVCard(card);
  const blob = new Blob([vcardContent], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${card.full_name.replace(/\s+/g, '-')}.vcf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

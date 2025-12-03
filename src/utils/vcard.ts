import type { Tables } from "@/integrations/supabase/types";
import { profileToVCardV3, type Profile } from "./canonicalVCard";

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
  const additionalEmails: Profile['emails'] = [];
  const additionalPhones: Profile['phones'] = [];
  const additionalWebsites: Profile['websites'] = [];
  const additionalAddresses: Profile['addresses'] = [];

  if (additionalContacts) {
    for (const contact of additionalContacts) {
      if (!contact.value) continue;
      
      if (contact.kind === 'email') {
        additionalEmails.push({ type: 'OTHER', value: contact.value, label: contact.label });
      } else if (contact.kind === 'phone') {
        additionalPhones.push({ type: 'OTHER', value: contact.value });
      } else if (contact.kind === 'url') {
        additionalWebsites.push({ type: 'OTHER', value: contact.value, label: contact.label });
      } else if (contact.kind === 'custom') {
        additionalAddresses.push({ street: contact.value, type: 'OTHER', label: contact.label });
      }
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
    emails: additionalEmails.length > 0 ? additionalEmails : undefined,
    phones: card.phone 
      ? [{ type: 'CELL', value: card.phone }, ...additionalPhones] 
      : (additionalPhones.length > 0 ? additionalPhones : undefined),
    website: card.website || undefined,
    websites: additionalWebsites.length > 0 ? additionalWebsites : undefined,
    address: card.location ? { street: card.location, type: 'WORK' } : undefined,
    addresses: additionalAddresses.length > 0 ? additionalAddresses : undefined,
    notes: card.bio || undefined,
    photo_url: card.avatar_url || undefined,
    uid: `cardex-${card.id}`,
  };
}

export async function generateVCard(card: CardData, additionalContacts?: AdditionalContact[]): Promise<string> {
  const profile = mapCardToProfile(card, additionalContacts);
  return await profileToVCardV3(profile);
}

export async function downloadVCard(card: CardData, additionalContacts?: AdditionalContact[]): Promise<void> {
  const vcardContent = await generateVCard(card, additionalContacts);
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

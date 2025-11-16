import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

// Ensure proper type inference for vCard generation

export function generateVCard(card: CardData): string {
  const lastName = card.last_name || '';
  const firstName = card.first_name || '';
  const middleName = card.middle_name || '';
  const prefix = card.prefix || '';
  const suffix = card.suffix || '';
  
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${card.full_name}`,
    `N:${lastName};${firstName};${middleName};${prefix};${suffix}`,
  ];

  if (card.title) {
    lines.push(`TITLE:${card.title}`);
  }

  if (card.company) {
    lines.push(`ORG:${card.company}`);
  }

  if (card.email) {
    lines.push(`EMAIL;TYPE=INTERNET:${card.email}`);
  }

  if (card.phone) {
    lines.push(`TEL;TYPE=CELL:${card.phone}`);
  }

  if (card.website) {
    lines.push(`URL:${card.website}`);
  }

  if (card.location) {
    lines.push(`ADR;TYPE=WORK:;;${card.location};;;;`);
  }

  if (card.bio) {
    lines.push(`NOTE:${card.bio}`);
  }

  if (card.avatar_url) {
    lines.push(`PHOTO;VALUE=URL:${card.avatar_url}`);
  }

  lines.push('END:VCARD');

  return lines.join('\r\n');
}

export function downloadVCard(card: CardData): void {
  const vcardContent = generateVCard(card);
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

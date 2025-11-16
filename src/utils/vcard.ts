import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

// Ensure proper type inference for vCard generation

// Helper function to escape vCard values
function escapeVCardValue(value: string = ""): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// Helper function to assemble FN (formatted name)
function assembleFN(card: CardData): string {
  const base = [card.prefix, card.first_name, card.middle_name, card.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  
  if (!card.suffix) return base;
  
  // Use comma for generational suffixes (Jr., Sr., II, III, IV)
  const isGenerational = /^(Jr\.?|Sr\.?|II|III|IV)$/i.test(card.suffix);
  const separator = isGenerational ? ", " : " ";
  
  return `${base}${separator}${card.suffix}`.trim();
}

export function generateVCard(card: CardData): string {
  const lastName = card.last_name || '';
  const firstName = card.first_name || '';
  const middleName = card.middle_name || '';
  const prefix = card.prefix || '';
  const suffix = card.suffix || '';
  
  // vCard 3.0 spec: N = Family(Last); Given(First); Additional(Middle); Honorific Prefix; Honorific Suffix
  const N = [
    escapeVCardValue(lastName),    // Family name
    escapeVCardValue(firstName),   // Given name
    escapeVCardValue(middleName),  // Additional names
    escapeVCardValue(prefix),      // Honorific prefix
    escapeVCardValue(suffix)       // Honorific suffix
  ].join(';');
  
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${N}`,
    `FN:${escapeVCardValue(assembleFN(card))}`,
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

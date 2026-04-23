// Canonical vCard 3.0 Generator (Deno version)
// Ensures uniform formatting across all users

export type Profile = {
  prefix?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  org?: string;
  title?: string;
  email?: string;
  emails?: { type: 'WORK' | 'HOME' | 'OTHER'; value: string; label?: string }[];
  phones?: { type: 'CELL' | 'WORK' | 'HOME' | 'MAIN' | 'FAX' | 'OTHER'; value: string }[];
  website?: string;
  websites?: { type: 'WORK' | 'HOME' | 'OTHER'; value: string; label?: string }[];
  address?: {
    street?: string;
    city?: string;
    region?: string;
    postcode?: string;
    country?: string;
    type?: 'HOME' | 'WORK';
  };
  addresses?: {
    street?: string;
    city?: string;
    region?: string;
    postcode?: string;
    country?: string;
    type?: 'HOME' | 'WORK' | 'OTHER';
    label?: string;
  }[];
  photo_url?: string;
  photo_type?: 'JPEG' | 'PNG';
  socials?: Partial<{
    facebook: string;
    instagram: string;
    tiktok: string;
    youtube: string;
    linkedin: string;
    twitter: string;
    whatsapp: string;
  }>;
  notes?: string;
  uid?: string;
};

function esc(s = '') {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function crlf(lines: string[]) {
  return lines.join('\r\n') + '\r\n';
}

function fold(vcard: string) {
  const out: string[] = [];
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  for (const line of vcard.split('\r\n')) {
    const bytes = enc.encode(line);
    if (bytes.length <= 75) {
      out.push(line);
      continue;
    }
    let start = 0;
    while (start < bytes.length) {
      let end = Math.min(start + 75, bytes.length);
      while (end > start) {
        try {
          const chunk = dec.decode(bytes.slice(start, end));
          out.push((start === 0 ? '' : ' ') + chunk);
          start = end;
          break;
        } catch {
          end--;
        }
      }
    }
  }
  return out.join('\r\n') + '\r\n';
}

async function toBase64FromUrl(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    let bin = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  } catch {
    return null;
  }
}

function formatFN(p: Profile) {
  return [p.prefix, p.first_name, p.middle_name, p.last_name, p.suffix]
    .filter(Boolean)
    .join(' ');
}

function safeUID(uid?: string) {
  return uid || ('cardex-' + Math.random().toString(36).slice(2) + Date.now());
}

export async function profileToVCardV3(profile: Profile): Promise<string> {
  const p = profile;

  const last = esc(p.last_name || '');
  const first = esc(p.first_name || '');
  const middle = esc(p.middle_name || '');
  const prefix = esc(p.prefix || '');
  const suffix = esc(p.suffix || '');

  const lines: string[] = [];

  lines.push('BEGIN:VCARD');
  lines.push('VERSION:3.0');

  lines.push(`UID:${esc(safeUID(p.uid))}`);
  lines.push(`REV:${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}`);

  lines.push(`N:${last};${first};${middle};${prefix};${suffix}`);
  lines.push(`FN:${esc(formatFN(p))}`);

  if (p.org) lines.push(`ORG:${esc(p.org)}`);
  if (p.title) lines.push(`TITLE:${esc(p.title)}`);

  const phoneOrder = ['CELL', 'WORK', 'HOME', 'MAIN', 'FAX', 'OTHER'];
  const phoneTypeMap: Record<string, string> = {
    'CELL': 'CELL,VOICE,PREF',
    'WORK': 'WORK,VOICE',
    'HOME': 'HOME,VOICE',
    'MAIN': 'MAIN,VOICE',
    'FAX': 'FAX',
    'OTHER': 'VOICE'
  };
  (p.phones || [])
    .slice()
    .sort((a, b) => phoneOrder.indexOf(a.type) - phoneOrder.indexOf(b.type))
    .forEach((ph) => {
      if (ph?.value) {
        const typeStr = phoneTypeMap[ph.type] || 'VOICE';
        lines.push(`TEL;TYPE=${typeStr}:${esc(ph.value)}`);
      }
    });

  // Primary Email — bare EMAIL so contacts apps display "Email"
  if (p.email) lines.push(`EMAIL:${esc(p.email.toLowerCase())}`);

  // Website (single, plain URL — labeled "Website" by contacts apps)
  if (p.website) lines.push(`URL:${esc(p.website)}`);

  // Additional Websites
  (p.websites || []).forEach((ws) => {
    if (ws?.value) {
      lines.push(`URL:${esc(ws.value)}`);
    }
  });

  // Primary Address
  if (
    p.address &&
    (p.address.street ||
      p.address.city ||
      p.address.region ||
      p.address.postcode ||
      p.address.country)
  ) {
    const t = p.address.type || 'HOME';
    const street = esc(p.address.street || '');
    const city = esc(p.address.city || '');
    const region = esc(p.address.region || '');
    const post = esc(p.address.postcode || '');
    const country = esc(p.address.country || '');
    lines.push(`ADR;TYPE=${t}:;;${street};${city};${region};${post};${country}`);
  }

  // Additional Addresses
  (p.addresses || []).forEach((addr) => {
    if (addr.street || addr.city || addr.region || addr.postcode || addr.country) {
      const t = addr.type || 'OTHER';
      const street = esc(addr.street || '');
      const city = esc(addr.city || '');
      const region = esc(addr.region || '');
      const post = esc(addr.postcode || '');
      const country = esc(addr.country || '');
      lines.push(`ADR;TYPE=${t}:;;${street};${city};${region};${post};${country}`);
    }
  });

  if (p.photo_url) {
    const imgType =
      p.photo_type || (p.photo_url.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG');
    try {
      const b64 = await toBase64FromUrl(p.photo_url);
      if (b64) lines.push(`PHOTO;ENCODING=b;TYPE=${imgType}:${b64}`);
    } catch {}
  }

  const socialMap: [keyof NonNullable<Profile['socials']>, string][] = [
    ['facebook', 'Facebook'],
    ['instagram', 'Instagram'],
    ['tiktok', 'TikTok'],
    ['youtube', 'YouTube'],
    ['linkedin', 'LinkedIn'],
    ['twitter', 'Twitter'],
    ['whatsapp', 'WhatsApp'],
  ];
  // Socials — use itemN.URL + X-ABLabel only (clean, single entry per platform with proper label)
  let itemI = 0;
  if (p.socials) {
    for (const [key, label] of socialMap) {
      const url = p.socials[key];
      if (!url) continue;
      itemI++;
      lines.push(`item${itemI}.URL:${esc(url)}`);
      lines.push(`item${itemI}.X-ABLabel:${label}`);
    }
  }

  // Additional Emails — use itemN grouping with explicit "Email" label so
  // contacts apps display "Email" instead of falling back to "Other".
  (p.emails || []).forEach((em) => {
    if (em?.value) {
      itemI++;
      lines.push(`item${itemI}.EMAIL:${esc(em.value.toLowerCase())}`);
      lines.push(`item${itemI}.X-ABLabel:Email`);
    }
  });

  // NOTE intentionally omitted — bio is shown on the card, not the contact entry.

  lines.push('END:VCARD');

  const vcf = fold(crlf(lines));
  return vcf;
}

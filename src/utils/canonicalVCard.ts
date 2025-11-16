// Canonical vCard 3.0 Generator
// Ensures uniform formatting across all users

export type Profile = {
  // Name parts
  prefix?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;

  // Basics
  org?: string;
  title?: string;
  email?: string;
  phones?: { type: 'CELL' | 'WORK' | 'HOME' | 'MAIN' | 'FAX' | 'OTHER'; value: string }[];
  website?: string;

  // Address
  address?: {
    street?: string;
    city?: string;
    region?: string;
    postcode?: string;
    country?: string;
    type?: 'HOME' | 'WORK';
  };

  // Photo
  photo_url?: string;
  photo_type?: 'JPEG' | 'PNG';

  // Socials
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

// ---------- helpers ----------
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

// vCard 3.0 folding: max 75 bytes, continuation lines begin with a single space
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
      // keep UTF-8 boundaries
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

// ---------- main ----------
export async function profileToVCardV3(profile: Profile): Promise<string> {
  const p = profile;

  const last = esc(p.last_name || '');
  const first = esc(p.first_name || '');
  const middle = esc(p.middle_name || '');
  const prefix = esc(p.prefix || '');
  const suffix = esc(p.suffix || '');

  const lines: string[] = [];

  // Header (locked for all users)
  lines.push('BEGIN:VCARD');
  lines.push('VERSION:3.0');

  // UID + REV for sync systems
  lines.push(`UID:${esc(safeUID(p.uid))}`);
  lines.push(`REV:${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}`);

  // Name mapping (uniform)
  lines.push(`N:${last};${first};${middle};${prefix};${suffix}`);
  lines.push(`FN:${esc(formatFN(p))}`);

  // Org & Title
  if (p.org) lines.push(`ORG:${esc(p.org)}`);
  if (p.title) lines.push(`TITLE:${esc(p.title)}`);

  // Phones (stable order by TYPE)
  const phoneOrder = ['CELL', 'WORK', 'HOME', 'MAIN', 'FAX', 'OTHER'];
  (p.phones || [])
    .slice()
    .sort((a, b) => phoneOrder.indexOf(a.type) - phoneOrder.indexOf(b.type))
    .forEach((ph) => {
      if (ph?.value) lines.push(`TEL;TYPE=${ph.type}:${esc(ph.value)}`);
    });

  // Email
  if (p.email) lines.push(`EMAIL;TYPE=INTERNET:${esc(p.email.toLowerCase())}`);

  // Website
  if (p.website) lines.push(`URL:${esc(p.website)}`);

  // Address
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

  // Photo (embed base64 + keep URI)
  if (p.photo_url) {
    const imgType =
      p.photo_type || (p.photo_url.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG');
    try {
      const b64 = await toBase64FromUrl(p.photo_url);
      if (b64) lines.push(`PHOTO;ENCODING=b;TYPE=${imgType}:${b64}`);
    } catch {}
    lines.push(`PHOTO;VALUE=URI:${esc(p.photo_url)}`);
  }

  // Socials: Apple item.URL + X-ABLabel AND X-SOCIALPROFILE
  const socialMap: [keyof NonNullable<Profile['socials']>, string][] = [
    ['facebook', 'Facebook'],
    ['instagram', 'Instagram'],
    ['tiktok', 'TikTok'],
    ['youtube', 'YouTube'],
    ['linkedin', 'LinkedIn'],
    ['twitter', 'Twitter'],
    ['whatsapp', 'WhatsApp'],
  ];
  let itemI = 0;
  if (p.socials) {
    for (const [key, label] of socialMap) {
      const url = p.socials[key];
      if (!url) continue;
      itemI++;
      lines.push(`item${itemI}.URL;type=pref:${esc(url)}`);
      lines.push(`item${itemI}.X-ABLabel:${label}`);
      lines.push(`X-SOCIALPROFILE;type=${key}:${esc(url)}`);
    }
  }

  // Notes
  if (p.notes) lines.push(`NOTE:${esc(p.notes)}`);

  // Footer
  lines.push('END:VCARD');

  // CRLF + fold
  const vcf = fold(crlf(lines));
  return vcf;
}

// Utility for downloads in browser
export async function downloadVCard(profile: Profile, filename = 'contact.vcf') {
  const vcf = await profileToVCardV3(profile);
  const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
}

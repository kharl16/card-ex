/**
 * iamEcommUrl.ts
 *
 * Single source of truth for the IAM e-commerce share link used by the
 * Products carousel CTA.
 *
 * Format: https://iam-ecomm-share.vercel.app/r/<8-digit IAM ID>
 */

export const IAM_ECOMM_BASE = "https://iam-ecomm-share.vercel.app/r";

/** Normalize any user input into an 8-digit IAM ID, or null when invalid. */
export function normalizeIamId(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return digits;
}

/** Build the canonical products carousel URL for an IAM ID. */
export function buildIamEcommUrl(rawIamId: unknown): string | null {
  const id = normalizeIamId(rawIamId);
  return id ? `${IAM_ECOMM_BASE}/${id}` : null;
}

/** True when the URL points at the IAM e-commerce share site. */
export function isIamEcommUrl(url: string | null | undefined): boolean {
  return !!url && /iam-ecomm-share\.vercel\.app/i.test(url);
}

/**
 * Rewrite any URL so it carries the given IAM ID.
 * - `https://iam-ecomm-share.vercel.app/r/<digits>` → replaces the digits
 * - legacy query params (`idno=`, `ref=`, ...) → replaces the value
 * Returns the original URL untouched when there is no IAM ID.
 */
export function applyIamIdToUrl(
  url: string | null | undefined,
  rawIamId: unknown
): string | null | undefined {
  const id = normalizeIamId(rawIamId);
  if (!url || !id) return url;
  if (isIamEcommUrl(url)) return `${IAM_ECOMM_BASE}/${id}`;
  return url
    .replace(/(idno=)\d{6,}/gi, `$1${id}`)
    .replace(/(\?|&)(ref|referrer|referral|iamid|iam_id)=\d{6,}/gi, `$1$2=${id}`);
}

/**
 * Rules shared by the member GCash form and the admin review page.
 * They mirror the database checks on gcash_payment_submissions so members
 * see a clear message before anything is sent.
 */

export type GcashSubmissionStatus = "pending" | "approved" | "rejected";

/** GCash reference numbers are shown with spaces; keep digits only. */
export function normalizeGcashReference(input: string): string {
  return input.replace(/\D/g, "");
}

/** GCash reference numbers are 13 digits; allow 10–16 like the database does. */
export function isValidGcashReference(reference: string): boolean {
  return /^[0-9]{10,16}$/.test(reference);
}

/**
 * Turn any common way of writing a PH mobile number into 09XXXXXXXXX.
 * Returns null when it isn't a PH mobile number.
 */
export function normalizePhMobile(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (/^639[0-9]{9}$/.test(digits)) return `0${digits.slice(2)}`;
  if (/^9[0-9]{9}$/.test(digits)) return `0${digits}`;
  if (/^09[0-9]{9}$/.test(digits)) return digits;
  return null;
}

/** 09171234567 → 0917 123 4567 (easier to read aloud and copy). */
export function formatPhMobile(number: string): string {
  const n = normalizePhMobile(number);
  if (!n) return number;
  return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
}

export function formatPeso(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** The newest submission decides what the member sees on the payment page. */
export function latestSubmission<T extends { status: GcashSubmissionStatus | string; created_at: string }>(
  submissions: T[] | null | undefined,
): T | null {
  if (!submissions?.length) return null;
  return [...submissions].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

export const MAX_PROOF_BYTES = 10 * 1024 * 1024;

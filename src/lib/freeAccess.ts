/**
 * 7-day free access for new cardholders.
 * The database grants `trial_ends_at` on a user's first card only; this module
 * turns that timestamp into what the member sees and whether they may publish.
 */
export const FREE_ACCESS_DAYS = 7;
/** Show the gentle "activate soon" reminder when this many days or fewer remain. */
export const FREE_ACCESS_REMINDER_DAYS = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

export type FreeAccessStatus = "paid" | "active" | "ending" | "expired" | "none";

export interface FreeAccessCard {
  is_paid?: boolean | null;
  trial_ends_at?: string | null;
}

export interface FreeAccessState {
  status: FreeAccessStatus;
  /** Whole days remaining, rounded up (1 = ends within the next 24 hours). */
  daysLeft: number;
  endsAt: Date | null;
}

export function getFreeAccessState(card: FreeAccessCard | null | undefined, now: Date = new Date()): FreeAccessState {
  if (!card) return { status: "none", daysLeft: 0, endsAt: null };
  if (card.is_paid) return { status: "paid", daysLeft: 0, endsAt: null };
  if (!card.trial_ends_at) return { status: "none", daysLeft: 0, endsAt: null };

  const endsAt = new Date(card.trial_ends_at);
  const msLeft = endsAt.getTime() - now.getTime();
  if (Number.isNaN(msLeft) || msLeft <= 0) return { status: "expired", daysLeft: 0, endsAt };

  const daysLeft = Math.ceil(msLeft / DAY_MS);
  return {
    status: daysLeft <= FREE_ACCESS_REMINDER_DAYS ? "ending" : "active",
    daysLeft,
    endsAt,
  };
}

/** A card may be published when it is paid or still inside its free access window. */
export function hasCardAccess(card: FreeAccessCard | null | undefined, now: Date = new Date()): boolean {
  const { status } = getFreeAccessState(card, now);
  return status === "paid" || status === "active" || status === "ending";
}

export function daysLeftLabel(daysLeft: number): string {
  if (daysLeft <= 1) return "Last day";
  return `${daysLeft} days left`;
}

/**
 * Pages a member may still open after their free week ended unpaid:
 * only plan activation (billing and its success page). Everything else shows the lock screen.
 */
export function isPathAllowedWhileLocked(pathname: string): boolean {
  return pathname === "/billing" || pathname.startsWith("/billing/");
}

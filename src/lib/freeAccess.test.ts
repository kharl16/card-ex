import { describe, it, expect } from "vitest";
import { getFreeAccessState, hasCardAccess, daysLeftLabel, isPathAllowedWhileLocked } from "./freeAccess";

const now = new Date("2026-11-11T06:00:00Z");
const inDays = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();

describe("7-day free access", () => {
  it("a brand-new card has 7 days of free access and can publish", () => {
    const card = { is_paid: false, trial_ends_at: inDays(7) };
    expect(getFreeAccessState(card, now)).toMatchObject({ status: "active", daysLeft: 7 });
    expect(hasCardAccess(card, now)).toBe(true);
  });

  it("shows the reminder when 2 days or fewer remain", () => {
    expect(getFreeAccessState({ is_paid: false, trial_ends_at: inDays(2) }, now).status).toBe("ending");
    expect(getFreeAccessState({ is_paid: false, trial_ends_at: inDays(2.5) }, now).status).toBe("active");
  });

  it("after day 7 an unpaid card loses access", () => {
    const card = { is_paid: false, trial_ends_at: inDays(-0.01) };
    expect(getFreeAccessState(card, now).status).toBe("expired");
    expect(hasCardAccess(card, now)).toBe(false);
  });

  it("an unpaid card without free access (second card or existing member) cannot publish", () => {
    expect(hasCardAccess({ is_paid: false, trial_ends_at: null }, now)).toBe(false);
  });

  it("a paid card always has access, even after the free week", () => {
    const card = { is_paid: true, trial_ends_at: inDays(-30) };
    expect(getFreeAccessState(card, now).status).toBe("paid");
    expect(hasCardAccess(card, now)).toBe(true);
  });

  it("labels the final 24 hours as the last day", () => {
    expect(daysLeftLabel(1)).toBe("Last day");
    expect(daysLeftLabel(5)).toBe("5 days left");
  });
});

describe("isPathAllowedWhileLocked", () => {
  it("keeps plan activation open after the free week ends", () => {
    expect(isPathAllowedWhileLocked("/billing/abc")).toBe(true);
    expect(isPathAllowedWhileLocked("/billing/abc/success")).toBe(true);
  });
  it("closes every other signed-in page", () => {
    expect(isPathAllowedWhileLocked("/dashboard")).toBe(false);
    expect(isPathAllowedWhileLocked("/cards/abc/edit")).toBe(false);
    expect(isPathAllowedWhileLocked("/dashboard/presentations")).toBe(false);
    expect(isPathAllowedWhileLocked("/billingx")).toBe(false);
  });
});

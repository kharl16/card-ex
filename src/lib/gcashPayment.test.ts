import { describe, it, expect } from "vitest";
import {
  normalizeGcashReference,
  isValidGcashReference,
  normalizePhMobile,
  formatPhMobile,
  latestSubmission,
} from "./gcashPayment";

describe("GCash payment rules", () => {
  it("accepts a 13-digit GCash reference typed with spaces", () => {
    const ref = normalizeGcashReference("1012 345 678912");
    expect(ref).toBe("1012345678912");
    expect(isValidGcashReference(ref)).toBe(true);
  });

  it("rejects a reference that is too short", () => {
    expect(isValidGcashReference(normalizeGcashReference("12345"))).toBe(false);
  });

  it("reads +63, 63 and 09 mobile numbers as the same GCash number", () => {
    expect(normalizePhMobile("+63 917 123 4567")).toBe("09171234567");
    expect(normalizePhMobile("639171234567")).toBe("09171234567");
    expect(normalizePhMobile("0917-123-4567")).toBe("09171234567");
    expect(formatPhMobile("09171234567")).toBe("0917 123 4567");
  });

  it("rejects numbers that are not PH mobile numbers", () => {
    expect(normalizePhMobile("02 8123 4567")).toBeNull();
  });

  it("shows the newest submission, e.g. a new try after a rejection", () => {
    const latest = latestSubmission([
      { status: "rejected", created_at: "2026-11-10T01:00:00Z" },
      { status: "pending", created_at: "2026-11-12T01:00:00Z" },
    ]);
    expect(latest?.status).toBe("pending");
  });
});

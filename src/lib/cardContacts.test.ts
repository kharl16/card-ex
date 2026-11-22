import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { toAdditionalContacts } from "./cardContacts";

describe("toAdditionalContacts", () => {
  it("keeps a second mobile number so the editor preview matches the actual card", () => {
    const contacts = toAdditionalContacts([
      { id: "1", kind: "phone", label: "Mobile Phone", value: "+639171234567" },
      { id: "2", kind: "email", label: "Work Email", value: "a@b.com" },
    ]);
    expect(contacts.map((c) => c.value)).toEqual(["+639171234567", "a@b.com"]);
    expect(contacts[0].contactType).toBe("mobile");
  });

  it("leaves out social links stored alongside contacts", () => {
    const contacts = toAdditionalContacts([
      { id: "1", kind: "url", label: "Facebook", value: "https://facebook.com/x" },
      { id: "2", kind: "facebook", label: "Facebook", value: "https://facebook.com/x" },
    ]);
    expect(contacts).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { CHATBOT_NAME_MAX, normalizeChatbotNameForSave, resolveChatbotName } from "@/lib/chatbotName";

describe("chat assistant name", () => {
  it("allows up to 30 characters", () => {
    expect(CHATBOT_NAME_MAX).toBe(30);
    expect(normalizeChatbotNameForSave("A".repeat(35))).toBe("A".repeat(30));
  });

  it("stores a blank name as empty so the first name is used", () => {
    expect(normalizeChatbotNameForSave("   ")).toBeNull();
    expect(resolveChatbotName(null, "Ma Sofia Requejo")).toBe("Ma");
  });

  it("prefers the custom name over the first name", () => {
    expect(resolveChatbotName("  Sofia  ", "Ma Sofia Requejo")).toBe("Sofia");
  });
});

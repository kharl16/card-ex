/** Longest custom chat assistant name a card holder may enter (matches the database limit). */
export const CHATBOT_NAME_MAX = 30;

/**
 * The name the card's chat assistant goes by: the owner's custom name when set,
 * otherwise the first word of the card holder's full name, otherwise empty.
 */
export function resolveChatbotName(chatbotName: string | null | undefined, fullName: string | null | undefined): string {
  const custom = (chatbotName ?? "").replace(/\s+/g, " ").trim();
  if (custom) return custom.slice(0, CHATBOT_NAME_MAX);
  return (fullName ?? "").trim().split(/\s+/)[0] || "";
}

/** Text shown on the floating chat button. */
export function chatTriggerLabel(name: string): string {
  return name ? `Ask ${name}` : "Ask AI";
}

/** Value to store: trimmed custom name, or null to use the first name. */
export function normalizeChatbotNameForSave(value: string | null | undefined): string | null {
  const cleaned = (value ?? "").replace(/\s+/g, " ").trim().slice(0, CHATBOT_NAME_MAX);
  return cleaned || null;
}

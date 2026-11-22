import { supabase } from "@/integrations/supabase/client";

export type ContactKind = "email" | "phone" | "url" | "custom";
export type ContactType = "work" | "home" | "mobile" | "office" | "other";

export interface AdditionalContact {
  id: string;
  kind: ContactKind;
  label: string;
  value: string;
  contactType: ContactType;
  isNew?: boolean;
}

export interface ContactLinkRow {
  id: string;
  kind: string;
  label: string | null;
  value: string | null;
}

const CONTACT_LABEL_KEYWORDS = ["additional", "alternate", "other", "secondary", "work", "home", "mobile", "office"];

export function inferTypeFromLabel(labelLower: string): ContactType {
  if (labelLower.includes("work")) return "work";
  if (labelLower.includes("home")) return "home";
  if (labelLower.includes("mobile") || labelLower.includes("cell")) return "mobile";
  if (labelLower.includes("office")) return "office";
  return "other";
}

/**
 * Turns card_links rows into the extra contacts shown on a card.
 * Shared by the editor preview, the editor's contact list, and the public/shared
 * card pages so every view shows exactly the same numbers and emails.
 */
export function toAdditionalContacts(rows: ContactLinkRow[]): AdditionalContact[] {
  return rows
    .filter((row) => ["email", "phone", "url", "custom"].includes(row.kind))
    .filter((row) => {
      const label = (row.label || "").toLowerCase();
      return CONTACT_LABEL_KEYWORDS.some((keyword) => label.includes(keyword));
    })
    .map((row) => {
      const rawLabel = row.label || "";
      return {
        id: row.id,
        kind: row.kind as ContactKind,
        label: rawLabel,
        value: row.value || "",
        contactType: inferTypeFromLabel(rawLabel.toLowerCase()),
        isNew: false,
      };
    });
}

/** Loads a card's extra contacts (second phone, extra emails, etc.) in display order. */
export async function fetchAdditionalContacts(cardId: string): Promise<AdditionalContact[] | null> {
  const { data, error } = await supabase
    .from("card_links")
    .select("id, kind, label, value, sort_index")
    .eq("card_id", cardId)
    .in("kind", ["email", "phone", "url", "custom"])
    .order("sort_index", { ascending: true });

  if (error) {
    console.error("Error loading additional contacts:", error);
    return null;
  }
  return toAdditionalContacts(data ?? []);
}

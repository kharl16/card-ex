import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X, Mail, Phone, Globe, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

type ContactKind = "email" | "phone" | "url" | "custom";
type ContactType = "work" | "home" | "mobile" | "office" | "other";

export interface AdditionalContact {
  id: string;
  kind: ContactKind;
  label: string;
  value: string;
  contactType: ContactType;
  isNew?: boolean; // not yet saved in DB
}

interface ContactInformationSectionProps {
  card: CardData;
  validationErrors: Record<string, string>;
  onCardChange: (updates: Partial<CardData>) => void;
  onAdditionalContactsChange?: (contacts: AdditionalContact[]) => void;
}

// Infer contact type from an existing label
function inferTypeFromLabel(labelLower: string): ContactType {
  if (labelLower.includes("work")) return "work";
  if (labelLower.includes("home")) return "home";
  if (labelLower.includes("mobile") || labelLower.includes("cell")) return "mobile";
  if (labelLower.includes("office")) return "office";
  return "other";
}

// Human label for type dropdown
function getContactTypeLabel(type: ContactType): string {
  switch (type) {
    case "work":
      return "Work";
    case "home":
      return "Home";
    case "mobile":
      return "Mobile";
    case "office":
      return "Office";
    case "other":
    default:
      return "Other";
  }
}

// Build the label we store in card_links.label
function buildLabelFromKindAndType(kind: ContactKind, type: ContactType): string {
  const kindName = kind === "email" ? "Email" : kind === "phone" ? "Phone" : kind === "url" ? "Website" : "Location";

  const typeName = type === "other" ? "Additional" : getContactTypeLabel(type); // Work / Home / Mobile / Office

  return `${typeName} ${kindName}`;
}

export function ContactInformationSection({
  card,
  validationErrors,
  onCardChange,
  onAdditionalContactsChange,
}: ContactInformationSectionProps) {
  const [additionalContacts, setAdditionalContacts] = useState<AdditionalContact[]>([]);

  // Load additional contacts from card_links when card.id changes
  useEffect(() => {
    if (card?.id) {
      loadAdditionalContacts();
    } else {
      setAdditionalContacts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]);

  const loadAdditionalContacts = async () => {
    if (!card?.id) return;

    const { data, error } = await supabase
      .from("card_links")
      .select("id, kind, label, value")
      .eq("card_id", card.id)
      .in("kind", ["email", "phone", "url", "custom"])
      .order("sort_index", { ascending: true });

    if (error) {
      console.error("Error loading additional contacts:", error);
      return;
    }

    if (!data) {
      setAdditionalContacts([]);
      onAdditionalContactsChange?.([]);
      return;
    }

    // Keep only contact-related links (not social media)
    const contactLinks = data.filter((link) => {
      const labelLower = (link.label || "").toLowerCase();

      return (
        link.kind === "email" ||
        link.kind === "phone" ||
        (link.kind === "custom" && labelLower.includes("location")) ||
        (link.kind === "url" &&
          !["facebook", "linkedin", "instagram", "x", "youtube", "telegram", "tiktok"].some((social) =>
            labelLower.includes(social),
          ))
      );
    });

    const contacts: AdditionalContact[] = contactLinks
      .filter((link) => {
        const label = (link.label || "").toLowerCase();
        return (
          label.includes("additional") ||
          label.includes("alternate") ||
          label.includes("other") ||
          label.includes("secondary") ||
          label.includes("work") ||
          label.includes("home") ||
          label.includes("mobile") ||
          label.includes("office")
        );
      })
      .map((link) => {
        const rawLabel = link.label || "";
        const labelLower = rawLabel.toLowerCase();
        const contactType = inferTypeFromLabel(labelLower);

        return {
          id: link.id,
          kind: link.kind as ContactKind,
          label: rawLabel || buildLabelFromKindAndType(link.kind as ContactKind, contactType),
          value: link.value || "",
          contactType,
          isNew: false,
        };
      });

    setAdditionalContacts(contacts);
    onAdditionalContactsChange?.(contacts);
  };

  /**
   * When user clicks +Email/+Phone/etc:
   * - Create a local row (isNew: true) with default type
   * - No Supabase insert yet (DB requires a non-empty value)
   */
  const addContact = (kind: ContactKind) => {
    if (!card?.id) return;

    // sensible defaults
    const defaultType: ContactType = kind === "phone" ? "mobile" : kind === "custom" ? "office" : "work";

    const newContact: AdditionalContact = {
      id: crypto.randomUUID(), // temporary ID
      kind,
      contactType: defaultType,
      label: buildLabelFromKindAndType(kind, defaultType),
      value: "",
      isNew: true,
    };

    const updated = [...additionalContacts, newContact];
    setAdditionalContacts(updated);
    onAdditionalContactsChange?.(updated);
  };

  /**
   * Update contact value (email/phone/url/etc).
   * For new rows, insert into Supabase the first time value becomes non-empty.
   */
  const updateContactValue = async (id: string, newValue: string) => {
    const updated = additionalContacts.map((c) => (c.id === id ? { ...c, value: newValue } : c));
    setAdditionalContacts(updated);
    onAdditionalContactsChange?.(updated);

    const contact = updated.find((c) => c.id === id);
    if (!contact || !card?.id) return;

    // Brand new contact → only insert once we have a value
    if (contact.isNew) {
      if (newValue.trim() === "") return;

      try {
        const { data, error } = await supabase
          .from("card_links")
          .insert([
            {
              card_id: card.id,
              kind: contact.kind,
              label: contact.label || buildLabelFromKindAndType(contact.kind, contact.contactType),
              value: newValue.trim(),
              sort_index: additionalContacts.length,
            },
          ])
          .select("id, label, value")
          .single();

        if (error || !data) {
          console.error("Failed to save new contact:", error);
          toast.error(error?.message || "Failed to save contact");
          return;
        }

        const finalContacts = updated.map((c) =>
          c.id === contact.id
            ? {
                ...c,
                id: data.id,
                label: data.label || c.label,
                value: data.value || c.value,
                isNew: false,
              }
            : c,
        );
        setAdditionalContacts(finalContacts);
        onAdditionalContactsChange?.(finalContacts);
      } catch (err) {
        console.error("Unexpected error saving new contact:", err);
        toast.error("Failed to save contact");
      }

      return;
    }

    // Existing contact → update Supabase
    try {
      const { error } = await supabase.from("card_links").update({ value: newValue }).eq("id", contact.id);

      if (error) {
        console.error("Failed to update contact:", error);
        toast.error("Failed to save contact changes");
      }
    } catch (err) {
      console.error("Unexpected error updating contact:", err);
      toast.error("Failed to save contact changes");
    }
  };

  /**
   * Change the contact type (Work/Home/Mobile/Office/Other).
   * We update:
   *  - local contactType
   *  - label (e.g. "Work Email")
   *  - Supabase label for existing rows
   */
  const updateContactType = async (id: string, newType: ContactType) => {
    const updated = additionalContacts.map((c) =>
      c.id === id
        ? {
            ...c,
            contactType: newType,
            label: buildLabelFromKindAndType(c.kind, newType),
          }
        : c,
    );
    setAdditionalContacts(updated);
    onAdditionalContactsChange?.(updated);

    const contact = updated.find((c) => c.id === id);
    if (!contact || !card?.id || contact.isNew) {
      // For new contacts, label will be sent on first save
      return;
    }

    try {
      const { error } = await supabase.from("card_links").update({ label: contact.label }).eq("id", contact.id);

      if (error) {
        console.error("Failed to update contact type:", error);
        toast.error("Failed to save contact type");
      }
    } catch (err) {
      console.error("Unexpected error updating contact type:", err);
      toast.error("Failed to save contact type");
    }
  };

  const removeContact = async (id: string) => {
    const contact = additionalContacts.find((c) => c.id === id);
    if (!contact) return;

    if (contact.isNew) {
      const updatedLocal = additionalContacts.filter((c) => c.id !== id);
      setAdditionalContacts(updatedLocal);
      onAdditionalContactsChange?.(updatedLocal);
      return;
    }

    try {
      const { error } = await supabase.from("card_links").delete().eq("id", id);
      if (error) {
        console.error("Failed to remove contact:", error);
        toast.error("Failed to remove contact");
        return;
      }

      const updated = additionalContacts.filter((c) => c.id !== id);
      setAdditionalContacts(updated);
      onAdditionalContactsChange?.(updated);
      toast.success("Contact removed");
    } catch (err) {
      console.error("Unexpected error removing contact:", err);
      toast.error("Failed to remove contact");
    }
  };

  const getContactIcon = (kind: ContactKind) => {
    switch (kind) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "phone":
        return <Phone className="h-4 w-4" />;
      case "url":
        return <Globe className="h-4 w-4" />;
      case "custom":
        return <MapPin className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getPlaceholder = (kind: ContactKind) => {
    switch (kind) {
      case "email":
        return "additional@email.com";
      case "phone":
        return "+1 234 567 8901";
      case "url":
        return "https://other-website.com";
      case "custom":
        return "City, Country";
      default:
        return "";
    }
  };

  const getInputType = (kind: ContactKind) => {
    switch (kind) {
      case "email":
        return "email";
      case "phone":
        return "tel";
      case "url":
        return "url";
      default:
        return "text";
    }
  };

  return (
    <div className="space-y-6">
      {/* Primary Contact Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={card.email || ""}
            onChange={(e) => onCardChange({ email: e.target.value })}
            placeholder="your@email.com"
            maxLength={255}
            className={validationErrors.email ? "border-destructive" : ""}
          />
          {validationErrors.email && <p className="text-sm text-destructive">{validationErrors.email}</p>}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Phone
          </Label>
          <Input
            id="phone"
            type="tel"
            value={card.phone || ""}
            onChange={(e) => onCardChange({ phone: e.target.value })}
            placeholder="+1 234 567 8900"
            maxLength={30}
            className={validationErrors.phone ? "border-destructive" : ""}
          />
          {validationErrors.phone && <p className="text-sm text-destructive">{validationErrors.phone}</p>}
        </div>

        {/* Website */}
        <div className="space-y-2">
          <Label htmlFor="website" className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Website
          </Label>
          <Input
            id="website"
            type="url"
            value={card.website || ""}
            onChange={(e) => onCardChange({ website: e.target.value })}
            placeholder="https://yourwebsite.com"
            maxLength={255}
            className={validationErrors.website ? "border-destructive" : ""}
          />
          {validationErrors.website && <p className="text-sm text-destructive">{validationErrors.website}</p>}
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Location
          </Label>
          <Input
            id="location"
            value={card.location || ""}
            onChange={(e) => onCardChange({ location: e.target.value })}
            placeholder="City, Country"
            maxLength={200}
            className={validationErrors.location ? "border-destructive" : ""}
          />
          {validationErrors.location && <p className="text-sm text-destructive">{validationErrors.location}</p>}
        </div>
      </div>

      {/* Additional Contacts Section */}
      {additionalContacts.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">Additional Contacts</Label>
          <div className="space-y-3">
            {additionalContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <div className="mt-2 text-muted-foreground">{getContactIcon(contact.kind)}</div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {/* Type selector */}
                  <select
                    value={contact.contactType}
                    onChange={(e) => updateContactType(contact.id, e.target.value as ContactType)}
                    className="text-sm rounded-md border bg-background px-2 py-1.5"
                  >
                    <option value="work">{getContactTypeLabel("work")}</option>
                    <option value="home">{getContactTypeLabel("home")}</option>
                    <option value="mobile">{getContactTypeLabel("mobile")}</option>
                    <option value="office">{getContactTypeLabel("office")}</option>
                    <option value="other">{getContactTypeLabel("other")}</option>
                  </select>

                  {/* Value input */}
                  <Input
                    type={getInputType(contact.kind)}
                    value={contact.value}
                    onChange={(e) => updateContactValue(contact.id, e.target.value)}
                    placeholder={getPlaceholder(contact.kind)}
                    className="text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeContact(contact.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Changes to additional contacts and types are saved automatically.
          </p>
        </div>
      )}

      {/* Add Additional Contact Buttons */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">Add Additional</Label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => addContact("email")} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            <Mail className="h-3.5 w-3.5" />
            Email
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addContact("phone")} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            <Phone className="h-3.5 w-3.5" />
            Phone
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addContact("url")} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            <Globe className="h-3.5 w-3.5" />
            Website
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addContact("custom")} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            <MapPin className="h-3.5 w-3.5" />
            Location
          </Button>
        </div>
      </div>
    </div>
  );
}

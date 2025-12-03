import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X, Mail, Phone, Globe, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

export interface AdditionalContact {
  id: string;
  kind: "email" | "phone" | "url" | "custom";
  label: string;
  value: string;
  isNew?: boolean; // not yet saved in DB
}

interface ContactInformationSectionProps {
  card: CardData;
  validationErrors: Record<string, string>;
  onCardChange: (updates: Partial<CardData>) => void;
  onAdditionalContactsChange?: (contacts: AdditionalContact[]) => void;
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
      .map((link) => ({
        id: link.id,
        kind: link.kind as AdditionalContact["kind"],
        label: link.label || "",
        value: link.value || "",
        isNew: false,
      }));

    setAdditionalContacts(contacts);
    onAdditionalContactsChange?.(contacts);
  };

  /**
   * When user clicks +Email/+Phone/etc:
   * - Only create a local row (isNew: true)
   * - Do NOT hit Supabase yet (value is still empty and DB requires a value)
   */
  const addContact = (type: AdditionalContact["kind"]) => {
    if (!card?.id) return;

    const labelMap: Record<AdditionalContact["kind"], string> = {
      email: "Additional Email",
      phone: "Additional Phone",
      url: "Additional Website",
      custom: "Additional Location",
    };

    const newContact: AdditionalContact = {
      id: crypto.randomUUID(), // temporary ID for React list rendering
      kind: type,
      label: labelMap[type],
      value: "",
      isNew: true,
    };

    const updated = [...additionalContacts, newContact];
    setAdditionalContacts(updated);
    onAdditionalContactsChange?.(updated);
  };

  /**
   * When user edits label or value:
   * - Update React state immediately
   * - If contact is new:
   *    - Only insert into Supabase when value becomes non-empty
   * - If contact already exists in DB:
   *    - Update the row in Supabase
   */
  const updateContact = async (id: string, field: "label" | "value", newValue: string) => {
    const updated = additionalContacts.map((c) => (c.id === id ? { ...c, [field]: newValue } : c));
    setAdditionalContacts(updated);
    onAdditionalContactsChange?.(updated);

    const contact = updated.find((c) => c.id === id);
    if (!contact || !card?.id) return;

    // For brand new contacts, only hit DB the first time we get a non-empty value
    if (contact.isNew) {
      if (field === "value" && newValue.trim() !== "") {
        try {
          const { data, error } = await supabase
            .from("card_links")
            .insert([
              {
                card_id: card.id,
                kind: contact.kind,
                label: contact.label || "",
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

          // Replace temp ID with real DB ID, mark isNew = false
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
      }

      // If still empty, just keep it local and don't touch DB yet
      return;
    }

    // Existing contact → update Supabase
    try {
      const payload: Record<string, string> = { [field]: newValue };
      const { error } = await supabase.from("card_links").update(payload).eq("id", id);

      if (error) {
        console.error("Failed to update contact:", error);
        toast.error("Failed to save contact changes");
      }
    } catch (err) {
      console.error("Unexpected error updating contact:", err);
      toast.error("Failed to save contact changes");
    }
  };

  const removeContact = async (id: string) => {
    const contact = additionalContacts.find((c) => c.id === id);
    if (!contact) return;

    // If it's only local (never saved), just drop it from state
    if (contact.isNew) {
      const updatedLocal = additionalContacts.filter((c) => c.id !== id);
      setAdditionalContacts(updatedLocal);
      onAdditionalContactsChange?.(updatedLocal);
      return;
    }

    // Otherwise delete from DB then from state
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

  const getContactIcon = (kind: AdditionalContact["kind"]) => {
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

  const getPlaceholder = (kind: AdditionalContact["kind"]) => {
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

  const getInputType = (kind: AdditionalContact["kind"]) => {
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
                  <Input
                    value={contact.label}
                    onChange={(e) => updateContact(contact.id, "label", e.target.value)}
                    placeholder="Label (e.g., Work Email)"
                    className="text-sm"
                  />
                  <Input
                    type={getInputType(contact.kind)}
                    value={contact.value}
                    onChange={(e) => updateContact(contact.id, "value", e.target.value)}
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

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X, Mail, Phone, Globe, MapPin, ChevronDown, GripVertical } from "lucide-react";
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
  isNew?: boolean;
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
  const [draggingId, setDraggingId] = useState<string | null>(null);

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
      .select("id, kind, label, value, sort_index")
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

  const addContact = (kind: ContactKind) => {
    if (!card?.id) return;

    const defaultType: ContactType = kind === "phone" ? "mobile" : kind === "custom" ? "office" : "work";

    const newContact: AdditionalContact = {
      id: crypto.randomUUID(),
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

  const updateContactValue = async (id: string, newValue: string) => {
    const updated = additionalContacts.map((c) => (c.id === id ? { ...c, value: newValue } : c));
    setAdditionalContacts(updated);
    onAdditionalContactsChange?.(updated);

    const contact = updated.find((c) => c.id === id);
    if (!contact || !card?.id) return;

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
              sort_index: updated.findIndex((c) => c.id === contact.id),
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
        console.error("Unexpected error saving contact:", err);
        toast.error("Failed to save contact");
      }

      return;
    }

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

  // ----- Drag & Drop helpers -----

  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, overId: string) => {
    e.preventDefault();
    if (!draggingId || draggingId === overId) return;

    const currentIndex = additionalContacts.findIndex((c) => c.id === draggingId);
    const overIndex = additionalContacts.findIndex((c) => c.id === overId);
    if (currentIndex === -1 || overIndex === -1) return;

    const updated = [...additionalContacts];
    const [moved] = updated.splice(currentIndex, 1);
    updated.splice(overIndex, 0, moved);

    setAdditionalContacts(updated);
    onAdditionalContactsChange?.(updated);
  };

  const handleDragEnd = async () => {
    if (!card?.id) {
      setDraggingId(null);
      return;
    }

    try {
      // Persist new sort_index order
      await Promise.all(
        additionalContacts.map((contact, index) =>
          contact.isNew
            ? Promise.resolve()
            : supabase.from("card_links").update({ sort_index: index }).eq("id", contact.id),
        ),
      );
    } catch (err) {
      console.error("Failed to save contact order:", err);
      toast.error("Failed to save contact order");
    } finally {
      setDraggingId(null);
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
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Additional Contacts</Label>
          <div className="space-y-2">
            {additionalContacts.map((contact) => (
              <div
                key={contact.id}
                draggable
                onDragStart={() => handleDragStart(contact.id)}
                onDragOver={(e) => handleDragOver(e, contact.id)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 rounded-lg bg-muted/30 border border-border/40 px-2 py-1.5 cursor-grab ${
                  draggingId === contact.id ? "ring-1 ring-primary/60 bg-muted/50" : ""
                }`}
              >
                {/* Drag handle */}
                <div className="flex items-center justify-center text-muted-foreground flex-shrink-0">
                  <GripVertical className="h-4 w-4 opacity-70" />
                </div>

                {/* Icon */}
                <div className="text-muted-foreground flex-shrink-0">{getContactIcon(contact.kind)}</div>

                {/* Type + value */}
                <div className="flex-1 flex flex-col sm:flex-row items-stretch gap-1.5 sm:gap-2">
                  {/* Type selector with custom arrow */}
                  <div className="relative w-28 sm:w-32 flex-shrink-0">
                    <select
                      value={contact.contactType}
                      onChange={(e) => updateContactType(contact.id, e.target.value as ContactType)}
                      className="text-xs sm:text-sm rounded-md border border-border bg-background px-2 pr-8 py-1 h-8 sm:h-9 w-full appearance-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="work">{getContactTypeLabel("work")}</option>
                      <option value="home">{getContactTypeLabel("home")}</option>
                      <option value="mobile">{getContactTypeLabel("mobile")}</option>
                      <option value="office">{getContactTypeLabel("office")}</option>
                      <option value="other">{getContactTypeLabel("other")}</option>
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-muted-foreground">
                      <ChevronDown className="h-3 w-3" />
                    </span>
                  </div>

                  {/* Value input */}
                  <Input
                    type={getInputType(contact.kind)}
                    value={contact.value}
                    onChange={(e) => updateContactValue(contact.id, e.target.value)}
                    placeholder={getPlaceholder(contact.kind)}
                    className="text-xs sm:text-sm flex-1 min-w-0 h-8 sm:h-9"
                  />
                </div>

                {/* Remove */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => removeContact(contact.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Drag rows to reorder. Changes and order are saved automatically.
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

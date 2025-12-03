import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X, Mail, Phone, Globe, MapPin, ChevronDown, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getActiveTheme, CardTheme } from "@/lib/theme";
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

// --- helpers ----------------------------------------------------

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

  const typeName = type === "other" ? "Additional" : getContactTypeLabel(type);

  return `${typeName} ${kindName}`;
}

// Enforce grouping order for additional contacts (email → phone → url → custom)
function kindOrder(kind: ContactKind): number {
  switch (kind) {
    case "email":
      return 1;
    case "phone":
      return 2;
    case "url":
      return 3;
    case "custom":
    default:
      return 4;
  }
}

export function ContactInformationSection({
  card,
  validationErrors,
  onCardChange,
  onAdditionalContactsChange,
}: ContactInformationSectionProps) {
  // Get theme and primary color from the card
  const theme = getActiveTheme((card.theme ?? null) as unknown as CardTheme | null);
  const primaryColor = theme?.primary || "#D4AF37";

  // additional contacts (from card_links)
  const [additionalContacts, setAdditionalContacts] = useState<AdditionalContact[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // drag state for primary (main) fields
  type PrimaryField = "email" | "phone" | "website" | "location";
  const [primaryOrder, setPrimaryOrder] = useState<PrimaryField[]>(["email", "phone", "website", "location"]);
  const [primaryDraggingId, setPrimaryDraggingId] = useState<PrimaryField | null>(null);

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

  // ----- Drag & drop: PRIMARY fields (local only) -------------------

  const handlePrimaryDragStart = (field: PrimaryField) => {
    setPrimaryDraggingId(field);
  };

  const handlePrimaryDragOver = (e: React.DragEvent<HTMLDivElement>, overField: PrimaryField) => {
    e.preventDefault();
    if (!primaryDraggingId || primaryDraggingId === overField) return;

    const currentIndex = primaryOrder.indexOf(primaryDraggingId);
    const overIndex = primaryOrder.indexOf(overField);
    if (currentIndex === -1 || overIndex === -1) return;

    const updated = [...primaryOrder];
    const [moved] = updated.splice(currentIndex, 1);
    updated.splice(overIndex, 0, moved);
    setPrimaryOrder(updated);
  };

  const handlePrimaryDragEnd = () => {
    setPrimaryDraggingId(null);
  };

  // ----- Drag & drop: ADDITIONAL contacts (with grouping & persistence) -----

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

    // Current visual order
    const idOrder = additionalContacts.map((c, idx) => [c.id, idx] as const);
    const indexMap = new Map<string, number>(idOrder);

    // Group by kind (email → phone → url → custom),
    // keep relative order inside each kind from current UI.
    const grouped = [...additionalContacts].sort((a, b) => {
      const kDiff = kindOrder(a.kind) - kindOrder(b.kind);
      if (kDiff !== 0) return kDiff;
      return (indexMap.get(a.id) ?? 0) - (indexMap.get(b.id) ?? 0);
    });

    setAdditionalContacts(grouped);
    onAdditionalContactsChange?.(grouped);

    try {
      await Promise.all(
        grouped.map((contact, index) =>
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

  // ----- UI helpers -------------------------------------------------

  const getContactIcon = (kind: ContactKind) => {
    const commonProps = { className: "h-4 w-4", style: { color: primaryColor } };

    switch (kind) {
      case "email":
        return <Mail {...commonProps} />;
      case "phone":
        return <Phone {...commonProps} />;
      case "url":
        return <Globe {...commonProps} />;
      case "custom":
        return <MapPin {...commonProps} />;
      default:
        return null;
    }
  };

  const getPlaceholder = (kind: ContactKind | PrimaryField) => {
    switch (kind) {
      case "email":
        return "your@email.com";
      case "phone":
        return "+1 234 567 8900";
      case "url":
      case "website":
        return "https://yourwebsite.com";
      case "custom":
      case "location":
        return "City, Country";
      default:
        return "";
    }
  };

  const getInputType = (kind: ContactKind | PrimaryField) => {
    switch (kind) {
      case "email":
        return "email";
      case "phone":
        return "tel";
      case "url":
      case "website":
        return "url";
      default:
        return "text";
    }
  };

  const getPrimaryIcon = (field: PrimaryField) => {
    const commonProps = { className: "h-4 w-4", style: { color: primaryColor } };

    switch (field) {
      case "email":
        return <Mail {...commonProps} />;
      case "phone":
        return <Phone {...commonProps} />;
      case "website":
        return <Globe {...commonProps} />;
      case "location":
        return <MapPin {...commonProps} />;
      default:
        return null;
    }
  };

  const getPrimaryLabel = (field: PrimaryField) => {
    switch (field) {
      case "email":
        return "Email";
      case "phone":
        return "Phone";
      case "website":
        return "Website";
      case "location":
        return "Location";
      default:
        return "";
    }
  };

  const getPrimaryValue = (field: PrimaryField) => {
    switch (field) {
      case "email":
        return card.email || "";
      case "phone":
        return card.phone || "";
      case "website":
        return card.website || "";
      case "location":
        return card.location || "";
      default:
        return "";
    }
  };

  const setPrimaryValue = (field: PrimaryField, value: string) => {
    switch (field) {
      case "email":
        onCardChange({ email: value });
        break;
      case "phone":
        onCardChange({ phone: value });
        break;
      case "website":
        onCardChange({ website: value });
        break;
      case "location":
        onCardChange({ location: value });
        break;
    }
  };

  const getPrimaryError = (field: PrimaryField) => {
    switch (field) {
      case "email":
        return validationErrors.email;
      case "phone":
        return validationErrors.phone;
      case "website":
        return validationErrors.website;
      case "location":
        return validationErrors.location;
      default:
        return undefined;
    }
  };

  // ----- render -----------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Primary Contact Fields (now draggable rows) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">Contact Information</Label>
        <div className="space-y-2">
          {primaryOrder.map((field) => {
            const error = getPrimaryError(field);
            return (
              <div
                key={field}
                draggable
                onDragStart={() => handlePrimaryDragStart(field)}
                onDragOver={(e) => handlePrimaryDragOver(e, field)}
                onDragEnd={handlePrimaryDragEnd}
                className={`flex items-center gap-2 rounded-lg bg-muted/20 border border-border/40 px-2 py-1.5 cursor-grab ${
                  primaryDraggingId === field ? "ring-1 ring-primary/60 bg-muted/40" : ""
                }`}
              >
                {/* Drag handle */}
                <div className="flex items-center justify-center text-muted-foreground flex-shrink-0">
                  <GripVertical className="h-4 w-4 opacity-70" />
                </div>

                {/* Icon */}
                <div className="flex items-center justify-center flex-shrink-0">{getPrimaryIcon(field)}</div>

                {/* Label + input */}
                <div className="flex-1 flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">{getPrimaryLabel(field)}</span>
                  <Input
                    type={getInputType(field)}
                    value={getPrimaryValue(field)}
                    onChange={(e) => setPrimaryValue(field, e.target.value)}
                    placeholder={getPlaceholder(field)}
                    maxLength={field === "phone" ? 30 : 255}
                    className={`h-8 text-sm ${error ? "border-destructive" : ""}`}
                  />
                  {error && <p className="text-xs text-destructive mt-0.5">{error}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Contacts Section (drag, group by kind) */}
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
                <div className="flex-shrink-0">{getContactIcon(contact.kind)}</div>

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
            Drag rows to reorder. Emails, phones, websites, and locations for additional contacts stay grouped together.
            Changes and order are saved automatically.
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

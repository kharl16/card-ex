import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

interface ContactInformationSectionProps {
  card: CardData;
  validationErrors: Record<string, string>;
  onCardChange: (updates: Partial<CardData>) => void;
}

export function ContactInformationSection({
  card,
  validationErrors,
  onCardChange,
}: ContactInformationSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={card.email || ""}
          onChange={(e) => onCardChange({ email: e.target.value })}
          placeholder="your@email.com"
          maxLength={255}
          className={validationErrors.email ? "border-destructive" : ""}
        />
        {validationErrors.email && (
          <p className="text-sm text-destructive">{validationErrors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          value={card.phone || ""}
          onChange={(e) => onCardChange({ phone: e.target.value })}
          placeholder="+1 234 567 8900"
          maxLength={30}
          className={validationErrors.phone ? "border-destructive" : ""}
        />
        {validationErrors.phone && (
          <p className="text-sm text-destructive">{validationErrors.phone}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          type="url"
          value={card.website || ""}
          onChange={(e) => onCardChange({ website: e.target.value })}
          placeholder="https://yourwebsite.com"
          maxLength={255}
          className={validationErrors.website ? "border-destructive" : ""}
        />
        {validationErrors.website && (
          <p className="text-sm text-destructive">{validationErrors.website}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={card.location || ""}
          onChange={(e) => onCardChange({ location: e.target.value })}
          placeholder="City, Country"
          maxLength={200}
          className={validationErrors.location ? "border-destructive" : ""}
        />
        {validationErrors.location && (
          <p className="text-sm text-destructive">{validationErrors.location}</p>
        )}
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

interface BasicInformationSectionProps {
  card: CardData;
  validationErrors: Record<string, string>;
  onCardChange: (updates: Partial<CardData>) => void;
  onValidationErrorChange: (errors: Record<string, string>) => void;
}

// Validate name fields for special characters
const validateNameField = (value: string, fieldName: string): string | null => {
  const specialChars = /[^a-zA-Z\s\-'\.]/;
  if (specialChars.test(value)) {
    return `${fieldName} can only contain letters, spaces, hyphens, apostrophes, and periods`;
  }
  return null;
};

// Sanitize prefix/suffix to prevent vCard-breaking characters
const sanitizeNameField = (value: string): string => {
  return value
    .replace(/[;\n\r]/g, " ")
    .replace(/[\\,]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20);
};

// Generate formatted full name preview
const getFormattedName = (card: CardData): string => {
  const mainParts = [
    card.prefix?.trim(),
    card.first_name?.trim(),
    card.middle_name?.trim(),
    card.last_name?.trim(),
  ].filter((part) => part && part.length > 0) as string[];

  let name = mainParts.join(" ");

  if (card.suffix && card.suffix.trim()) {
    name = `${name}, ${card.suffix.trim()}`;
  }

  return name || "Enter your name above";
};

export function BasicInformationSection({
  card,
  validationErrors,
  onCardChange,
  onValidationErrorChange,
}: BasicInformationSectionProps) {
  const handleNameFieldChange = (
    field: string,
    value: string,
    shouldSanitize: boolean = false
  ) => {
    const processedValue = shouldSanitize ? sanitizeNameField(value) : value;
    const capitalized = processedValue.charAt(0).toUpperCase() + processedValue.slice(1);
    const error = validateNameField(capitalized, field.replace("_", " "));
    
    onValidationErrorChange({
      ...validationErrors,
      [field]: error || "",
    });
    
    onCardChange({ [field]: capitalized });
  };

  const clearAllNames = () => {
    onCardChange({
      prefix: "",
      first_name: "",
      middle_name: "",
      last_name: "",
      suffix: "",
    });
    onValidationErrorChange({
      ...validationErrors,
      prefix: "",
      first_name: "",
      middle_name: "",
      last_name: "",
      suffix: "",
    });
  };

  return (
    <div className="space-y-4">
      {/* Name Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Name * (Left to Right)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAllNames}
            className="h-8 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </div>

        {/* Name Preview */}
        <div className="text-sm text-muted-foreground mb-2 p-2 bg-muted/50 rounded-md">
          <span className="font-medium">Preview: </span>
          {getFormattedName(card)}
        </div>

        {/* Name Fields Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="space-y-1">
            <Label htmlFor="prefix" className="text-xs text-muted-foreground">
              Prefix
            </Label>
            <Input
              id="prefix"
              value={card.prefix || ""}
              onChange={(e) => handleNameFieldChange("prefix", e.target.value, true)}
              placeholder="Engr."
              maxLength={20}
              className={cn("text-sm", validationErrors.prefix && "border-destructive")}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="first_name" className="text-xs text-muted-foreground">
              First Name *
            </Label>
            <Input
              id="first_name"
              value={card.first_name || ""}
              onChange={(e) => handleNameFieldChange("first_name", e.target.value)}
              placeholder="Carl"
              maxLength={50}
              className={cn("text-sm", validationErrors.first_name && "border-destructive")}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="middle_name" className="text-xs text-muted-foreground">
              Middle Name
            </Label>
            <Input
              id="middle_name"
              value={card.middle_name || ""}
              onChange={(e) => handleNameFieldChange("middle_name", e.target.value)}
              placeholder="Ayala"
              maxLength={50}
              className={cn("text-sm", validationErrors.middle_name && "border-destructive")}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="last_name" className="text-xs text-muted-foreground">
              Last Name *
            </Label>
            <Input
              id="last_name"
              value={card.last_name || ""}
              onChange={(e) => handleNameFieldChange("last_name", e.target.value)}
              placeholder="Tamayao"
              maxLength={50}
              className={cn("text-sm", validationErrors.last_name && "border-destructive")}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="suffix" className="text-xs text-muted-foreground">
              Suffix
            </Label>
            <Input
              id="suffix"
              value={card.suffix || ""}
              onChange={(e) => handleNameFieldChange("suffix", e.target.value, true)}
              placeholder="V"
              maxLength={20}
              className={cn("text-sm", validationErrors.suffix && "border-destructive")}
            />
          </div>
        </div>

        {/* Name Validation Errors */}
        {(validationErrors.prefix ||
          validationErrors.first_name ||
          validationErrors.middle_name ||
          validationErrors.last_name ||
          validationErrors.suffix) && (
          <div className="space-y-1 text-sm text-destructive">
            {validationErrors.prefix && <p>{validationErrors.prefix}</p>}
            {validationErrors.first_name && <p>{validationErrors.first_name}</p>}
            {validationErrors.middle_name && <p>{validationErrors.middle_name}</p>}
            {validationErrors.last_name && <p>{validationErrors.last_name}</p>}
            {validationErrors.suffix && <p>{validationErrors.suffix}</p>}
          </div>
        )}
      </div>

      {/* Title & Company */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={card.title || ""}
            onChange={(e) => onCardChange({ title: e.target.value })}
            placeholder="e.g. CEO, Designer"
            maxLength={100}
            className={validationErrors.title ? "border-destructive" : ""}
          />
          {validationErrors.title && (
            <p className="text-sm text-destructive">{validationErrors.title}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            value={card.company || ""}
            onChange={(e) => onCardChange({ company: e.target.value })}
            maxLength={100}
            className={validationErrors.company ? "border-destructive" : ""}
          />
          {validationErrors.company && (
            <p className="text-sm text-destructive">{validationErrors.company}</p>
          )}
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={card.bio || ""}
          onChange={(e) => onCardChange({ bio: e.target.value })}
          rows={4}
          maxLength={500}
          className={validationErrors.bio ? "border-destructive" : ""}
        />
        {validationErrors.bio && (
          <p className="text-sm text-destructive">{validationErrors.bio}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {(card.bio?.length || 0)}/500 characters
        </p>
      </div>
    </div>
  );
}

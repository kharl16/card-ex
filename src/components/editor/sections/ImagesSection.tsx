import ImageUpload from "@/components/ImageUpload";
import type { Tables } from "@/integrations/supabase/types";
import type { CardTheme } from "@/lib/theme";

type CardData = Tables<"cards">;

interface ImagesSectionProps {
  card: CardData;
  onCardChange: (updates: Partial<CardData>) => void;
  theme?: CardTheme;
  onThemeChange?: (theme: CardTheme) => void;
}

export function ImagesSection({ card, onCardChange, theme, onThemeChange }: ImagesSectionProps) {
  const avatarDisplayMode = theme?.avatarDisplayMode || "contain";
  const logoDisplayMode = theme?.logoDisplayMode || "contain";

  const handleAvatarDisplayModeChange = (mode: "contain" | "cover") => {
    if (onThemeChange && theme) {
      onThemeChange({ ...theme, avatarDisplayMode: mode });
    }
  };

  const handleLogoDisplayModeChange = (mode: "contain" | "cover") => {
    if (onThemeChange && theme) {
      onThemeChange({ ...theme, logoDisplayMode: mode });
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <ImageUpload
        value={card.avatar_url}
        onChange={(url) => onCardChange({ avatar_url: url })}
        label="Avatar"
        aspectRatio="aspect-square"
        maxSize={5}
        showDisplayToggle
        displayMode={avatarDisplayMode}
        onDisplayModeChange={handleAvatarDisplayModeChange}
      />
      <ImageUpload
        value={card.logo_url}
        onChange={(url) => onCardChange({ logo_url: url })}
        label="Company Logo"
        aspectRatio="aspect-square"
        maxSize={2}
        showDisplayToggle
        displayMode={logoDisplayMode}
        onDisplayModeChange={handleLogoDisplayModeChange}
      />
      <ImageUpload
        value={card.cover_url}
        onChange={(url) => onCardChange({ cover_url: url })}
        label="Cover Photo"
        aspectRatio="aspect-square"
        maxSize={5}
      />
    </div>
  );
}

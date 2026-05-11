import { useMemo } from "react";
import { RotatingPhotoSlot } from "@/components/editor/RotatingPhotoSlot";
import {
  parseImageCarousels,
  type ImageCarouselsData,
} from "@/lib/imageCarousels";
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

  const carousels: ImageCarouselsData = useMemo(
    () => parseImageCarousels((card as any).image_carousels),
    [card]
  );

  const setCarousels = (next: ImageCarouselsData) => {
    onCardChange({ image_carousels: (next as any) });
  };

  const handleAvatarDisplayModeChange = (mode: "contain" | "cover") => {
    if (onThemeChange && theme) onThemeChange({ ...theme, avatarDisplayMode: mode });
  };

  const handleLogoDisplayModeChange = (mode: "contain" | "cover") => {
    if (onThemeChange && theme) onThemeChange({ ...theme, logoDisplayMode: mode });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-snug">
        Each slot starts with a single photo. Add more photos to enable a slow Ken Burns
        rotation — the first image (uploaded above) is always shown first.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <RotatingPhotoSlot
          slot="avatar"
          label="Profile Photo"
          primaryUrl={card.avatar_url}
          onPrimaryChange={(url) => onCardChange({ avatar_url: url })}
          carousels={carousels}
          onCarouselsChange={setCarousels}
          aspectRatio="aspect-square"
          maxSize={5}
          imageType="avatar"
          showDisplayToggle
          displayMode={avatarDisplayMode}
          onDisplayModeChange={handleAvatarDisplayModeChange}
        />

        <RotatingPhotoSlot
          slot="logo"
          label="Company Logo"
          primaryUrl={card.logo_url}
          onPrimaryChange={(url) => onCardChange({ logo_url: url })}
          carousels={carousels}
          onCarouselsChange={setCarousels}
          aspectRatio="aspect-square"
          maxSize={2}
          imageType="logo"
          showDisplayToggle
          displayMode={logoDisplayMode}
          onDisplayModeChange={handleLogoDisplayModeChange}
        />

        <RotatingPhotoSlot
          slot="cover"
          label="Cover Photo"
          primaryUrl={card.cover_url}
          onPrimaryChange={(url) => onCardChange({ cover_url: url })}
          carousels={carousels}
          onCarouselsChange={setCarousels}
          aspectRatio="aspect-video"
          maxSize={5}
          imageType="cover"
        />
      </div>
    </div>
  );
}

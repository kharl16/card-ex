import { useState } from "react";
import ImageUpload from "@/components/ImageUpload";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

interface ImagesSectionProps {
  card: CardData;
  onCardChange: (updates: Partial<CardData>) => void;
}

export function ImagesSection({ card, onCardChange }: ImagesSectionProps) {
  const [avatarDisplayMode, setAvatarDisplayMode] = useState<"contain" | "cover">("contain");
  const [logoDisplayMode, setLogoDisplayMode] = useState<"contain" | "cover">("contain");

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
        onDisplayModeChange={setAvatarDisplayMode}
      />
      <ImageUpload
        value={card.logo_url}
        onChange={(url) => onCardChange({ logo_url: url })}
        label="Company Logo"
        aspectRatio="aspect-square"
        maxSize={2}
        showDisplayToggle
        displayMode={logoDisplayMode}
        onDisplayModeChange={setLogoDisplayMode}
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

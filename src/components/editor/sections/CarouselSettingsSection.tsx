import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateVariant } from "@/lib/theme";
import type { Tables } from "@/integrations/supabase/types";
import type { CardTheme, ThemeVariant } from "@/lib/theme";

type CardData = Tables<"cards">;

interface CarouselSettingsSectionProps {
  card: CardData;
  onCardChange: (updates: Partial<CardData>) => void;
}

export function CarouselSettingsSection({ card, onCardChange }: CarouselSettingsSectionProps) {
  const theme = ((card.theme ?? {}) as unknown) as CardTheme;
  const activeVariant = theme.activeVariant || "A";
  const variant = (theme.variants?.[activeVariant] ?? {}) as ThemeVariant;
  const currentSpeed = variant.carouselSpeed ?? theme.carouselSpeed ?? 4000;

  const handleSpeedChange = (value: string) => {
    const newSpeed = parseInt(value) || 4000;
    
    // Update the active variant (if variants exist) AND top-level for backward compatibility
    if (theme.variants && theme.primary) {
      const updatedTheme = updateVariant(theme as CardTheme, activeVariant, { carouselSpeed: newSpeed });
      // Also set top-level for backward compatibility
      updatedTheme.carouselSpeed = newSpeed;
      onCardChange({ theme: updatedTheme as any });
    } else {
      // Legacy: no variants, just update top-level
      const updatedTheme = {
        ...theme,
        carouselSpeed: newSpeed,
      };
      onCardChange({ theme: updatedTheme as any });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="carouselSpeed">Auto-play Speed (ms)</Label>
        <Input
          id="carouselSpeed"
          type="number"
          min="1000"
          max="10000"
          step="500"
          value={currentSpeed}
          onChange={(e) => handleSpeedChange(e.target.value)}
          placeholder="4000"
        />
        <p className="text-xs text-muted-foreground">
          Time between slides (1000 = 1 second). Default: 4000ms
        </p>
      </div>

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Tip:</strong> The carousel displays your product images in a continuous loop. 
          Add images in the "Product Images" section above to see them in action.
        </p>
      </div>
    </div>
  );
}

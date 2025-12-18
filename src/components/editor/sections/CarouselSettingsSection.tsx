import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  
  const currentSpeed = variant.carouselSpeedMs ?? variant.carouselSpeed ?? 4000;
  const currentMode = variant.carouselMode ?? "roulette";
  const currentDepth = variant.carouselDepth ?? "medium";
  const currentAutoPlay = variant.carouselAutoPlay ?? true;
  const currentSpotlight = variant.carouselSpotlight ?? true;

  const handleUpdate = (updates: Partial<ThemeVariant>) => {
    if (theme.variants && theme.primary) {
      const updatedTheme = updateVariant(theme as CardTheme, activeVariant, updates);
      onCardChange({ theme: updatedTheme as any });
    } else {
      const updatedTheme = { ...theme, ...updates };
      onCardChange({ theme: updatedTheme as any });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="carouselMode">Carousel Style</Label>
          <Select value={currentMode} onValueChange={(v) => handleUpdate({ carouselMode: v as any })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="roulette">Roulette – 3D strip with momentum</SelectItem>
              <SelectItem value="ring3d">3D Ring – hero showcase</SelectItem>
              <SelectItem value="flat">Simple strip – clean swipeable row</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Autoplay</Label>
            <p className="text-xs text-muted-foreground">Automatically cycle through images</p>
          </div>
          <Switch checked={currentAutoPlay} onCheckedChange={(v) => handleUpdate({ carouselAutoPlay: v })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="carouselSpeed">Autoplay Speed (ms)</Label>
          <Input
            id="carouselSpeed"
            type="number"
            min="500"
            max="10000"
            step="100"
            value={currentSpeed}
            onChange={(e) => handleUpdate({ carouselSpeedMs: parseInt(e.target.value) || 4000 })}
            placeholder="4000"
          />
          <p className="text-xs text-muted-foreground">Time between slides (500-10000ms)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="carouselDepth">3D Depth</Label>
          <Select value={currentDepth} onValueChange={(v) => handleUpdate({ carouselDepth: v as any })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="soft">Soft</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="strong">Strong</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Controls 3D effect intensity</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Spotlight Stage</Label>
            <p className="text-xs text-muted-foreground">Adds twin spotlights and boosts center brightness</p>
          </div>
          <Switch checked={currentSpotlight} onCheckedChange={(v) => handleUpdate({ carouselSpotlight: v })} />
        </div>
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

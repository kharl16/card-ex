import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Sparkles, Link } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
type CardData = Tables<"cards">;
interface CustomUrlSectionProps {
  card: CardData;
  validationErrors: Record<string, string>;
  onCardChange: (updates: Partial<CardData>) => void;
}
export function CustomUrlSection({
  card,
  validationErrors,
  onCardChange
}: CustomUrlSectionProps) {
  return <div className="space-y-4">
      {/* Premium Feature Banner */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/30">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-[#D4AF37] mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-foreground">Premium Add-on</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Personalize your short URL for easier sharing and better branding.
            </p>
          </div>
        </div>
      </div>

      {/* Custom Slug Input */}
      <div className="space-y-2">
        <Label htmlFor="custom_slug">Custom Short URL</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Link className="h-3 w-3" />
            tagex.app/
          </span>
          <Input id="custom_slug" value={card.custom_slug || ""} onChange={e => onCardChange({
          custom_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")
        })} placeholder="your-name" maxLength={50} className={cn("flex-1", validationErrors.custom_slug && "border-destructive")} />
        </div>
        {validationErrors.custom_slug && <p className="text-xs text-destructive">{validationErrors.custom_slug}</p>}
        {card.custom_slug && <p className="text-xs text-[#D4AF37]">
            ✓ Your custom URL: tagex.app/{card.custom_slug}
          </p>}
        {!card.custom_slug && <p className="text-xs text-muted-foreground">
            Leave empty to use the default URL with /c/ prefix
          </p>}
      </div>

      {/* Default Slug Display */}
      
    </div>;
}
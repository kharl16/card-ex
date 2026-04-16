import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useGlobalProductImages } from "@/hooks/useGlobalProductImages";

interface Props {
  cardId: string;
}

/**
 * Lets a card owner toggle which global product photos appear on their card.
 * Hidden globals stay hidden for this card only; admins still control the source list.
 */
export default function GlobalProductsManager({ cardId }: Props) {
  const { allGlobals, hiddenIds, loading, reload } = useGlobalProductImages(cardId);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggle(globalImageId: string) {
    setBusyId(globalImageId);
    if (hiddenIds.has(globalImageId)) {
      // Currently hidden → show again by removing override
      const { error } = await supabase
        .from("card_global_image_overrides")
        .delete()
        .eq("card_id", cardId)
        .eq("global_image_id", globalImageId);
      if (error) toast.error(error.message);
      else toast.success("Photo will show on your card");
    } else {
      // Currently visible → hide by inserting override
      const { error } = await supabase
        .from("card_global_image_overrides")
        .insert({ card_id: cardId, global_image_id: globalImageId });
      if (error) toast.error(error.message);
      else toast.success("Photo hidden from your card");
    }
    await reload();
    setBusyId(null);
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading shared photos…</div>;
  if (allGlobals.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold">Shared Product Photos</h3>
        <p className="text-sm text-muted-foreground">
          These photos appear on every card by default. Hide any you don't want on your card.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {allGlobals.map((g) => {
          const hidden = hiddenIds.has(g.id);
          return (
            <div
              key={g.id}
              className={`group relative rounded-lg border bg-card p-2 transition ${
                hidden ? "border-border/40 opacity-60" : "border-primary/40"
              }`}
            >
              <img src={g.url} alt={g.caption ?? ""} className="h-28 w-full rounded object-cover" />
              {g.caption && <p className="mt-1 truncate text-xs text-muted-foreground">{g.caption}</p>}
              <Button
                size="sm"
                variant={hidden ? "outline" : "secondary"}
                disabled={busyId === g.id}
                onClick={() => toggle(g.id)}
                className="mt-2 w-full"
              >
                {hidden ? (
                  <>
                    <Eye className="mr-1 h-3 w-3" /> Show on my card
                  </>
                ) : (
                  <>
                    <EyeOff className="mr-1 h-3 w-3" /> Hide from my card
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

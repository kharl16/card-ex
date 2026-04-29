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
              className={`group relative overflow-hidden rounded-lg border bg-card transition ${
                hidden ? "border-border/40 opacity-60" : "border-primary/40"
              }`}
            >
              <div className="relative">
                <img
                  src={g.url}
                  alt={g.caption ?? ""}
                  className="h-28 w-full object-cover"
                />
                <button
                  type="button"
                  disabled={busyId === g.id}
                  onClick={() => toggle(g.id)}
                  aria-label={hidden ? "Show on my card" : "Hide from my card"}
                  title={hidden ? "Show on my card" : "Hide from my card"}
                  className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur-sm transition hover:bg-background disabled:opacity-50"
                >
                  {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="p-2">
                {g.caption && (
                  <p className="mb-1 truncate text-xs text-muted-foreground">{g.caption}</p>
                )}
                <p className="text-[11px] font-medium text-muted-foreground">
                  {hidden ? "Hidden on your card" : "Showing on your card"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

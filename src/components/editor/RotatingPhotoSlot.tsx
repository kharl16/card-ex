import { useMemo } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, Plus, Sparkles, X } from "lucide-react";
import {
  IMAGE_CAROUSEL_DEFAULT_AUTOPLAY,
  IMAGE_CAROUSEL_MAX_ITEMS,
  type ImageCarouselItem,
  type ImageCarouselSet,
  type ImageCarouselSlot,
  type ImageCarouselsData,
} from "@/lib/imageCarousels";
import type { ImageType } from "@/components/media/EnhancedImageEditorDialog";

interface RotatingPhotoSlotProps {
  slot: ImageCarouselSlot;
  label: string;
  primaryUrl: string | null;
  onPrimaryChange: (url: string | null) => void;
  carousels: ImageCarouselsData;
  onCarouselsChange: (next: ImageCarouselsData) => void;
  aspectRatio?: string;
  maxSize?: number;
  imageType: ImageType;
  /** Optional display-mode toggle plumbing (avatar/logo). */
  displayMode?: "contain" | "cover";
  onDisplayModeChange?: (mode: "contain" | "cover") => void;
  showDisplayToggle?: boolean;
}

/**
 * RotatingPhotoSlot
 *
 * Wraps the existing single-image `ImageUpload` (kept as the primary photo
 * stored on `cards.<slot>_url`) and adds a UI for managing additional photos
 * that rotate via Ken Burns crossfade. Extra photos live in the new
 * `cards.image_carousels` JSONB column under `carousels[slot].items`.
 */
export function RotatingPhotoSlot({
  slot,
  label,
  primaryUrl,
  onPrimaryChange,
  carousels,
  onCarouselsChange,
  aspectRatio = "aspect-square",
  maxSize = 5,
  imageType,
  displayMode,
  onDisplayModeChange,
  showDisplayToggle,
}: RotatingPhotoSlotProps) {
  const set: ImageCarouselSet = useMemo(
    () =>
      carousels[slot] ?? {
        items: [],
        autoPlayMs: IMAGE_CAROUSEL_DEFAULT_AUTOPLAY,
      },
    [carousels, slot]
  );

  // Effective list shown to the user = primary (if set) + extra items
  const totalImages = (primaryUrl ? 1 : 0) + set.items.length;
  const canAddMore = totalImages < IMAGE_CAROUSEL_MAX_ITEMS;

  const writeSet = (next: Partial<ImageCarouselSet>) => {
    const merged: ImageCarouselSet = {
      items: next.items ?? set.items,
      autoPlayMs: next.autoPlayMs ?? set.autoPlayMs ?? IMAGE_CAROUSEL_DEFAULT_AUTOPLAY,
    };
    const updated: ImageCarouselsData = { ...carousels };
    if (merged.items.length === 0) {
      delete updated[slot];
    } else {
      updated[slot] = merged;
    }
    onCarouselsChange(updated);
  };

  const addItem = (url: string | null) => {
    if (!url) return;
    if (totalImages >= IMAGE_CAROUSEL_MAX_ITEMS) return;
    writeSet({ items: [...set.items, { url }] });
  };

  const removeItem = (idx: number) => {
    writeSet({ items: set.items.filter((_, i) => i !== idx) });
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const next = [...set.items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    writeSet({ items: next });
  };

  return (
    <div className="space-y-3">
      {/* Primary single-image uploader (legacy column) */}
      <ImageUpload
        value={primaryUrl}
        onChange={onPrimaryChange}
        label={label}
        aspectRatio={aspectRatio}
        maxSize={maxSize}
        imageType={imageType}
        showDisplayToggle={showDisplayToggle}
        displayMode={displayMode}
        onDisplayModeChange={onDisplayModeChange}
      />

      {/* Extra rotating photos */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs font-medium truncate">
              Rotating photos ({totalImages}/{IMAGE_CAROUSEL_MAX_ITEMS})
            </span>
          </div>
          {set.items.length > 0 && (
            <Select
              value={String(set.autoPlayMs ?? IMAGE_CAROUSEL_DEFAULT_AUTOPLAY)}
              onValueChange={(v) => writeSet({ autoPlayMs: Number(v) })}
            >
              <SelectTrigger className="h-7 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Off</SelectItem>
                <SelectItem value="3000">3s</SelectItem>
                <SelectItem value="5000">5s</SelectItem>
                <SelectItem value="7000">7s</SelectItem>
                <SelectItem value="10000">10s</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Thumbnails of extra items — one per row */}
        {set.items.length > 0 && (
          <div className="space-y-2">
            {set.items.map((item, idx) => (
              <ExtraThumb
                key={`${item.url}-${idx}`}
                item={item}
                idx={idx}
                isFirst={idx === 0}
                isLast={idx === set.items.length - 1}
                onRemove={() => removeItem(idx)}
                onUp={() => moveItem(idx, -1)}
                onDown={() => moveItem(idx, 1)}
              />
            ))}
          </div>
        )}

        {/* Add another photo */}
        {canAddMore ? (
          <ImageUpload
            value={null}
            onChange={addItem}
            label={
              set.items.length === 0 && primaryUrl
                ? "Add a 2nd photo to start rotating"
                : "Add another rotation photo"
            }
            aspectRatio={aspectRatio}
            maxSize={maxSize}
            imageType={imageType}
            folderPrefix={`carousel-${slot}`}
          />
        ) : (
          <p className="text-[11px] text-muted-foreground text-center">
            Maximum {IMAGE_CAROUSEL_MAX_ITEMS} photos reached.
          </p>
        )}
      </div>
    </div>
  );
}

function ExtraThumb({
  item,
  idx,
  isFirst,
  isLast,
  onRemove,
  onUp,
  onDown,
}: {
  item: ImageCarouselItem;
  idx: number;
  isFirst: boolean;
  isLast: boolean;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background p-2">
      {/* Thumbnail */}
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
        <img
          src={item.url}
          alt={`Photo ${idx + 2}`}
          className="h-full w-full object-cover"
          draggable={false}
        />
        <span className="absolute bottom-0 left-0 rounded-tr-md bg-black/70 px-1 py-0.5 text-[10px] font-medium text-white">
          #{idx + 2}
        </span>
      </div>

      {/* Reorder controls */}
      <div className="flex flex-1 items-center gap-1">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
          disabled={isFirst}
          onClick={onUp}
          title="Move earlier"
          aria-label="Move earlier"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
          disabled={isLast}
          onClick={onDown}
          title="Move later"
          aria-label="Move later"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      </div>

      {/* Remove button beside the thumbnail */}
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-destructive/90 text-white shadow hover:bg-destructive active:scale-95 transition-all"
        onClick={onRemove}
        title="Remove photo"
        aria-label="Remove photo"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

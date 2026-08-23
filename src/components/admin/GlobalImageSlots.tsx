import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadOptimizedFile, getRenderUrl } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ImagePlus, Trash2 } from "lucide-react";

const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp"];

interface Props {
  table: "global_product_images" | "global_package_images";
  rowId: string;
  url: string;
  url2: string | null;
  caption: string | null;
  isActive: boolean;
  kind: "product" | "package";
  folder: string;
  onChanged: () => void | Promise<void>;
}

/**
 * Two-photo slot manager (main + alternate angle) for global photo rows.
 * Lets super admins replace or remove a single photo without touching the
 * caption / SRP details stored on the same row.
 */
export default function GlobalImageSlots({
  table,
  rowId,
  url,
  url2,
  caption,
  isActive,
  kind,
  folder,
  onChanged,
}: Props) {
  const [slot, setSlot] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const current = slot === 1 ? url : url2;

  async function save(value: string | null) {
    const patch = slot === 1 ? { url: value } : { url_2: value };
    const { error } = await supabase.from(table).update(patch as never).eq("id", rowId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(value ? "Photo updated" : "Photo removed");
    await onChanged();
  }

  async function onPick(file: File | undefined) {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      toast.error("Only JPEG, PNG, GIF, or WebP allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Max file size is 10MB");
      return;
    }
    setBusy(true);
    try {
      const { publicUrl } = await uploadOptimizedFile(file, { bucket: "media", folder, kind });
      await save(publicUrl);
    } catch (e) {
      toast.error(`Upload failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onRemove() {
    if (slot === 1) {
      if (url2) {
        // Promote the alternate photo so the row always has a main image.
        setBusy(true);
        const { error } = await supabase
          .from(table)
          .update({ url: url2, url_2: null } as never)
          .eq("id", rowId);
        setBusy(false);
        if (error) return toast.error(error.message);
        toast.success("Photo removed");
        setSlot(1);
        await onChanged();
        return;
      }
      toast.error("Add a second photo first, or delete the whole item.");
      return;
    }
    setBusy(true);
    await save(null);
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        {current ? (
          <img
            src={getRenderUrl(current, kind, "thumb")}
            alt={caption ?? ""}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No alternate photo yet
          </div>
        )}
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white">
            HIDDEN GLOBALLY
          </div>
        )}
        <div className="absolute left-1.5 top-1.5 flex gap-1 rounded-full bg-background/85 p-0.5 backdrop-blur-sm">
          {([1, 2] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSlot(s)}
              className={`h-6 min-w-6 rounded-full px-2 text-[11px] font-semibold transition ${
                slot === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
              aria-label={s === 1 ? "Main photo" : "Alternate angle"}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="mr-1 h-4 w-4" />
          {current ? "Replace" : "Add"} photo {slot}
        </Button>
        <Button size="sm" variant="outline" disabled={busy || !current} onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Eye, EyeOff, Sparkles, Loader2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Row = {
  id: string;
  url: string;
  caption: string | null;
  
  sort_index: number;
  is_active: boolean;
};

const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export default function AdminGlobalTestimonies() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [bulkExtracting, setBulkExtracting] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [captionInput, setCaptionInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("global_testimony_images")
      .select("id,url,caption,sort_index,is_active")
      .order("sort_index", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Admin access required");
      navigate("/dashboard");
    }
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  async function uploadFile(file: File): Promise<string | null> {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Only JPEG, PNG, GIF, or WebP allowed");
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Max file size is 10MB");
      return null;
    }
    const path = `global-testimonies/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("media").upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      return null;
    }
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  async function addRow(url: string, caption: string) {
    if (!user) return;
    const nextSort = rows.length ? Math.max(...rows.map((r) => r.sort_index)) + 1 : 0;
    const { error } = await supabase.from("global_testimony_images").insert({
      url,
      caption: caption.trim() || null,
      sort_index: nextSort,
      is_active: true,
      created_by: user.id,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Global package added — visible on all cards");
      await load();
    }
  }

  async function onFileChoose(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    for (const f of Array.from(files)) {
      const url = await uploadFile(f);
      if (url) await addRow(url, "");
    }
    setBusy(false);
  }

  async function onAddUrl() {
    if (!urlInput.trim()) return;
    setBusy(true);
    await addRow(urlInput.trim(), captionInput);
    setUrlInput("");
    setCaptionInput("");
    setBusy(false);
  }

  async function toggleActive(row: Row) {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: !r.is_active } : r)));
    const { error } = await supabase
      .from("global_testimony_images")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: row.is_active } : r)));
    }
  }

  async function remove(row: Row) {
    if (!confirm("Remove this package from ALL cards? This cannot be undone.")) return;
    const prev = rows;
    setRows((p) => p.filter((r) => r.id !== row.id));
    const { error } = await supabase.from("global_testimony_images").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      setRows(prev);
    } else {
      toast.success("Removed");
    }
  }

  async function updateCaption(row: Row, caption: string) {
    const newCaption = caption.trim() || null;
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, caption: newCaption } : r)));
    const { error } = await supabase
      .from("global_testimony_images")
      .update({ caption: newCaption })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, caption: row.caption } : r)));
    }
  }

  async function extractCaption(row: Row, opts: { silent?: boolean; overwrite?: boolean } = {}): Promise<string | null> {
    if (!opts.overwrite && row.caption && row.caption.trim()) return row.caption;
    try {
      const { data, error } = await supabase.functions.invoke("extract-testimony-caption", {
        body: { imageUrl: row.url },
      });
      if (error) throw error;
      const caption = (data?.caption ?? "").trim();
      if (!caption) {
        if (!opts.silent) toast.warning("No condition text detected in image");
        return null;
      }
      const { error: upErr } = await supabase
        .from("global_testimony_images")
        .update({ caption })
        .eq("id", row.id);
      if (upErr) throw upErr;
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, caption } : r)));
      if (!opts.silent) toast.success(`Caption set: ${caption}`);
      return caption;
    } catch (e: any) {
      if (!opts.silent) toast.error(`Extract failed: ${e.message ?? e}`);
      return null;
    }
  }

  async function onExtractOne(row: Row) {
    setExtractingId(row.id);
    await extractCaption(row, { overwrite: true });
    setExtractingId(null);
  }

  async function onExtractAllMissing() {
    const targets = rows.filter((r) => !r.caption || !r.caption.trim());
    if (targets.length === 0) {
      toast.info("All rows already have captions");
      return;
    }
    if (!confirm(`Auto-caption ${targets.length} image(s) with no caption? This calls AI vision for each.`)) return;
    setBulkExtracting(true);
    let ok = 0;
    let miss = 0;
    for (const r of targets) {
      setExtractingId(r.id);
      const result = await extractCaption(r, { silent: true });
      if (result) ok++;
      else miss++;
    }
    setExtractingId(null);
    setBulkExtracting(false);
    toast.success(`Done: ${ok} captioned, ${miss} skipped/failed`);
  }

  async function persistOrder(ordered: Row[]) {
    // Reassign sort_index sequentially and persist any that changed.
    const updates = ordered
      .map((r, idx) => ({ r, idx }))
      .filter(({ r, idx }) => r.sort_index !== idx);
    if (updates.length === 0) return;
    const results = await Promise.all(
      updates.map(({ r, idx }) =>
        supabase.from("global_testimony_images").update({ sort_index: idx }).eq("id", r.id)
      )
    );
    const firstErr = results.find((res) => res.error)?.error;
    if (firstErr) {
      toast.error(`Reorder failed: ${firstErr.message}`);
      await load();
    } else {
      setRows(ordered.map((r, idx) => ({ ...r, sort_index: idx })));
    }
  }

  function reorder(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || toIdx >= rows.length) return;
    const next = arrayMove(rows, fromIdx, toIdx);
    setRows(next);
    void persistOrder(next);
  }

  function move(row: Row, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.id === row.id);
    if (idx < 0) return;
    reorder(idx, idx + dir);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = rows.findIndex((r) => r.id === active.id);
    const to = rows.findIndex((r) => r.id === over.id);
    reorder(from, to);
  }

  if (authLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Global Testimony Photos</h1>
          <p className="text-sm text-muted-foreground">
            Upload package photos here once and they appear on every card automatically. Card owners can choose to hide
            specific packages on their own card.
          </p>
        </div>
        <Button onClick={onExtractAllMissing} disabled={bulkExtracting || loading} variant="outline">
          {bulkExtracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Auto-caption missing
        </Button>
      </div>

      <div className="mb-8 rounded-xl border border-border bg-card p-4 space-y-4">
        <div>
          <Label>Upload images (JPEG/PNG/GIF/WebP, max 10MB each)</Label>
          <Input type="file" accept="image/*" multiple disabled={busy} onChange={(e) => onFileChoose(e.target.files)} />
        </div>
        <div className="space-y-2">
          <Label>…or add by URL</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="https://…"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={busy}
            />
            <Input
              placeholder="Caption (e.g. Customer name or quote)"
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              disabled={busy}
              className="sm:max-w-xs"
            />
            <Button onClick={onAddUrl} disabled={busy || !urlInput.trim()}>
              Add
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No global testimonys yet. Upload one above and it will appear on every card.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={rows.map((r) => r.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((r, i) => (
                <SortableCard
                  key={r.id}
                  row={r}
                  index={i}
                  total={rows.length}
                  extractingId={extractingId}
                  bulkExtracting={bulkExtracting}
                  onMove={move}
                  onToggleActive={toggleActive}
                  onExtractOne={onExtractOne}
                  onRemove={remove}
                  onUpdateCaption={updateCaption}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

interface SortableCardProps {
  row: Row;
  index: number;
  total: number;
  extractingId: string | null;
  bulkExtracting: boolean;
  onMove: (row: Row, dir: -1 | 1) => void;
  onToggleActive: (row: Row) => void;
  onExtractOne: (row: Row) => void;
  onRemove: (row: Row) => void;
  onUpdateCaption: (row: Row, caption: string) => void;
}

function SortableCard({
  row: r,
  index: i,
  total,
  extractingId,
  bulkExtracting,
  onMove,
  onToggleActive,
  onExtractOne,
  onRemove,
  onUpdateCaption,
}: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: r.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-border bg-card p-3 space-y-2"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        <img src={r.url} alt={r.caption ?? ""} className="h-full w-full object-cover" />
        {!r.is_active && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white">
            HIDDEN GLOBALLY
          </div>
        )}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          title="Drag to reorder"
          className="absolute left-1.5 top-1.5 inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur-sm transition hover:bg-background active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <Input
        defaultValue={r.caption ?? ""}
        placeholder="Caption"
        onBlur={(e) => {
          if (e.target.value !== (r.caption ?? "")) onUpdateCaption(r, e.target.value);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onMove(r, -1)} disabled={i === 0}>
          ↑
        </Button>
        <Button size="sm" variant="outline" onClick={() => onMove(r, 1)} disabled={i === total - 1}>
          ↓
        </Button>
        <Button size="sm" variant="outline" onClick={() => onToggleActive(r)}>
          {r.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onExtractOne(r)}
          disabled={extractingId === r.id || bulkExtracting}
          title="Auto-caption from image (AI vision)"
        >
          {extractingId === r.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onRemove(r)} className="ml-auto">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
    </div>
  );
}

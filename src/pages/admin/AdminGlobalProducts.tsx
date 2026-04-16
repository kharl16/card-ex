import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Eye, EyeOff } from "lucide-react";

type Row = {
  id: string;
  url: string;
  caption: string | null;
  sort_index: number;
  is_active: boolean;
};

const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export default function AdminGlobalProducts() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [captionInput, setCaptionInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("global_product_images")
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
    const path = `global-products/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("media").upload(path, file, {
      cacheControl: "3600",
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
    const { error } = await supabase.from("global_product_images").insert({
      url,
      caption: caption.trim() || null,
      sort_index: nextSort,
      is_active: true,
      created_by: user.id,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Global photo added — visible on all cards");
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
    const { error } = await supabase
      .from("global_product_images")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else await load();
  }

  async function remove(row: Row) {
    if (!confirm("Remove this photo from ALL cards? This cannot be undone.")) return;
    const { error } = await supabase.from("global_product_images").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      await load();
    }
  }

  async function updateCaption(row: Row, caption: string) {
    const { error } = await supabase
      .from("global_product_images")
      .update({ caption: caption.trim() || null })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else await load();
  }

  async function move(row: Row, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.id === row.id);
    const swap = rows[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("global_product_images").update({ sort_index: swap.sort_index }).eq("id", row.id),
      supabase.from("global_product_images").update({ sort_index: row.sort_index }).eq("id", swap.id),
    ]);
    await load();
  }

  if (authLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Global Product Photos</h1>
        <p className="text-sm text-muted-foreground">
          Upload product photos here once and they appear on every card automatically. Card owners can choose to hide
          specific photos on their own card.
        </p>
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
              placeholder="Caption (optional)"
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
          No global photos yet. Upload one above and it will appear on every card.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r, i) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                <img src={r.url} alt={r.caption ?? ""} className="h-full w-full object-cover" />
                {!r.is_active && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white">
                    HIDDEN GLOBALLY
                  </div>
                )}
              </div>
              <Input
                defaultValue={r.caption ?? ""}
                placeholder="Caption"
                onBlur={(e) => {
                  if (e.target.value !== (r.caption ?? "")) updateCaption(r, e.target.value);
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => move(r, -1)} disabled={i === 0}>
                  ↑
                </Button>
                <Button size="sm" variant="outline" onClick={() => move(r, 1)} disabled={i === rows.length - 1}>
                  ↓
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive(r)}>
                  {r.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => remove(r)} className="ml-auto">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

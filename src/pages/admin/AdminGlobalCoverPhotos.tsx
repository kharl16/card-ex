import { GlobalOrderControls } from "@/components/admin/GlobalOrderControls";
import { getGlobalInsertIndex, moveGlobalItem } from "@/lib/globalOrdering";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageBackButton } from "@/components/PageBackButton";
import AdminPhotoUploader from "@/components/admin/AdminPhotoUploader";
import { getRenderUrl, uploadOptimizedFile } from "@/lib/images";

type Row = {
  id: string;
  url: string;
  title: string | null;
  sort_index: number;
  is_active: boolean;
};

const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function AdminGlobalCoverPhotos() {
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("global_cover_photos")
      .select("id,url,title,sort_index,is_active")
      .order("sort_index", { ascending: true }).order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) {
      toast.error("Super admin access required");
      navigate("/dashboard");
      return;
    }
    void load();
  }, [authLoading, isSuperAdmin, navigate, load]);

  const onFilesSelected = async (files: FileList | null) => {
    if (!files?.length || !user) return;
    setBusy(true);
    let added = 0;

    for (const file of Array.from(files)) {
      if (!ALLOWED.includes(file.type)) {
        toast.error(`${file.name}: only JPEG, PNG, GIF, or WebP is allowed`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: maximum file size is 10MB`);
        continue;
      }

      try {
        const { publicUrl } = await uploadOptimizedFile(file, {
          bucket: "media",
          folder: "global-cover-photos",
          kind: "cover",
        });
        const { error } = await supabase.from("global_cover_photos").insert({
          url: publicUrl,
          title: uploadTitle.trim() || null,
          sort_index: await getGlobalInsertIndex("global_cover_photos"),
          is_active: true,
          created_by: user.id,
        });
        if (error) throw error;
        added += 1;
      } catch (error) {
        toast.error(`${file.name}: ${(error as Error).message || "Upload failed"}`);
      }
    }

    setBusy(false);
    if (added > 0) {
      setUploadTitle("");
      toast.success(`${added} cover photo${added === 1 ? "" : "s"} added to every card's Videos carousel`);
      await load();
    }
  };

  const update = async (id: string, patch: Partial<Pick<Row, "title" | "is_active">>) => {
    const { error } = await supabase.from("global_cover_photos").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else await load();
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const ordered = [...rows];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setRows(ordered.map((row, i) => ({ ...row, sort_index: i })));

    const results = await Promise.all(
      ordered.map((row, i) =>
        supabase.from("global_cover_photos").update({ sort_index: i }).eq("id", row.id)
      )
    );
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      toast.error(failed.error.message);
      await load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this cover photo from every card's Videos carousel?")) return;
    const { error } = await supabase.from("global_cover_photos").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Cover photo removed");
      await load();
    }
  };

  if (authLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
        <div className="flex items-start gap-3">
          <PageBackButton to="/admin/cards" />
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Global Cover Photos</h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Uploaded photos appear as photo slides in the Videos carousel on every member's Actual Card.
              They do not replace each card's main cover photo.
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-primary/40 bg-card p-4">
          <div className="space-y-1.5">
            <Label htmlFor="global-cover-title">Title for the next upload (optional)</Label>
            <Input
              id="global-cover-title"
              className="h-12 text-base"
              value={uploadTitle}
              onChange={(event) => setUploadTitle(event.target.value)}
              maxLength={120}
              disabled={busy}
              placeholder="Company cover photo"
            />
          </div>
          <AdminPhotoUploader busy={busy} onFilesSelected={onFilesSelected} label="Upload cover photos" />
        </div>

        {loading ? (
          <p className="py-8 text-center text-muted-foreground">Loading cover photos…</p>
        ) : rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
            No global cover photos yet. Upload one above to show it on every card.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row, index) => (
              <div key={row.id} className="space-y-3 rounded-2xl border border-primary/30 bg-card p-3">
                <div className="aspect-video overflow-hidden rounded-xl bg-muted">
                  <img
                    src={getRenderUrl(row.url, "cover", "default")}
                    alt={row.title || `Global cover photo ${index + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <Input
                  defaultValue={row.title ?? ""}
                  placeholder="Title (optional)"
                  className="h-11"
                  maxLength={120}
                  onBlur={(event) => {
                    const title = event.target.value.trim() || null;
                    if (title !== row.title) void update(row.id, { title });
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <GlobalOrderControls index={index} total={rows.length} disabled={busy} onMove={(dir) => void move(index, dir)} />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-11 gap-1.5"
                    onClick={() => void update(row.id, { is_active: !row.is_active })}
                  >
                    {row.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {row.is_active ? "Showing" : "Hidden"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-11 gap-1.5 text-destructive"
                    onClick={() => void remove(row.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

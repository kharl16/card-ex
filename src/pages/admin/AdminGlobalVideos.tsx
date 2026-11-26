import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from "lucide-react";
import { PageBackButton } from "@/components/PageBackButton";
import { getThumbnailUrl, parseVideoUrl } from "@/lib/videoUtils";

type Row = { id: string; url: string; title: string | null; sort_index: number; is_active: boolean };
const db = supabase as any;

export default function AdminGlobalVideos() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await db.from("global_videos").select("id,url,title,sort_index,is_active").order("sort_index");
    if (error) toast.error(error.message);
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) { toast.error("Super admin access required"); navigate("/dashboard"); return; }
    load();
  }, [authLoading, isSuperAdmin, navigate, load]);

  const add = async () => {
    if (!parseVideoUrl(url.trim())) { toast.error("Paste a YouTube, Google Drive or Facebook video link"); return; }
    setBusy(true);
    const next = rows.length ? Math.max(...rows.map((r) => r.sort_index)) + 1 : 0;
    const { error } = await db.from("global_videos").insert({ url: url.trim(), title: title.trim() || null, sort_index: next });
    setBusy(false);
    if (error) return toast.error(error.message);
    setUrl(""); setTitle(""); toast.success("Video added to every card"); load();
  };

  const update = async (id: string, patch: Partial<Row>) => {
    const { error } = await db.from("global_videos").update(patch).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const move = async (i: number, dir: -1 | 1) => {
    const a = rows[i], b = rows[i + dir];
    if (!a || !b) return;
    await db.from("global_videos").update({ sort_index: b.sort_index }).eq("id", a.id);
    await db.from("global_videos").update({ sort_index: a.sort_index }).eq("id", b.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this video from all cards?")) return;
    const { error } = await db.from("global_videos").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <PageBackButton to="/admin/cards" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Global Videos</h1>
            <p className="text-sm text-muted-foreground">These videos appear in the Videos carousel on every member's card.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/40 bg-card p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="gv-url">Video link (YouTube, Google Drive or Facebook)</Label>
            <Input id="gv-url" className="h-12 text-base" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gv-title">Title (optional)</Label>
            <Input id="gv-title" className="h-12 text-base" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <Button className="h-12 w-full sm:w-auto" onClick={add} disabled={busy || !url.trim()}>Add video</Button>
        </div>

        <div className="space-y-3">
          {rows.length === 0 && <p className="text-muted-foreground text-center py-8">No global videos yet.</p>}
          {rows.map((r, i) => {
            const thumb = getThumbnailUrl(r.url);
            return (
              <div key={r.id} className="rounded-2xl border border-primary/30 bg-card p-3 flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:w-40 aspect-video rounded-xl bg-muted overflow-hidden shrink-0">
                  {thumb && <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <Input defaultValue={r.title ?? ""} placeholder="Title" className="h-11"
                    onBlur={(e) => e.target.value !== (r.title ?? "") && update(r.id, { title: e.target.value || null })} />
                  <a href={r.url} target="_blank" rel="noreferrer" className="block text-sm text-primary underline truncate">{r.url}</a>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="h-11" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" className="h-11" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" className="h-11 gap-1" onClick={() => update(r.id, { is_active: !r.is_active })}>
                      {r.is_active ? <><Eye className="h-4 w-4" />Showing</> : <><EyeOff className="h-4 w-4" />Hidden</>}
                    </Button>
                    <Button size="sm" variant="outline" className="h-11 gap-1 text-destructive" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" />Remove</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

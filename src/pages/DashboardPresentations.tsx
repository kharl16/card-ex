import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Presentation, Upload, Trash2, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SlideViewer } from "@/components/presentations/SlideViewer";

interface Item {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
}

const BUCKET = "member-presentations";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function DashboardPresentations() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPaid, setIsPaid] = useState(true);
  const [active, setActive] = useState<Item | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const [{ data: admin }, { data: paid }] = await Promise.all([
        db.rpc("is_super_admin", { _user_id: u.user.id }),
        db.rpc("is_paid_member", { _user_id: u.user.id }),
      ]);
      setIsAdmin(!!admin);
      setIsPaid(!!paid);
    }
    const { data } = await db.from("member_presentations").select("id,title,description,file_path").order("sort_order").order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = async (item: Item) => {
    setActive(item);
    setUrl(null);
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(item.file_path, 60 * 60 * 4);
    if (error || !data) { toast.error("Couldn't open this presentation"); setActive(null); return; }
    setUrl(data.signedUrl);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const upload = async () => {
    if (!file || !title.trim()) return toast.error("Add a title and choose a PDF");
    if (file.type !== "application/pdf") return toast.error("Please choose a PDF file");
    setUploading(true);
    const path = `${crypto.randomUUID()}.pdf`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: "application/pdf" });
    if (upErr) { setUploading(false); return toast.error(upErr.message.includes("size") || upErr.message.includes("large") ? "This file is larger than your storage upload limit" : upErr.message); }
    const { error } = await db.from("member_presentations").insert({ title: title.trim(), file_path: path, file_size: file.size });
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Presentation added");
    setTitle(""); setFile(null);
    load();
  };

  const remove = async (item: Item) => {
    if (!confirm(`Remove "${item.title}"?`)) return;
    await supabase.storage.from(BUCKET).remove([item.file_path]);
    await db.from("member_presentations").delete().eq("id", item.id);
    if (active?.id === item.id) setActive(null);
    load();
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-24">
      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
        <Button variant="ghost" onClick={() => (active ? setActive(null) : navigate("/dashboard"))} className="h-12 gap-2 text-lg">
          <ArrowLeft className="h-6 w-6" /> {active ? "All Presentations" : "Back to Dashboard"}
        </Button>

        {active ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{active.title}</h1>
            {url ? <SlideViewer url={url} title={active.title} /> : <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />}
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Presentations</h1>
              <p className="mt-1 text-lg text-muted-foreground">Tap a presentation to open it.</p>
            </div>

            {isAdmin && (
              <div className="space-y-3 rounded-2xl border border-primary/30 bg-card p-4">
                <h2 className="text-lg font-semibold text-foreground">Add a presentation (PDF)</h2>
                <div className="space-y-2">
                  <Label htmlFor="ptitle">Title</Label>
                  <Input id="ptitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Business Opportunity" className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pfile">PDF file</Label>
                  <Input id="pfile" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="h-12" />
                </div>
                <Button onClick={upload} disabled={uploading} className="h-12 gap-2">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                  {uploading ? "Uploading…" : "Upload"}
                </Button>
              </div>
            )}

            {loading ? (
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            ) : !isPaid ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/30 bg-card p-8 text-center">
                <Lock className="h-10 w-10 text-primary" />
                <p className="text-lg text-foreground">Presentations are available to paid members.</p>
              </div>
            ) : items.length === 0 ? (
              <p className="rounded-2xl border border-primary/30 bg-card p-8 text-center text-lg text-muted-foreground">No presentations yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-card p-2">
                    <button type="button" onClick={() => open(it)} className="flex min-h-[64px] flex-1 items-center gap-4 rounded-xl p-3 text-left hover:bg-primary/10">
                      <Presentation className="h-9 w-9 shrink-0 text-primary" />
                      <span className="text-lg font-semibold text-foreground">{it.title}</span>
                    </button>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" aria-label={`Remove ${it.title}`} onClick={() => remove(it)} className="h-12 w-12">
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

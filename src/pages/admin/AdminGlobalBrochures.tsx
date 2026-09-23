import { uploadOptimizedFile } from "@/lib/images";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";
import { CompanySwitcher } from "@/components/admin/CompanySwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Eye, EyeOff, Plus, BookOpen, LayoutTemplate, WandSparkles } from "lucide-react";
import GlobalImageSlots from "@/components/admin/GlobalImageSlots";
import AdminPhotoUploader from "@/components/admin/AdminPhotoUploader";
import type { BrochurePageShape } from "@/lib/carouselTypes";

type Row = {
  id: string;
  url: string;
  url_2: string | null;
  caption: string | null;
  sort_index: number;
  is_active: boolean;
  section_id: string | null;
};

type Brochure = {
  id: string;
  title: string;
  intro: string | null;
  page_shape: BrochurePageShape;
};

type Section = {
  id: string;
  heading: string;
  body: string | null;
  sort_index: number;
};

const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const UNSECTIONED = "__none__";

/**
 * Super-admin library for Company Brochure pages shared across every card,
 * plus the brochure's real page structure (title, intro, sections).
 */
export default function AdminGlobalBrochures() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [brochure, setBrochure] = useState<Brochure | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [captionInput, setCaptionInput] = useState("");
  const [cleanProgress, setCleanProgress] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);

    const [imagesRes, brochureRes] = await Promise.all([
      supabase
        .from("global_brochure_images")
        .select("id,url,url_2,caption,sort_index,is_active,section_id")
        .eq("company_id", activeCompanyId)
        .order("sort_index", { ascending: true }),
      supabase
        .from("global_brochures")
        .select("id,title,intro,page_shape,sort_index")
        .eq("company_id", activeCompanyId)
        .order("sort_index", { ascending: true })
        .limit(1),
    ]);

    if (imagesRes.error) toast.error(imagesRes.error.message);
    setRows((imagesRes.data as Row[]) ?? []);

    const meta = ((brochureRes.data as Brochure[]) ?? [])[0] ?? null;
    setBrochure(meta);

    if (meta) {
      const { data: sectionRows } = await supabase
        .from("global_brochure_sections")
        .select("id,heading,body,sort_index")
        .eq("brochure_id", meta.id)
        .order("sort_index", { ascending: true });
      setSections((sectionRows as Section[]) ?? []);
    } else {
      setSections([]);
    }

    setLoading(false);
  }, [activeCompanyId]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Admin access required");
      navigate("/dashboard");
    }
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin && activeCompanyId) load();
  }, [isAdmin, activeCompanyId, load]);

  /** Creates the brochure record lazily the first time it's needed. */
  async function ensureBrochure(): Promise<Brochure | null> {
    if (brochure) return brochure;
    if (!activeCompanyId || !user) return null;
    const { data, error } = await supabase
      .from("global_brochures")
      .insert({
        company_id: activeCompanyId,
        title: "Company Brochure",
        created_by: user.id,
      })
      .select("id,title,intro,page_shape")
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    const created = data as Brochure;
    setBrochure(created);
    return created;
  }

  async function saveBrochureField(field: "title" | "intro", value: string) {
    const b = await ensureBrochure();
    if (!b) return;
    const payload = field === "title" ? { title: value.trim() || "Company Brochure" } : { intro: value.trim() || null };
    const { error } = await supabase.from("global_brochures").update(payload).eq("id", b.id);
    if (error) toast.error(error.message);
    else {
      setBrochure({ ...b, ...payload } as Brochure);
      toast.success("Brochure saved");
    }
  }

  async function savePageShape(pageShape: BrochurePageShape) {
    const b = await ensureBrochure();
    if (!b) return;
    const { error } = await supabase
      .from("global_brochures")
      .update({ page_shape: pageShape })
      .eq("id", b.id);
    if (error) toast.error(error.message);
    else {
      setBrochure({ ...b, page_shape: pageShape });
      toast.success("Brochure page shape saved");
    }
  }

  async function addSection() {
    const b = await ensureBrochure();
    if (!b) return;
    const nextSort = sections.length ? Math.max(...sections.map((s) => s.sort_index)) + 1 : 0;
    const { error } = await supabase.from("global_brochure_sections").insert({
      brochure_id: b.id,
      heading: `Section ${sections.length + 1}`,
      sort_index: nextSort,
    });
    if (error) toast.error(error.message);
    else await load();
  }

  async function updateSection(section: Section, patch: Partial<Section>) {
    const { error } = await supabase.from("global_brochure_sections").update(patch).eq("id", section.id);
    if (error) toast.error(error.message);
    else setSections((prev) => prev.map((s) => (s.id === section.id ? { ...s, ...patch } : s)));
  }

  async function moveSection(section: Section, dir: -1 | 1) {
    const idx = sections.findIndex((s) => s.id === section.id);
    const swap = sections[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("global_brochure_sections").update({ sort_index: swap.sort_index }).eq("id", section.id),
      supabase.from("global_brochure_sections").update({ sort_index: section.sort_index }).eq("id", swap.id),
    ]);
    await load();
  }

  async function removeSection(section: Section) {
    if (!confirm("Delete this section? Its pages stay in the library and become unsectioned.")) return;
    const { error } = await supabase.from("global_brochure_sections").delete().eq("id", section.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Section deleted");
      await load();
    }
  }

  async function assignSection(row: Row, sectionId: string) {
    const value = sectionId === UNSECTIONED ? null : sectionId;
    const b = await ensureBrochure();
    const { error } = await supabase
      .from("global_brochure_images")
      .update({ section_id: value, brochure_id: b?.id ?? null })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, section_id: value } : r)));
  }

  async function uploadFile(file: File): Promise<string | null> {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Only JPEG, PNG, GIF, or WebP allowed");
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Max file size is 10MB");
      return null;
    }
    try {
      const { publicUrl } = await uploadOptimizedFile(file, {
        bucket: "media",
        folder: "global-brochures",
        kind: "carousel",
        trimWhiteEdges: true,
      });
      return publicUrl;
    } catch (e: any) {
      toast.error(`Upload failed: ${e.message || e}`);
      return null;
    }
  }

  async function addRow(url: string, caption: string) {
    if (!user || !activeCompanyId) return;
    const nextSort = rows.length ? Math.max(...rows.map((r) => r.sort_index)) + 1 : 0;
    const { error } = await supabase.from("global_brochure_images").insert({
      url,
      caption: caption.trim() || null,
      sort_index: nextSort,
      is_active: true,
      created_by: user.id,
      company_id: activeCompanyId,
      brochure_id: brochure?.id ?? null,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Brochure page added — visible on all cards");
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
    try {
      const response = await fetch(urlInput.trim(), { mode: "cors" });
      if (!response.ok) throw new Error("Image could not be downloaded");
      const blob = await response.blob();
      if (!ALLOWED.includes(blob.type)) throw new Error("URL must point to a JPEG, PNG, GIF, or WebP image");
      if (blob.size > 10 * 1024 * 1024) throw new Error("Image is larger than 10MB");
      const file = new File([blob], "brochure-url-image", { type: blob.type });
      const cleanedUrl = await uploadFile(file);
      if (cleanedUrl) {
        await addRow(cleanedUrl, captionInput);
        setUrlInput("");
        setCaptionInput("");
      }
    } catch {
      // The browser could not download the image (cross-origin block, odd
      // content type, etc.). Fall back to saving the link as-is, like before.
      await addRow(urlInput.trim(), captionInput);
      setUrlInput("");
      setCaptionInput("");
      toast.info("Added using the original link — white-edge cleanup was skipped.");
    }
    setBusy(false);
  }

  async function cleanExistingPages() {
    if (rows.length === 0 || !confirm("Clean white edges from all existing brochure pages? Original stored files will be kept.")) return;
    setBusy(true);
    let cleaned = 0;
    let skipped = 0;
    const slots = rows.flatMap((row) => [
      { row, field: "url" as const, url: row.url },
      ...(row.url_2 ? [{ row, field: "url_2" as const, url: row.url_2 }] : []),
    ]);
    for (let index = 0; index < slots.length; index += 1) {
      const item = slots[index];
      setCleanProgress(`${index + 1} of ${slots.length}`);
      try {
        const response = await fetch(item.url, { mode: "cors" });
        if (!response.ok) throw new Error("Download failed");
        const blob = await response.blob();
        const file = new File([blob], `brochure-${item.row.id}`, { type: blob.type || "image/jpeg" });
        const nextUrl = await uploadFile(file);
        if (!nextUrl) throw new Error("Processing failed");
        const { error } = await supabase
          .from("global_brochure_images")
          .update({ [item.field]: nextUrl })
          .eq("id", item.row.id);
        if (error) throw error;
        cleaned += 1;
      } catch {
        skipped += 1;
      }
    }
    setCleanProgress(null);
    setBusy(false);
    await load();
    if (skipped) toast.warning(`Cleaned ${cleaned} page photo(s); ${skipped} could not be processed.`);
    else toast.success(`Cleaned ${cleaned} brochure page photo(s).`);
  }

  async function toggleActive(row: Row) {
    const { error } = await supabase
      .from("global_brochure_images")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else await load();
  }

  async function remove(row: Row) {
    if (!confirm("Remove this brochure page from ALL cards? This cannot be undone.")) return;
    const { error } = await supabase.from("global_brochure_images").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      await load();
    }
  }

  async function updateCaption(row: Row, caption: string) {
    const { error } = await supabase
      .from("global_brochure_images")
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
      supabase.from("global_brochure_images").update({ sort_index: swap.sort_index }).eq("id", row.id),
      supabase.from("global_brochure_images").update({ sort_index: row.sort_index }).eq("id", swap.id),
    ]);
    await load();
  }

  if (authLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Global Brochure Photos</h1>
          <p className="text-sm text-muted-foreground">
            Upload company brochure pages here once and they appear in the Company Brochure section
            of every card. Card owners can hide specific pages on their own card.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CompanySwitcher />
          <Button variant="outline" onClick={() => navigate("/admin/global-brochures/preview")}>
            <BookOpen className="mr-2 h-4 w-4" /> Preview
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/brochure-templates")}>
            <LayoutTemplate className="mr-2 h-4 w-4" /> Templates
          </Button>
          <Button variant="outline" onClick={cleanExistingPages} disabled={busy || rows.length === 0}>
            <WandSparkles className="mr-2 h-4 w-4" />
            {cleanProgress ? `Cleaning ${cleanProgress}` : "Clean existing pages"}
          </Button>
        </div>
      </div>

      {/* Brochure page setup: title, intro, sections */}
      <div className="mb-8 rounded-xl border border-border bg-card p-4 space-y-4">
        <h2 className="text-lg font-semibold">Brochure page</h2>
        <div className="space-y-2">
          <Label>Default page shape</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["portrait", "landscape", "original"] as const).map((shape) => (
              <Button
                key={shape}
                type="button"
                variant={(brochure?.page_shape ?? "portrait") === shape ? "default" : "outline"}
                onClick={() => savePageShape(shape)}
                className="capitalize"
              >
                {shape}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Used by every card unless its editor chooses a different shape.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Brochure title</Label>
            <Input
              key={brochure?.id ?? "new"}
              defaultValue={brochure?.title ?? "Company Brochure"}
              placeholder="Company Brochure"
              onBlur={(e) => {
                if (e.target.value !== (brochure?.title ?? "")) saveBrochureField("title", e.target.value);
              }}
            />
          </div>
          <div>
            <Label>Short intro (optional)</Label>
            <Textarea
              key={`intro-${brochure?.id ?? "new"}`}
              defaultValue={brochure?.intro ?? ""}
              placeholder="A short welcome paragraph shown above the brochure"
              onBlur={(e) => {
                if (e.target.value !== (brochure?.intro ?? "")) saveBrochureField("intro", e.target.value);
              }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Sections</Label>
            <Button size="sm" variant="outline" onClick={addSection}>
              <Plus className="mr-1 h-4 w-4" /> Add section
            </Button>
          </div>
          {sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sections yet — all pages show as one brochure strip. Add sections to group pages
              with their own headings.
            </p>
          ) : (
            sections.map((s, i) => (
              <div key={s.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    defaultValue={s.heading}
                    placeholder="Section heading"
                    onBlur={(e) => {
                      if (e.target.value !== s.heading) updateSection(s, { heading: e.target.value });
                    }}
                  />
                  <Button size="sm" variant="outline" onClick={() => moveSection(s, -1)} disabled={i === 0}>
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => moveSection(s, 1)}
                    disabled={i === sections.length - 1}
                  >
                    ↓
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => removeSection(s)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  defaultValue={s.body ?? ""}
                  placeholder="Section text (optional)"
                  onBlur={(e) => {
                    if (e.target.value !== (s.body ?? "")) updateSection(s, { body: e.target.value || null });
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {rows.filter((r) => r.section_id === s.id).length} page(s) in this section
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-border bg-card p-4 space-y-4">
        <AdminPhotoUploader busy={busy} onFilesSelected={onFileChoose} label="Upload brochure photos" />
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
              placeholder="Caption (e.g. Page 1 — Company Story)"
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
          No brochure pages yet. Upload one above and it will appear on every card.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r, i) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
              <GlobalImageSlots
                table="global_brochure_images"
                rowId={r.id}
                url={r.url}
                url2={r.url_2}
                caption={r.caption}
                isActive={r.is_active}
                kind="carousel"
                folder="global-brochures"
                trimWhiteEdges
                onChanged={load}
                aspectClass={
                  (brochure?.page_shape ?? "portrait") === "landscape"
                    ? "aspect-video"
                    : (brochure?.page_shape ?? "portrait") === "original"
                      ? "aspect-auto min-h-48"
                      : "aspect-[3/4]"
                }
              />
              <Input
                defaultValue={r.caption ?? ""}
                placeholder="Caption"
                onBlur={(e) => {
                  if (e.target.value !== (r.caption ?? "")) updateCaption(r, e.target.value);
                }}
              />
              <Select value={r.section_id ?? UNSECTIONED} onValueChange={(v) => assignSection(r, v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNSECTIONED}>No section</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.heading || "Untitled section"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

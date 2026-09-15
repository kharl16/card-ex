import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";
import { CompanySwitcher } from "@/components/admin/CompanySwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Save, Wand2 } from "lucide-react";

type ImageRow = {
  id: string;
  url: string;
  caption: string | null;
  sort_index: number;
  section_id: string | null;
};

type SectionRow = { id: string; heading: string; body: string | null; sort_index: number };

type TemplateSection = { id: string; heading: string; body?: string | null; image_ids?: string[] };

type TemplatePayload = {
  section_title?: string;
  cta_label?: string;
  included_image_ids?: string[];
  /** Real page layout captured from the brochure library */
  title?: string;
  intro?: string | null;
  sections?: TemplateSection[];
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  payload: TemplatePayload;
};

type CardRow = { id: string; slug: string | null; full_name: string | null };

/**
 * Named brochure setups that can be applied to one or many cards at once.
 * Applying never touches a card's own uploaded brochure photos.
 */
export default function AdminBrochureTemplates() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const navigate = useNavigate();

  const [images, setImages] = useState<ImageRow[]>([]);
  const [librarySections, setLibrarySections] = useState<SectionRow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sectionTitle, setSectionTitle] = useState("Company Brochure");
  const [pageTitle, setPageTitle] = useState("Company Brochure");
  const [pageIntro, setPageIntro] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [included, setIncluded] = useState<Set<string>>(new Set());

  const [applyTemplate, setApplyTemplate] = useState<Template | null>(null);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    const [imgRes, tplRes] = await Promise.all([
      supabase
        .from("global_brochure_images")
        .select("id,url,caption,sort_index")
        .eq("company_id", activeCompanyId)
        .eq("is_active", true)
        .order("sort_index", { ascending: true }),
      supabase
        .from("brochure_templates")
        .select("id,name,description,payload")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false }),
    ]);
    const imgs = (imgRes.data as ImageRow[]) ?? [];
    setImages(imgs);
    setTemplates((tplRes.data as Template[]) ?? []);
    setIncluded(new Set(imgs.map((i) => i.id)));
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

  async function saveTemplate() {
    if (!name.trim() || !user || !activeCompanyId) return;
    const payload: TemplatePayload = {
      section_title: sectionTitle.trim() || "Company Brochure",
      cta_label: ctaLabel.trim() || undefined,
      included_image_ids: Array.from(included),
    };
    const { error } = await supabase.from("brochure_templates").insert({
      company_id: activeCompanyId,
      name: name.trim(),
      description: description.trim() || null,
      payload: payload as any,
      created_by: user.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Template saved");
      setName("");
      setDescription("");
      await load();
    }
  }

  async function removeTemplate(t: Template) {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    const { error } = await supabase.from("brochure_templates").delete().eq("id", t.id);
    if (error) toast.error(error.message);
    else await load();
  }

  async function openApply(t: Template) {
    setApplyTemplate(t);
    setSelectedCards(new Set());
    const { data, error } = await supabase
      .from("cards")
      .select("id,slug,full_name")
      .order("full_name", { ascending: true })
      .limit(1000);
    if (error) toast.error(error.message);
    setCards((data as CardRow[]) ?? []);
  }

  async function runApply() {
    if (!applyTemplate || selectedCards.size === 0) return;
    setApplying(true);
    const payload = applyTemplate.payload || {};
    const includedIds = new Set(payload.included_image_ids ?? images.map((i) => i.id));
    const excluded = images.filter((i) => !includedIds.has(i.id)).map((i) => i.id);

    let failed = 0;
    for (const cardId of selectedCards) {
      const { data: cardRow } = await supabase
        .from("cards")
        .select("carousel_settings")
        .eq("id", cardId)
        .maybeSingle();

      const settings = ((cardRow as any)?.carousel_settings as Record<string, any>) || {};
      const brochureSection = { ...(settings.brochure || {}) };
      brochureSection.title = payload.section_title || "Company Brochure";
      brochureSection.settings = { ...(brochureSection.settings || {}), enabled: true };
      if (payload.cta_label) {
        brochureSection.cta = {
          ...(brochureSection.cta || {}),
          enabled: true,
          label: payload.cta_label,
        };
      }

      const { error: updErr } = await supabase
        .from("cards")
        .update({ carousel_settings: { ...settings, brochure: brochureSection } as any })
        .eq("id", cardId);
      if (updErr) failed++;

      // Overrides = the shared pages this card should hide.
      await supabase.from("card_global_brochure_overrides").delete().eq("card_id", cardId);
      if (excluded.length) {
        const { error: insErr } = await supabase.from("card_global_brochure_overrides").insert(
          excluded.map((id) => ({ card_id: cardId, global_brochure_image_id: id }))
        );
        if (insErr) failed++;
      }
    }

    setApplying(false);
    setApplyTemplate(null);
    if (failed) toast.error(`Applied with ${failed} problem(s)`);
    else toast.success(`Brochure applied to ${selectedCards.size} card(s)`);
  }

  if (authLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Button variant="ghost" onClick={() => navigate("/admin/global-brochures")} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to library
      </Button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Brochure Templates</h1>
          <p className="text-sm text-muted-foreground">
            Save a brochure setup once, then apply it to any number of cards. A card's own uploaded
            brochure photos are never removed.
          </p>
        </div>
        <CompanySwitcher />
      </div>

      <div className="mb-8 rounded-xl border border-border bg-card p-4 space-y-4">
        <h2 className="text-lg font-semibold">New template</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Template name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Standard brochure" />
          </div>
          <div>
            <Label>Section title on the card</Label>
            <Input value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} />
          </div>
          <div>
            <Label>Button label (optional)</Label>
            <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Read the Brochure" />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Pages included</Label>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.map((img) => {
                const checked = included.has(img.id);
                return (
                  <label key={img.id} className="flex cursor-pointer flex-col gap-1 rounded-lg border border-border p-2">
                    <img src={img.url} alt={img.caption || "Brochure page"} loading="lazy" className="aspect-[3/4] w-full rounded object-cover" />
                    <span className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          setIncluded((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(img.id);
                            else next.delete(img.id);
                            return next;
                          })
                        }
                      />
                      {img.caption || "Page"}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <Button onClick={saveTemplate} disabled={!name.trim()}>
          <Save className="mr-2 h-4 w-4" /> Save template
        </Button>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Saved templates</h2>
      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          No templates yet.
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-muted-foreground">
                  {t.payload?.included_image_ids?.length ?? 0} page(s)
                  {t.description ? ` — ${t.description}` : ""}
                </p>
              </div>
              <Button variant="outline" onClick={() => openApply(t)}>
                <Wand2 className="mr-2 h-4 w-4" /> Apply to cards
              </Button>
              <Button variant="destructive" size="icon" onClick={() => removeTemplate(t)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!applyTemplate} onOpenChange={(open) => !open && setApplyTemplate(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apply "{applyTemplate?.name}" to cards</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {cards.map((c) => (
              <label key={c.id} className="flex items-center gap-3 rounded-lg border border-border p-2 text-sm">
                <Checkbox
                  checked={selectedCards.has(c.id)}
                  onCheckedChange={(v) =>
                    setSelectedCards((prev) => {
                      const next = new Set(prev);
                      if (v) next.add(c.id);
                      else next.delete(c.id);
                      return next;
                    })
                  }
                />
                <span>{c.full_name || c.slug || c.id}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={runApply} disabled={applying || selectedCards.size === 0}>
              {applying ? "Applying…" : `Apply to ${selectedCards.size} card(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

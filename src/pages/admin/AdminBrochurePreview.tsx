import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import LightboxDialog from "@/components/LightboxDialog";
import { useLightbox, type LightboxImage } from "@/hooks/useLightbox";
import type { BrochurePageShape } from "@/lib/carouselTypes";

type Image = {
  id: string;
  url: string;
  caption: string | null;
  sort_index: number;
  section_id: string | null;
};

type Group = {
  id: string;
  heading: string;
  body: string | null;
  images: Image[];
};

/** Visitor-style preview of the shared Company Brochure. */
export default function AdminBrochurePreview() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const navigate = useNavigate();
  const [title, setTitle] = useState("Company Brochure");
  const [intro, setIntro] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [orientation, setOrientation] = useState<BrochurePageShape>("portrait");

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Admin access required");
      navigate("/dashboard");
    }
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin || !activeCompanyId) return;
    (async () => {
      setLoading(true);
      const [imagesRes, brochureRes] = await Promise.all([
        supabase
          .from("global_brochure_images")
          .select("id,url,caption,sort_index,section_id")
          .eq("company_id", activeCompanyId)
          .eq("is_active", true)
          .order("sort_index", { ascending: true }),
        supabase
          .from("global_brochures")
          .select("id,title,intro,page_shape,sort_index")
          .eq("company_id", activeCompanyId)
          .order("sort_index", { ascending: true })
          .limit(1),
      ]);

      const images = (imagesRes.data as Image[]) ?? [];
      const meta = ((brochureRes.data as { id: string; title: string; intro: string | null; page_shape: BrochurePageShape }[]) ?? [])[0];
      setTitle(meta?.title || "Company Brochure");
      setIntro(meta?.intro ?? null);
      setOrientation(meta?.page_shape ?? "portrait");

      let sectionRows: { id: string; heading: string; body: string | null }[] = [];
      if (meta) {
        const { data } = await supabase
          .from("global_brochure_sections")
          .select("id,heading,body,sort_index")
          .eq("brochure_id", meta.id)
          .order("sort_index", { ascending: true });
        sectionRows = (data as typeof sectionRows) ?? [];
      }

      const next: Group[] = [];
      const unsectioned = images.filter(
        (i) => !i.section_id || !sectionRows.some((s) => s.id === i.section_id)
      );
      if (unsectioned.length) {
        next.push({ id: "lead", heading: "", body: null, images: unsectioned });
      }
      sectionRows.forEach((s) => {
        const sectionImages = images.filter((i) => i.section_id === s.id);
        if (sectionImages.length) {
          next.push({ id: s.id, heading: s.heading, body: s.body, images: sectionImages });
        }
      });

      setGroups(next);
      setLoading(false);
    })();
  }, [isAdmin, activeCompanyId]);

  const flat: LightboxImage[] = useMemo(
    () =>
      groups.flatMap((g) =>
        g.images.map((i) => ({ url: i.url, alt: i.caption ?? g.heading, description: i.caption ?? undefined }))
      ),
    [groups]
  );
  const lightbox = useLightbox({ images: flat });

  const indexOf = (groupIdx: number, imageIdx: number) =>
    groups.slice(0, groupIdx).reduce((sum, g) => sum + g.images.length, 0) + imageIdx;

  if (authLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Button variant="ghost" onClick={() => navigate("/admin/global-brochures")} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to library
      </Button>

      <header className="mb-6 text-center">
        <h1 className="text-4xl font-bold">{title}</h1>
        {intro && <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{intro}</p>}
      </header>

      <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm text-muted-foreground">Page shape:</span>
        {(["portrait", "landscape", "original"] as const).map((o) => (
          <Button
            key={o}
            type="button"
            size="sm"
            variant={orientation === o ? "default" : "outline"}
            onClick={() => setOrientation(o)}
            className="capitalize"
          >
            {o}
          </Button>
        ))}
      </div>


      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No active brochure pages yet.
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((g, gi) => (
            <section key={g.id} className="space-y-3">
              {g.heading && <h2 className="text-2xl font-semibold">{g.heading}</h2>}
              {g.body && <p className="text-muted-foreground">{g.body}</p>}
              <div
                className={
                  orientation === "landscape"
                    ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    : "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
                }
              >
                {g.images.map((img, ii) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => lightbox.openLightbox(indexOf(gi, ii))}
                    className="group overflow-hidden rounded-lg border border-border bg-card text-left"
                  >
                    <img
                      src={img.url}
                      alt={img.caption || `${title} page`}
                      loading="lazy"
                      className={
                        orientation === "original"
                          ? "h-auto w-full object-contain transition-transform group-hover:scale-105"
                          : orientation === "landscape"
                            ? "aspect-[4/3] w-full object-contain transition-transform group-hover:scale-105"
                            : "aspect-[3/4] w-full object-contain transition-transform group-hover:scale-105"
                      }
                    />
                    {img.caption && (
                      <span className="block px-2 py-1 text-xs text-muted-foreground">{img.caption}</span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <LightboxDialog
        open={lightbox.lightboxOpen}
        onOpenChange={lightbox.setLightboxOpen}
        currentImage={lightbox.currentImage}
        index={lightbox.lightboxIndex}
        count={lightbox.count}
        zoomLevel={lightbox.zoomLevel}
        setZoomLevel={lightbox.setZoomLevel}
        onZoomIn={lightbox.zoomIn}
        onZoomOut={lightbox.zoomOut}
        onResetZoom={lightbox.resetZoom}
        onNext={lightbox.nextImage}
        onPrev={lightbox.prevImage}
        onDownload={lightbox.handleDownload}
        onClose={lightbox.closeLightbox}
        images={flat}
      />
    </div>
  );
}

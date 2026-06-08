import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TemplateGallery } from "./TemplateGallery";
import { CardTemplate, LayoutData } from "@/hooks/useTemplates";
import { Palette, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

interface ChangeTemplateDialogProps {
  card: Tables<"cards">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: () => void;
}

/**
 * Apply a template's design + carousel content to an existing card,
 * while PRESERVING:
 *   - Personal details (names, prefix/suffix, title, company, bio, avatar)
 *   - Contact info (email, phone, website, location)
 *   - Social media (social_links JSON + card_links rows)
 *   - Slug / custom_slug / publish state / referral fields
 */
export function ChangeTemplateDialog({
  card,
  open,
  onOpenChange,
  onApplied,
}: ChangeTemplateDialogProps) {
  const [pending, setPending] = useState<CardTemplate | null>(null);
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    if (!pending) return;
    setApplying(true);
    try {
      const snapshot = pending.layout_data as LayoutData;

      // Update only design + carousel content fields.
      const { error } = await supabase
        .from("cards")
        .update({
          theme: snapshot.theme as any,
          cover_url: snapshot.cover_url ?? null,
          logo_url: snapshot.logo_url ?? null,
          carousel_enabled: snapshot.carousel_enabled ?? true,
          carousel_settings: (snapshot.carousel_settings || {}) as any,
          product_images: (snapshot.product_images || []) as any,
          package_images: (snapshot.package_images || []) as any,
          testimony_images: (snapshot.testimony_images || []) as any,
          video_items: (snapshot.video_items || []) as any,
          image_carousels: (snapshot.image_carousels || null) as any,
          show_daily_quote: snapshot.show_daily_quote ?? false,
          show_referral_earnings: snapshot.show_referral_earnings ?? false,
        })
        .eq("id", card.id);

      if (error) throw error;

      toast.success(`Template "${pending.name}" applied. Your personal info was kept.`);
      setPending(null);
      onOpenChange(false);
      onApplied();
    } catch (err: any) {
      console.error("[ChangeTemplateDialog] apply failed:", err);
      toast.error("Failed to apply template");
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Palette className="h-5 w-5 text-primary" />
              Change Template
            </DialogTitle>
            <DialogDescription>
              Pick a new design. Your personal details, contact info, and social media links will
              stay exactly as they are — only the look and carousel content will be replaced.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <TemplateGallery
              onSelectTemplate={(t) => setPending(t)}
              onBuildFromScratch={() => {
                toast.info("To start from scratch, edit fields directly here in the editor.");
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && !applying && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply "{pending?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your card's design, theme, and carousel content (products,
              packages, testimonies, videos). Your name, contact info, and social media links
              will be preserved. This cannot be undone automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApply} disabled={applying}>
              {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

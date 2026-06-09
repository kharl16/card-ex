import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import CardView from "@/components/CardView";
import type { CardTemplate, LayoutData } from "@/hooks/useTemplates";
import type { Tables, Json } from "@/integrations/supabase/types";

interface TemplatePreviewDialogProps {
  template: CardTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: CardTemplate) => void;
}

/**
 * Renders a real CardView from the template snapshot so the preview matches
 * the actual card view exactly — including product/package/testimony carousels.
 * Hidden carousel items are already stripped from the snapshot during
 * template save, so they will not appear here.
 */
export function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
  onSelect,
}: TemplatePreviewDialogProps) {
  if (!template) return null;

  const layoutData = template.layout_data as LayoutData;

  // Build a card-shaped object from the snapshot. We use a synthetic id prefixed
  // with "tpl-preview-" so any hooks that filter by card_id simply return empty
  // (no overrides exist for this id) without erroring.
  const mockCard: Tables<"cards"> = {
    id: `tpl-preview-${template.id}`,
    user_id: template.owner_id,
    slug: "preview",
    ad_banner: null,
    image_carousels: (layoutData.image_carousels as unknown as Json) ?? null,
    show_daily_quote: layoutData.show_daily_quote ?? false,
    show_referral_earnings: layoutData.show_referral_earnings ?? false,
    full_name:
      layoutData.full_name ||
      [layoutData.prefix, layoutData.first_name, layoutData.middle_name, layoutData.last_name]
        .filter(Boolean)
        .join(" ") ||
      "Card Owner",
    first_name: layoutData.first_name || null,
    middle_name: layoutData.middle_name || null,
    last_name: layoutData.last_name || null,
    prefix: layoutData.prefix || null,
    suffix: layoutData.suffix || null,
    title: layoutData.title || null,
    company: layoutData.company || null,
    bio: layoutData.bio || null,
    email: layoutData.email || null,
    phone: layoutData.phone || null,
    website: layoutData.website || null,
    location: layoutData.location || null,
    avatar_url: layoutData.avatar_url || null,
    cover_url: layoutData.cover_url || null,
    logo_url: layoutData.logo_url || null,
    carousel_enabled: layoutData.carousel_enabled ?? true,
    carousel_settings: (layoutData.carousel_settings || {}) as Json,
    theme: (layoutData.theme || null) as Json,
    is_published: false,
    is_paid: false,
    mindset_result: null,
    paid_at: null,
    paid_overridden_by_admin: false,
    plan_id: null,
    public_url: null,
    share_url: null,
    qr_code_url: null,
    vcard_url: null,
    wallet_pass_url: null,
    custom_slug: null,
    organization_id: null,
    owner_name: null,
    card_type: null,
    views_count: null,
    unique_views: null,
    published_at: null,
    is_template: false,
    social_links: (layoutData.social_links as unknown as Json) || null,
    product_images: (layoutData.product_images as unknown as Json) || [],
    package_images: (layoutData.package_images as unknown as Json) || [],
    testimony_images: (layoutData.testimony_images as unknown as Json) || [],
    owner_referral_code: null,
    referred_by_code: null,
    referred_by_name: null,
    referred_by_user_id: null,
    design_version: 1,
    last_design_patch_id: null,
    video_items: (layoutData.video_items as unknown as Json) || [],
    disc_result: null,
    love_language_result: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Build social links list for CardView from card_links (snapshot)
  const socialLinks = (layoutData.card_links || [])
    .filter((link) => link?.kind && link?.value)
    .map((link, index) => ({
      id: `link-${index}`,
      kind: link.kind,
      label: link.label,
      value: link.value,
      icon: link.icon || "Globe",
    }));

  // CardView expects ProductImage[] in legacy shape for the prop, but the real
  // products carousel reads from card.product_images (JSONB) inside CardView,
  // so we can pass an empty array here.
  const productImages: never[] = [];

  const handleSelect = () => {
    onSelect(template);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            Preview: {template.name}
          </DialogTitle>
        </DialogHeader>

        {/* Native scroll container — Radix ScrollArea was hiding the inner
            CardView. A plain overflow-y-auto div renders CardView exactly as
            it appears on the actual card page. */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-4">
          <CardView
            card={mockCard}
            socialLinks={socialLinks}
            productImages={productImages}
            isInteractive={false}
            showQRCode={false}
            showVCardButtons={false}
          />
        </div>

        <div className="flex gap-3 px-6 py-4 border-t bg-background flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 gap-2"
          >
            <X className="h-4 w-4" />
            Close
          </Button>
          <Button onClick={handleSelect} className="flex-1 gap-2">
            <Check className="h-4 w-4" />
            Use Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X } from "lucide-react";
import CardView from "@/components/CardView";
import type { CardTemplate, LayoutData } from "@/hooks/useTemplates";
import type { Tables } from "@/integrations/supabase/types";

interface TemplatePreviewDialogProps {
  template: CardTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: CardTemplate) => void;
}

export function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
  onSelect,
}: TemplatePreviewDialogProps) {
  if (!template) return null;

  const layoutData = template.layout_data as LayoutData;

  // Build a mock card object from the template's layout_data
  const mockCard: Tables<"cards"> = {
    id: "preview",
    user_id: "",
    slug: "preview",
    full_name: layoutData.full_name || "Your Name",
    first_name: layoutData.first_name || null,
    middle_name: layoutData.middle_name || null,
    last_name: layoutData.last_name || null,
    prefix: layoutData.prefix || null,
    suffix: layoutData.suffix || null,
    title: layoutData.title || "Your Title",
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
    carousel_settings: (layoutData as any).carousel_settings || {},
    theme: layoutData.theme || null,
    is_published: false,
    is_paid: false,
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
    social_links: layoutData.social_links || null,
    product_images: (layoutData.product_images || []) as unknown as import("@/integrations/supabase/types").Json,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Build social links from card_links
  const socialLinks = (layoutData.card_links || [])
    .filter((link) => !["email", "phone", "url", "custom"].includes(link.kind) || link.kind === "url")
    .map((link, index) => ({
      id: `link-${index}`,
      kind: link.kind,
      label: link.label,
      value: link.value,
      icon: link.icon || "Globe",
    }));

  // Build product images
  const productImages = (layoutData.product_images || []).map((img, index) => ({
    id: `img-${index}`,
    image_url: img.image_url,
    alt_text: img.alt_text,
    description: img.description,
    sort_order: img.sort_order ?? index,
  }));

  const handleSelect = () => {
    onSelect(template);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            Preview: {template.name}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="px-4 pb-4">
            <div className="rounded-lg overflow-hidden border">
              <CardView
                card={mockCard}
                socialLinks={socialLinks}
                productImages={productImages}
                isInteractive={false}
                showQRCode={false}
                showVCardButtons={false}
              />
            </div>
          </div>
        </ScrollArea>

        <div className="flex gap-3 px-6 py-4 border-t bg-background">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 gap-2"
          >
            <X className="h-4 w-4" />
            Close
          </Button>
          <Button
            onClick={handleSelect}
            className="flex-1 gap-2"
          >
            <Check className="h-4 w-4" />
            Use Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, X, Mail, Phone, Globe, MapPin, Image as ImageIcon, Package, Quote, Video, Link as LinkIcon } from "lucide-react";
import type { CardTemplate, LayoutData } from "@/hooks/useTemplates";

interface TemplatePreviewDialogProps {
  template: CardTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: CardTemplate) => void;
}

/**
 * Lightweight, self-contained template preview that renders directly from the
 * snapshot (layout_data) — does NOT use CardView (which depends on a real
 * card.id, supabase hooks, RiderHeader, etc., and rendered blank in this dialog).
 */
export function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
  onSelect,
}: TemplatePreviewDialogProps) {
  if (!template) return null;

  const data = template.layout_data as LayoutData;
  const theme = (data.theme || {}) as Record<string, any>;
  const primary = theme.primary || "#D4AF37";
  const background = theme.background || "#0B0B0C";
  const textColor = theme.text || "#F8F8F8";

  const fullName =
    data.full_name ||
    [data.prefix, data.first_name, data.middle_name, data.last_name]
      .filter(Boolean)
      .join(" ") ||
    "Card Owner";

  const countVisible = (arr: any) =>
    Array.isArray(arr) ? arr.filter((i: any) => i?.hidden !== true && (i?.url || i?.image_url)).length : 0;

  const productCount = countVisible(data.product_images);
  const packageCount = countVisible(data.package_images);
  const testimonyCount = countVisible(data.testimony_images);
  const videoCount = Array.isArray(data.video_items)
    ? data.video_items.filter((v: any) => v?.hidden !== true).length
    : 0;
  const socialCount = Array.isArray(data.card_links)
    ? data.card_links.filter((l: any) => l?.kind && l?.value).length
    : Array.isArray(data.social_links)
    ? data.social_links.length
    : 0;

  const handleSelect = () => {
    onSelect(template);
    onOpenChange(false);
  };

  const previewImages = (Array.isArray(data.product_images) ? data.product_images : [])
    .filter((i: any) => i?.hidden !== true)
    .map((i: any) => i?.url || i?.image_url)
    .filter(Boolean)
    .slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            Preview: {template.name}
          </DialogTitle>
          {template.description && (
            <p className="text-sm text-muted-foreground">{template.description}</p>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="px-4 pb-6">
            <div
              className="rounded-2xl overflow-hidden border shadow-lg"
              style={{ backgroundColor: background, color: textColor }}
            >
              {/* Cover */}
              <div
                className="relative h-32 w-full"
                style={{
                  background: data.cover_url
                    ? `url(${data.cover_url}) center/cover`
                    : `linear-gradient(135deg, ${primary}40, ${primary}10)`,
                }}
              >
                <div
                  className="absolute inset-x-0 bottom-0 h-1"
                  style={{ background: `linear-gradient(90deg, transparent, ${primary}, transparent)` }}
                />
              </div>

              {/* Identity */}
              <div className="px-5 -mt-10 pb-4 flex items-end gap-3">
                <Avatar className="h-20 w-20 ring-4" style={{ boxShadow: `0 0 0 3px ${primary}` }}>
                  {data.avatar_url ? <AvatarImage src={data.avatar_url} alt={fullName} /> : null}
                  <AvatarFallback style={{ backgroundColor: primary, color: background }}>
                    {fullName
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {data.logo_url && (
                  <img
                    src={data.logo_url}
                    alt="Logo"
                    className="h-10 w-10 rounded-md object-contain bg-white/10 p-1 ml-auto"
                  />
                )}
              </div>

              <div className="px-5 pb-4">
                <h3 className="text-lg font-bold leading-tight">{fullName}</h3>
                {data.title && (
                  <p className="text-sm opacity-80">{data.title}</p>
                )}
                {data.company && (
                  <p
                    className="text-[11px] uppercase tracking-wider mt-1 font-semibold"
                    style={{ color: primary }}
                  >
                    {data.company}
                  </p>
                )}
                {data.bio && (
                  <p className="text-xs opacity-70 mt-2 leading-relaxed line-clamp-4">
                    {data.bio}
                  </p>
                )}
              </div>

              {/* Contact strip */}
              {(data.email || data.phone || data.website || data.location) && (
                <div className="px-5 pb-4 flex flex-wrap gap-2 text-[11px] opacity-80">
                  {data.email && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-white/5">
                      <Mail className="h-3 w-3" /> {data.email}
                    </span>
                  )}
                  {data.phone && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-white/5">
                      <Phone className="h-3 w-3" /> {data.phone}
                    </span>
                  )}
                  {data.website && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-white/5">
                      <Globe className="h-3 w-3" /> {data.website}
                    </span>
                  )}
                  {data.location && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-white/5">
                      <MapPin className="h-3 w-3" /> {data.location}
                    </span>
                  )}
                </div>
              )}

              {/* Product image strip */}
              {previewImages.length > 0 && (
                <div className="px-5 pb-4">
                  <p
                    className="text-[10px] uppercase tracking-[0.2em] mb-2 font-semibold"
                    style={{ color: primary }}
                  >
                    Products
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {previewImages.map((url, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-md overflow-hidden bg-white/5"
                        style={{ backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Content summary chips */}
              <div className="px-5 pb-5 flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <ImageIcon className="h-3 w-3" /> {productCount} Products
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Package className="h-3 w-3" /> {packageCount} Packages
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Quote className="h-3 w-3" /> {testimonyCount} Testimonies
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Video className="h-3 w-3" /> {videoCount} Videos
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <LinkIcon className="h-3 w-3" /> {socialCount} Links
                </Badge>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground text-center mt-3 px-4">
              This is a quick snapshot preview. Applying the template keeps your personal
              details and replaces only the design + carousel content.
            </p>
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
          <Button onClick={handleSelect} className="flex-1 gap-2">
            <Check className="h-4 w-4" />
            Use Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

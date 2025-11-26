import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ArrowLeft,
  Save,
  Share2,
  BarChart3,
  User,
  Phone,
  Share,
  Image,
  Settings,
  QrCode,
  Palette,
  Link,
  ListOrdered,
  Layers,
} from "lucide-react";
import ShareCardDialog from "@/components/ShareCardDialog";
import type { Tables } from "@/integrations/supabase/types";
import { z } from "zod";
import ThemeCustomizer from "@/components/ThemeCustomizer";
import SocialMediaLinks from "@/components/SocialMediaLinks";
import QRCodeCustomizer from "@/components/QRCodeCustomizer";
import QRCode from "qrcode";
import ProductImageManager from "@/components/ProductImageManager";
import CardView, { SocialLink, ProductImage } from "@/components/CardView";

// Editor section components
import { SmartAccordion, EditorSection } from "@/components/editor/SmartAccordion";
import { EditorWizard, WizardStep } from "@/components/editor/EditorWizard";
import { BasicInformationSection } from "@/components/editor/sections/BasicInformationSection";
import { ContactInformationSection } from "@/components/editor/sections/ContactInformationSection";
import { ImagesSection } from "@/components/editor/sections/ImagesSection";
import { CarouselSettingsSection } from "@/components/editor/sections/CarouselSettingsSection";
import { CustomUrlSection } from "@/components/editor/sections/CustomUrlSection";

type CardData = Tables<"cards">;

const STORAGE_KEY = "cardex_editor_section_order";

// Validation schema for card data
const cardSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(50, "First name must be 50 characters or less"),
  last_name: z.string().trim().min(1, "Last name is required").max(50, "Last name must be 50 characters or less"),
  prefix: z.string().trim().max(20, "Prefix must be 20 characters or less").optional().or(z.literal("")),
  middle_name: z.string().trim().max(50, "Middle name must be 50 characters or less").optional().or(z.literal("")),
  suffix: z.string().trim().max(20, "Suffix must be 20 characters or less").optional().or(z.literal("")),
  title: z.string().trim().max(100, "Title must be 100 characters or less").optional().or(z.literal("")),
  company: z.string().trim().max(100, "Company must be 100 characters or less").optional().or(z.literal("")),
  bio: z.string().trim().max(500, "Bio must be 500 characters or less").optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .max(255, "Email must be 255 characters or less")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(30, "Phone must be 30 characters or less").optional().or(z.literal("")),
  website: z
    .string()
    .trim()
    .max(255, "Website must be 255 characters or less")
    .refine((val) => !val || val.startsWith("http://") || val.startsWith("https://"), {
      message: "Website must start with http:// or https://",
    })
    .refine((val) => !val || !/^(javascript|data|vbscript):/i.test(val), {
      message: "Invalid URL scheme",
    })
    .optional()
    .or(z.literal("")),
  location: z.string().trim().max(200, "Location must be 200 characters or less").optional().or(z.literal("")),
  custom_slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      "Custom slug must be lowercase alphanumeric with hyphens, starting and ending with alphanumeric",
    )
    .min(3, "Custom slug must be at least 3 characters")
    .max(50, "Custom slug must be 50 characters or less")
    .optional()
    .or(z.literal("")),
});

// Default section order
const DEFAULT_SECTION_ORDER = [
  "basic",
  "contact",
  "social",
  "products",
  "carousel",
  "qr",
  "theme",
  "custom-url",
];

export default function CardEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState<CardData | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [regeneratingQR, setRegeneratingQR] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  // Layout mode: "accordion" or "wizard"
  const [layoutMode, setLayoutMode] = useState<"accordion" | "wizard">("accordion");
  
  // Admin drag-drop mode
  const [isAdmin] = useState(true); // TODO: Replace with actual admin check
  const [customizeOrder, setCustomizeOrder] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_SECTION_ORDER;
  });

  // Generate formatted full name preview (single source of truth)
  const getFormattedName = (): string => {
    if (!card) return "";
    const mainParts = [
      card.prefix?.trim(),
      card.first_name?.trim(),
      card.middle_name?.trim(),
      card.last_name?.trim(),
    ].filter((part) => part && part.length > 0) as string[];

    let name = mainParts.join(" ");

    if (card.suffix && card.suffix.trim()) {
      name = `${name}, ${card.suffix.trim()}`;
    }

    return name || "Enter your name above";
  };

  useEffect(() => {
    loadCard();
    loadSocialLinks();
    loadProductImages();
  }, [id]);

  const loadCard = async () => {
    if (!id) return;

    const { data, error } = await supabase.from("cards").select("*").eq("id", id).single();

    if (error || !data) {
      toast.error("Card not found");
      navigate("/dashboard");
    } else {
      setCard(data);
    }
    setLoading(false);
  };

  const loadSocialLinks = async () => {
    if (!id) return;

    const { data } = await supabase
      .from("card_links")
      .select("*")
      .eq("card_id", id)
      .in("kind", ["facebook", "linkedin", "instagram", "x", "youtube", "telegram", "tiktok", "url"])
      .order("sort_index");

    if (data) {
      setSocialLinks(
        data.map((link) => ({
          id: link.id,
          kind: link.kind,
          label: link.label,
          value: link.value,
          icon: link.icon || "",
        })),
      );
    }
  };

  const loadProductImages = async () => {
    if (!id) return;

    const { data } = await supabase
      .from("product_images")
      .select("id, image_url, alt_text, description, sort_order")
      .eq("card_id", id)
      .order("sort_order", { ascending: true });

    if (data) {
      setProductImages(data);
    }
  };

  const generateQRCode = async (shareUrl: string, cardSlug: string, customSettings?: any) => {
    try {
      const theme = card?.theme as any;
      const qrSettings = customSettings || theme?.qr || {};

      const qrDataUrl = await QRCode.toDataURL(shareUrl, {
        width: qrSettings.size || 512,
        margin: 2,
        color: {
          dark: qrSettings.darkColor || "#000000",
          light: qrSettings.lightColor || "#FFFFFF",
        },
      });

      const blob = await (await fetch(qrDataUrl)).blob();
      const fileName = `${cardSlug}-qr-${Date.now()}.png`;
      const filePath = `${card?.user_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("qrcodes").upload(filePath, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("qrcodes").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("QR code generation error:", error);
      return null;
    }
  };

  const handleRegenerateQR = async () => {
    if (!card || !card.share_url) {
      toast.error("Card must have a share URL to generate QR code");
      return;
    }

    setRegeneratingQR(true);
    try {
      const theme = card.theme as any;
      const qrSettings = theme?.qr || {};
      const newQRUrl = await generateQRCode(card.share_url, card.slug, qrSettings);

      if (newQRUrl) {
        const { error } = await supabase.from("cards").update({ qr_code_url: newQRUrl }).eq("id", card.id);

        if (error) throw error;

        setCard({ ...card, qr_code_url: newQRUrl });
        toast.success("QR code regenerated successfully!");
      } else {
        toast.error("Failed to generate QR code");
      }
    } catch (error) {
      console.error("Error regenerating QR:", error);
      toast.error("Failed to regenerate QR code");
    } finally {
      setRegeneratingQR(false);
    }
  };

  const handleSave = async () => {
    if (!card) return;

    try {
      const validationData = {
        first_name: card.first_name || "",
        last_name: card.last_name || "",
        prefix: card.prefix || "",
        middle_name: card.middle_name || "",
        suffix: card.suffix || "",
        title: card.title || "",
        company: card.company || "",
        bio: card.bio || "",
        email: card.email || "",
        phone: card.phone || "",
        website: card.website || "",
        location: card.location || "",
        custom_slug: card.custom_slug || "",
      };

      cardSchema.parse(validationData);
      setValidationErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setValidationErrors(errors);
        toast.error("Please fix validation errors before saving");
        return;
      }
    }

    setSaving(true);

    let qrCodeUrl = card.qr_code_url;
    const hasOldQRFormat = qrCodeUrl && !qrCodeUrl.includes("tagex.app");
    if (card.is_published && card.share_url && (!qrCodeUrl || hasOldQRFormat)) {
      qrCodeUrl = await generateQRCode(card.share_url, card.slug);
    }

    // Compute live full_name to keep DB in sync
    const liveFullName = getFormattedName();

    const { error } = await supabase
      .from("cards")
      .update({
        prefix: card.prefix,
        first_name: card.first_name,
        middle_name: card.middle_name,
        last_name: card.last_name,
        suffix: card.suffix,
        full_name: liveFullName,
        title: card.title,
        company: card.company,
        bio: card.bio,
        email: card.email,
        phone: card.phone,
        website: card.website,
        location: card.location,
        avatar_url: card.avatar_url,
        cover_url: card.cover_url,
        logo_url: card.logo_url,
        is_published: card.is_published,
        theme: card.theme,
        qr_code_url: qrCodeUrl,
        slug: card.slug,
        custom_slug: card.custom_slug,
      })
      .eq("id", card.id);

    if (error) {
      toast.error(error.message || "Failed to save card");
    } else {
      if (qrCodeUrl && !card.qr_code_url) {
        setCard({ ...card, qr_code_url: qrCodeUrl });
      }
      toast.success("Card saved!");
    }
    setSaving(false);
  };

  const togglePublish = async () => {
    if (!card) return;

    const newStatus = !card.is_published;

    let qrCodeUrl = card.qr_code_url;
    const hasOldQRFormat = qrCodeUrl && !qrCodeUrl.includes("tagex.app");
    if (newStatus && card.share_url && (!qrCodeUrl || hasOldQRFormat)) {
      qrCodeUrl = await generateQRCode(card.share_url, card.slug);
    }

    const { error } = await supabase
      .from("cards")
      .update({
        is_published: newStatus,
        qr_code_url: qrCodeUrl,
      })
      .eq("id", card.id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      setCard({ ...card, is_published: newStatus, qr_code_url: qrCodeUrl });
      toast.success(newStatus ? "Card published!" : "Card unpublished");
    }
  };

  const handleCardChange = (updates: Partial<CardData>) => {
    if (!card) return;
    setCard({ ...card, ...updates });
  };

  const handleSectionReorder = (newOrder: string[]) => {
    setSectionOrder(newOrder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
  };

  // Build sections configuration
  const buildSections = (): EditorSection[] => {
    if (!card) return [];

    const sectionMap: Record<string, EditorSection> = {
      basic: {
        id: "basic",
        title: "Basic Information",
        description: "Name, title, company, and bio",
        icon: <User className="h-4 w-4" />,
        content: (
          <BasicInformationSection
            card={card}
            validationErrors={validationErrors}
            onCardChange={handleCardChange}
            onValidationErrorChange={setValidationErrors}
          />
        ),
      },
      contact: {
        id: "contact",
        title: "Contact Information",
        description: "Email, phone, website, and location",
        icon: <Phone className="h-4 w-4" />,
        content: (
          <ContactInformationSection
            card={card}
            validationErrors={validationErrors}
            onCardChange={handleCardChange}
          />
        ),
      },
      social: {
        id: "social",
        title: "Social Media Links",
        description: "Add your social profiles",
        icon: <Share className="h-4 w-4" />,
        content: <SocialMediaLinks cardId={card.id} onLinksChange={setSocialLinks} />,
      },
      products: {
        id: "products",
        title: "Product Images",
        description: "Showcase your products or services",
        icon: <Image className="h-4 w-4" />,
        content: (
          <div className="space-y-4">
            <ImagesSection card={card} onCardChange={handleCardChange} />
            <div className="pt-4 border-t border-border/50">
              <ProductImageManager cardId={card.id} ownerId={card.user_id} onImagesChange={loadProductImages} />
            </div>
          </div>
        ),
      },
      carousel: {
        id: "carousel",
        title: "Carousel Settings",
        description: "Configure image carousel behavior",
        icon: <Settings className="h-4 w-4" />,
        content: <CarouselSettingsSection card={card} onCardChange={handleCardChange} />,
      },
      qr: {
        id: "qr",
        title: "QR Code Customization",
        description: "Customize your QR code appearance",
        icon: <QrCode className="h-4 w-4" />,
        content: (
          <QRCodeCustomizer
            settings={(card.theme as any)?.qr || {}}
            onChange={(qrSettings) => {
              const currentTheme = (card.theme as any) || {};
              const updatedTheme = { ...currentTheme, qr: qrSettings };
              setCard({ ...card, theme: updatedTheme as any });
            }}
            onRegenerate={handleRegenerateQR}
            isRegenerating={regeneratingQR}
          />
        ),
      },
      theme: {
        id: "theme",
        title: "Theme Customization",
        description: "Colors, fonts, and visual style",
        icon: <Palette className="h-4 w-4" />,
        content: (
          <ThemeCustomizer
            theme={(card.theme as any) || { primary: "#D4AF37", background: "#0B0B0C", text: "#F8F8F8" }}
            onChange={(theme) => setCard({ ...card, theme: theme as any })}
          />
        ),
      },
      "custom-url": {
        id: "custom-url",
        title: "Custom URL",
        description: "Personalize your short link",
        isPremium: true,
        icon: <Link className="h-4 w-4" />,
        content: (
          <CustomUrlSection
            card={card}
            validationErrors={validationErrors}
            onCardChange={handleCardChange}
          />
        ),
      },
    };

    // Return sections in the correct order
    const orderedIds = customizeOrder ? sectionOrder : DEFAULT_SECTION_ORDER;
    return orderedIds.map((id) => sectionMap[id]).filter(Boolean);
  };

  // Build wizard steps from sections
  const buildWizardSteps = (): WizardStep[] => {
    return buildSections().map((section) => ({
      ...section,
      shortTitle: section.title.split(" ")[0], // Use first word as short title
    }));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!card) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/cards/${card.id}/analytics`)} className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </Button>
            <Button variant="outline" onClick={() => setShareDialogOpen(true)} className="gap-2">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Generate Card</span>
            </Button>
            <ShareCardDialog cardId={card.id} open={shareDialogOpen} onOpenChange={setShareDialogOpen} />
            <Button onClick={togglePublish} variant={card.is_published ? "secondary" : "default"}>
              {card.is_published ? "Unpublish" : "Publish"}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto grid gap-6 px-4 py-6 lg:grid-cols-2">
        {/* Editor Column */}
        <div className="space-y-4">
          {/* Mode Switcher & Admin Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/50">
            <ToggleGroup
              type="single"
              value={layoutMode}
              onValueChange={(value) => value && setLayoutMode(value as "accordion" | "wizard")}
              className="justify-start"
            >
              <ToggleGroupItem value="accordion" className="gap-2">
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Accordion</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="wizard" className="gap-2">
                <ListOrdered className="h-4 w-4" />
                <span className="hidden sm:inline">Step-by-Step</span>
              </ToggleGroupItem>
            </ToggleGroup>

            {isAdmin && layoutMode === "accordion" && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={customizeOrder}
                  onCheckedChange={setCustomizeOrder}
                  id="customize-order"
                />
                <Label htmlFor="customize-order" className="text-sm text-muted-foreground cursor-pointer">
                  Reorder Sections
                </Label>
              </div>
            )}
          </div>

          {/* Editor Content */}
          {layoutMode === "accordion" ? (
            <SmartAccordion
              sections={buildSections()}
              defaultOpenId="basic"
              enableDragDrop={customizeOrder}
              onReorder={handleSectionReorder}
            />
          ) : (
            <div className="min-h-[600px]">
              <EditorWizard
                steps={buildWizardSteps()}
                onComplete={() => {
                  toast.success("All sections complete! Don't forget to save.");
                }}
              />
            </div>
          )}
        </div>

        {/* Live Preview */}
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <Card className="overflow-hidden border-border/50">
            <CardHeader className="bg-gradient-to-br from-muted/50 to-muted/20 py-3">
              <CardTitle className="text-center text-sm font-medium">Card Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <CardView
                card={card}
                socialLinks={socialLinks}
                productImages={productImages}
                isInteractive={false}
                showQRCode={false}
                showVCardButtons={false}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

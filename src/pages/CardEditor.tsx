import { useEffect, useState, useRef, useCallback } from "react";
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
  Cloud,
  CloudOff,
  Loader2,
  FileDown,
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
import { SaveTemplateDialog } from "@/components/templates/SaveTemplateDialog";
import { useAuth } from "@/contexts/AuthContext";
import { usePublishLimit } from "@/hooks/usePublishLimit";

// Editor section components
import { SmartAccordion, EditorSection } from "@/components/editor/SmartAccordion";
import { EditorWizard, WizardStep } from "@/components/editor/EditorWizard";
import { BasicInformationSection } from "@/components/editor/sections/BasicInformationSection";
import { ContactInformationSection, AdditionalContact } from "@/components/editor/sections/ContactInformationSection";

import { CarouselSettingsSection } from "@/components/editor/sections/CarouselSettingsSection";
import { CustomUrlSection } from "@/components/editor/sections/CustomUrlSection";

type CardData = Tables<"cards">;

const STORAGE_KEY = "cardex_editor_section_order";
const AUTOSAVE_DELAY = 2000; // 2 seconds of inactivity

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
  "carousel",
  "qr",
  "theme",
  "custom-url",
];

type AutosaveStatus = "saved" | "saving" | "unsaved" | "error";

export default function CardEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState<CardData | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [additionalContacts, setAdditionalContacts] = useState<AdditionalContact[]>([]);
  const [regeneratingQR, setRegeneratingQR] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  
  // Layout mode: "accordion" or "wizard"
  const [layoutMode, setLayoutMode] = useState<"accordion" | "wizard">("accordion");
  
  // Admin from auth context
  const { isAdmin } = useAuth();
  const [customizeOrder, setCustomizeOrder] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_SECTION_ORDER;
  });

  // Autosave state
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("saved");
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(true);
  const lastSavedCardRef = useRef<string>("");

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
      // Store initial card state for comparison
      lastSavedCardRef.current = JSON.stringify(data);
      initialLoadRef.current = false;
    }
    setLoading(false);
  };

  // Autosave effect - triggers after AUTOSAVE_DELAY ms of inactivity
  useEffect(() => {
    // Skip on initial load or if card isn't loaded
    if (initialLoadRef.current || !card) return;

    // Check if card has changed from last saved state
    const currentCardString = JSON.stringify(card);
    if (currentCardString === lastSavedCardRef.current) return;

    // Mark as unsaved
    setAutosaveStatus("unsaved");

    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    // Set new timer for autosave
    autosaveTimerRef.current = setTimeout(() => {
      performAutosave();
    }, AUTOSAVE_DELAY);

    // Cleanup
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [card]);

  const performAutosave = useCallback(async () => {
    if (!card) return;

    // Validate before saving
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
    } catch (error) {
      // Don't autosave if validation fails
      setAutosaveStatus("error");
      return;
    }

    setAutosaveStatus("saving");

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
        slug: card.slug,
        custom_slug: card.custom_slug,
        carousel_settings: (card as any).carousel_settings,
        product_images: (card as any).product_images,
        package_images: (card as any).package_images,
        testimony_images: (card as any).testimony_images,
      })
      .eq("id", card.id);

    if (error) {
      setAutosaveStatus("error");
    } else {
      lastSavedCardRef.current = JSON.stringify(card);
      setAutosaveStatus("saved");
    }
  }, [card]);

  const loadSocialLinks = async () => {
    if (!id) return;

    // First try to load from card's social_links JSON field
    const { data: cardData } = await supabase
      .from("cards")
      .select("social_links")
      .eq("id", id)
      .single();

    if (cardData?.social_links && Array.isArray(cardData.social_links)) {
      const socialLinksData = cardData.social_links as unknown as SocialLink[];
      setSocialLinks(
        socialLinksData.map((link, index) => ({
          id: link.id || `link-${index}`,
          kind: link.kind,
          label: link.label,
          value: link.value,
          icon: link.icon || "",
        })),
      );
    } else {
      // Fallback: load from card_links table for backward compatibility
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
    }
  };

  const loadProductImages = async () => {
    if (!id) return;

    // Load from cards.product_images JSONB - already loaded with card
    // This function is now called after loadCard, card should have product_images
  };

  // Update productImages state when card is loaded
  useEffect(() => {
    if (card) {
      const rawProductImages = (card as any).product_images;
      if (rawProductImages && Array.isArray(rawProductImages)) {
        const images = rawProductImages.map((img: any, index: number) => ({
          id: `product-${index}`,
          image_url: img.image_url,
          alt_text: img.alt_text || null,
          description: img.description || null,
          sort_order: img.sort_order ?? index,
        }));
        setProductImages(images);
      } else {
        setProductImages([]);
      }
    }
  }, [card?.id]);

  const generateQRCode = async (shareUrl: string, cardSlug: string, customSettings?: any) => {
    try {
      const theme = card?.theme as any;
      const qrSettings = customSettings || theme?.qr || {};

      // Import QRCodeStyling dynamically
      const QRCodeStyling = (await import('qr-code-styling')).default;

      // Map pattern names to qr-code-styling dot types
      const dotTypeMap: Record<string, string> = {
        'squares': 'square',
        'classy': 'classy',
        'rounded': 'rounded',
        'classy-rounded': 'classy-rounded',
        'extra-rounded': 'extra-rounded',
        'dots': 'dots',
      };

      // Map eye style names to qr-code-styling corner types
      const cornerTypeMap: Record<string, string> = {
        'square': 'square',
        'extra-rounded': 'extra-rounded',
        'leaf': 'leaf', 
        'diamond': 'square',
        'dot': 'dot',
      };

      const isBackgroundMode = qrSettings.logoPosition === 'background' && qrSettings.logoUrl;
      const size = qrSettings.size || 512;

      const qrCode = new QRCodeStyling({
        width: size,
        height: size,
        data: shareUrl,
        margin: 10,
        dotsOptions: {
          color: qrSettings.darkColor || "#000000",
          type: (dotTypeMap[qrSettings.pattern] || 'square') as any,
        },
        backgroundOptions: {
          color: isBackgroundMode ? 'transparent' : (qrSettings.lightColor || "#FFFFFF"),
        },
        cornersSquareOptions: {
          color: qrSettings.darkColor || "#000000",
          type: (cornerTypeMap[qrSettings.eyeStyle] || 'square') as any,
        },
        cornersDotOptions: {
          color: qrSettings.darkColor || "#000000",
          type: (cornerTypeMap[qrSettings.eyeStyle] || 'square') as any,
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 10,
          imageSize: 0.4,
        },
        image: (!isBackgroundMode && qrSettings.logoUrl) ? qrSettings.logoUrl : undefined,
      });

      let blob = await qrCode.getRawData('png');
      if (!blob) throw new Error('Failed to generate QR code');

      // Handle Buffer type
      let blobData: Blob;
      if (blob instanceof Blob) {
        blobData = blob;
      } else {
        const uint8Array = new Uint8Array(blob as unknown as ArrayBuffer);
        blobData = new Blob([uint8Array], { type: 'image/png' });
      }

      // If background mode, composite the logo behind the QR
      if (isBackgroundMode && qrSettings.logoUrl) {
        blobData = await compositeQRWithBackgroundLogo(
          blobData,
          qrSettings.logoUrl,
          size,
          qrSettings.logoOpacity || 0.3,
          qrSettings.lightColor || "#FFFFFF"
        );
      }

      const fileName = `${cardSlug}-qr-${Date.now()}.png`;
      const filePath = `${card?.user_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("qrcodes").upload(filePath, blobData, { upsert: true });

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

  // Helper function to composite QR with background logo
  const compositeQRWithBackgroundLogo = (
    qrBlob: Blob,
    logoUrl: string,
    size: number,
    opacity: number,
    lightColor: string
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.fillStyle = lightColor;
      ctx.fillRect(0, 0, size, size);

      const logoImg = new window.Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.onload = () => {
        ctx.globalAlpha = opacity;
        
        const logoAspect = logoImg.width / logoImg.height;
        let drawWidth = size;
        let drawHeight = size;
        let drawX = 0;
        let drawY = 0;

        if (logoAspect > 1) {
          drawHeight = size;
          drawWidth = size * logoAspect;
          drawX = (size - drawWidth) / 2;
        } else {
          drawWidth = size;
          drawHeight = size / logoAspect;
          drawY = (size - drawHeight) / 2;
        }

        ctx.drawImage(logoImg, drawX, drawY, drawWidth, drawHeight);
        ctx.globalAlpha = 1;

        const qrImg = new window.Image();
        qrImg.onload = () => {
          ctx.drawImage(qrImg, 0, 0, size, size);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          }, 'image/png');
        };
        qrImg.onerror = reject;
        qrImg.src = URL.createObjectURL(qrBlob);
      };
      logoImg.onerror = reject;
      logoImg.src = logoUrl;
    });
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
      setAutosaveStatus("error");
    } else {
      if (qrCodeUrl && !card.qr_code_url) {
        setCard({ ...card, qr_code_url: qrCodeUrl });
      }
      lastSavedCardRef.current = JSON.stringify(card);
      setAutosaveStatus("saved");
      toast.success("Card saved!");
    }
    setSaving(false);
  };

  const { canPublish: checkCanPublish, isAdmin: publishLimitIsAdmin } = usePublishLimit();

  const togglePublish = async () => {
    if (!card) return;

    // If card is unpaid and trying to publish, redirect to billing
    if (!card.is_paid && !card.is_published) {
      toast.info("Please complete payment to publish your card");
      navigate(`/billing/${card.id}`);
      return;
    }

    const newStatus = !card.is_published;

    // Check publish limit for non-admins when trying to publish
    if (newStatus && !publishLimitIsAdmin) {
      const { allowed, message } = await checkCanPublish(card.id);
      if (!allowed) {
        toast.error(message || "You can only publish one card.");
        return;
      }
    }

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

  // Calculate section progress based on filled fields
  const calculateProgress = (sectionId: string): number => {
    if (!card) return 0;

    switch (sectionId) {
      case "basic": {
        const fields = [
          card.first_name,
          card.last_name,
          card.title,
          card.company,
          card.bio,
        ];
        const filled = fields.filter((f) => f && f.trim().length > 0).length;
        return Math.round((filled / fields.length) * 100);
      }
      case "contact": {
        const fields = [card.email, card.phone, card.website, card.location];
        const filled = fields.filter((f) => f && f.trim().length > 0).length;
        return Math.round((filled / fields.length) * 100);
      }
      case "social": {
        return socialLinks.length > 0 ? 100 : 0;
      }
      case "products": {
        // Check avatar, logo, cover + product images
        const imageFields = [card.avatar_url, card.logo_url, card.cover_url];
        const filledImages = imageFields.filter((f) => f && f.trim().length > 0).length;
        const hasProductImages = productImages.length > 0;
        const score = (filledImages / 3) * 50 + (hasProductImages ? 50 : 0);
        return Math.round(score);
      }
      case "carousel": {
        const theme = card.theme as any;
        return theme?.carouselSpeed ? 100 : 50; // Default settings count as 50%
      }
      case "qr": {
        const theme = card.theme as any;
        const qr = theme?.qr;
        if (qr && (qr.darkColor || qr.lightColor)) return 100;
        return 50; // Default QR counts as 50%
      }
      case "theme": {
        const theme = card.theme as any;
        if (!theme) return 0;
        const hasCustomColors = theme.primary || theme.background || theme.text;
        const hasFont = theme.font;
        const hasBackground = theme.backgroundType && theme.backgroundType !== "solid";
        let score = hasCustomColors ? 50 : 0;
        score += hasFont ? 25 : 0;
        score += hasBackground ? 25 : 0;
        return Math.min(100, score || 50); // Default theme counts as 50%
      }
      case "custom-url": {
        return card.custom_slug && card.custom_slug.length >= 3 ? 100 : 0;
      }
      default:
        return 0;
    }
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
        progress: calculateProgress("basic"),
        content: (
          <BasicInformationSection
            card={card}
            validationErrors={validationErrors}
            onCardChange={handleCardChange}
            onValidationErrorChange={setValidationErrors}
            theme={(card.theme as any) || {}}
            onThemeChange={(theme) => setCard({ ...card, theme: theme as any })}
          />
        ),
      },
      contact: {
        id: "contact",
        title: "Contact Information",
        description: "Email, phone, website, and location",
        icon: <Phone className="h-4 w-4" />,
        progress: calculateProgress("contact"),
        content: (
          <ContactInformationSection
            card={card}
            validationErrors={validationErrors}
            onCardChange={handleCardChange}
            onAdditionalContactsChange={setAdditionalContacts}
          />
        ),
      },
      social: {
        id: "social",
        title: "Social Media Links",
        description: "Add your social profiles",
        icon: <Share className="h-4 w-4" />,
        progress: calculateProgress("social"),
        content: <SocialMediaLinks cardId={card.id} onLinksChange={setSocialLinks} />,
      },
      carousel: {
        id: "carousel",
        title: "Carousel Settings",
        description: "Configure image carousel behavior",
        icon: <Settings className="h-4 w-4" />,
        progress: calculateProgress("carousel"),
        content: <CarouselSettingsSection card={card} onCardChange={handleCardChange} />,
      },
      qr: {
        id: "qr",
        title: "QR Code Customization",
        description: "Customize your QR code appearance",
        icon: <QrCode className="h-4 w-4" />,
        progress: calculateProgress("qr"),
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
            cardId={card.id}
            userId={card.user_id}
            previewUrl={card.share_url || `https://card-ex.com/c/${card.slug}`}
          />
        ),
      },
      theme: {
        id: "theme",
        title: "Theme Customization",
        description: "Colors, fonts, and visual style",
        icon: <Palette className="h-4 w-4" />,
        progress: calculateProgress("theme"),
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
        progress: calculateProgress("custom-url"),
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

  // Autosave status indicator component
  const AutosaveIndicator = () => {
    const statusConfig = {
      saved: {
        icon: <Cloud className="h-4 w-4 text-green-500" />,
        text: "Saved",
        className: "text-green-500",
      },
      saving: {
        icon: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />,
        text: "Saving...",
        className: "text-muted-foreground",
      },
      unsaved: {
        icon: <Cloud className="h-4 w-4 text-amber-500" />,
        text: "Unsaved",
        className: "text-amber-500",
      },
      error: {
        icon: <CloudOff className="h-4 w-4 text-destructive" />,
        text: "Error",
        className: "text-destructive",
      },
    };

    const config = statusConfig[autosaveStatus];

    return (
      <div className={`flex items-center gap-1.5 text-xs ${config.className}`}>
        {config.icon}
        <span className="hidden sm:inline">{config.text}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background w-full max-w-full overflow-x-hidden">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur sticky top-0 z-50">
        <div className="w-full max-w-full px-3 sm:px-4 mx-auto">
          {/* Top row: Back button and autosave */}
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1 sm:gap-2 px-2 sm:px-3">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden xs:inline">Back</span>
              </Button>
              <AutosaveIndicator />
            </div>
            {/* Action buttons - wrap on mobile */}
            <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
              <Button variant="outline" size="sm" onClick={() => setSaveTemplateDialogOpen(true)} className="gap-1 px-2 sm:px-3">
                <FileDown className="h-4 w-4" />
                <span className="hidden md:inline">Save Template</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/cards/${card.id}/analytics`)} className="gap-1 px-2 sm:px-3">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden md:inline">Analytics</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)} className="gap-1 px-2 sm:px-3">
                <Share2 className="h-4 w-4" />
                <span className="hidden md:inline">Generate</span>
              </Button>
              <ShareCardDialog cardId={card.id} open={shareDialogOpen} onOpenChange={setShareDialogOpen} />
              <SaveTemplateDialog 
                card={card} 
                open={saveTemplateDialogOpen} 
                onOpenChange={setSaveTemplateDialogOpen} 
              />
              <Button size="sm" onClick={togglePublish} variant={card.is_published ? "secondary" : "default"} className="px-2 sm:px-3">
                <span className="hidden sm:inline">{card.is_published ? "Unpublish" : "Publish"}</span>
                <span className="sm:hidden">{card.is_published ? "Off" : "On"}</span>
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1 px-2 sm:px-3">
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">{saving ? "Saving..." : "Save"}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-full overflow-x-hidden px-3 sm:px-4 py-4 sm:py-6 mx-auto grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Editor Column */}
        <div className="w-full max-w-full overflow-x-hidden space-y-4">
          {/* Mode Switcher & Admin Controls */}
          <div className="flex flex-col gap-3 pb-4 border-b border-border/50">
            <ToggleGroup
              type="single"
              value={layoutMode}
              onValueChange={(value) => value && setLayoutMode(value as "accordion" | "wizard")}
              className="justify-start w-full"
            >
              <ToggleGroupItem value="accordion" className="gap-1.5 sm:gap-2 flex-1 sm:flex-none">
                <Layers className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Accordion</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="wizard" className="gap-1.5 sm:gap-2 flex-1 sm:flex-none">
                <ListOrdered className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Step-by-Step</span>
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
        <div className="w-full max-w-full overflow-x-hidden lg:sticky lg:top-24 lg:h-fit">
          <Card className="overflow-hidden border-border/50 transition-all duration-300 w-full">
            <CardHeader className="bg-gradient-to-br from-muted/50 to-muted/20 py-3">
              <CardTitle className="text-center text-sm font-medium">Card Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              <div className="transition-all duration-500 ease-out w-full max-w-full overflow-x-hidden">
                <CardView
                  card={card}
                  socialLinks={socialLinks}
                  productImages={productImages}
                  additionalContacts={additionalContacts}
                  isInteractive={false}
                  showQRCode={true}
                  showVCardButtons={false}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

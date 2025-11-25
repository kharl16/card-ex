import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Eye,
  Mail,
  Phone,
  Globe,
  Share2,
  BarChart3,
  Facebook,
  Linkedin,
  Instagram,
  Twitter,
  Youtube,
  MessageCircle,
  Music,
  X,
} from "lucide-react";
import ShareCardDialog from "@/components/ShareCardDialog";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";
import { z } from "zod";
import ImageUpload from "@/components/ImageUpload";
import ThemeCustomizer from "@/components/ThemeCustomizer";
import SocialMediaLinks from "@/components/SocialMediaLinks";
import QRCodeCustomizer from "@/components/QRCodeCustomizer";
import QRCode from "qrcode";
import ProductImageManager from "@/components/ProductImageManager";

type CardData = Tables<"cards">;

interface SocialLink {
  id: string;
  kind: string;
  label: string;
  value: string;
  icon: string;
}

const socialIconMap: Record<string, any> = {
  Facebook,
  Linkedin,
  Instagram,
  Twitter,
  Youtube,
  MessageCircle,
  Music,
  Globe,
};

const socialBrandColors: Record<string, string> = {
  facebook: "bg-[#1877F2]",
  linkedin: "bg-[#0A66C2]",
  instagram: "bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#FD1D1D]",
  x: "bg-black",
  youtube: "bg-[#FF0000]",
  telegram: "bg-[#26A5E4]",
  tiktok: "bg-black",
  url: "bg-[#4285F4]",
};

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

export default function CardEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState<CardData | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [regeneratingQR, setRegeneratingQR] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Validate name fields for special characters
  const validateNameField = (value: string, fieldName: string): string | null => {
    const specialChars = /[^a-zA-Z\s\-'\.]/;
    if (specialChars.test(value)) {
      return `${fieldName} can only contain letters, spaces, hyphens, apostrophes, and periods`;
    }
    return null;
  };

  // Sanitize prefix/suffix to prevent vCard-breaking characters
  const sanitizeNameField = (value: string): string => {
    return value
      .replace(/[;\n\r]/g, " ")
      .replace(/[\\,]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 20);
  };

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

    const { error } = await supabase
      .from("cards")
      .update({
        prefix: card.prefix,
        first_name: card.first_name,
        middle_name: card.middle_name,
        last_name: card.last_name,
        suffix: card.suffix,
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
      <header className="border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/cards/${card.id}/analytics`)} className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
            <Button variant="outline" onClick={() => window.open(`/c/${card.slug}`, "_blank")} className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button variant="outline" onClick={() => setShareDialogOpen(true)} className="gap-2">
              <Share2 className="h-4 w-4" />
              Generate Card
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

      <main className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Images Section */}
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <ImageUpload
                  value={card.avatar_url}
                  onChange={(url) => setCard({ ...card, avatar_url: url })}
                  label="Avatar"
                  aspectRatio="aspect-square"
                  maxSize={5}
                />
                <ImageUpload
                  value={card.logo_url}
                  onChange={(url) => setCard({ ...card, logo_url: url })}
                  label="Company Logo"
                  aspectRatio="aspect-square"
                  maxSize={2}
                />
                <ImageUpload
                  value={card.cover_url}
                  onChange={(url) => setCard({ ...card, cover_url: url })}
                  label="Cover Photo"
                  aspectRatio="aspect-square"
                  maxSize={5}
                />
              </div>
            </CardContent>
          </Card>

          <ThemeCustomizer
            theme={(card.theme as any) || { primary: "#D4AF37", background: "#0B0B0C", text: "#F8F8F8" }}
            onChange={(theme) => setCard({ ...card, theme: theme as any })}
          />

          <SocialMediaLinks cardId={card.id} />

          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductImageManager cardId={card.id} ownerId={card.user_id} />
            </CardContent>
          </Card>

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

          <Card>
            <CardHeader>
              <CardTitle>Carousel Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="carouselSpeed">Auto-play Speed (ms)</Label>
                <Input
                  id="carouselSpeed"
                  type="number"
                  min="1000"
                  max="10000"
                  step="500"
                  value={(card.theme as any)?.carouselSpeed || 4000}
                  onChange={(e) => {
                    const currentTheme = (card.theme as any) || {};
                    const updatedTheme = {
                      ...currentTheme,
                      carouselSpeed: parseInt(e.target.value) || 4000,
                    };
                    setCard({ ...card, theme: updatedTheme as any });
                  }}
                  placeholder="4000"
                />
                <p className="text-xs text-muted-foreground">Time between slides (1000 = 1 second). Default: 4000ms</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom URL</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom_slug">Custom Short URL (Optional)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">tagex.app/</span>
                  <Input
                    id="custom_slug"
                    value={card.custom_slug || ""}
                    onChange={(e) =>
                      setCard({
                        ...card,
                        custom_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                      })
                    }
                    placeholder="john (3-50 chars)"
                    maxLength={50}
                    className={validationErrors.custom_slug ? "border-destructive" : ""}
                  />
                </div>
                {validationErrors.custom_slug && (
                  <p className="text-xs text-destructive">{validationErrors.custom_slug}</p>
                )}
                {card.custom_slug && (
                  <p className="text-xs text-muted-foreground">Short URL: tagex.app/{card.custom_slug}</p>
                )}
                {!card.custom_slug && (
                  <p className="text-xs text-muted-foreground">Leave empty to use default URL with /c/ prefix</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Default URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/c/</span>
                  <Input
                    id="slug"
                    value={card.slug}
                    onChange={(e) =>
                      setCard({
                        ...card,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                      })
                    }
                    placeholder="your-name"
                    maxLength={100}
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Fallback URL: {window.location.origin}/c/{card.slug}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* BASIC INFORMATION */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Name * (Left to Right)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCard({
                        ...card,
                        prefix: "",
                        first_name: "",
                        middle_name: "",
                        last_name: "",
                        suffix: "",
                      });
                      setValidationErrors((prev) => ({
                        ...prev,
                        prefix: "",
                        first_name: "",
                        middle_name: "",
                        last_name: "",
                        suffix: "",
                      }));
                    }}
                    className="h-8 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                </div>

                {/* Single top preview bar (uses getFormattedName) */}
                <div className="text-sm text-muted-foreground mb-2 p-2 bg-muted/50 rounded-md">
                  <span className="font-medium">Preview: </span>
                  {getFormattedName()}
                </div>

                {/* COMPACT HORIZONTAL NAME FIELDS */}
                <div className="overflow-x-auto">
                  <div className="flex min-w-[640px] gap-3">
                    {/* Prefix */}
                    <div className="flex-1">
                      <Label htmlFor="prefix" className="mb-1 block text-xs text-muted-foreground text-center">
                        Prefix
                      </Label>
                      <Input
                        id="prefix"
                        value={card.prefix || ""}
                        onChange={(e) => {
                          const value = sanitizeNameField(e.target.value);
                          const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                          const error = validateNameField(capitalized, "Prefix");
                          setValidationErrors((prev) => ({
                            ...prev,
                            prefix: error || "",
                          }));
                          setCard({ ...card, prefix: capitalized });
                        }}
                        placeholder="Mr."
                        maxLength={20}
                        className={cn("h-9 text-sm text-center", validationErrors.prefix && "border-destructive")}
                      />
                    </div>

                    {/* First Name */}
                    <div className="flex-1">
                      <Label htmlFor="first_name" className="mb-1 block text-xs text-muted-foreground text-center">
                        First Name *
                      </Label>
                      <Input
                        id="first_name"
                        value={card.first_name || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                          const error = validateNameField(capitalized, "First name");
                          setValidationErrors((prev) => ({
                            ...prev,
                            first_name: error || "",
                          }));
                          setCard({ ...card, first_name: capitalized });
                        }}
                        placeholder="Juan"
                        maxLength={50}
                        className={cn("h-9 text-sm text-center", validationErrors.first_name && "border-destructive")}
                      />
                    </div>

                    {/* Middle Name */}
                    <div className="flex-1">
                      <Label htmlFor="middle_name" className="mb-1 block text-xs text-muted-foreground text-center">
                        Middle Name
                      </Label>
                      <Input
                        id="middle_name"
                        value={card.middle_name || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                          const error = validateNameField(capitalized, "Middle name");
                          setValidationErrors((prev) => ({
                            ...prev,
                            middle_name: error || "",
                          }));
                          setCard({ ...card, middle_name: capitalized });
                        }}
                        placeholder="Santos"
                        maxLength={50}
                        className={cn("h-9 text-sm text-center", validationErrors.middle_name && "border-destructive")}
                      />
                    </div>

                    {/* Last Name */}
                    <div className="flex-1">
                      <Label htmlFor="last_name" className="mb-1 block text-xs text-muted-foreground text-center">
                        Last Name *
                      </Label>
                      <Input
                        id="last_name"
                        value={card.last_name || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                          const error = validateNameField(capitalized, "Last name");
                          setValidationErrors((prev) => ({
                            ...prev,
                            last_name: error || "",
                          }));
                          setCard({ ...card, last_name: capitalized });
                        }}
                        placeholder="Dela Cruz"
                        maxLength={50}
                        className={cn("h-9 text-sm text-center", validationErrors.last_name && "border-destructive")}
                      />
                    </div>

                    {/* Suffix */}
                    <div className="flex-1">
                      <Label htmlFor="suffix" className="mb-1 block text-xs text-muted-foreground text-center">
                        Suffix
                      </Label>
                      <Input
                        id="suffix"
                        value={card.suffix || ""}
                        onChange={(e) => {
                          const value = sanitizeNameField(e.target.value);
                          const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                          const error = validateNameField(capitalized, "Suffix");
                          setValidationErrors((prev) => ({
                            ...prev,
                            suffix: error || "",
                          }));
                          setCard({ ...card, suffix: capitalized });
                        }}
                        placeholder="Jr."
                        maxLength={20}
                        className={cn("h-9 text-sm text-center", validationErrors.suffix && "border-destructive")}
                      />
                    </div>
                  </div>
                </div>

                {/* Name validation errors */}
                {(validationErrors.prefix ||
                  validationErrors.first_name ||
                  validationErrors.middle_name ||
                  validationErrors.last_name ||
                  validationErrors.suffix) && (
                  <div className="space-y-1">
                    {validationErrors.prefix && <p className="text-sm text-destructive">{validationErrors.prefix}</p>}
                    {validationErrors.first_name && (
                      <p className="text-sm text-destructive">{validationErrors.first_name}</p>
                    )}
                    {validationErrors.middle_name && (
                      <p className="text-sm text-destructive">{validationErrors.middle_name}</p>
                    )}
                    {validationErrors.last_name && (
                      <p className="text-sm text-destructive">{validationErrors.last_name}</p>
                    )}
                    {validationErrors.suffix && <p className="text-sm text-destructive">{validationErrors.suffix}</p>}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={card.title || ""}
                    onChange={(e) => setCard({ ...card, title: e.target.value })}
                    placeholder="e.g. CEO, Designer"
                    maxLength={100}
                    className={validationErrors.title ? "border-destructive" : ""}
                  />
                  {validationErrors.title && <p className="text-sm text-destructive">{validationErrors.title}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={card.company || ""}
                    onChange={(e) => setCard({ ...card, company: e.target.value })}
                    maxLength={100}
                    className={validationErrors.company ? "border-destructive" : ""}
                  />
                  {validationErrors.company && <p className="text-sm text-destructive">{validationErrors.company}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={card.bio || ""}
                  onChange={(e) => setCard({ ...card, bio: e.target.value })}
                  rows={4}
                  maxLength={500}
                  className={validationErrors.bio ? "border-destructive" : ""}
                />
                {validationErrors.bio && <p className="text-sm text-destructive">{validationErrors.bio}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={card.email || ""}
                    onChange={(e) => setCard({ ...card, email: e.target.value })}
                    maxLength={255}
                    className={validationErrors.email ? "border-destructive" : ""}
                  />
                  {validationErrors.email && <p className="text-sm text-destructive">{validationErrors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={card.phone || ""}
                    onChange={(e) => setCard({ ...card, phone: e.target.value })}
                    maxLength={30}
                    className={validationErrors.phone ? "border-destructive" : ""}
                  />
                  {validationErrors.phone && <p className="text-sm text-destructive">{validationErrors.phone}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={card.website || ""}
                    onChange={(e) => setCard({ ...card, website: e.target.value })}
                    placeholder="https://"
                    maxLength={255}
                    className={validationErrors.website ? "border-destructive" : ""}
                  />
                  {validationErrors.website && <p className="text-sm text-destructive">{validationErrors.website}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={card.location || ""}
                    onChange={(e) => setCard({ ...card, location: e.target.value })}
                    placeholder="City, Country"
                    maxLength={200}
                    className={validationErrors.location ? "border-destructive" : ""}
                  />
                  {validationErrors.location && <p className="text-sm text-destructive">{validationErrors.location}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="lg:sticky lg:top-8 lg:h-fit">
          <Card className="overflow-hidden border-border/50">
            <CardHeader className="bg-gradient-to-br from-muted/50 to-muted/20">
              <CardTitle className="text-center text-sm font-medium">Card Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
                {/* Cover */}
                <div className="relative h-40 sm:h-48 bg-gradient-to-br from-primary/20 to-primary/5">
                  {card.cover_url && (
                    <>
                      <img src={card.cover_url} alt="Cover" className="h-full w-full object-contain" />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent"></div>
                    </>
                  )}

                  {/* Avatar */}
                  <div className="absolute -bottom-10 left-4 h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 border-background bg-muted overflow-hidden shadow-2xl ring-4 ring-black/10 hover:scale-105 transition-transform duration-300">
                    {card.avatar_url && (
                      <img src={card.avatar_url} alt={card.full_name} className="h-full w-full object-cover" />
                    )}
                  </div>

                  {/* Logo */}
                  {card.logo_url && (
                    <div className="absolute -bottom-8 right-4 h-16 w-28 sm:h-20 sm:w-32 rounded-lg bg-black/90 p-1.5 shadow-2xl ring-4 ring-black/10 hover:scale-105 transition-transform duration-300">
                      <img src={card.logo_url} alt="Logo" className="h-full w-full object-contain" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="px-4 pt-14 pb-4">
                  <h3 className="text-xl font-bold">{card.full_name}</h3>
                  {card.title && <p className="text-sm text-foreground/80 mt-1">{card.title}</p>}
                  {card.company && <p className="text-sm text-muted-foreground">{card.company}</p>}
                  {card.bio && <p className="mt-3 text-sm text-muted-foreground">{card.bio}</p>}
                </div>

                {/* Social Media Links */}
                {socialLinks.length > 0 && (
                  <div className="flex flex-wrap gap-3 justify-center px-4 pb-4">
                    {socialLinks.map((link) => {
                      const IconComponent = socialIconMap[link.icon];
                      const brandColor = socialBrandColors[link.kind] || "bg-green-600";
                      return (
                        <div
                          key={link.id}
                          className={`flex h-12 w-12 items-center justify-center rounded-full ${brandColor} hover:scale-110 hover:opacity-90 transition-all duration-200 cursor-pointer shadow-md`}
                          title={link.label}
                        >
                          {IconComponent && <IconComponent className="h-6 w-6 text-white" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Contact Buttons Preview */}
                <div className="space-y-3 px-4 pb-4">
                  {card.email && (
                    <div className="flex items-center gap-3 group">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EA4335] group-hover:scale-110 transition-transform duration-200 shadow-md">
                        <Mail className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{card.email}</p>
                        <p className="text-xs text-muted-foreground">Personal</p>
                      </div>
                    </div>
                  )}
                  {card.phone && (
                    <div className="flex items-center gap-3 group">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#34A853] group-hover:scale-110 transition-transform duration-200 shadow-md">
                        <Phone className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{card.phone}</p>
                        <p className="text-xs text-muted-foreground">Mobile</p>
                      </div>
                    </div>
                  )}
                  {card.website && (
                    <div className="flex items-center gap-3 group">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#4285F4] group-hover:scale-110 transition-transform duration-200 shadow-md">
                        <Globe className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{card.website}</p>
                        <p className="text-xs text-muted-foreground">Website</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Save Contact Button */}
                <div className="px-4 pb-4">
                  <button className="w-full h-14 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded-full transition-colors">
                    Save Contact
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

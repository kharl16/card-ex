import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, Layers, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TemplateGallery } from "@/components/templates/TemplateGallery";
import { CardTemplate, LayoutData } from "@/hooks/useTemplates";
import { cn } from "@/lib/utils";

interface AdminCreateCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUserName: string;
  onSuccess?: () => void;
}

// Default theme matching the MLM gold branding
const DEFAULT_THEME = {
  name: "Black&Gold",
  text: "#F8F8F8",
  primary: "#D4AF37",
  accent: "#FACC15",
  background: "#0B0B0C",
  buttonColor: "#D4AF37",
  baseMode: "dark",
  variants: {
    A: {
      font: "Montserrat",
      text: "#F9FAFB",
      accent: "#FACC15",
      primary: "#D4AF37",
      background: "#050509",
      buttonColor: "#D4AF37",
      gradientEnd: "#1F2937",
      gradientStart: "#050509",
      backgroundType: "gradient",
      gradientDirection: "to-tr",
    },
    B: {
      text: "#F8F8F8",
      primary: "#D4AF37",
      background: "#0B0B0C",
    },
  },
  activeVariant: "A",
};

type Step = "choice" | "templates";

export function AdminCreateCardDialog({ 
  open, 
  onOpenChange, 
  targetUserId, 
  targetUserName,
  onSuccess 
}: AdminCreateCardDialogProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("choice");
  const [creating, setCreating] = useState(false);

  const generateSlug = () => {
    return `${targetUserId.slice(0, 8)}-${Date.now()}`;
  };

  const createCard = async (layoutData?: LayoutData) => {
    if (!targetUserId) return;

    setCreating(true);
    try {
      const slug = generateSlug();
      
      // Get theme from template or use default
      // IMPORTANT: Extract only QR styling, not QR data/URL
      const templateTheme = layoutData?.theme || {};
      const theme = {
        ...DEFAULT_THEME,
        ...templateTheme,
        // Ensure QR settings only have styling, no actual QR data
        qr: templateTheme.qr ? {
          pattern: templateTheme.qr.pattern,
          eyeStyle: templateTheme.qr.eyeStyle,
          darkColor: templateTheme.qr.darkColor,
          lightColor: templateTheme.qr.lightColor,
          size: templateTheme.qr.size,
          logoPosition: templateTheme.qr.logoPosition,
          logoOpacity: templateTheme.qr.logoOpacity,
          // Include logo URL from template if it's a design asset (not personal)
          logoUrl: templateTheme.qr.logoUrl,
          gradientEnabled: templateTheme.qr.gradientEnabled,
          gradientColor1: templateTheme.qr.gradientColor1,
          gradientColor2: templateTheme.qr.gradientColor2,
          gradientType: templateTheme.qr.gradientType,
          frameStyle: templateTheme.qr.frameStyle,
          frameColor: templateTheme.qr.frameColor,
          frameWidth: templateTheme.qr.frameWidth,
          frameBorderRadius: templateTheme.qr.frameBorderRadius,
          framePadding: templateTheme.qr.framePadding,
          frameShadow: templateTheme.qr.frameShadow,
          // Explicitly DO NOT copy: qrCodeUrl, shareUrl, or any encoded data
        } : undefined,
      };
      
      const carouselEnabled = layoutData?.carousel_enabled ?? true;

      // Create the card for the target user (not the admin)
      const { data, error } = await supabase
        .from("cards")
        .insert({
          user_id: targetUserId,
          full_name: targetUserName || "New Card",
          slug,
          is_published: false,
          theme,
          carousel_enabled: carouselEnabled,
          // Apply design assets from template
          cover_url: layoutData?.cover_url || null,
          logo_url: layoutData?.logo_url || null,
          // Personal fields are intentionally left empty
          avatar_url: null,
          email: null,
          phone: null,
          location: null,
          bio: null,
          title: null,
          company: null,
          website: null,
        })
        .select()
        .single();

      if (error) throw error;

      // If template has product images, copy them to the new card
      if (layoutData?.product_images && layoutData.product_images.length > 0) {
        const productImageInserts = layoutData.product_images.map((img: any, index: number) => ({
          card_id: data.id,
          owner: targetUserId,
          image_url: img.image_url,
          alt_text: img.alt_text || null,
          description: img.description || null,
          sort_order: index,
        }));

        await supabase.from("product_images").insert(productImageInserts);
      }

      toast.success("Card created for " + targetUserName);
      onOpenChange(false);
      setStep("choice");
      onSuccess?.();
      
      // Navigate to edit the new card
      navigate(`/cards/${data.id}/edit`);
    } catch (error: any) {
      console.error("Error creating card:", error);
      toast.error(error.message || "Failed to create card");
    } finally {
      setCreating(false);
    }
  };

  const handleBuildFromScratch = () => {
    createCard();
  };

  const handleSelectTemplate = (template: CardTemplate) => {
    createCard(template.layout_data as LayoutData);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep("choice");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(
        "overflow-y-auto transition-all",
        step === "templates" ? "max-h-[90vh] sm:max-w-[800px]" : "sm:max-w-[600px]"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {step === "choice" ? (
              <>
                <Sparkles className="h-5 w-5 text-primary" />
                Create Card for {targetUserName}
              </>
            ) : (
              <>
                <Layers className="h-5 w-5 text-primary" />
                Choose a Template
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === "choice"
              ? "How would you like to start this card?"
              : "Select a template to get started quickly."}
          </DialogDescription>
        </DialogHeader>

        {creating ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Creating card for {targetUserName}...</p>
          </div>
        ) : step === "choice" ? (
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <Card
              className="cursor-pointer border-2 transition-all hover:border-primary hover:shadow-lg"
              onClick={handleBuildFromScratch}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Build from Scratch</CardTitle>
                    <CardDescription>Start fresh with defaults</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Create a fully custom card with the Card-Ex gold theme. Perfect for unique designs.
                </p>
                <Button className="w-full gap-2">
                  Start Building
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer border-2 transition-all hover:border-primary hover:shadow-lg"
              onClick={() => setStep("templates")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/5">
                    <Layers className="h-7 w-7 text-accent" />
                  </div>
                  <div>
                    <CardTitle>Use a Template</CardTitle>
                    <CardDescription>Start with a pre-made design</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Choose from professionally designed templates. Just add the member's details!
                </p>
                <Button variant="secondary" className="w-full gap-2">
                  Browse Templates
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="py-4">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4"
              onClick={() => setStep("choice")}
            >
              ← Back to options
            </Button>
            <TemplateGallery
              onSelectTemplate={handleSelectTemplate}
              onBuildFromScratch={handleBuildFromScratch}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

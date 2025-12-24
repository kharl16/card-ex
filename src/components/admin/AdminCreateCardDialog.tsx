import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, Layers, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TemplateGallery } from "@/components/templates/TemplateGallery";
import { CardTemplate, LayoutData } from "@/hooks/useTemplates";
import { cn } from "@/lib/utils";
import { buildCardInsertFromSnapshot, buildCardLinksInsertFromSnapshot, type CardSnapshot } from "@/lib/cardSnapshot";

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
  onSuccess,
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

      let insertData: Record<string, any>;

      if (layoutData) {
        // Use the unified snapshot builder for template-based cards
        const snapshot = layoutData as CardSnapshot;
        insertData = buildCardInsertFromSnapshot(snapshot, targetUserId, slug, {
          full_name: layoutData.full_name || targetUserName || "New Card",
          owner_name: targetUserName || undefined,
          is_published: false,
        });
        // Merge DEFAULT_THEME with template theme
        insertData.theme = { ...DEFAULT_THEME, ...snapshot.theme };
      } else {
        // Build from scratch - minimal card
        insertData = {
          user_id: targetUserId,
          slug,
          is_published: false,
          theme: DEFAULT_THEME,
          carousel_enabled: true,
          full_name: targetUserName || "New Card",
          owner_name: targetUserName || null,
          card_type: 'publishable',
        };
      }

      const { data, error } = await supabase
        .from("cards")
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;

      // If template has card links, copy them to the new card
      if (layoutData?.card_links && layoutData.card_links.length > 0) {
        const cardLinkInserts = buildCardLinksInsertFromSnapshot(layoutData as CardSnapshot, data.id);
        await supabase.from("card_links").insert(cardLinkInserts);
      }

      toast.success("Card created for " + targetUserName);
      onOpenChange(false);
      setStep("choice");
      onSuccess?.();

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
      <DialogContent
        className={cn(
          "overflow-y-auto transition-all",
          step === "templates" ? "max-h-[90vh] sm:max-w-[800px]" : "sm:max-w-[600px]",
        )}
      >
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
            {step === "choice" ? "How would you like to start this card?" : "Select a template to get started quickly."}
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
                  Choose from professionally designed templates. Just add the member&apos;s details!
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
            <Button variant="ghost" size="sm" className="mb-4" onClick={() => setStep("choice")}>
              ← Back to options
            </Button>
            <TemplateGallery onSelectTemplate={handleSelectTemplate} onBuildFromScratch={handleBuildFromScratch} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

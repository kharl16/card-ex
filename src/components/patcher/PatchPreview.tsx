import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Check, X, AlertTriangle, ArrowRight } from "lucide-react";
import type { Tables, Json } from "@/integrations/supabase/types";
import type { PatchOptionsState } from "./PatchOptions";

type CardTemplate = Tables<"card_templates">;
type CardData = Tables<"cards">;

interface LayoutData {
  theme?: Record<string, any>;
  carousel_settings?: Record<string, any>;
  product_images?: any[];
  package_images?: any[];
  testimony_images?: any[];
  card_links?: any[];
  social_links?: any[];
}

interface PatchPreviewProps {
  template: CardTemplate;
  previewCard: CardData | null;
  patchOptions: PatchOptionsState;
  totalCards: number;
}

export function PatchPreview({ template, previewCard, patchOptions, totalCards }: PatchPreviewProps) {
  const layout = template.layout_data as unknown as LayoutData;
  
  const getChangeSummary = () => {
    const changes: Array<{ label: string; type: "apply" | "merge" | "overwrite" | "skip" }> = [];
    
    if (patchOptions.theme) changes.push({ label: "Theme & Background", type: "apply" });
    if (patchOptions.fonts) changes.push({ label: "Typography", type: "apply" });
    if (patchOptions.buttonStyles) changes.push({ label: "Button Styles", type: "apply" });
    if (patchOptions.layoutConfig) changes.push({ label: "Layout Config", type: "apply" });
    if (patchOptions.qrTheme) changes.push({ label: "QR Theme", type: "apply" });
    if (patchOptions.qrContainer) changes.push({ label: "QR Container", type: "apply" });
    
    // Carousel sections
    if (patchOptions.carouselProducts.settings) {
      changes.push({ label: "Products Settings", type: "apply" });
    }
    if (patchOptions.carouselProducts.images.apply) {
      changes.push({ 
        label: "Products Images", 
        type: patchOptions.carouselProducts.images.mode as "merge" | "overwrite"
      });
    }
    
    if (patchOptions.carouselPackages.settings) {
      changes.push({ label: "Packages Settings", type: "apply" });
    }
    if (patchOptions.carouselPackages.images.apply) {
      changes.push({ 
        label: "Packages Images", 
        type: patchOptions.carouselPackages.images.mode as "merge" | "overwrite"
      });
    }
    
    if (patchOptions.carouselTestimonies.settings) {
      changes.push({ label: "Testimonies Settings", type: "apply" });
    }
    if (patchOptions.carouselTestimonies.images.apply) {
      changes.push({ 
        label: "Testimonies Images", 
        type: patchOptions.carouselTestimonies.images.mode as "merge" | "overwrite"
      });
    }
    
    if (patchOptions.socialLinkStyling) changes.push({ label: "Social Link Styling", type: "apply" });
    if (patchOptions.socialLinksMerge) changes.push({ label: "Social Links", type: "merge" });
    if (patchOptions.socialLinksOverwrite) changes.push({ label: "Social Links", type: "overwrite" });
    if (patchOptions.sectionHeaders) changes.push({ label: "Section Headers", type: "apply" });
    if (patchOptions.sectionVisibility) changes.push({ label: "Section Visibility", type: "apply" });
    
    return changes;
  };
  
  const getPreservedFields = () => [
    "Name (full_name, first_name, etc.)",
    "Phone, Email, Website",
    "Location",
    "Avatar, Cover Photo, Logo",
    "Slug / Public URL",
    "Personal Social Link Values",
    "Existing carousel images (unless merge/overwrite selected)",
  ];
  
  const changes = getChangeSummary();
  const preserved = getPreservedFields();
  
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* What Will Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRight className="h-4 w-4 text-primary" />
            What Will Change
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {changes.length === 0 ? (
                <p className="text-muted-foreground text-sm">No changes selected</p>
              ) : (
                changes.map((change, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-sm">{change.label}</span>
                    <Badge 
                      variant={change.type === "overwrite" ? "destructive" : change.type === "merge" ? "secondary" : "default"}
                      className="text-xs"
                    >
                      {change.type}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* What Will Be Preserved */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Check className="h-4 w-4 text-green-500" />
            What Will Be Preserved
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {preserved.map((field, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded bg-green-500/10">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{field}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Summary */}
      <Card className="md:col-span-2">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Source Template</p>
              <p className="font-medium">{template.name}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="space-y-1 text-right">
              <p className="text-sm text-muted-foreground">Target Cards</p>
              <p className="font-medium">{totalCards} card{totalCards !== 1 ? "s" : ""}</p>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-600">Important</p>
              <p className="text-muted-foreground">
                This operation will modify {totalCards} card{totalCards !== 1 ? "s" : ""}. 
                A backup of each card's current state will be saved for potential rollback.
                Personal information and existing assets will not be modified unless explicitly selected above.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
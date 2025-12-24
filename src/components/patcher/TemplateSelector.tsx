import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Check, Image, Palette, QrCode, Layout } from "lucide-react";
import type { Tables, Json } from "@/integrations/supabase/types";

type CardTemplate = Tables<"card_templates">;

interface TemplateSelectorProps {
  templates: CardTemplate[];
  selectedTemplate: CardTemplate | null;
  onSelect: (template: CardTemplate) => void;
  loading?: boolean;
}

interface LayoutData {
  theme?: Record<string, any>;
  carousel_settings?: Record<string, any>;
  product_images?: any[];
  package_images?: any[];
  testimony_images?: any[];
}

export function TemplateSelector({ templates, selectedTemplate, onSelect, loading }: TemplateSelectorProps) {
  const [search, setSearch] = useState("");
  
  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );
  
  const getTemplateStats = (template: CardTemplate) => {
    const layout = template.layout_data as unknown as LayoutData;
    const theme = layout?.theme || {};
    const productCount = layout?.product_images?.length || 0;
    const packageCount = layout?.package_images?.length || 0;
    const testimonyCount = layout?.testimony_images?.length || 0;
    
    return {
      themeName: theme?.name || "Custom",
      hasQR: !!theme?.qrSettings,
      hasCarousel: !!layout?.carousel_settings,
      imageCount: productCount + packageCount + testimonyCount,
      productCount,
      packageCount,
      testimonyCount,
    };
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates..."
          className="pl-9"
        />
      </div>
      
      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-4">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates found
            </div>
          ) : (
            filteredTemplates.map(template => {
              const stats = getTemplateStats(template);
              const isSelected = selectedTemplate?.id === template.id;
              
              return (
                <button
                  key={template.id}
                  onClick={() => onSelect(template)}
                  className={`
                    w-full text-left p-4 rounded-lg border transition-all
                    ${isSelected 
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                      : "border-border hover:border-primary/50 hover:bg-muted/50"}
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {template.thumbnail_url ? (
                        <img 
                          src={template.thumbnail_url} 
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Layout className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{template.name}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      
                      {template.description && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {template.description}
                        </p>
                      )}
                      
                      {/* Stats */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          <Palette className="h-3 w-3 mr-1" />
                          {stats.themeName}
                        </Badge>
                        {stats.hasQR && (
                          <Badge variant="secondary" className="text-xs">
                            <QrCode className="h-3 w-3 mr-1" />
                            QR
                          </Badge>
                        )}
                        {stats.imageCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Image className="h-3 w-3 mr-1" />
                            {stats.imageCount}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Carousel breakdown */}
                      {(stats.productCount > 0 || stats.packageCount > 0 || stats.testimonyCount > 0) && (
                        <div className="text-xs text-muted-foreground mt-1.5">
                          {[
                            stats.productCount > 0 && `${stats.productCount} products`,
                            stats.packageCount > 0 && `${stats.packageCount} packages`,
                            stats.testimonyCount > 0 && `${stats.testimonyCount} testimonies`,
                          ].filter(Boolean).join(" • ")}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
      
      {selectedTemplate && (
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            Selected: <strong>{selectedTemplate.name}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Palette, Sparkles, User, Globe, Users, Lock, Eye } from "lucide-react";
import { useTemplates, CardTemplate, TemplateVisibility } from "@/hooks/useTemplates";
import { TemplatePreviewDialog } from "./TemplatePreviewDialog";
import { cn } from "@/lib/utils";

const visibilityConfig: Record<TemplateVisibility, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" }> = {
  global: { label: "Global", icon: <Globe className="h-3 w-3" />, variant: "default" },
  team: { label: "Team", icon: <Users className="h-3 w-3" />, variant: "secondary" },
  private: { label: "Private", icon: <Lock className="h-3 w-3" />, variant: "outline" },
};

interface TemplateGalleryProps {
  onSelectTemplate: (template: CardTemplate) => void;
  onBuildFromScratch: () => void;
  loading?: boolean;
}

export function TemplateGallery({
  onSelectTemplate,
  onBuildFromScratch,
  loading: externalLoading,
}: TemplateGalleryProps) {
  const { templates, userTemplate, loading } = useTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CardTemplate | null>(null);

  const handleSelect = (template: CardTemplate) => {
    setSelectedId(template.id);
    onSelectTemplate(template);
  };

  const handlePreview = (e: React.MouseEvent, template: CardTemplate) => {
    e.stopPropagation();
    setPreviewTemplate(template);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Build from scratch option */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className={cn(
            "cursor-pointer border-2 transition-all hover:border-primary hover:shadow-lg",
            selectedId === "scratch" && "border-primary ring-2 ring-primary/20"
          )}
          onClick={() => {
            setSelectedId("scratch");
            onBuildFromScratch();
          }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Build Your Own Card</CardTitle>
                <CardDescription>Start from scratch and fully customize</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create a completely custom card with the default Card-Ex styling. Perfect for unique designs.
            </p>
          </CardContent>
        </Card>

        {userTemplate && (
          <Card
            className={cn(
              "cursor-pointer border-2 transition-all hover:border-primary hover:shadow-lg",
              selectedId === userTemplate.id && "border-primary ring-2 ring-primary/20"
            )}
            onClick={() => handleSelect(userTemplate)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-accent/5">
                  <User className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{userTemplate.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">My Template</Badge>
                  </div>
                  <CardDescription>Your saved personal template</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={(e) => handlePreview(e, userTemplate)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {userTemplate.description || "Your previously saved card design."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Admin Templates */}
      {templates.length > 0 && (
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Palette className="h-5 w-5 text-primary" />
            Card-Ex Templates
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={cn(
                  "cursor-pointer border-2 transition-all hover:border-primary hover:shadow-lg",
                  selectedId === template.id && "border-primary ring-2 ring-primary/20"
                )}
                onClick={() => handleSelect(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    {template.thumbnail_url ? (
                      <img
                        src={template.thumbnail_url}
                        alt={template.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-primary/10">
                        <Palette className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.visibility && visibilityConfig[template.visibility as TemplateVisibility] && (
                          <Badge variant={visibilityConfig[template.visibility as TemplateVisibility].variant} className="text-xs flex items-center gap-1">
                            {visibilityConfig[template.visibility as TemplateVisibility].icon}
                            {visibilityConfig[template.visibility as TemplateVisibility].label}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>Pre-designed template</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => handlePreview(e, template)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {template.description || "A professionally designed Card-Ex template."}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {templates.length === 0 && !userTemplate && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Palette className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-semibold">No templates available yet</h3>
          <p className="text-sm text-muted-foreground">
            Build your own card from scratch to get started!
          </p>
        </div>
      )}

      {/* Template Preview Dialog */}
      <TemplatePreviewDialog
        template={previewTemplate}
        open={!!previewTemplate}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
        onSelect={handleSelect}
      />
    </div>
  );
}

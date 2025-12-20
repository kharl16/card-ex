import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Package, Image, MessageSquare, Settings, Palette, MousePointerClick, Upload } from "lucide-react";
import {
  type CarouselKey,
  type CarouselSection,
  type CarouselSettingsData,
  type CarouselImage,
  type CTAAction,
  type CTAPlacement,
  type CTAContactMethod,
  type CTAVariant,
  type CTAShape,
  type CTASize,
  type CTAWidth,
  type CarouselBackgroundType,
  type CarouselGradientDirection,
  mergeCarouselSettings,
} from "@/lib/carouselTypes";
import CarouselImageUploader from "@/components/carousel/CarouselImageUploader";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

interface CarouselSettingsSectionProps {
  card: CardData;
  onCardChange: (updates: Partial<CardData>) => void;
}

const CAROUSEL_ICONS: Record<CarouselKey, React.ReactNode> = {
  products: <Package className="h-4 w-4" />,
  packages: <Image className="h-4 w-4" />,
  testimonies: <MessageSquare className="h-4 w-4" />,
};

const CAROUSEL_DESCRIPTIONS: Record<CarouselKey, string> = {
  products: "Showcase your products (max 50 images, scrolls right→left)",
  packages: "Display packages or services (max 50 images, scrolls left→right)",
  testimonies: "Show customer testimonials (max 200 images, scrolls right→left)",
};

export function CarouselSettingsSection({ card, onCardChange }: CarouselSettingsSectionProps) {
  const [activeTab, setActiveTab] = useState<CarouselKey>("products");

  // Get or initialize carousel settings
  const carouselSettings = mergeCarouselSettings(
    (card as any).carousel_settings as Partial<CarouselSettingsData> | null
  );

  const updateCarouselSection = (key: CarouselKey, updates: Partial<CarouselSection>) => {
    const newSettings = {
      ...carouselSettings,
      [key]: {
        ...carouselSettings[key],
        ...updates,
      },
    };
    onCardChange({ carousel_settings: newSettings as any });
  };

  const updateBackground = (key: CarouselKey, updates: Partial<CarouselSection["background"]>) => {
    const current = carouselSettings[key];
    updateCarouselSection(key, {
      background: { ...current.background, ...updates },
    });
  };

  const updateSettings = (key: CarouselKey, updates: Partial<CarouselSection["settings"]>) => {
    const current = carouselSettings[key];
    updateCarouselSection(key, {
      settings: { ...current.settings, ...updates },
    });
  };

  const updateCTA = (key: CarouselKey, updates: Partial<CarouselSection["cta"]>) => {
    const current = carouselSettings[key];
    updateCarouselSection(key, {
      cta: { ...current.cta, ...updates },
    });
  };

  const updateCTAStyle = (key: CarouselKey, updates: Partial<CarouselSection["cta"]["style"]>) => {
    const current = carouselSettings[key];
    updateCarouselSection(key, {
      cta: {
        ...current.cta,
        style: { ...current.cta.style, ...updates },
      },
    });
  };

  const updateImages = (key: CarouselKey, images: CarouselImage[]) => {
    updateCarouselSection(key, { images });
  };

  const MAX_IMAGES: Record<CarouselKey, number> = {
    products: 50,
    packages: 50,
    testimonies: 200,
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CarouselKey)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="products" className="flex items-center gap-2">
            {CAROUSEL_ICONS.products}
            <span className="hidden sm:inline">Products</span>
            {carouselSettings.products.images.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {carouselSettings.products.images.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="packages" className="flex items-center gap-2">
            {CAROUSEL_ICONS.packages}
            <span className="hidden sm:inline">Packages</span>
            {carouselSettings.packages.images.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {carouselSettings.packages.images.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="testimonies" className="flex items-center gap-2">
            {CAROUSEL_ICONS.testimonies}
            <span className="hidden sm:inline">Testimonies</span>
            {carouselSettings.testimonies.images.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {carouselSettings.testimonies.images.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {(["products", "packages", "testimonies"] as CarouselKey[]).map((key) => (
          <TabsContent key={key} value={key} className="space-y-6 mt-4">
            <p className="text-sm text-muted-foreground">{CAROUSEL_DESCRIPTIONS[key]}</p>

            {/* Enable Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Carousel</Label>
                <p className="text-xs text-muted-foreground">Show this carousel on your card</p>
              </div>
              <Switch
                checked={carouselSettings[key].settings.enabled}
                onCheckedChange={(v) => updateSettings(key, { enabled: v })}
              />
            </div>

            <Separator />

            {/* Carousel Behavior Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Behavior
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={carouselSettings[key].title}
                      onChange={(e) => updateCarouselSection(key, { title: e.target.value })}
                      placeholder="Section title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Autoplay Speed (ms)</Label>
                    <Input
                      type="number"
                      min="500"
                      max="10000"
                      step="100"
                      value={carouselSettings[key].settings.autoPlayMs}
                      onChange={(e) => updateSettings(key, { autoPlayMs: parseInt(e.target.value) || 4000 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Background Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Background
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enable Background</Label>
                  <Switch
                    checked={carouselSettings[key].background.enabled}
                    onCheckedChange={(v) => updateBackground(key, { enabled: v })}
                  />
                </div>

                {carouselSettings[key].background.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={carouselSettings[key].background.type}
                        onValueChange={(v) => updateBackground(key, { type: v as CarouselBackgroundType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="transparent">Transparent</SelectItem>
                          <SelectItem value="solid">Solid Color</SelectItem>
                          <SelectItem value="gradient">Gradient</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {carouselSettings[key].background.type === "solid" && (
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={carouselSettings[key].background.solid_color || "#000000"}
                            onChange={(e) => updateBackground(key, { solid_color: e.target.value })}
                            className="w-12 h-10 p-1"
                          />
                          <Input
                            value={carouselSettings[key].background.solid_color || "#000000"}
                            onChange={(e) => updateBackground(key, { solid_color: e.target.value })}
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    )}

                    {carouselSettings[key].background.type === "gradient" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>From</Label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={carouselSettings[key].background.gradient?.from || "#000000"}
                                onChange={(e) =>
                                  updateBackground(key, {
                                    gradient: {
                                      ...carouselSettings[key].background.gradient,
                                      from: e.target.value,
                                      to: carouselSettings[key].background.gradient?.to || "#333333",
                                      direction: carouselSettings[key].background.gradient?.direction || "to-b",
                                    },
                                  })
                                }
                                className="w-12 h-10 p-1"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>To</Label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={carouselSettings[key].background.gradient?.to || "#333333"}
                                onChange={(e) =>
                                  updateBackground(key, {
                                    gradient: {
                                      ...carouselSettings[key].background.gradient,
                                      from: carouselSettings[key].background.gradient?.from || "#000000",
                                      to: e.target.value,
                                      direction: carouselSettings[key].background.gradient?.direction || "to-b",
                                    },
                                  })
                                }
                                className="w-12 h-10 p-1"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Direction</Label>
                          <Select
                            value={carouselSettings[key].background.gradient?.direction || "to-b"}
                            onValueChange={(v) =>
                              updateBackground(key, {
                                gradient: {
                                  ...carouselSettings[key].background.gradient,
                                  from: carouselSettings[key].background.gradient?.from || "#000000",
                                  to: carouselSettings[key].background.gradient?.to || "#333333",
                                  direction: v as CarouselGradientDirection,
                                },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="to-r">Left → Right</SelectItem>
                              <SelectItem value="to-l">Right → Left</SelectItem>
                              <SelectItem value="to-b">Top → Bottom</SelectItem>
                              <SelectItem value="to-t">Bottom → Top</SelectItem>
                              <SelectItem value="to-br">Top-Left → Bottom-Right</SelectItem>
                              <SelectItem value="to-tr">Bottom-Left → Top-Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* CTA Button Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MousePointerClick className="h-4 w-4" />
                  Call-to-Action Button
                </CardTitle>
                <CardDescription>Configure the button shown with this carousel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enable CTA</Label>
                  <Switch
                    checked={carouselSettings[key].cta.enabled}
                    onCheckedChange={(v) => updateCTA(key, { enabled: v })}
                  />
                </div>

                {carouselSettings[key].cta.enabled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Button Label</Label>
                        <Input
                          value={carouselSettings[key].cta.label}
                          onChange={(e) => updateCTA(key, { label: e.target.value })}
                          placeholder="Inquire Now"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Placement</Label>
                        <Select
                          value={carouselSettings[key].cta.placement}
                          onValueChange={(v) => updateCTA(key, { placement: v as CTAPlacement })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="below">Below Carousel</SelectItem>
                            <SelectItem value="overlay_bottom">Overlay (Bottom-Right)</SelectItem>
                            <SelectItem value="header_right">Header Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Action</Label>
                      <Select
                        value={carouselSettings[key].cta.action}
                        onValueChange={(v) => updateCTA(key, { action: v as CTAAction })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="link">Open Link</SelectItem>
                          <SelectItem value="scroll">Scroll to Section</SelectItem>
                          <SelectItem value="contact">Contact Action</SelectItem>
                          <SelectItem value="modal">Show Modal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Action-specific fields */}
                    {carouselSettings[key].cta.action === "link" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>URL</Label>
                          <Input
                            value={carouselSettings[key].cta.href || ""}
                            onChange={(e) => updateCTA(key, { href: e.target.value })}
                            placeholder="https://..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Open in</Label>
                          <Select
                            value={carouselSettings[key].cta.target || "_blank"}
                            onValueChange={(v) => updateCTA(key, { target: v as "_blank" | "_self" })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_blank">New Tab</SelectItem>
                              <SelectItem value="_self">Same Tab</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {carouselSettings[key].cta.action === "scroll" && (
                      <div className="space-y-2">
                        <Label>Scroll To</Label>
                        <Select
                          value={carouselSettings[key].cta.scroll_target || "top"}
                          onValueChange={(v) => updateCTA(key, { scroll_target: v as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="top">Top of Page</SelectItem>
                            <SelectItem value="contact">Contact Section</SelectItem>
                            <SelectItem value="carousel_products">Products Carousel</SelectItem>
                            <SelectItem value="carousel_packages">Packages Carousel</SelectItem>
                            <SelectItem value="carousel_testimonies">Testimonies Carousel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {carouselSettings[key].cta.action === "contact" && (
                      <div className="space-y-2">
                        <Label>Contact Method</Label>
                        <Select
                          value={carouselSettings[key].cta.contact_method || "messenger"}
                          onValueChange={(v) => updateCTA(key, { contact_method: v as CTAContactMethod })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="messenger">Messenger</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="viber">Viber</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone Call</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {carouselSettings[key].cta.action === "modal" && (
                      <div className="space-y-2">
                        <Label>Modal Content</Label>
                        <Textarea
                          value={carouselSettings[key].cta.modal_content || ""}
                          onChange={(e) => updateCTA(key, { modal_content: e.target.value })}
                          placeholder="Enter content to display in the modal..."
                          rows={4}
                        />
                      </div>
                    )}

                    <Separator />

                    {/* Style settings */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Style</Label>
                        <Select
                          value={carouselSettings[key].cta.style.variant}
                          onValueChange={(v) => updateCTAStyle(key, { variant: v as CTAVariant })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="solid">Solid</SelectItem>
                            <SelectItem value="outline">Outline</SelectItem>
                            <SelectItem value="ghost">Ghost</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Shape</Label>
                        <Select
                          value={carouselSettings[key].cta.style.shape}
                          onValueChange={(v) => updateCTAStyle(key, { shape: v as CTAShape })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pill">Pill</SelectItem>
                            <SelectItem value="rounded">Rounded</SelectItem>
                            <SelectItem value="square">Square</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Size</Label>
                        <Select
                          value={carouselSettings[key].cta.style.size}
                          onValueChange={(v) => updateCTAStyle(key, { size: v as CTASize })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sm">Small</SelectItem>
                            <SelectItem value="md">Medium</SelectItem>
                            <SelectItem value="lg">Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Width</Label>
                        <Select
                          value={carouselSettings[key].cta.style.width}
                          onValueChange={(v) => updateCTAStyle(key, { width: v as CTAWidth })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fit">Fit Content</SelectItem>
                            <SelectItem value="full">Full Width</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Glow Effect</Label>
                        <p className="text-xs text-muted-foreground">Add subtle glow shadow</p>
                      </div>
                      <Switch
                        checked={carouselSettings[key].cta.style.glow || false}
                        onCheckedChange={(v) => updateCTAStyle(key, { glow: v })}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Image Upload Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Images
                </CardTitle>
                <CardDescription>
                  Upload and manage images for this carousel. Drag to reorder.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CarouselImageUploader
                  carouselKey={key}
                  cardId={card.id}
                  ownerId={card.user_id}
                  images={carouselSettings[key].images || []}
                  maxImages={MAX_IMAGES[key]}
                  onImagesChange={(images) => updateImages(key, images)}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

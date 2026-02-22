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
import { Slider } from "@/components/ui/slider";
import { Package, Image, MessageSquare, Settings, Palette, MousePointerClick, Upload, Film, Plus, Trash2, GripVertical } from "lucide-react";
import { parseVideoUrl, detectVideoSource, type VideoItem } from "@/lib/videoUtils";
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
  type CTAGlowColorMode,
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
  videos: <Film className="h-4 w-4" />,
};

const CAROUSEL_DESCRIPTIONS: Record<CarouselKey, string> = {
  products: "Showcase your products (max 50 images, scrolls right→left)",
  packages: "Display packages or services (max 50 images, scrolls left→right)",
  testimonies: "Show customer testimonials (max 200 images, scrolls right→left)",
  videos: "Share video content from YouTube or Google Drive (max 25 videos)",
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
    // Save images to the new dedicated columns
    const columnMap: Record<CarouselKey, string> = {
      products: "product_images",
      packages: "package_images",
      testimonies: "testimony_images",
      videos: "video_items",
    };
    onCardChange({ [columnMap[key]]: images } as any);
  };

  const MAX_IMAGES: Record<CarouselKey, number> = {
    products: 50,
    packages: 50,
    testimonies: 200,
    videos: 25,
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CarouselKey)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="products" className="flex items-center gap-2">
            {CAROUSEL_ICONS.products}
            <span className="hidden sm:inline">Products</span>
          </TabsTrigger>
          <TabsTrigger value="packages" className="flex items-center gap-2">
            {CAROUSEL_ICONS.packages}
            <span className="hidden sm:inline">Packages</span>
          </TabsTrigger>
          <TabsTrigger value="testimonies" className="flex items-center gap-2">
            {CAROUSEL_ICONS.testimonies}
            <span className="hidden sm:inline">Testimonies</span>
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            {CAROUSEL_ICONS.videos}
            <span className="hidden sm:inline">Videos</span>
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
                <div className="space-y-2">
                  <Label>Image Size</Label>
                  <Select
                    value={carouselSettings[key].settings.imageSize || "md"}
                    onValueChange={(v) => updateSettings(key, { imageSize: v as "sm" | "md" | "lg" })}
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

                {/* Image Gap Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Image Gap</Label>
                    <span className="text-xs text-muted-foreground">
                      {carouselSettings[key].settings.imageGap ?? 12}px
                    </span>
                  </div>
                  <Slider
                    value={[carouselSettings[key].settings.imageGap ?? 12]}
                    onValueChange={([v]) => updateSettings(key, { imageGap: v })}
                    min={0}
                    max={32}
                    step={4}
                  />
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
                    {/* Preset Background Styles */}
                    <div className="space-y-2">
                      <Label>Quick Presets</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {/* Dark Theme */}
                        <button
                          type="button"
                          onClick={() => updateBackground(key, {
                            type: "gradient",
                            gradient: { from: "#0f0f0f", to: "#1a1a2e", direction: "to-b" },
                            borderWidth: 1,
                            borderColor: "#333333",
                          })}
                          className="group relative h-12 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all"
                          title="Dark Theme"
                        >
                          <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f0f] to-[#1a1a2e]" />
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white/80 group-hover:text-white">Dark</span>
                        </button>

                        {/* Light Theme */}
                        <button
                          type="button"
                          onClick={() => updateBackground(key, {
                            type: "gradient",
                            gradient: { from: "#ffffff", to: "#f1f5f9", direction: "to-b" },
                            borderWidth: 1,
                            borderColor: "#e2e8f0",
                          })}
                          className="group relative h-12 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all"
                          title="Light Theme"
                        >
                          <div className="absolute inset-0 bg-gradient-to-b from-[#ffffff] to-[#f1f5f9]" />
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-gray-600 group-hover:text-gray-900">Light</span>
                        </button>

                        {/* Ocean Blue */}
                        <button
                          type="button"
                          onClick={() => updateBackground(key, {
                            type: "gradient",
                            gradient: { from: "#0c4a6e", to: "#164e63", direction: "to-br" },
                            borderWidth: 1,
                            borderColor: "#0ea5e9",
                          })}
                          className="group relative h-12 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all"
                          title="Ocean Blue"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-[#0c4a6e] to-[#164e63]" />
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white/80 group-hover:text-white">Ocean</span>
                        </button>

                        {/* Sunset */}
                        <button
                          type="button"
                          onClick={() => updateBackground(key, {
                            type: "gradient",
                            gradient: { from: "#7c2d12", to: "#9f1239", direction: "to-r" },
                            borderWidth: 1,
                            borderColor: "#f97316",
                          })}
                          className="group relative h-12 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all"
                          title="Sunset"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-[#7c2d12] to-[#9f1239]" />
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white/80 group-hover:text-white">Sunset</span>
                        </button>

                        {/* Forest */}
                        <button
                          type="button"
                          onClick={() => updateBackground(key, {
                            type: "gradient",
                            gradient: { from: "#14532d", to: "#1e3a2f", direction: "to-b" },
                            borderWidth: 1,
                            borderColor: "#22c55e",
                          })}
                          className="group relative h-12 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all"
                          title="Forest"
                        >
                          <div className="absolute inset-0 bg-gradient-to-b from-[#14532d] to-[#1e3a2f]" />
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white/80 group-hover:text-white">Forest</span>
                        </button>

                        {/* Purple */}
                        <button
                          type="button"
                          onClick={() => updateBackground(key, {
                            type: "gradient",
                            gradient: { from: "#4c1d95", to: "#581c87", direction: "to-br" },
                            borderWidth: 1,
                            borderColor: "#a855f7",
                          })}
                          className="group relative h-12 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all"
                          title="Purple"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-[#4c1d95] to-[#581c87]" />
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white/80 group-hover:text-white">Purple</span>
                        </button>

                        {/* Gold */}
                        <button
                          type="button"
                          onClick={() => updateBackground(key, {
                            type: "gradient",
                            gradient: { from: "#78350f", to: "#451a03", direction: "to-b" },
                            borderWidth: 1,
                            borderColor: "#fbbf24",
                          })}
                          className="group relative h-12 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all"
                          title="Gold"
                        >
                          <div className="absolute inset-0 bg-gradient-to-b from-[#78350f] to-[#451a03]" />
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-amber-200/80 group-hover:text-amber-200">Gold</span>
                        </button>

                        {/* Transparent */}
                        <button
                          type="button"
                          onClick={() => updateBackground(key, {
                            type: "transparent",
                            borderWidth: 0,
                            borderColor: "#ffffff",
                          })}
                          className="group relative h-12 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all bg-[repeating-conic-gradient(#80808020_0%_25%,transparent_0%_50%)] bg-[length:12px_12px]"
                          title="Transparent"
                        >
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-muted-foreground group-hover:text-foreground">None</span>
                        </button>
                      </div>
                    </div>

                    <Separator />
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

                    {/* Inner Padding */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Inner Padding</Label>
                        <span className="text-xs text-muted-foreground">
                          {carouselSettings[key].background.innerPadding ?? 8}px
                        </span>
                      </div>
                      <Slider
                        value={[carouselSettings[key].background.innerPadding ?? 8]}
                        onValueChange={([v]) => updateBackground(key, { innerPadding: v })}
                        min={0}
                        max={32}
                        step={4}
                      />
                    </div>

                    {/* Border Settings */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Border Width</Label>
                        <span className="text-xs text-muted-foreground">
                          {carouselSettings[key].background.borderWidth ?? 0}px
                        </span>
                      </div>
                      <Slider
                        value={[carouselSettings[key].background.borderWidth ?? 0]}
                        onValueChange={([v]) => updateBackground(key, { borderWidth: v })}
                        min={0}
                        max={8}
                        step={1}
                      />
                    </div>

                    {(carouselSettings[key].background.borderWidth ?? 0) > 0 && (
                      <div className="space-y-2">
                        <Label>Border Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={carouselSettings[key].background.borderColor || "#ffffff"}
                            onChange={(e) => updateBackground(key, { borderColor: e.target.value })}
                            className="w-12 h-10 p-1"
                          />
                          <Input
                            value={carouselSettings[key].background.borderColor || "#ffffff"}
                            onChange={(e) => updateBackground(key, { borderColor: e.target.value })}
                            placeholder="#ffffff"
                          />
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

                    {carouselSettings[key].cta.style.glow && (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Glow Intensity</Label>
                            <span className="text-xs text-muted-foreground">
                              {carouselSettings[key].cta.style.glowIntensity ?? 25}%
                            </span>
                          </div>
                          <Slider
                            value={[carouselSettings[key].cta.style.glowIntensity ?? 25]}
                            onValueChange={([v]) => updateCTAStyle(key, { glowIntensity: v })}
                            min={10}
                            max={100}
                            step={5}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Glow Color</Label>
                          <Select
                            value={carouselSettings[key].cta.style.glowColorMode || "primary"}
                            onValueChange={(v) => updateCTAStyle(key, { glowColorMode: v as CTAGlowColorMode })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="primary">Primary (Gold)</SelectItem>
                              <SelectItem value="background">Button Background</SelectItem>
                              <SelectItem value="custom">Custom Color</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {carouselSettings[key].cta.style.glowColorMode === "custom" && (
                          <div className="space-y-2">
                            <Label>Custom Glow Color</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={carouselSettings[key].cta.style.glowCustomColor || "#d4a51a"}
                                onChange={(e) => updateCTAStyle(key, { glowCustomColor: e.target.value })}
                                className="w-10 h-10 rounded-md border border-input cursor-pointer"
                              />
                              <Input
                                value={carouselSettings[key].cta.style.glowCustomColor || "#d4a51a"}
                                onChange={(e) => updateCTAStyle(key, { glowCustomColor: e.target.value })}
                                placeholder="#d4a51a"
                                className="flex-1"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
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
                  images={(() => {
                    // Read images from the new dedicated columns
                    const columnMap: Record<CarouselKey, string> = {
                      products: "product_images",
                      packages: "package_images",
                      testimonies: "testimony_images",
                      videos: "video_items",
                    };
                    return ((card as any)[columnMap[key]] || []) as CarouselImage[];
                  })()}
                  maxImages={MAX_IMAGES[key]}
                  onImagesChange={(images) => updateImages(key, images)}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        {/* Videos Tab - URL-based input instead of image uploader */}
        <TabsContent value="videos" className="space-y-6 mt-4">
          <p className="text-sm text-muted-foreground">{CAROUSEL_DESCRIPTIONS.videos}</p>

          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Video Carousel</Label>
              <p className="text-xs text-muted-foreground">Show video carousel on your card</p>
            </div>
            <Switch
              checked={carouselSettings.videos.settings.enabled}
              onCheckedChange={(v) => updateSettings("videos", { enabled: v })}
            />
          </div>

          <Separator />

          {/* Video Behavior Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Behavior
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={carouselSettings.videos.title}
                  onChange={(e) => updateCarouselSection("videos", { title: e.target.value })}
                  placeholder="Section title"
                />
              </div>
              <div className="space-y-2">
                <Label>Video Size</Label>
                <Select
                  value={carouselSettings.videos.settings.imageSize || "md"}
                  onValueChange={(v) => updateSettings("videos", { imageSize: v as "sm" | "md" | "lg" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">Small</SelectItem>
                    <SelectItem value="md">Medium</SelectItem>
                    <SelectItem value="lg">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Video URL Manager */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Film className="h-4 w-4" />
                Videos ({((card as any).video_items || []).length} / {MAX_IMAGES.videos})
              </CardTitle>
              <CardDescription>
                Add YouTube or Google Drive video URLs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <VideoUrlManager
                videos={((card as any).video_items || []) as VideoItem[]}
                maxVideos={MAX_IMAGES.videos}
                onVideosChange={(videos) => onCardChange({ video_items: videos } as any)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Inline VideoUrlManager component for the videos tab
function VideoUrlManager({
  videos,
  maxVideos,
  onVideosChange,
}: {
  videos: VideoItem[];
  maxVideos: number;
  onVideosChange: (videos: VideoItem[]) => void;
}) {
  const [newUrl, setNewUrl] = useState("");

  const handleAdd = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    const parsed = parseVideoUrl(trimmed, videos.length);
    if (!parsed) {
      return;
    }
    if (videos.length >= maxVideos) return;
    onVideosChange([...videos, parsed]);
    setNewUrl("");
  };

  const handleRemove = (index: number) => {
    const updated = videos.filter((_, i) => i !== index);
    onVideosChange(updated.map((v, i) => ({ ...v, order: i })));
  };

  const handleTitleChange = (index: number, title: string) => {
    const updated = [...videos];
    updated[index] = { ...updated[index], title };
    onVideosChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* Add new video URL */}
      <div className="flex gap-2">
        <Input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="Paste YouTube or Google Drive URL..."
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={videos.length >= maxVideos || !newUrl.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Supports YouTube and Google Drive video links
      </p>

      {/* Video list */}
      {videos.map((video, index) => (
        <div key={index} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
          <div className="flex-shrink-0">
            <Badge variant="outline" className="text-[10px]">
              {video.source === "youtube" ? "YT" : "GD"}
            </Badge>
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <Input
              value={video.title || ""}
              onChange={(e) => handleTitleChange(index, e.target.value)}
              placeholder="Video title (optional)"
              className="h-7 text-xs"
            />
            <p className="text-[10px] text-muted-foreground truncate">{video.url}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 text-destructive hover:text-destructive"
            onClick={() => handleRemove(index)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {videos.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <Film className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No videos added yet
        </div>
      )}
    </div>
  );
}

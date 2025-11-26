import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Sun, Moon, Sparkles, Copy, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  CardTheme,
  ThemeVariant,
  DEFAULT_THEME,
  LIGHT_MODE_DEFAULTS,
  DARK_MODE_DEFAULTS,
  initializeVariants,
  updateVariant,
  switchVariant,
} from "@/lib/theme";

interface ThemeCustomizerProps {
  theme: CardTheme;
  onChange: (theme: CardTheme) => void;
}

// Theme preset categories
const THEME_PRESETS = {
  // Classic presets
  professional: {
    name: "Professional",
    category: "classic",
    primary: "#2563eb",
    background: "#ffffff",
    text: "#1f2937",
    accent: "#3b82f6",
    buttonColor: "#2563eb",
    mode: "light" as const,
    backgroundType: "solid" as const,
  },
  creative: {
    name: "Creative",
    category: "classic",
    primary: "#ec4899",
    background: "#fdf2f8",
    text: "#831843",
    accent: "#f472b6",
    buttonColor: "#ec4899",
    mode: "light" as const,
    backgroundType: "solid" as const,
  },
  modern: {
    name: "Modern",
    category: "classic",
    primary: "#8b5cf6",
    background: "#0f172a",
    text: "#f1f5f9",
    accent: "#a78bfa",
    buttonColor: "#8b5cf6",
    mode: "dark" as const,
    backgroundType: "gradient" as const,
    gradientStart: "#0f172a",
    gradientEnd: "#1e1b4b",
    gradientDirection: "to-br",
  },
  elegant: {
    name: "Elegant",
    category: "classic",
    primary: "#D4AF37",
    background: "#0B0B0C",
    text: "#D4AF37",
    accent: "#E6C85C",
    buttonColor: "#D4AF37",
    mode: "dark" as const,
    backgroundType: "solid" as const,
  },
  nature: {
    name: "Nature",
    category: "classic",
    primary: "#059669",
    background: "#f0fdf4",
    text: "#14532d",
    accent: "#10b981",
    buttonColor: "#059669",
    mode: "light" as const,
    backgroundType: "pattern" as const,
    patternType: "dots",
    patternColor: "#059669",
    patternOpacity: 0.05,
  },

  // Seasonal themes
  holiday: {
    name: "Holiday",
    category: "seasonal",
    primary: "#dc2626",
    background: "#1a1a1a",
    text: "#fef2f2",
    accent: "#22c55e",
    buttonColor: "#dc2626",
    mode: "dark" as const,
    backgroundType: "pattern" as const,
    patternType: "dots",
    patternColor: "#dc2626",
    patternOpacity: 0.08,
  },
  summer: {
    name: "Summer",
    category: "seasonal",
    primary: "#f97316",
    background: "#fffbeb",
    text: "#78350f",
    accent: "#fbbf24",
    buttonColor: "#f97316",
    mode: "light" as const,
    backgroundType: "gradient" as const,
    gradientStart: "#fffbeb",
    gradientEnd: "#fef3c7",
    gradientDirection: "to-b",
  },
  autumn: {
    name: "Autumn",
    category: "seasonal",
    primary: "#b45309",
    background: "#292524",
    text: "#fef3c7",
    accent: "#d97706",
    buttonColor: "#b45309",
    mode: "dark" as const,
    backgroundType: "solid" as const,
  },
  spring: {
    name: "Spring",
    category: "seasonal",
    primary: "#84cc16",
    background: "#f0fdf4",
    text: "#365314",
    accent: "#a3e635",
    buttonColor: "#84cc16",
    mode: "light" as const,
    backgroundType: "pattern" as const,
    patternType: "dots",
    patternColor: "#84cc16",
    patternOpacity: 0.06,
  },
  winter: {
    name: "Winter",
    category: "seasonal",
    primary: "#0ea5e9",
    background: "#0c4a6e",
    text: "#e0f2fe",
    accent: "#38bdf8",
    buttonColor: "#0ea5e9",
    mode: "dark" as const,
    backgroundType: "gradient" as const,
    gradientStart: "#0c4a6e",
    gradientEnd: "#1e3a5f",
    gradientDirection: "to-br",
  },

  // Industry-specific themes
  realEstate: {
    name: "Real Estate",
    category: "industry",
    primary: "#0f766e",
    background: "#f8fafc",
    text: "#134e4a",
    accent: "#14b8a6",
    buttonColor: "#0f766e",
    mode: "light" as const,
    backgroundType: "solid" as const,
  },
  tech: {
    name: "Tech",
    category: "industry",
    primary: "#06b6d4",
    background: "#0f172a",
    text: "#e2e8f0",
    accent: "#22d3ee",
    buttonColor: "#06b6d4",
    mode: "dark" as const,
    backgroundType: "gradient" as const,
    gradientStart: "#0f172a",
    gradientEnd: "#1e293b",
    gradientDirection: "to-br",
  },
  finance: {
    name: "Finance",
    category: "industry",
    primary: "#1e40af",
    background: "#ffffff",
    text: "#1e3a8a",
    accent: "#3b82f6",
    buttonColor: "#1e40af",
    mode: "light" as const,
    backgroundType: "solid" as const,
  },
  healthcare: {
    name: "Healthcare",
    category: "industry",
    primary: "#0891b2",
    background: "#ecfeff",
    text: "#164e63",
    accent: "#22d3ee",
    buttonColor: "#0891b2",
    mode: "light" as const,
    backgroundType: "solid" as const,
  },
  fitness: {
    name: "Fitness",
    category: "industry",
    primary: "#ea580c",
    background: "#18181b",
    text: "#fafafa",
    accent: "#fb923c",
    buttonColor: "#ea580c",
    mode: "dark" as const,
    backgroundType: "gradient" as const,
    gradientStart: "#18181b",
    gradientEnd: "#27272a",
    gradientDirection: "to-br",
  },
  beauty: {
    name: "Beauty",
    category: "industry",
    primary: "#db2777",
    background: "#fdf2f8",
    text: "#831843",
    accent: "#f472b6",
    buttonColor: "#db2777",
    mode: "light" as const,
    backgroundType: "gradient" as const,
    gradientStart: "#fdf2f8",
    gradientEnd: "#fce7f3",
    gradientDirection: "to-b",
  },
  legal: {
    name: "Legal",
    category: "industry",
    primary: "#4338ca",
    background: "#f5f3ff",
    text: "#3730a3",
    accent: "#6366f1",
    buttonColor: "#4338ca",
    mode: "light" as const,
    backgroundType: "solid" as const,
  },
  restaurant: {
    name: "Restaurant",
    category: "industry",
    primary: "#b91c1c",
    background: "#fffbeb",
    text: "#7f1d1d",
    accent: "#f59e0b",
    buttonColor: "#b91c1c",
    mode: "light" as const,
    backgroundType: "solid" as const,
  },
};

const PRESET_CATEGORIES = [
  { id: "classic", name: "Classic" },
  { id: "seasonal", name: "Seasonal" },
  { id: "industry", name: "Industry" },
];

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter (Default)" },
  { value: "Roboto", label: "Roboto" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Poppins", label: "Poppins" },
  { value: "Lato", label: "Lato" },
  { value: "Raleway", label: "Raleway" },
  { value: "Oswald", label: "Oswald" },
  { value: "Merriweather", label: "Merriweather" },
];

const GRADIENT_DIRECTIONS = [
  { value: "to-r", label: "Left to Right" },
  { value: "to-l", label: "Right to Left" },
  { value: "to-t", label: "Bottom to Top" },
  { value: "to-b", label: "Top to Bottom" },
  { value: "to-br", label: "Top-Left to Bottom-Right" },
  { value: "to-bl", label: "Top-Right to Bottom-Left" },
  { value: "to-tr", label: "Bottom-Left to Top-Right" },
  { value: "to-tl", label: "Bottom-Right to Top-Left" },
];

const PATTERN_TYPES = [
  { value: "dots", label: "Dots" },
  { value: "stripes", label: "Stripes" },
  { value: "grid", label: "Grid" },
  { value: "diagonal", label: "Diagonal Lines" },
  { value: "waves", label: "Waves" },
];

export default function ThemeCustomizer({ theme: rawTheme, onChange }: ThemeCustomizerProps) {
  // Initialize variants if needed
  const [theme, setTheme] = useState<CardTheme>(() => initializeVariants(rawTheme || DEFAULT_THEME));
  const [activeVariant, setActiveVariant] = useState<"A" | "B">(theme.activeVariant || "A");

  // Sync with parent when rawTheme changes externally
  useEffect(() => {
    const initialized = initializeVariants(rawTheme || DEFAULT_THEME);
    setTheme(initialized);
    setActiveVariant(initialized.activeVariant || "A");
  }, [rawTheme]);

  // Get current variant's values
  const currentVariant = theme.variants?.[activeVariant] || theme;
  const baseMode = theme.baseMode || (currentVariant.background === DARK_MODE_DEFAULTS.background ? "dark" : "light");

  const handleVariantChange = (updates: Partial<ThemeVariant>) => {
    const updated = updateVariant(theme, activeVariant, updates);
    setTheme(updated);
    onChange(updated);
  };

  const handleSwitchVariant = (variantKey: "A" | "B") => {
    setActiveVariant(variantKey);
    const updated = switchVariant(theme, variantKey);
    setTheme(updated);
    onChange(updated);
  };

  const handleBaseModeChange = (mode: "light" | "dark") => {
    const defaults = mode === "dark" ? DARK_MODE_DEFAULTS : LIGHT_MODE_DEFAULTS;
    const updated = updateVariant(theme, activeVariant, {
      ...defaults,
    });
    const withBaseMode = { ...updated, baseMode: mode };
    setTheme(withBaseMode);
    onChange(withBaseMode);
  };

  const applyPreset = (presetKey: keyof typeof THEME_PRESETS) => {
    const preset = THEME_PRESETS[presetKey];
    handleVariantChange({
      primary: preset.primary,
      background: preset.background,
      text: preset.text,
      accent: preset.accent,
      buttonColor: preset.buttonColor,
      backgroundType: preset.backgroundType,
      gradientStart: (preset as any).gradientStart,
      gradientEnd: (preset as any).gradientEnd,
      gradientDirection: (preset as any).gradientDirection,
      patternType: (preset as any).patternType,
      patternColor: (preset as any).patternColor,
      patternOpacity: (preset as any).patternOpacity,
    });
  };

  // Copy current variant to the other one
  const handleCopyVariant = () => {
    const sourceVariant = theme.variants?.[activeVariant] || currentVariant;
    const targetKey: "A" | "B" = activeVariant === "A" ? "B" : "A";
    
    const updatedTheme: CardTheme = {
      ...theme,
      variants: {
        ...theme.variants,
        [targetKey]: { ...sourceVariant },
      },
    };
    
    setTheme(updatedTheme);
    onChange(updatedTheme);
  };

  // Get presets by category
  const getPresetsByCategory = (categoryId: string) => {
    return Object.entries(THEME_PRESETS).filter(
      ([_, preset]) => (preset as any).category === categoryId
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="h-5 w-5 text-primary" />
          Theme Customization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* A/B Theme Variant Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Theme Variant</Label>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              Save two looks
            </div>
          </div>
          <Tabs value={activeVariant} onValueChange={(v) => handleSwitchVariant(v as "A" | "B")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="A" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Theme A
              </TabsTrigger>
              <TabsTrigger 
                value="B"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Theme B
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Copy Variant Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyVariant}
            className="w-full gap-2 text-muted-foreground hover:text-foreground"
          >
            <Copy className="h-4 w-4" />
            Copy Theme {activeVariant} to Theme {activeVariant === "A" ? "B" : "A"}
          </Button>
        </div>

        {/* Light / Dark Base Mode Toggle */}
        <div className="space-y-2">
          <Label>Base Mode</Label>
          <div className="flex gap-2">
            <Button
              variant={baseMode === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => handleBaseModeChange("light")}
              className="flex-1 transition-all duration-300"
            >
              <Sun className="h-4 w-4 mr-2" />
              Light
            </Button>
            <Button
              variant={baseMode === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => handleBaseModeChange("dark")}
              className="flex-1 transition-all duration-300"
            >
              <Moon className="h-4 w-4 mr-2" />
              Dark
            </Button>
          </div>
        </div>

        {/* Theme Presets by Category */}
        <div className="space-y-3">
          <Label>Theme Presets</Label>
          {PRESET_CATEGORIES.map((category) => (
            <Collapsible key={category.id} defaultOpen={category.id === "classic"}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between px-2 py-1.5 h-auto font-medium text-sm hover:bg-muted/50"
                >
                  {category.name}
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-2 gap-2">
                  {getPresetsByCategory(category.id).map(([key, preset]) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset(key as keyof typeof THEME_PRESETS)}
                      className="justify-start hover:border-primary/50 transition-colors text-xs"
                    >
                      <div
                        className="w-3 h-3 rounded-full mr-2 ring-1 ring-border flex-shrink-0"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span className="truncate">{preset.name}</span>
                    </Button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        {/* Font Selection */}
        <div className="space-y-2">
          <Label htmlFor="font-select">Font Family</Label>
          <Select
            value={currentVariant.font || "Inter"}
            onValueChange={(value) => handleVariantChange({ font: value })}
          >
            <SelectTrigger id="font-select">
              <SelectValue placeholder="Select font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem
                  key={font.value}
                  value={font.value}
                  style={{ fontFamily: `"${font.value}", sans-serif` }}
                >
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Primary Color */}
        <div className="space-y-2">
          <Label htmlFor="primary-color">Primary Color</Label>
          <div className="flex gap-2 items-center">
            <input
              id="primary-color"
              type="color"
              value={currentVariant.primary || DEFAULT_THEME.primary}
              onChange={(e) => handleVariantChange({ primary: e.target.value })}
              className="h-10 w-20 rounded border border-border cursor-pointer"
            />
            <input
              type="text"
              value={currentVariant.primary || DEFAULT_THEME.primary}
              onChange={(e) => handleVariantChange({ primary: e.target.value })}
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="#D4AF37"
            />
          </div>
        </div>

        {/* Accent Color */}
        <div className="space-y-2">
          <Label htmlFor="accent-color">Accent Color</Label>
          <div className="flex gap-2 items-center">
            <input
              id="accent-color"
              type="color"
              value={currentVariant.accent || currentVariant.primary || DEFAULT_THEME.primary}
              onChange={(e) => handleVariantChange({ accent: e.target.value })}
              className="h-10 w-20 rounded border border-border cursor-pointer"
            />
            <input
              type="text"
              value={currentVariant.accent || currentVariant.primary || DEFAULT_THEME.primary}
              onChange={(e) => handleVariantChange({ accent: e.target.value })}
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="#E6C85C"
            />
          </div>
        </div>

        {/* Button Color */}
        <div className="space-y-2">
          <Label htmlFor="button-color">Button Color</Label>
          <div className="flex gap-2 items-center">
            <input
              id="button-color"
              type="color"
              value={currentVariant.buttonColor || currentVariant.primary || DEFAULT_THEME.primary}
              onChange={(e) => handleVariantChange({ buttonColor: e.target.value })}
              className="h-10 w-20 rounded border border-border cursor-pointer"
            />
            <input
              type="text"
              value={currentVariant.buttonColor || currentVariant.primary || DEFAULT_THEME.primary}
              onChange={(e) => handleVariantChange({ buttonColor: e.target.value })}
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="#D4AF37"
            />
          </div>
        </div>

        {/* Background Type */}
        <div className="space-y-2">
          <Label>Background Type</Label>
          <div className="flex gap-2">
            <Button
              variant={(!currentVariant.backgroundType || currentVariant.backgroundType === "solid") ? "default" : "outline"}
              size="sm"
              onClick={() => handleVariantChange({ backgroundType: "solid" })}
              className="flex-1 transition-all duration-300"
            >
              Solid
            </Button>
            <Button
              variant={currentVariant.backgroundType === "gradient" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                handleVariantChange({
                  backgroundType: "gradient",
                  gradientStart: currentVariant.gradientStart || currentVariant.background,
                  gradientEnd: currentVariant.gradientEnd || currentVariant.primary,
                })
              }
              className="flex-1 transition-all duration-300"
            >
              Gradient
            </Button>
            <Button
              variant={currentVariant.backgroundType === "pattern" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                handleVariantChange({
                  backgroundType: "pattern",
                  patternType: currentVariant.patternType || "dots",
                  patternColor: currentVariant.patternColor || currentVariant.primary,
                  patternOpacity: currentVariant.patternOpacity ?? 0.1,
                })
              }
              className="flex-1 transition-all duration-300"
            >
              Pattern
            </Button>
          </div>
        </div>

        {/* Solid Background Color */}
        {(!currentVariant.backgroundType || currentVariant.backgroundType === "solid") && (
          <div className="space-y-2 animate-fade-in">
            <Label htmlFor="background-color">Background Color</Label>
            <div className="flex gap-2 items-center">
              <input
                id="background-color"
                type="color"
                value={currentVariant.background || DEFAULT_THEME.background}
                onChange={(e) => handleVariantChange({ background: e.target.value })}
                className="h-10 w-20 rounded border border-border cursor-pointer"
              />
              <input
                type="text"
                value={currentVariant.background || DEFAULT_THEME.background}
                onChange={(e) => handleVariantChange({ background: e.target.value })}
                className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
                placeholder="#0B0B0C"
              />
            </div>
          </div>
        )}

        {/* Gradient Options */}
        {currentVariant.backgroundType === "gradient" && (
          <div className="space-y-4 p-4 border border-border rounded-lg animate-fade-in">
            <div className="space-y-2">
              <Label>Gradient Direction</Label>
              <Select
                value={currentVariant.gradientDirection || "to-br"}
                onValueChange={(value) => handleVariantChange({ gradientDirection: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select direction" />
                </SelectTrigger>
                <SelectContent>
                  {GRADIENT_DIRECTIONS.map((dir) => (
                    <SelectItem key={dir.value} value={dir.value}>
                      {dir.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gradient-start">Start Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    id="gradient-start"
                    type="color"
                    value={currentVariant.gradientStart || currentVariant.background || DEFAULT_THEME.background}
                    onChange={(e) => handleVariantChange({ gradientStart: e.target.value })}
                    className="h-10 w-14 rounded border border-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentVariant.gradientStart || currentVariant.background || DEFAULT_THEME.background}
                    onChange={(e) => handleVariantChange({ gradientStart: e.target.value })}
                    className="flex-1 h-10 rounded-md border border-input bg-background px-2 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gradient-end">End Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    id="gradient-end"
                    type="color"
                    value={currentVariant.gradientEnd || currentVariant.primary || DEFAULT_THEME.primary}
                    onChange={(e) => handleVariantChange({ gradientEnd: e.target.value })}
                    className="h-10 w-14 rounded border border-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentVariant.gradientEnd || currentVariant.primary || DEFAULT_THEME.primary}
                    onChange={(e) => handleVariantChange({ gradientEnd: e.target.value })}
                    className="flex-1 h-10 rounded-md border border-input bg-background px-2 text-xs"
                  />
                </div>
              </div>
            </div>
            {/* Gradient Preview */}
            <div
              className="h-12 rounded-lg border border-border transition-all duration-500"
              style={{ background: getGradientCSS(currentVariant) }}
            />
          </div>
        )}

        {/* Pattern Options */}
        {currentVariant.backgroundType === "pattern" && (
          <div className="space-y-4 p-4 border border-border rounded-lg animate-fade-in">
            <div className="space-y-2">
              <Label htmlFor="background-color-pattern">Base Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  id="background-color-pattern"
                  type="color"
                  value={currentVariant.background || DEFAULT_THEME.background}
                  onChange={(e) => handleVariantChange({ background: e.target.value })}
                  className="h-10 w-20 rounded border border-border cursor-pointer"
                />
                <input
                  type="text"
                  value={currentVariant.background || DEFAULT_THEME.background}
                  onChange={(e) => handleVariantChange({ background: e.target.value })}
                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pattern Type</Label>
              <Select
                value={currentVariant.patternType || "dots"}
                onValueChange={(value) => handleVariantChange({ patternType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pattern" />
                </SelectTrigger>
                <SelectContent>
                  {PATTERN_TYPES.map((pattern) => (
                    <SelectItem key={pattern.value} value={pattern.value}>
                      {pattern.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pattern-color">Pattern Color</Label>
                <input
                  id="pattern-color"
                  type="color"
                  value={currentVariant.patternColor || currentVariant.primary || DEFAULT_THEME.primary}
                  onChange={(e) => handleVariantChange({ patternColor: e.target.value })}
                  className="h-10 w-full rounded border border-border cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pattern-opacity">
                  Opacity: {Math.round((currentVariant.patternOpacity ?? 0.1) * 100)}%
                </Label>
                <input
                  id="pattern-opacity"
                  type="range"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={currentVariant.patternOpacity ?? 0.1}
                  onChange={(e) => handleVariantChange({ patternOpacity: parseFloat(e.target.value) })}
                  className="w-full h-10"
                />
              </div>
            </div>
            {/* Pattern Preview */}
            <div
              className="h-12 rounded-lg border border-border transition-all duration-500"
              style={{
                backgroundColor: currentVariant.background || DEFAULT_THEME.background,
                backgroundImage: getPatternCSS(currentVariant),
                backgroundSize: getPatternSize(currentVariant.patternType),
              }}
            />
          </div>
        )}

        {/* Text Color */}
        <div className="space-y-2">
          <Label htmlFor="text-color">Text Color</Label>
          <div className="flex gap-2 items-center">
            <input
              id="text-color"
              type="color"
              value={currentVariant.text || DEFAULT_THEME.text}
              onChange={(e) => handleVariantChange({ text: e.target.value })}
              className="h-10 w-20 rounded border border-border cursor-pointer"
            />
            <input
              type="text"
              value={currentVariant.text || DEFAULT_THEME.text}
              onChange={(e) => handleVariantChange({ text: e.target.value })}
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="#F8F8F8"
            />
          </div>
        </div>

        {/* Live Preview Swatch */}
        <div className="space-y-2">
          <Label>Live Preview</Label>
          <div
            className="h-20 rounded-lg border border-border flex items-center justify-center transition-all duration-500"
            style={{
              backgroundColor: currentVariant.background || DEFAULT_THEME.background,
              color: currentVariant.text || DEFAULT_THEME.text,
              fontFamily: currentVariant.font ? `"${currentVariant.font}", sans-serif` : undefined,
            }}
          >
            <div className="text-center">
              <div className="text-sm font-semibold">Preview Text</div>
              <div
                className="text-xs mt-1 px-3 py-1 rounded-full transition-all duration-500"
                style={{ backgroundColor: currentVariant.primary || DEFAULT_THEME.primary }}
              >
                Button
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// CSS helper functions (exported for use in other components)
export function getGradientCSS(theme: any): string {
  const direction = theme?.gradientDirection || "to-br";
  const start = theme?.gradientStart || theme?.background || "#0B0B0C";
  const end = theme?.gradientEnd || theme?.primary || "#D4AF37";

  const directionMap: Record<string, string> = {
    "to-r": "to right",
    "to-l": "to left",
    "to-t": "to top",
    "to-b": "to bottom",
    "to-br": "to bottom right",
    "to-bl": "to bottom left",
    "to-tr": "to top right",
    "to-tl": "to top left",
  };

  return `linear-gradient(${directionMap[direction] || "to bottom right"}, ${start}, ${end})`;
}

export function getPatternCSS(theme: any): string {
  const patternType = theme?.patternType || "dots";
  const patternColor = theme?.patternColor || theme?.primary || "#D4AF37";
  const opacity = theme?.patternOpacity ?? 0.1;

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const color = hexToRgba(patternColor, opacity);

  switch (patternType) {
    case "dots":
      return `radial-gradient(${color} 1px, transparent 1px)`;
    case "stripes":
      return `repeating-linear-gradient(90deg, ${color}, ${color} 1px, transparent 1px, transparent 10px)`;
    case "grid":
      return `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`;
    case "diagonal":
      return `repeating-linear-gradient(45deg, ${color}, ${color} 1px, transparent 1px, transparent 10px)`;
    case "waves":
      return `repeating-radial-gradient(circle at 0 0, transparent 0, transparent 10px, ${color} 10px, ${color} 11px)`;
    default:
      return `radial-gradient(${color} 1px, transparent 1px)`;
  }
}

export function getPatternSize(patternType?: string): string {
  switch (patternType) {
    case "dots":
      return "20px 20px";
    case "stripes":
      return "10px 10px";
    case "grid":
      return "20px 20px";
    case "diagonal":
      return "14px 14px";
    case "waves":
      return "20px 20px";
    default:
      return "20px 20px";
  }
}

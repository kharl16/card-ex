import React from "react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Sun, Moon } from "lucide-react";

interface ThemeProps {
  primary: string;
  background: string;
  text: string;
  accent?: string;
  buttonColor?: string;
  font?: string;
  mode?: 'light' | 'dark';
  backgroundType?: 'solid' | 'gradient' | 'pattern';
  gradientStart?: string;
  gradientEnd?: string;
  gradientDirection?: string;
  patternType?: string;
  patternColor?: string;
  patternOpacity?: number;
}

interface ThemeCustomizerProps {
  theme: ThemeProps;
  onChange: (theme: ThemeProps) => void;
}

const THEME_PRESETS = {
  professional: {
    name: "Professional",
    primary: "#2563eb",
    background: "#ffffff",
    text: "#1f2937",
    accent: "#3b82f6",
    buttonColor: "#2563eb",
    mode: 'light' as const,
    backgroundType: 'solid' as const,
  },
  creative: {
    name: "Creative",
    primary: "#ec4899",
    background: "#fdf2f8",
    text: "#831843",
    accent: "#f472b6",
    buttonColor: "#ec4899",
    mode: 'light' as const,
    backgroundType: 'solid' as const,
  },
  modern: {
    name: "Modern",
    primary: "#8b5cf6",
    background: "#0f172a",
    text: "#f1f5f9",
    accent: "#a78bfa",
    buttonColor: "#8b5cf6",
    mode: 'dark' as const,
    backgroundType: 'gradient' as const,
    gradientStart: "#0f172a",
    gradientEnd: "#1e1b4b",
    gradientDirection: "to-br",
  },
  elegant: {
    name: "Elegant",
    primary: "#D4AF37",
    background: "#0B0B0C",
    text: "#D4AF37",
    accent: "#E6C85C",
    buttonColor: "#D4AF37",
    mode: 'dark' as const,
    backgroundType: 'solid' as const,
  },
  nature: {
    name: "Nature",
    primary: "#059669",
    background: "#f0fdf4",
    text: "#14532d",
    accent: "#10b981",
    buttonColor: "#059669",
    mode: 'light' as const,
    backgroundType: 'pattern' as const,
    patternType: 'dots',
    patternColor: "#059669",
    patternOpacity: 0.05,
  },
};

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

export default function ThemeCustomizer({ theme, onChange }: ThemeCustomizerProps) {
  const applyPreset = (presetKey: keyof typeof THEME_PRESETS) => {
    const preset = THEME_PRESETS[presetKey] as any;
    onChange({
      ...theme,
      primary: preset.primary,
      background: preset.background,
      text: preset.text,
      accent: preset.accent,
      buttonColor: preset.buttonColor,
      mode: preset.mode,
      backgroundType: preset.backgroundType,
      gradientStart: preset.gradientStart || undefined,
      gradientEnd: preset.gradientEnd || undefined,
      gradientDirection: preset.gradientDirection || undefined,
      patternType: preset.patternType || undefined,
      patternColor: preset.patternColor || undefined,
      patternOpacity: preset.patternOpacity ?? undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Theme Customization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Presets */}
        <div className="space-y-2">
          <Label>Theme Presets</Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(THEME_PRESETS).map(([key, preset]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(key as keyof typeof THEME_PRESETS)}
                className="justify-start"
              >
                <div 
                  className="w-4 h-4 rounded-full mr-2" 
                  style={{ backgroundColor: preset.primary }}
                />
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="space-y-2">
          <Label>Preview Mode</Label>
          <div className="flex gap-2">
            <Button
              variant={theme.mode === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({ ...theme, mode: 'light' })}
              className="flex-1"
            >
              <Sun className="h-4 w-4 mr-2" />
              Light
            </Button>
            <Button
              variant={theme.mode === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({ ...theme, mode: 'dark' })}
              className="flex-1"
            >
              <Moon className="h-4 w-4 mr-2" />
              Dark
            </Button>
          </div>
        </div>

        {/* Font Selection */}
        <div className="space-y-2">
          <Label htmlFor="font-select">Font Family</Label>
          <Select
            value={theme.font || "Inter"}
            onValueChange={(value) => onChange({ ...theme, font: value })}
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
              value={theme.primary}
              onChange={(e) => onChange({ ...theme, primary: e.target.value })}
              className="h-10 w-20 rounded border border-border cursor-pointer"
            />
            <input
              type="text"
              value={theme.primary}
              onChange={(e) => onChange({ ...theme, primary: e.target.value })}
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
              value={theme.accent || theme.primary}
              onChange={(e) => onChange({ ...theme, accent: e.target.value })}
              className="h-10 w-20 rounded border border-border cursor-pointer"
            />
            <input
              type="text"
              value={theme.accent || theme.primary}
              onChange={(e) => onChange({ ...theme, accent: e.target.value })}
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
              value={theme.buttonColor || theme.primary}
              onChange={(e) => onChange({ ...theme, buttonColor: e.target.value })}
              className="h-10 w-20 rounded border border-border cursor-pointer"
            />
            <input
              type="text"
              value={theme.buttonColor || theme.primary}
              onChange={(e) => onChange({ ...theme, buttonColor: e.target.value })}
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
              variant={(!theme.backgroundType || theme.backgroundType === 'solid') ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({ ...theme, backgroundType: 'solid' })}
              className="flex-1"
            >
              Solid
            </Button>
            <Button
              variant={theme.backgroundType === 'gradient' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({ ...theme, backgroundType: 'gradient', gradientStart: theme.gradientStart || theme.background, gradientEnd: theme.gradientEnd || theme.primary })}
              className="flex-1"
            >
              Gradient
            </Button>
            <Button
              variant={theme.backgroundType === 'pattern' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({ ...theme, backgroundType: 'pattern', patternType: theme.patternType || 'dots', patternColor: theme.patternColor || theme.primary, patternOpacity: theme.patternOpacity ?? 0.1 })}
              className="flex-1"
            >
              Pattern
            </Button>
          </div>
        </div>

        {/* Solid Background Color */}
        {(!theme.backgroundType || theme.backgroundType === 'solid') && (
          <div className="space-y-2">
            <Label htmlFor="background-color">Background Color</Label>
            <div className="flex gap-2 items-center">
              <input
                id="background-color"
                type="color"
                value={theme.background}
                onChange={(e) => onChange({ ...theme, background: e.target.value })}
                className="h-10 w-20 rounded border border-border cursor-pointer"
              />
              <input
                type="text"
                value={theme.background}
                onChange={(e) => onChange({ ...theme, background: e.target.value })}
                className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
                placeholder="#0B0B0C"
              />
            </div>
          </div>
        )}

        {/* Gradient Options */}
        {theme.backgroundType === 'gradient' && (
          <div className="space-y-4 p-4 border border-border rounded-lg">
            <div className="space-y-2">
              <Label>Gradient Direction</Label>
              <Select
                value={theme.gradientDirection || "to-br"}
                onValueChange={(value) => onChange({ ...theme, gradientDirection: value })}
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
                    value={theme.gradientStart || theme.background}
                    onChange={(e) => onChange({ ...theme, gradientStart: e.target.value })}
                    className="h-10 w-14 rounded border border-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.gradientStart || theme.background}
                    onChange={(e) => onChange({ ...theme, gradientStart: e.target.value })}
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
                    value={theme.gradientEnd || theme.primary}
                    onChange={(e) => onChange({ ...theme, gradientEnd: e.target.value })}
                    className="h-10 w-14 rounded border border-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.gradientEnd || theme.primary}
                    onChange={(e) => onChange({ ...theme, gradientEnd: e.target.value })}
                    className="flex-1 h-10 rounded-md border border-input bg-background px-2 text-xs"
                  />
                </div>
              </div>
            </div>
            {/* Gradient Preview */}
            <div 
              className="h-12 rounded-lg border border-border"
              style={{ background: getGradientCSS(theme) }}
            />
          </div>
        )}

        {/* Pattern Options */}
        {theme.backgroundType === 'pattern' && (
          <div className="space-y-4 p-4 border border-border rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="background-color-pattern">Base Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  id="background-color-pattern"
                  type="color"
                  value={theme.background}
                  onChange={(e) => onChange({ ...theme, background: e.target.value })}
                  className="h-10 w-20 rounded border border-border cursor-pointer"
                />
                <input
                  type="text"
                  value={theme.background}
                  onChange={(e) => onChange({ ...theme, background: e.target.value })}
                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pattern Type</Label>
              <Select
                value={theme.patternType || "dots"}
                onValueChange={(value) => onChange({ ...theme, patternType: value })}
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
                  value={theme.patternColor || theme.primary}
                  onChange={(e) => onChange({ ...theme, patternColor: e.target.value })}
                  className="h-10 w-full rounded border border-border cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pattern-opacity">Opacity: {Math.round((theme.patternOpacity ?? 0.1) * 100)}%</Label>
                <input
                  id="pattern-opacity"
                  type="range"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={theme.patternOpacity ?? 0.1}
                  onChange={(e) => onChange({ ...theme, patternOpacity: parseFloat(e.target.value) })}
                  className="w-full h-10"
                />
              </div>
            </div>
            {/* Pattern Preview */}
            <div 
              className="h-12 rounded-lg border border-border"
              style={{ 
                backgroundColor: theme.background,
                backgroundImage: getPatternCSS(theme),
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
              value={theme.text}
              onChange={(e) => onChange({ ...theme, text: e.target.value })}
              className="h-10 w-20 rounded border border-border cursor-pointer"
            />
            <input
              type="text"
              value={theme.text}
              onChange={(e) => onChange({ ...theme, text: e.target.value })}
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="#F8F8F8"
            />
          </div>
        </div>

        {/* Text Color */}
        <div className="space-y-2">
          <Label htmlFor="text-color">Text Color</Label>
          <div className="flex gap-2 items-center">
            <input
              id="text-color"
              type="color"
              value={theme.text}
              onChange={(e) => onChange({ ...theme, text: e.target.value })}
              className="h-10 w-20 rounded border border-border cursor-pointer"
            />
            <input
              type="text"
              value={theme.text}
              onChange={(e) => onChange({ ...theme, text: e.target.value })}
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="#F8F8F8"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions for generating CSS
export function getGradientCSS(theme: ThemeProps): string {
  if (theme.backgroundType !== 'gradient') return theme.background;
  
  const direction = theme.gradientDirection || 'to-br';
  const directionMap: Record<string, string> = {
    'to-r': 'to right',
    'to-l': 'to left',
    'to-t': 'to top',
    'to-b': 'to bottom',
    'to-br': 'to bottom right',
    'to-bl': 'to bottom left',
    'to-tr': 'to top right',
    'to-tl': 'to top left',
  };
  
  return `linear-gradient(${directionMap[direction] || 'to bottom right'}, ${theme.gradientStart || theme.background}, ${theme.gradientEnd || theme.primary})`;
}

export function getPatternCSS(theme: ThemeProps): string {
  if (theme.backgroundType !== 'pattern') return 'none';
  
  const color = theme.patternColor || theme.primary;
  const opacity = theme.patternOpacity ?? 0.1;
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  const patternColor = hexToRgba(color, opacity);
  
  switch (theme.patternType) {
    case 'dots':
      return `radial-gradient(circle, ${patternColor} 1px, transparent 1px)`;
    case 'stripes':
      return `repeating-linear-gradient(90deg, ${patternColor} 0px, ${patternColor} 1px, transparent 1px, transparent 20px)`;
    case 'grid':
      return `linear-gradient(${patternColor} 1px, transparent 1px), linear-gradient(90deg, ${patternColor} 1px, transparent 1px)`;
    case 'diagonal':
      return `repeating-linear-gradient(45deg, ${patternColor} 0px, ${patternColor} 1px, transparent 1px, transparent 15px)`;
    case 'waves':
      return `repeating-radial-gradient(circle at 0 0, transparent 0, ${patternColor} 10px), repeating-linear-gradient(${patternColor}, ${hexToRgba(color, opacity * 0.5)})`;
    default:
      return 'none';
  }
}

export function getPatternSize(patternType: string | undefined): string {
  switch (patternType) {
    case 'dots':
      return '20px 20px';
    case 'grid':
      return '20px 20px';
    case 'waves':
      return '40px 40px';
    default:
      return 'auto';
  }
}

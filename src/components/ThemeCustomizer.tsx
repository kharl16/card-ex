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
  },
  creative: {
    name: "Creative",
    primary: "#ec4899",
    background: "#fdf2f8",
    text: "#831843",
    accent: "#f472b6",
    buttonColor: "#ec4899",
    mode: 'light' as const,
  },
  modern: {
    name: "Modern",
    primary: "#8b5cf6",
    background: "#0f172a",
    text: "#f1f5f9",
    accent: "#a78bfa",
    buttonColor: "#8b5cf6",
    mode: 'dark' as const,
  },
  elegant: {
    name: "Elegant",
    primary: "#D4AF37",
    background: "#0B0B0C",
    text: "#F8F8F8",
    accent: "#E6C85C",
    buttonColor: "#D4AF37",
    mode: 'dark' as const,
  },
  nature: {
    name: "Nature",
    primary: "#059669",
    background: "#f0fdf4",
    text: "#14532d",
    accent: "#10b981",
    buttonColor: "#059669",
    mode: 'light' as const,
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

export default function ThemeCustomizer({ theme, onChange }: ThemeCustomizerProps) {
  const applyPreset = (presetKey: keyof typeof THEME_PRESETS) => {
    const preset = THEME_PRESETS[presetKey];
    onChange({
      primary: preset.primary,
      background: preset.background,
      text: preset.text,
      accent: preset.accent,
      buttonColor: preset.buttonColor,
      font: theme.font,
      mode: preset.mode,
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
                <SelectItem key={font.value} value={font.value}>
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

        {/* Background Color */}
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

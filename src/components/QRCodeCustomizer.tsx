import { useState, useRef, useEffect } from "react";
import type { ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Upload, X, RotateCcw, Save, FolderOpen, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QRPatternPreview } from "./qr/QRPatternPreview";
import { QREyeStylePreview } from "./qr/QREyeStylePreview";
import { QRLivePreview } from "./qr/QRLivePreview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface QRSettings {
  size?: number;
  darkColor?: string;
  lightColor?: string;
  logoUrl?: string;
  logoPosition?: "center" | "background";
  logoOpacity?: number;
  pattern?: "squares" | "classy" | "rounded" | "classy-rounded" | "extra-rounded" | "dots";
  eyeStyle?: "square" | "extra-rounded" | "leaf" | "diamond" | "dot" | "star" | "heart" | "shield";
  useGradient?: boolean;
  gradientColor1?: string;
  gradientColor2?: string;
  gradientType?: "linear" | "radial";
}

export interface QRPreset {
  id: string;
  name: string;
  settings: QRSettings;
  createdAt: string;
}

export const DEFAULT_QR_SETTINGS: QRSettings = {
  size: 512,
  darkColor: "#000000",
  lightColor: "#FFFFFF",
  logoUrl: "",
  logoPosition: "center",
  logoOpacity: 0.3,
  pattern: "squares",
  eyeStyle: "square",
  useGradient: false,
  gradientColor1: "#000000",
  gradientColor2: "#4F46E5",
  gradientType: "linear",
};

const QR_PRESETS_STORAGE_KEY = "cardex-qr-presets";

// Built-in QR preset templates
const BUILT_IN_TEMPLATES: { name: string; description: string; settings: Partial<QRSettings> }[] = [
  {
    name: "Professional",
    description: "Clean black & white classic look",
    settings: {
      darkColor: "#1A1A1A",
      lightColor: "#FFFFFF",
      pattern: "squares",
      eyeStyle: "square",
      useGradient: false,
    },
  },
  {
    name: "Modern",
    description: "Rounded corners with blue gradient",
    settings: {
      darkColor: "#3B82F6",
      lightColor: "#FFFFFF",
      pattern: "extra-rounded",
      eyeStyle: "extra-rounded",
      useGradient: true,
      gradientColor1: "#3B82F6",
      gradientColor2: "#8B5CF6",
      gradientType: "linear",
    },
  },
  {
    name: "Elegant",
    description: "Gold tones with classy pattern",
    settings: {
      darkColor: "#D4AF37",
      lightColor: "#FFF8E7",
      pattern: "classy",
      eyeStyle: "leaf",
      useGradient: true,
      gradientColor1: "#D4AF37",
      gradientColor2: "#B8860B",
      gradientType: "radial",
    },
  },
  {
    name: "Minimal",
    description: "Soft gray dots pattern",
    settings: {
      darkColor: "#374151",
      lightColor: "#F9FAFB",
      pattern: "dots",
      eyeStyle: "dot",
      useGradient: false,
    },
  },
  {
    name: "Vibrant",
    description: "Bold pink-to-orange gradient",
    settings: {
      darkColor: "#EC4899",
      lightColor: "#FFFFFF",
      pattern: "rounded",
      eyeStyle: "extra-rounded",
      useGradient: true,
      gradientColor1: "#EC4899",
      gradientColor2: "#F97316",
      gradientType: "linear",
    },
  },
  {
    name: "Nature",
    description: "Green gradient with leaf eyes",
    settings: {
      darkColor: "#059669",
      lightColor: "#ECFDF5",
      pattern: "classy-rounded",
      eyeStyle: "leaf",
      useGradient: true,
      gradientColor1: "#059669",
      gradientColor2: "#10B981",
      gradientType: "radial",
    },
  },
];

interface QRCodeCustomizerProps {
  settings: QRSettings;
  onChange: (settings: QRSettings) => void;
  onRegenerate: () => void;
  isRegenerating?: boolean;
  cardId?: string;
  userId?: string;
  previewUrl?: string;
}

const patternOptions: { value: QRSettings["pattern"]; label: string }[] = [
  { value: "squares", label: "Squares" },
  { value: "classy", label: "Classy" },
  { value: "rounded", label: "Rounded" },
  { value: "classy-rounded", label: "Classy Rounded" },
  { value: "extra-rounded", label: "Extra Rounded" },
  { value: "dots", label: "Dots" },
];

const eyeStyleOptions: { value: QRSettings["eyeStyle"]; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "extra-rounded", label: "Rounded" },
  { value: "dot", label: "Dot" },
  { value: "leaf", label: "Leaf" },
  { value: "diamond", label: "Diamond" },
  { value: "star", label: "Star" },
  { value: "heart", label: "Heart" },
  { value: "shield", label: "Shield" },
];

// Helper functions for presets
const loadPresetsFromStorage = (): QRPreset[] => {
  try {
    const stored = localStorage.getItem(QR_PRESETS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const savePresetsToStorage = (presets: QRPreset[]) => {
  localStorage.setItem(QR_PRESETS_STORAGE_KEY, JSON.stringify(presets));
};

export default function QRCodeCustomizer({
  settings,
  onChange,
  onRegenerate,
  isRegenerating,
  cardId,
  userId,
  previewUrl,
}: QRCodeCustomizerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [presets, setPresets] = useState<QRPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState("");
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);

  // Load presets from localStorage on mount
  useEffect(() => {
    setPresets(loadPresetsFromStorage());
  }, []);

  // Mark component as mounted to avoid auto-regenerate on first render
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Auto-regenerate QR whenever settings change (debounced)
  useEffect(() => {
    if (!hasMounted) return;

    const timeout = setTimeout(() => {
      onRegenerate();
    }, 600); // debounce to avoid spamming regenerate on every keystroke

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(settings), hasMounted]);

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be smaller than 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/qr-logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("media").upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("media").getPublicUrl(fileName);

      onChange({
        ...settings,
        logoUrl: publicUrl,
        // default to center overlay when first uploading
        logoPosition: settings.logoPosition || "center",
        logoOpacity: settings.logoOpacity ?? 0.3,
      });

      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = () => {
    onChange({
      ...settings,
      logoUrl: "",
      logoPosition: undefined,
      logoOpacity: undefined,
    });
  };

  const handleSizeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const parsed = parseInt(raw, 10);

    if (Number.isNaN(parsed)) {
      onChange({ ...settings, size: undefined });
      return;
    }

    const clamped = Math.min(1024, Math.max(256, parsed));
    onChange({ ...settings, size: clamped });
  };

  const handleResetSettings = () => {
    onChange({ ...DEFAULT_QR_SETTINGS });
    toast.success("QR settings reset to defaults");
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      toast.error("Please enter a preset name");
      return;
    }

    const newPreset: QRPreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName.trim(),
      settings: { ...settings, logoUrl: "" }, // Don't save logo URL as it may expire
      createdAt: new Date().toISOString(),
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    savePresetsToStorage(updatedPresets);
    setNewPresetName("");
    toast.success(`Preset "${newPreset.name}" saved`);
  };

  const handleLoadPreset = (preset: QRPreset) => {
    onChange({ ...preset.settings, logoUrl: settings.logoUrl }); // Keep current logo
    toast.success(`Preset "${preset.name}" loaded`);
    setIsPresetDialogOpen(false);
  };

  const handleDeletePreset = (presetId: string) => {
    const updatedPresets = presets.filter((p) => p.id !== presetId);
    setPresets(updatedPresets);
    savePresetsToStorage(updatedPresets);
    toast.success("Preset deleted");
  };

  const handleLoadTemplate = (template: typeof BUILT_IN_TEMPLATES[0]) => {
    onChange({ ...settings, ...template.settings });
    toast.success(`Template "${template.name}" applied`);
  };

  const darkColor = settings.darkColor || "#000000";
  const lightColor = settings.lightColor || "#FFFFFF";
  const currentSize = settings.size ?? 512;
  const currentLogoOpacity = settings.logoOpacity ?? 0.3;
  const currentLogoPosition = settings.logoPosition || "center";
  const useGradient = settings.useGradient ?? false;
  const gradientColor1 = settings.gradientColor1 || "#000000";
  const gradientColor2 = settings.gradientColor2 || "#4F46E5";
  const gradientType = settings.gradientType || "linear";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col gap-3">
          <span>QR Code Customization</span>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onRegenerate} disabled={isRegenerating}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isRegenerating ? "animate-spin" : ""}`} />
              Regenerate
            </Button>
            <Button size="sm" variant="outline" onClick={handleResetSettings}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <FolderOpen className="h-4 w-4 mr-1" />
                  Presets
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>QR Code Presets & Templates</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Built-in Templates */}
                  <div className="space-y-2">
                    <Label>Quick Templates</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {BUILT_IN_TEMPLATES.map((template) => (
                        <button
                          key={template.name}
                          onClick={() => handleLoadTemplate(template)}
                          className="flex flex-col items-start p-3 rounded-lg border-2 border-border bg-background hover:bg-muted/50 hover:border-primary/50 transition-all text-left"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-4 h-4 rounded-full border"
                              style={{
                                background: template.settings.useGradient
                                  ? `linear-gradient(135deg, ${template.settings.gradientColor1}, ${template.settings.gradientColor2})`
                                  : template.settings.darkColor,
                              }}
                            />
                            <span className="font-medium text-sm">{template.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{template.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Save new preset */}
                  <div className="space-y-2">
                    <Label>Save Current Settings as Preset</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Preset name..."
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
                      />
                      <Button onClick={handleSavePreset} disabled={!newPresetName.trim()}>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>

                  {/* Saved presets list */}
                  <div className="space-y-2">
                    <Label>Your Saved Presets</Label>
                    {presets.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No presets saved yet. Save your current settings to create one!
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {presets.map((preset) => (
                          <div
                            key={preset.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{preset.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {preset.settings.pattern} • {preset.settings.eyeStyle}
                                {preset.settings.useGradient && " • Gradient"}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleLoadPreset(preset)}
                              >
                                Load
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeletePreset(preset.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Size */}
        <div className="space-y-2">
          <Label htmlFor="qr-size">QR Code Size (px)</Label>
          <Input
            id="qr-size"
            type="number"
            min={256}
            max={1024}
            step={64}
            value={currentSize}
            onChange={handleSizeChange}
          />
          <p className="text-xs text-muted-foreground">Recommended: 512px. Range: 256–1024px</p>
        </div>

        {/* Colors */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qr-dark">Dark Color</Label>
              <div className="flex gap-2">
                <Input
                  id="qr-dark"
                  type="color"
                  value={darkColor}
                  onChange={(e) => onChange({ ...settings, darkColor: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                  disabled={useGradient}
                />
                <Input
                  type="text"
                  value={darkColor}
                  onChange={(e) => onChange({ ...settings, darkColor: e.target.value })}
                  placeholder="#000000"
                  className="flex-1"
                  disabled={useGradient}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qr-light">Light Color</Label>
              <div className="flex gap-2">
                <Input
                  id="qr-light"
                  type="color"
                  value={lightColor}
                  onChange={(e) => onChange({ ...settings, lightColor: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={lightColor}
                  onChange={(e) => onChange({ ...settings, lightColor: e.target.value })}
                  placeholder="#FFFFFF"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Gradient Toggle */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Use Gradient</Label>
              <button
                type="button"
                onClick={() => onChange({ ...settings, useGradient: !useGradient })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  useGradient ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useGradient ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {useGradient && (
              <div className="space-y-3 pt-2 border-t border-border/50">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Color 1</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={gradientColor1}
                        onChange={(e) => onChange({ ...settings, gradientColor1: e.target.value })}
                        className="w-12 h-8 p-0.5 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={gradientColor1}
                        onChange={(e) => onChange({ ...settings, gradientColor1: e.target.value })}
                        className="flex-1 h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Color 2</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={gradientColor2}
                        onChange={(e) => onChange({ ...settings, gradientColor2: e.target.value })}
                        className="w-12 h-8 p-0.5 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={gradientColor2}
                        onChange={(e) => onChange({ ...settings, gradientColor2: e.target.value })}
                        className="flex-1 h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Gradient Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onChange({ ...settings, gradientType: "linear" })}
                      className={`flex items-center justify-center gap-2 p-2 rounded border-2 transition-all ${
                        gradientType === "linear"
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded"
                        style={{
                          background: `linear-gradient(135deg, ${gradientColor1}, ${gradientColor2})`,
                        }}
                      />
                      <span className="text-xs font-medium">Linear</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange({ ...settings, gradientType: "radial" })}
                      className={`flex items-center justify-center gap-2 p-2 rounded border-2 transition-all ${
                        gradientType === "radial"
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded"
                        style={{
                          background: `radial-gradient(circle, ${gradientColor1}, ${gradientColor2})`,
                        }}
                      />
                      <span className="text-xs font-medium">Radial</span>
                    </button>
                  </div>
                </div>

                {/* Gradient Preview */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Preview:</span>
                  <div
                    className="flex-1 h-6 rounded"
                    style={{
                      background:
                        gradientType === "linear"
                          ? `linear-gradient(135deg, ${gradientColor1}, ${gradientColor2})`
                          : `radial-gradient(circle, ${gradientColor1}, ${gradientColor2})`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pattern Selection */}
        <div className="space-y-2">
          <Label>Pattern Style</Label>
          <div className="grid grid-cols-3 gap-2">
            {patternOptions.map((option) => (
              <QRPatternPreview
                key={option.value}
                pattern={option.value!}
                label={option.label}
                isSelected={(settings.pattern || "squares") === option.value}
                onClick={() => onChange({ ...settings, pattern: option.value || "squares" })}
              />
            ))}
          </div>
        </div>

        {/* Eye Style Selection */}
        <div className="space-y-2">
          <Label>Eye Style</Label>
          <div className="grid grid-cols-4 gap-2">
            {eyeStyleOptions.map((option) => (
              <QREyeStylePreview
                key={option.value}
                eyeStyle={option.value!}
                label={option.label}
                isSelected={(settings.eyeStyle || "square") === option.value}
                onClick={() => onChange({ ...settings, eyeStyle: option.value || "square" })}
              />
            ))}
          </div>
        </div>

        {/* Logo Upload + Center / Background */}
        <div className="space-y-2">
          <Label>Logo (Optional)</Label>
          <div className="flex flex-col gap-3">
            {settings.logoUrl ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <img src={settings.logoUrl} alt="QR Logo" className="h-12 w-12 object-contain rounded" />
                  <span className="flex-1 text-sm truncate">{settings.logoUrl.split("/").pop()}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveLogo}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Logo Position Toggle */}
                <div className="space-y-2">
                  <Label className="text-xs">Logo Position</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Center overlay */}
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...settings,
                          logoPosition: "center",
                        })
                      }
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 ${
                        currentLogoPosition === "center"
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:bg-muted/50"
                      }`}
                    >
                      <div className="w-10 h-10 border-2 border-current rounded flex items-center justify-center mb-1">
                        <div className="w-4 h-4 bg-current rounded" />
                      </div>
                      <span className="text-xs font-medium">Center</span>
                    </button>

                    {/* Background watermark */}
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...settings,
                          logoPosition: "background",
                          logoOpacity: currentLogoOpacity,
                        })
                      }
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 ${
                        currentLogoPosition === "background"
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:bg-muted/50"
                      }`}
                    >
                      <div className="w-10 h-10 border-2 border-current rounded flex items-center justify-center mb-1 relative overflow-hidden">
                        <div className="absolute inset-0 bg-current/20" />
                        <div className="relative grid grid-cols-3 gap-0.5">
                          {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 bg-current rounded-full" />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs font-medium">Background</span>
                    </button>
                  </div>
                </div>

                {/* Logo Opacity (only for background mode) */}
                {currentLogoPosition === "background" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Background Logo Opacity: {Math.round(currentLogoOpacity * 100)}%</Label>
                    <input
                      type="range"
                      min={0.05}
                      max={1.0}
                      step={0.05}
                      value={currentLogoOpacity}
                      onChange={(e) =>
                        onChange({
                          ...settings,
                          logoOpacity: parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">Lower values create a subtle watermark, higher values make the logo more visible.</p>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {isUploading ? "Uploading..." : "Click to upload logo"}
                </span>
                <span className="text-xs text-muted-foreground/70">PNG, JPG up to 2MB</span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              disabled={isUploading}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Use your logo as a center overlay or as a watermark-style background behind the QR pattern.
          </p>
        </div>

        {/* Live QR Code Preview */}
        <QRLivePreview settings={settings} previewUrl={previewUrl} />

        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3">
          <p className="text-xs text-blue-900 dark:text-blue-100">
            💡 <strong>Tip:</strong> Your QR updates automatically as you tweak settings. The “Regenerate QR” button can
            be used anytime if you want to manually refresh the generated image.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

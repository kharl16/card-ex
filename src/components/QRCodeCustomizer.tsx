import { useState, useRef, useEffect } from "react";
import type { ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QRPatternPreview } from "./qr/QRPatternPreview";
import { QREyeStylePreview } from "./qr/QREyeStylePreview";
import { QRLivePreview } from "./qr/QRLivePreview";

export interface QRSettings {
  size?: number;
  darkColor?: string;
  lightColor?: string;
  logoUrl?: string;
  logoPosition?: "center" | "background";
  logoOpacity?: number;
  pattern?: "squares" | "classy" | "rounded" | "classy-rounded" | "extra-rounded" | "dots";
  eyeStyle?: "square" | "extra-rounded" | "leaf" | "diamond" | "dot";
}

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
  { value: "leaf", label: "Leaf" },
  { value: "diamond", label: "Diamond" },
  { value: "dot", label: "Dot" },
];

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
      // allow clearing field temporarily
      onChange({ ...settings, size: undefined });
      return;
    }

    const clamped = Math.min(1024, Math.max(256, parsed));
    onChange({ ...settings, size: clamped });
  };

  const darkColor = settings.darkColor || "#000000";
  const lightColor = settings.lightColor || "#FFFFFF";
  const currentSize = settings.size ?? 512;
  const currentLogoOpacity = settings.logoOpacity ?? 0.3;
  const currentLogoPosition = settings.logoPosition || "center";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>QR Code Customization</span>
          <Button size="sm" variant="outline" onClick={onRegenerate} disabled={isRegenerating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
            Regenerate QR
          </Button>
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
              />
              <Input
                type="text"
                value={darkColor}
                onChange={(e) => onChange({ ...settings, darkColor: e.target.value })}
                placeholder="#000000"
                className="flex-1"
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
          <div className="grid grid-cols-5 gap-2">
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

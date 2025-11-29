import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface QRSettings {
  size?: number;
  darkColor?: string;
  lightColor?: string;
  logoUrl?: string;
  pattern?: 'squares' | 'classy' | 'rounded' | 'classy-rounded' | 'extra-rounded' | 'dots';
  eyeStyle?: 'square' | 'extra-rounded' | 'leaf' | 'diamond';
}

interface QRCodeCustomizerProps {
  settings: QRSettings;
  onChange: (settings: QRSettings) => void;
  onRegenerate: () => void;
  isRegenerating?: boolean;
  cardId?: string;
}

const patternOptions: { value: QRSettings['pattern']; label: string; icon: string }[] = [
  { value: 'squares', label: 'Squares', icon: '▦' },
  { value: 'classy', label: 'Classy', icon: '◫' },
  { value: 'rounded', label: 'Rounded', icon: '◉' },
  { value: 'classy-rounded', label: 'Classy Rounded', icon: '◎' },
  { value: 'extra-rounded', label: 'Extra Rounded', icon: '●' },
  { value: 'dots', label: 'Dots', icon: '⠿' },
];

const eyeStyleOptions: { value: QRSettings['eyeStyle']; label: string; icon: string }[] = [
  { value: 'square', label: 'Square', icon: '◻' },
  { value: 'extra-rounded', label: 'Rounded', icon: '◯' },
  { value: 'leaf', label: 'Leaf', icon: '◧' },
  { value: 'diamond', label: 'Diamond', icon: '◇' },
];

export default function QRCodeCustomizer({ 
  settings, 
  onChange, 
  onRegenerate,
  isRegenerating,
  cardId
}: QRCodeCustomizerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cardId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be smaller than 2MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${cardId}/qr-logo-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('card-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('card-assets')
        .getPublicUrl(fileName);

      onChange({ ...settings, logoUrl: publicUrl });
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    onChange({ ...settings, logoUrl: '' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          QR Code Customization
          <Button 
            size="sm" 
            variant="outline"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate QR
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="qr-size">QR Code Size (px)</Label>
          <Input
            id="qr-size"
            type="number"
            min="256"
            max="1024"
            step="64"
            value={settings.size || 512}
            onChange={(e) => onChange({ ...settings, size: parseInt(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">
            Recommended: 512px. Range: 256-1024px
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="qr-dark">Dark Color</Label>
            <div className="flex gap-2">
              <Input
                id="qr-dark"
                type="color"
                value={settings.darkColor || '#000000'}
                onChange={(e) => onChange({ ...settings, darkColor: e.target.value })}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={settings.darkColor || '#000000'}
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
                value={settings.lightColor || '#FFFFFF'}
                onChange={(e) => onChange({ ...settings, lightColor: e.target.value })}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={settings.lightColor || '#FFFFFF'}
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
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ ...settings, pattern: option.value })}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 hover:border-primary/50 ${
                  (settings.pattern || 'squares') === option.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:bg-muted/50'
                }`}
              >
                <span className="text-2xl mb-1">{option.icon}</span>
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Eye Style Selection */}
        <div className="space-y-2">
          <Label>Eye Style</Label>
          <div className="grid grid-cols-4 gap-2">
            {eyeStyleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ ...settings, eyeStyle: option.value })}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 hover:border-primary/50 ${
                  (settings.eyeStyle || 'square') === option.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:bg-muted/50'
                }`}
              >
                <span className="text-2xl mb-1">{option.icon}</span>
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Logo Upload */}
        <div className="space-y-2">
          <Label>Logo (Optional)</Label>
          <div className="flex flex-col gap-3">
            {settings.logoUrl ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <img 
                  src={settings.logoUrl} 
                  alt="QR Logo" 
                  className="h-12 w-12 object-contain rounded"
                />
                <span className="flex-1 text-sm truncate">{settings.logoUrl.split('/').pop()}</span>
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
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {isUploading ? 'Uploading...' : 'Click to upload logo'}
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
            Add a logo overlay in the center of the QR code
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <p className="text-sm font-medium">Preview Settings:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Size:</span>{' '}
              <span className="font-mono">{settings.size || 512}px</span>
            </div>
            <div>
              <span className="text-muted-foreground">Colors:</span>{' '}
              <span className="font-mono">
                {settings.darkColor || '#000'} / {settings.lightColor || '#FFF'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Pattern:</span>{' '}
              <span className="font-mono">{settings.pattern || 'squares'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Eye Style:</span>{' '}
              <span className="font-mono">{settings.eyeStyle || 'square'}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3">
          <p className="text-xs text-blue-900 dark:text-blue-100">
            💡 <strong>Tip:</strong> Click "Regenerate QR" after changing settings to apply your customizations. The QR code will update without republishing your card.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface QRSettings {
  size?: number;
  darkColor?: string;
  lightColor?: string;
  logoUrl?: string;
}

interface QRCodeCustomizerProps {
  settings: QRSettings;
  onChange: (settings: QRSettings) => void;
  onRegenerate: () => void;
  isRegenerating?: boolean;
}

export default function QRCodeCustomizer({ 
  settings, 
  onChange, 
  onRegenerate,
  isRegenerating 
}: QRCodeCustomizerProps) {
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

        <div className="space-y-2">
          <Label htmlFor="qr-logo">Logo URL (Optional)</Label>
          <Input
            id="qr-logo"
            type="url"
            value={settings.logoUrl || ''}
            onChange={(e) => onChange({ ...settings, logoUrl: e.target.value })}
            placeholder="https://example.com/logo.png"
          />
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

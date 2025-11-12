import React from "react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ThemeCustomizerProps {
  theme: {
    primary: string;
    background: string;
    text: string;
  };
  onChange: (theme: { primary: string; background: string; text: string }) => void;
}

export default function ThemeCustomizer({ theme, onChange }: ThemeCustomizerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme Colors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

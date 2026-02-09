import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useToolsOrb, ToolsOrbItem } from "@/hooks/useToolsOrb";
import { Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ImageUpload from "@/components/ImageUpload";

interface ToolsOrbCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ToolsOrbCustomizer({ open, onOpenChange }: ToolsOrbCustomizerProps) {
  const { settings, updateSettings, refetch } = useToolsOrb();
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLocalSettings(settings);
    }
  }, [open, settings]);

  const handleToggleEnabled = (enabled: boolean) => {
    setLocalSettings((prev) => ({ ...prev, enabled }));
  };

  const handleOrbLabelChange = (orb_label: string) => {
    setLocalSettings((prev) => ({ ...prev, orb_label }));
  };

  const handleOrbImageChange = (orb_image_url: string | null) => {
    setLocalSettings((prev) => ({ ...prev, orb_image_url }));
  };

  const handleItemToggle = (itemId: string, enabled: boolean) => {
    setLocalSettings((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, enabled } : item
      ),
    }));
  };

  const handleItemLabelChange = (itemId: string, label: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, label } : item
      ),
    }));
  };

  const handleItemImageChange = (itemId: string, image_url: string | null) => {
    setLocalSettings((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, image_url: image_url || undefined } : item
      ),
    }));
  };

  const handleMoveItem = (itemId: string, direction: "up" | "down") => {
    const currentIndex = localSettings.items.findIndex((i) => i.id === itemId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= localSettings.items.length) return;

    const newItems = [...localSettings.items];
    [newItems[currentIndex], newItems[newIndex]] = [newItems[newIndex], newItems[currentIndex]];

    // Update order numbers
    const reorderedItems = newItems.map((item, idx) => ({ ...item, order: idx + 1 }));

    setLocalSettings((prev) => ({ ...prev, items: reorderedItems }));
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await updateSettings(localSettings);
    if (success) {
      toast.success("Settings saved successfully");
      await refetch();
      onOpenChange(false);
    } else {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  const sortedItems = [...localSettings.items].sort((a, b) => a.order - b.order);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Tools Orb</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Global Enable */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div>
              <Label className="text-base font-semibold">Enable Tools Orb</Label>
              <p className="text-sm text-muted-foreground">Show the floating tools button</p>
            </div>
            <Switch
              checked={localSettings.enabled}
              onCheckedChange={handleToggleEnabled}
            />
          </div>

          {/* Orb Settings */}
          <div className="space-y-4 p-4 rounded-xl border">
            <h3 className="font-semibold">Orb Appearance</h3>

            <div className="space-y-2">
              <Label>Orb Label</Label>
              <Input
                value={localSettings.orb_label}
                onChange={(e) => handleOrbLabelChange(e.target.value)}
                placeholder="Tools"
              />
            </div>

            <div className="space-y-2">
              <ImageUpload
                value={localSettings.orb_image_url}
                onChange={handleOrbImageChange}
                label="Custom Orb Image"
                aspectRatio="aspect-square"
                bucket="media"
                folderPrefix="tools-orb"
                maxSize={2}
              />
              <p className="text-xs text-muted-foreground">Leave empty to use default icon</p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-4 p-4 rounded-xl border">
            <h3 className="font-semibold">Menu Items</h3>

            <div className="space-y-3">
              {sortedItems.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    "p-3 rounded-xl border bg-card",
                    !item.enabled && "opacity-50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Drag handle & reorder buttons */}
                    <div className="flex flex-col gap-1 pt-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveItem(item.id, "up")}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveItem(item.id, "down")}
                        disabled={index === sortedItems.length - 1}
                      >
                        ↓
                      </Button>
                    </div>

                    {/* Item content */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={item.label}
                          onChange={(e) => handleItemLabelChange(item.id, e.target.value)}
                          className="flex-1 h-9"
                          placeholder="Label"
                        />
                        <Switch
                          checked={item.enabled}
                          onCheckedChange={(checked) => handleItemToggle(item.id, checked)}
                        />
                      </div>
                      
                      {/* Custom icon image upload */}
                      <div className="w-24">
                        <ImageUpload
                          value={item.image_url || null}
                          onChange={(url) => handleItemImageChange(item.id, url)}
                          label="Icon"
                          aspectRatio="aspect-square"
                          bucket="media"
                          folderPrefix="tools-orb/icons"
                          maxSize={1}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

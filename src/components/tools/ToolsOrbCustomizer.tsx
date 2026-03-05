import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useMergedToolsOrb, ToolsOrbItem, UserOrbOverride } from "@/hooks/useToolsOrb";
import { useAuth } from "@/contexts/AuthContext";
import { Save, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import ImageUpload from "@/components/ImageUpload";

interface ToolsOrbCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ToolsOrbCustomizer({ open, onOpenChange }: ToolsOrbCustomizerProps) {
  const { isAdmin } = useAuth();
  const {
    globalSettings,
    hasPaidCard,
    userOverrides,
    userOrbLabel,
    userOrbImageUrl,
    saveUserOverrides,
    resetUserOverrides,
    updateGlobalSettings,
    refetchGlobal,
    hasOverrides,
  } = useMergedToolsOrb();

  const isUserMode = !isAdmin && hasPaidCard;
  const isAdminMode = isAdmin;

  // Local state for editing
  const [localSettings, setLocalSettings] = useState(globalSettings);
  const [localUserItems, setLocalUserItems] = useState<UserOrbOverride[]>([]);
  const [localUserLabel, setLocalUserLabel] = useState<string | null>(null);
  const [localUserImageUrl, setLocalUserImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isAdminMode) {
      setLocalSettings(globalSettings);
    } else if (isUserMode) {
      // Initialize user overrides from existing or from global defaults
      if (userOverrides && userOverrides.length > 0) {
        setLocalUserItems(userOverrides);
      } else {
        // Initialize from global items
        setLocalUserItems(
          globalSettings.items.map((item) => ({
            id: item.id,
            label: item.label,
            enabled: item.enabled,
            order: item.order,
            image_url: item.image_url,
          }))
        );
      }
      setLocalUserLabel(userOrbLabel ?? null);
      setLocalUserImageUrl(userOrbImageUrl ?? null);
    }
  }, [open, isAdminMode, isUserMode, globalSettings, userOverrides, userOrbLabel, userOrbImageUrl]);

  // ---- Admin mode handlers ----
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
    if (isAdminMode) {
      const items = [...localSettings.items].sort((a, b) => a.order - b.order);
      const currentIndex = items.findIndex((i) => i.id === itemId);
      if (currentIndex === -1) return;
      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= items.length) return;
      [items[currentIndex], items[newIndex]] = [items[newIndex], items[currentIndex]];
      const reorderedItems = items.map((item, idx) => ({ ...item, order: idx + 1 }));
      setLocalSettings((prev) => ({ ...prev, items: reorderedItems }));
    } else {
      const items = [...localUserItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const currentIndex = items.findIndex((i) => i.id === itemId);
      if (currentIndex === -1) return;
      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= items.length) return;
      [items[currentIndex], items[newIndex]] = [items[newIndex], items[currentIndex]];
      setLocalUserItems(items.map((item, idx) => ({ ...item, order: idx + 1 })));
    }
  };

  // ---- User mode handlers ----
  const handleUserItemToggle = (itemId: string, enabled: boolean) => {
    setLocalUserItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, enabled } : item))
    );
  };

  const handleUserItemLabelChange = (itemId: string, label: string) => {
    setLocalUserItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, label } : item))
    );
  };

  const handleUserItemImageChange = (itemId: string, image_url: string | null) => {
    setLocalUserItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, image_url: image_url || undefined } : item))
    );
  };

  // ---- Save ----
  const handleSave = async () => {
    setSaving(true);
    if (isAdminMode) {
      const success = await updateGlobalSettings(localSettings);
      if (success) {
        toast.success("Global settings saved");
        await refetchGlobal();
        onOpenChange(false);
      } else {
        toast.error("Failed to save settings");
      }
    } else {
      const success = await saveUserOverrides(localUserItems, localUserLabel, localUserImageUrl);
      if (success) {
        toast.success("Your orb customization saved");
        onOpenChange(false);
      } else {
        toast.error("Failed to save customization");
      }
    }
    setSaving(false);
  };

  const handleReset = async () => {
    setSaving(true);
    const success = await resetUserOverrides();
    if (success) {
      toast.success("Reset to global defaults");
      onOpenChange(false);
    } else {
      toast.error("Failed to reset");
    }
    setSaving(false);
  };

  // Sorted items for rendering
  const sortedAdminItems = [...localSettings.items].sort((a, b) => a.order - b.order);
  const sortedUserItems = [...localUserItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Resolve user item labels from global for display hints
  const getGlobalItem = (id: string) => globalSettings.items.find((i) => i.id === id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isAdminMode ? "Global Tools Orb Settings" : "Customize Your Tools Orb"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* ===== ADMIN MODE ===== */}
          {isAdminMode && (
            <>
              {/* Global Enable */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div>
                  <Label className="text-base font-semibold">Enable Tools Orb</Label>
                  <p className="text-sm text-muted-foreground">Show the floating tools button</p>
                </div>
                <Switch checked={localSettings.enabled} onCheckedChange={handleToggleEnabled} />
              </div>

              {/* Orb Settings */}
              <div className="space-y-4 p-4 rounded-xl border">
                <h3 className="font-semibold">Orb Appearance</h3>
                <div className="space-y-2">
                  <Label>Orb Label</Label>
                  <Input value={localSettings.orb_label} onChange={(e) => handleOrbLabelChange(e.target.value)} placeholder="Tools" />
                </div>
                <div className="space-y-2">
                  <ImageUpload value={localSettings.orb_image_url} onChange={handleOrbImageChange} label="Custom Orb Image" aspectRatio="aspect-square" bucket="media" folderPrefix="tools-orb" maxSize={2} />
                  <p className="text-xs text-muted-foreground">Leave empty to use default icon</p>
                </div>
              </div>

              {/* Menu Items */}
              <div className="space-y-4 p-4 rounded-xl border">
                <h3 className="font-semibold">Menu Items</h3>
                <div className="space-y-3">
                  {sortedAdminItems.map((item, index) => (
                    <div key={item.id} className={cn("p-3 rounded-xl border bg-card", !item.enabled && "opacity-50")}>
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col gap-1 pt-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveItem(item.id, "up")} disabled={index === 0}>↑</Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveItem(item.id, "down")} disabled={index === sortedAdminItems.length - 1}>↓</Button>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <Input value={item.label} onChange={(e) => handleItemLabelChange(item.id, e.target.value)} className="flex-1 h-9" placeholder="Label" />
                            <Switch checked={item.enabled} onCheckedChange={(checked) => handleItemToggle(item.id, checked)} />
                          </div>
                          <div className="w-24">
                            <ImageUpload value={item.image_url || null} onChange={(url) => handleItemImageChange(item.id, url)} label="Icon" aspectRatio="aspect-square" bucket="media" folderPrefix="tools-orb/icons" maxSize={1} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ===== USER MODE ===== */}
          {isUserMode && (
            <>
              {/* Orb label override */}
              <div className="space-y-4 p-4 rounded-xl border">
                <h3 className="font-semibold">Orb Appearance</h3>
                <div className="space-y-2">
                  <Label>Custom Label</Label>
                  <Input
                    value={localUserLabel ?? ""}
                    onChange={(e) => setLocalUserLabel(e.target.value || null)}
                    placeholder={globalSettings.orb_label}
                  />
                  <p className="text-xs text-muted-foreground">Leave empty to use default: "{globalSettings.orb_label}"</p>
                </div>
                <div className="space-y-2">
                  <ImageUpload
                    value={localUserImageUrl}
                    onChange={(url) => setLocalUserImageUrl(url)}
                    label="Custom Orb Image"
                    aspectRatio="aspect-square"
                    bucket="media"
                    folderPrefix="tools-orb/user"
                    maxSize={2}
                  />
                  <p className="text-xs text-muted-foreground">Leave empty to use global image</p>
                </div>
              </div>

              {/* Menu items toggle/reorder */}
              <div className="space-y-4 p-4 rounded-xl border">
                <h3 className="font-semibold">Menu Items</h3>
                <p className="text-sm text-muted-foreground">Toggle, rename, and reorder the tools on your orb.</p>
                <div className="space-y-3">
                  {sortedUserItems.map((item, index) => {
                    const globalItem = getGlobalItem(item.id);
                    return (
                      <div key={item.id} className={cn("p-3 rounded-xl border bg-card", !item.enabled && "opacity-50")}>
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col gap-1 pt-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveItem(item.id, "up")} disabled={index === 0}>↑</Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveItem(item.id, "down")} disabled={index === sortedUserItems.length - 1}>↓</Button>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <Input
                                value={item.label ?? ""}
                                onChange={(e) => handleUserItemLabelChange(item.id, e.target.value)}
                                className="flex-1 h-9"
                                placeholder={globalItem?.label ?? "Label"}
                              />
                              <Switch checked={item.enabled ?? true} onCheckedChange={(checked) => handleUserItemToggle(item.id, checked)} />
                            </div>
                            <div className="w-24">
                              <ImageUpload
                                value={item.image_url || null}
                                onChange={(url) => handleUserItemImageChange(item.id, url)}
                                label="Icon"
                                aspectRatio="aspect-square"
                                bucket="media"
                                folderPrefix="tools-orb/user-icons"
                                maxSize={1}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {isUserMode && hasOverrides && (
            <Button variant="outline" onClick={handleReset} disabled={saving} className="gap-2 mr-auto">
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </Button>
          )}
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

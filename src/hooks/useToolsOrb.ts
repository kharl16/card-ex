import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ToolsOrbItem {
  id: string;
  label: string;
  route: string;
  icon_name: string;
  image_url?: string;
  order: number;
  enabled: boolean;
}

export interface ToolsOrbSettings {
  id: string;
  enabled: boolean;
  orb_image_url: string | null;
  orb_label: string;
  items: ToolsOrbItem[];
  updated_at: string;
}

const DEFAULT_SETTINGS: ToolsOrbSettings = {
  id: "00000000-0000-0000-0000-000000000001",
  enabled: true,
  orb_image_url: null,
  orb_label: "Tools",
  items: [
    { id: "trainings", label: "Trainings", route: "/tools/trainings", icon_name: "GraduationCap", order: 1, enabled: true },
    { id: "links", label: "IAM Links", route: "/tools/links", icon_name: "Link", order: 2, enabled: true },
    { id: "files", label: "Files", route: "/tools/files", icon_name: "FolderOpen", order: 3, enabled: true },
    { id: "directory", label: "Branches", route: "/tools/directory", icon_name: "Building2", order: 4, enabled: true },
    { id: "presentations", label: "Presentations", route: "/tools/presentations", icon_name: "Presentation", order: 5, enabled: true },
  ],
  updated_at: new Date().toISOString(),
};

export function useToolsOrb() {
  const [settings, setSettings] = useState<ToolsOrbSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tools_orb_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching tools orb settings:", error);
        return;
      }

      if (data) {
        setSettings({
          id: data.id,
          enabled: data.enabled,
          orb_image_url: data.orb_image_url,
          orb_label: data.orb_label || "Tools",
          items: (data.items as unknown as ToolsOrbItem[]) || DEFAULT_SETTINGS.items,
          updated_at: data.updated_at,
        });
      }
    } catch (err) {
      console.error("Error in fetchSettings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (newSettings: Partial<ToolsOrbSettings>) => {
    try {
      const { error } = await supabase
        .from("tools_orb_settings")
        .update({
          enabled: newSettings.enabled,
          orb_image_url: newSettings.orb_image_url,
          orb_label: newSettings.orb_label,
          items: newSettings.items as unknown as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settings.id);

      if (error) throw error;

      setSettings((prev) => ({ ...prev, ...newSettings }));
      return true;
    } catch (err) {
      console.error("Error updating settings:", err);
      return false;
    }
  }, [settings.id]);

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings,
  };
}

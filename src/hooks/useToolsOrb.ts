import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

export interface UserOrbOverride {
  id: string;
  label?: string;
  enabled?: boolean;
  order?: number;
  image_url?: string;
}

const DEFAULT_SETTINGS: ToolsOrbSettings = {
  id: "00000000-0000-0000-0000-000000000001",
  enabled: true,
  orb_image_url: null,
  orb_label: "Tools",
  items: [
    { id: "trainings", label: "Videos", route: "/tools/trainings", icon_name: "GraduationCap", order: 1, enabled: true },
    { id: "links", label: "IAM Links", route: "/tools/links", icon_name: "Link", order: 2, enabled: true },
    { id: "files", label: "Files", route: "/tools/files", icon_name: "FolderOpen", order: 3, enabled: true },
    { id: "directory", label: "Branches", route: "/tools/directory", icon_name: "Building2", order: 4, enabled: true },
    { id: "presentations", label: "Presentations", route: "/tools/presentations", icon_name: "Presentation", order: 5, enabled: true },
    { id: "prospects", label: "Prospect List", route: "/prospects", icon_name: "ClipboardList", order: 6, enabled: true },
  ],
  updated_at: new Date().toISOString(),
};

const SYSTEM_ITEM_DEFAULTS = new Map(DEFAULT_SETTINGS.items.map((item) => [item.id, item] as const));

const normalizeOrbItems = (items?: ToolsOrbItem[] | null): ToolsOrbItem[] => {
  if (!items?.length) return DEFAULT_SETTINGS.items;

  return items.map((item) => {
    const systemDefault = SYSTEM_ITEM_DEFAULTS.get(item.id);

    if (!systemDefault) {
      return item;
    }

    return {
      ...item,
      route: systemDefault.route,
    };
  });
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

/**
 * Hook that merges global orb settings with per-user overrides (paid users only).
 */
export function useMergedToolsOrb() {
  const { settings: globalSettings, loading: globalLoading, updateSettings, refetch: refetchGlobal } = useToolsOrb();
  const { user } = useAuth();
  const [userOverrides, setUserOverrides] = useState<UserOrbOverride[] | null>(null);
  const [userOrbLabel, setUserOrbLabel] = useState<string | null>(null);
  const [userOrbImageUrl, setUserOrbImageUrl] = useState<string | null>(null);
  const [overridesLoading, setOverridesLoading] = useState(false);
  const [hasPaidCard, setHasPaidCard] = useState(false);
  const [overrideRowId, setOverrideRowId] = useState<string | null>(null);

  // Check if user has a paid card
  useEffect(() => {
    if (!user) {
      setHasPaidCard(false);
      return;
    }
    const check = async () => {
      const { data } = await supabase
        .from("cards")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_paid", true)
        .limit(1);
      setHasPaidCard(!!(data && data.length > 0));
    };
    check();
  }, [user]);

  // Fetch user overrides
  useEffect(() => {
    if (!user) {
      setUserOverrides(null);
      setUserOrbLabel(null);
      setUserOrbImageUrl(null);
      setOverrideRowId(null);
      return;
    }
    const fetchOverrides = async () => {
      setOverridesLoading(true);
      try {
        const { data, error } = await supabase
          .from("user_orb_overrides")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user orb overrides:", error);
        } else if (data) {
          setOverrideRowId(data.id);
          setUserOverrides((data.items as unknown as UserOrbOverride[]) || null);
          setUserOrbLabel(data.orb_label);
          setUserOrbImageUrl(data.orb_image_url);
        } else {
          setOverrideRowId(null);
          setUserOverrides(null);
          setUserOrbLabel(null);
          setUserOrbImageUrl(null);
        }
      } catch (err) {
        console.error("Error in fetchOverrides:", err);
      } finally {
        setOverridesLoading(false);
      }
    };
    fetchOverrides();
  }, [user]);

  // Merge global items with user overrides
  const mergedSettings = useMemo<ToolsOrbSettings>(() => {
    if (!userOverrides || userOverrides.length === 0) {
      return {
        ...globalSettings,
        orb_label: userOrbLabel ?? globalSettings.orb_label,
        orb_image_url: userOrbImageUrl !== undefined ? (userOrbImageUrl ?? globalSettings.orb_image_url) : globalSettings.orb_image_url,
      };
    }

    const mergedItems = globalSettings.items.map((globalItem) => {
      const override = userOverrides.find((uo) => uo.id === globalItem.id);
      if (!override) return globalItem;
      return {
        ...globalItem,
        label: override.label ?? globalItem.label,
        enabled: override.enabled ?? globalItem.enabled,
        order: override.order ?? globalItem.order,
        image_url: override.image_url !== undefined ? override.image_url : globalItem.image_url,
      };
    }).sort((a, b) => a.order - b.order);

    return {
      ...globalSettings,
      orb_label: userOrbLabel ?? globalSettings.orb_label,
      orb_image_url: userOrbImageUrl !== undefined ? (userOrbImageUrl ?? globalSettings.orb_image_url) : globalSettings.orb_image_url,
      items: mergedItems,
    };
  }, [globalSettings, userOverrides, userOrbLabel, userOrbImageUrl]);

  // Save user overrides
  const saveUserOverrides = useCallback(async (
    items: UserOrbOverride[],
    orbLabel: string | null,
    orbImageUrl: string | null
  ) => {
    if (!user) return false;
    try {
      if (overrideRowId) {
        const { error } = await supabase
          .from("user_orb_overrides")
          .update({
            items: items as unknown as any,
            orb_label: orbLabel,
            orb_image_url: orbImageUrl,
          })
          .eq("id", overrideRowId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("user_orb_overrides")
          .insert({
            user_id: user.id,
            items: items as unknown as any,
            orb_label: orbLabel,
            orb_image_url: orbImageUrl,
          })
          .select("id")
          .single();
        if (error) throw error;
        if (data) setOverrideRowId(data.id);
      }
      setUserOverrides(items);
      setUserOrbLabel(orbLabel);
      setUserOrbImageUrl(orbImageUrl);
      return true;
    } catch (err) {
      console.error("Error saving user orb overrides:", err);
      return false;
    }
  }, [user, overrideRowId]);

  // Reset user overrides (delete the row)
  const resetUserOverrides = useCallback(async () => {
    if (!user || !overrideRowId) return false;
    try {
      const { error } = await supabase
        .from("user_orb_overrides")
        .delete()
        .eq("id", overrideRowId);
      if (error) throw error;
      setOverrideRowId(null);
      setUserOverrides(null);
      setUserOrbLabel(null);
      setUserOrbImageUrl(null);
      return true;
    } catch (err) {
      console.error("Error resetting user orb overrides:", err);
      return false;
    }
  }, [user, overrideRowId]);

  return {
    globalSettings,
    mergedSettings,
    loading: globalLoading || overridesLoading,
    hasPaidCard,
    hasOverrides: !!overrideRowId,
    userOverrides,
    userOrbLabel,
    userOrbImageUrl,
    saveUserOverrides,
    resetUserOverrides,
    updateGlobalSettings: updateSettings,
    refetchGlobal,
  };
}

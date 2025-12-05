import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CardTemplate {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  layout_data: Record<string, any>;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

export interface LayoutData {
  theme: Record<string, any>;
  carousel_enabled: boolean;
  [key: string]: any; // Allow additional properties for JSON compatibility
}

export function useTemplates() {
  const { user, isAdmin } = useAuth();
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [userTemplate, setUserTemplate] = useState<CardTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch global templates
      const { data: globalTemplates, error: globalError } = await supabase
        .from("card_templates")
        .select("*")
        .eq("is_global", true)
        .order("created_at", { ascending: false });

      if (globalError) throw globalError;

      // Fetch user's personal template
      const { data: personalTemplates, error: personalError } = await supabase
        .from("card_templates")
        .select("*")
        .eq("owner_id", user.id)
        .eq("is_global", false);

      if (personalError) throw personalError;

      // Type cast the data to our interface
      const typedGlobalTemplates = (globalTemplates || []) as unknown as CardTemplate[];
      const typedPersonalTemplates = (personalTemplates || []) as unknown as CardTemplate[];

      setTemplates(typedGlobalTemplates);
      setUserTemplate(typedPersonalTemplates[0] || null);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const extractLayoutData = (card: Record<string, any>): LayoutData => {
    // Extract only design/layout data, excluding personal information
    return {
      theme: card.theme || {},
      carousel_enabled: card.carousel_enabled ?? true,
    };
  };

  const saveAsGlobalTemplate = async (
    card: Record<string, any>,
    name: string,
    description?: string,
    thumbnailUrl?: string
  ): Promise<boolean> => {
    if (!user || !isAdmin) {
      toast.error("Only admins can create global templates");
      return false;
    }

    try {
      const layoutData = extractLayoutData(card);

      const { error } = await supabase.from("card_templates").insert([{
        owner_id: user.id,
        name,
        description: description || null,
        thumbnail_url: thumbnailUrl || null,
        layout_data: layoutData as any,
        is_global: true,
      }]);

      if (error) throw error;

      toast.success("Template saved successfully!");
      await loadTemplates();
      return true;
    } catch (error) {
      console.error("Error saving global template:", error);
      toast.error("Failed to save template");
      return false;
    }
  };

  const savePersonalTemplate = async (
    card: Record<string, any>,
    name: string,
    description?: string
  ): Promise<boolean> => {
    if (!user) {
      toast.error("You must be logged in to save a template");
      return false;
    }

    try {
      const layoutData = extractLayoutData(card);

      if (userTemplate) {
        // Update existing personal template
        const { error } = await supabase
          .from("card_templates")
          .update({
            name,
            description: description || null,
            layout_data: layoutData as any,
          })
          .eq("id", userTemplate.id);

        if (error) throw error;
        toast.success("Your template has been updated!");
      } else {
        // Create new personal template
        const { error } = await supabase.from("card_templates").insert([{
          owner_id: user.id,
          name,
          description: description || null,
          layout_data: layoutData as any,
          is_global: false,
        }]);

        if (error) throw error;
        toast.success("Template saved successfully!");
      }

      await loadTemplates();
      return true;
    } catch (error: any) {
      console.error("Error saving personal template:", error);
      if (error.code === "23505") {
        toast.error("You already have a personal template. Update it instead.");
      } else {
        toast.error("Failed to save template");
      }
      return false;
    }
  };

  const updateTemplate = async (
    templateId: string,
    updates: { name?: string; description?: string; thumbnail_url?: string }
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("card_templates")
        .update(updates)
        .eq("id", templateId);

      if (error) throw error;

      toast.success("Template updated successfully!");
      await loadTemplates();
      return true;
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("Failed to update template");
      return false;
    }
  };

  const deleteTemplate = async (templateId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("card_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      toast.success("Template deleted successfully!");
      await loadTemplates();
      return true;
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
      return false;
    }
  };

  const getAllTemplatesForAdmin = async (): Promise<CardTemplate[]> => {
    if (!isAdmin) return [];

    try {
      const { data, error } = await supabase
        .from("card_templates")
        .select("*")
        .order("is_global", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as CardTemplate[];
    } catch (error) {
      console.error("Error fetching all templates:", error);
      return [];
    }
  };

  return {
    templates,
    userTemplate,
    loading,
    isAdmin,
    hasPersonalTemplate: !!userTemplate,
    saveAsGlobalTemplate,
    savePersonalTemplate,
    updateTemplate,
    deleteTemplate,
    loadTemplates,
    getAllTemplatesForAdmin,
    extractLayoutData,
  };
}

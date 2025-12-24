import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { CardProductImage } from "@/lib/theme";
import { buildCardSnapshot, type CardSnapshot, type CardLink } from "@/lib/cardSnapshot";

export type TemplateVisibility = 'global' | 'team' | 'private';

export interface CardTemplate {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  layout_data: CardSnapshot;
  is_global: boolean;
  visibility: TemplateVisibility;
  created_at: string;
  updated_at: string;
}

// Re-export CardSnapshot as LayoutData for backward compatibility
export type LayoutData = CardSnapshot;

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
      // Fetch all accessible templates using the new RLS policy
      // This includes: global, own templates, and team templates from referrer
      const { data: accessibleTemplates, error } = await supabase
        .from("card_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Type cast the data to our interface
      const typedTemplates = (accessibleTemplates || []) as unknown as CardTemplate[];

      // Separate global/team templates from personal templates
      const globalAndTeam = typedTemplates.filter(t => t.visibility === 'global' || t.visibility === 'team');
      const personal = typedTemplates.filter(t => t.visibility === 'private' && t.owner_id === user.id);

      setTemplates([...globalAndTeam, ...personal]);
      setUserTemplate(personal[0] || null);
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

  /**
   * Extract ALL layout/design data from a card for template storage.
   * Uses the unified buildCardSnapshot utility.
   * 
   * @param card - The card object from the database
   * @param productImagesFromTable - Product images fetched from the product_images table
   * @param cardLinks - Card links fetched from the card_links table
   */
  const extractLayoutData = (
    card: Record<string, any>, 
    productImagesFromTable?: CardProductImage[],
    cardLinks?: CardLink[]
  ): LayoutData => {
    return buildCardSnapshot(card, cardLinks, productImagesFromTable);
  };

  const saveAsGlobalTemplate = async (
    card: Record<string, any>,
    name: string,
    description?: string,
    thumbnailUrl?: string,
    productImages?: CardProductImage[],
    cardLinks?: Array<{ kind: string; label: string; value: string; icon?: string | null; sort_index?: number | null }>,
    visibility: TemplateVisibility = 'global'
  ): Promise<boolean> => {
    if (!user || (!isAdmin && visibility === 'global')) {
      toast.error("Only admins can create global templates");
      return false;
    }

    try {
      const layoutData = extractLayoutData(card, productImages, cardLinks);

      const { error } = await supabase.from("card_templates").insert([{
        owner_id: user.id,
        name,
        description: description || null,
        thumbnail_url: thumbnailUrl || null,
        layout_data: layoutData as any,
        is_global: visibility === 'global',
        visibility,
      }]);

      if (error) throw error;

      toast.success("Template saved successfully!");
      await loadTemplates();
      return true;
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
      return false;
    }
  };

  const savePersonalTemplate = async (
    card: Record<string, any>,
    name: string,
    description?: string,
    productImages?: CardProductImage[],
    cardLinks?: Array<{ kind: string; label: string; value: string; icon?: string | null; sort_index?: number | null }>,
    visibility: TemplateVisibility = 'private'
  ): Promise<boolean> => {
    if (!user) {
      toast.error("You must be logged in to save a template");
      return false;
    }

    try {
      const layoutData = extractLayoutData(card, productImages, cardLinks);

      if (userTemplate && visibility === 'private') {
        // Update existing personal template
        const { error } = await supabase
          .from("card_templates")
          .update({
            name,
            description: description || null,
            layout_data: layoutData as any,
            visibility,
          })
          .eq("id", userTemplate.id);

        if (error) throw error;
        toast.success("Your template has been updated!");
      } else {
        // Create new template
        const { error } = await supabase.from("card_templates").insert([{
          owner_id: user.id,
          name,
          description: description || null,
          layout_data: layoutData as any,
          is_global: visibility === 'global',
          visibility,
        }]);

        if (error) throw error;
        toast.success("Template saved successfully!");
      }

      await loadTemplates();
      return true;
    } catch (error: any) {
      console.error("Error saving template:", error);
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
    updates: { name?: string; description?: string; thumbnail_url?: string; visibility?: TemplateVisibility }
  ): Promise<boolean> => {
    try {
      const updateData: Record<string, any> = { ...updates };
      
      // If visibility is being changed to global, also update is_global flag
      if (updates.visibility) {
        updateData.is_global = updates.visibility === 'global';
      }
      
      const { error } = await supabase
        .from("card_templates")
        .update(updateData)
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

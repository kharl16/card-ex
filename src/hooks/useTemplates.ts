import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type TemplateVisibility = 'global' | 'team' | 'private';

export interface CardTemplate {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  layout_data: Record<string, any>;
  is_global: boolean;
  visibility: TemplateVisibility;
  created_at: string;
  updated_at: string;
}

export interface LayoutData {
  // Theme includes all styling: colors, gradients, patterns, fonts, AND QR settings
  theme: Record<string, any>;
  carousel_enabled: boolean;
  
  // Design assets (images)
  cover_url?: string | null;
  logo_url?: string | null;
  avatar_url?: string | null;
  
  // Personal/contact data - fully included in templates
  full_name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  prefix?: string | null;
  suffix?: string | null;
  title?: string | null;
  company?: string | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  location?: string | null;
  
  // Product/carousel images with metadata
  product_images?: Array<{
    image_url: string;
    alt_text?: string | null;
    description?: string | null;
    sort_order?: number | null;
  }>;
  
  // Card links (social media, additional contacts, custom links)
  card_links?: Array<{
    kind: string;
    label: string;
    value: string;
    icon?: string | null;
    sort_index?: number | null;
  }>;
  
  // Social links stored directly on card (JSONB field)
  social_links?: Array<{
    kind: string;
    label: string;
    url: string;
  }> | null;
  
  // Source card reference (for tracking where template came from)
  source_card_id?: string | null;
  
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
   * 
   * NO LONGER STRIPS PERSONAL DATA - copies everything as-is.
   * This enables full card duplication via templates.
   */
  const extractLayoutData = (
    card: Record<string, any>, 
    productImages?: Array<{ image_url: string; alt_text?: string | null; description?: string | null; sort_order?: number | null }>,
    cardLinks?: Array<{ kind: string; label: string; value: string; icon?: string | null; sort_index?: number | null }>
  ): LayoutData => {
    // Copy theme as-is including ALL settings:
    // - Colors (primary, accent, background, foreground, buttonColor)
    // - Typography (fontFamily)
    // - Background config (backgroundType, gradient settings, pattern settings)
    // - QR settings (qrSettings object with pattern, eye styles, colors, logo overlay, frame settings)
    // - Variant data (variantA, variantB, activeVariant)
    // - Display modes (avatarDisplayMode, logoDisplayMode)
    // - Carousel speed
    const theme = card.theme ? JSON.parse(JSON.stringify(card.theme)) : {};
    
    // IMPORTANT: Remove any QR payload/value/link from theme - new cards must generate new QR
    if (theme.qrSettings) {
      // Keep all styling but ensure no QR data/URL is preserved
      delete theme.qrSettings.data;
      delete theme.qrSettings.url;
    }

    return {
      theme,
      carousel_enabled: card.carousel_enabled ?? true,
      
      // Design assets (image URLs)
      cover_url: card.cover_url || null,
      logo_url: card.logo_url || null,
      avatar_url: card.avatar_url || null,
      
      // Personal/contact data - fully included
      full_name: card.full_name || null,
      first_name: card.first_name || null,
      middle_name: card.middle_name || null,
      last_name: card.last_name || null,
      prefix: card.prefix || null,
      suffix: card.suffix || null,
      title: card.title || null,
      company: card.company || null,
      bio: card.bio || null,
      email: card.email || null,
      phone: card.phone || null,
      website: card.website || null,
      location: card.location || null,
      
      // Product/portfolio images with sort order
      product_images: (productImages || []).map((img, idx) => ({
        image_url: img.image_url,
        alt_text: img.alt_text || null,
        description: img.description || null,
        sort_order: img.sort_order ?? idx,
      })),
      
      // Card links (social media, contact links) with sort order
      card_links: (cardLinks || []).map((link, idx) => ({
        kind: link.kind,
        label: link.label,
        value: link.value,
        icon: link.icon || null,
        sort_index: link.sort_index ?? idx,
      })),
      
      // Social links from card's JSONB field
      social_links: card.social_links || null,
      
      // Track source card for reference
      source_card_id: card.id || null,
    };
  };

  const saveAsGlobalTemplate = async (
    card: Record<string, any>,
    name: string,
    description?: string,
    thumbnailUrl?: string,
    productImages?: Array<{ image_url: string; alt_text?: string | null; description?: string | null }>,
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
    productImages?: Array<{ image_url: string; alt_text?: string | null; description?: string | null }>,
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

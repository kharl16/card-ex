import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Tool {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tool_url: string;
  visibility: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ToolInput {
  title: string;
  description?: string;
  category: string;
  tool_url: string;
  visibility?: string;
  is_active?: boolean;
}

interface UseToolsReturn {
  tools: Tool[];
  loading: boolean;
  error: string | null;
  categories: string[];
  refetch: () => Promise<void>;
  createTool: (data: ToolInput) => Promise<boolean>;
  updateTool: (id: string, data: ToolInput) => Promise<boolean>;
  deleteTool: (id: string) => Promise<boolean>;
}

export function useTools(): UseToolsReturn {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTools = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch only active tools, ordered by category then title
      // Future: Add role-based visibility filtering here
      const { data, error: fetchError } = await supabase
        .from("tools")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("title", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setTools((data as Tool[]) || []);
    } catch (err: any) {
      console.error("Error fetching tools:", err);
      setError(err.message || "Failed to load tools");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  // Extract unique categories from the tools data
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(tools.map((tool) => tool.category))];
    return uniqueCategories.sort();
  }, [tools]);

  const createTool = useCallback(async (data: ToolInput): Promise<boolean> => {
    try {
      const { error: insertError } = await supabase.from("tools").insert({
        title: data.title,
        description: data.description || null,
        category: data.category,
        tool_url: data.tool_url,
        visibility: data.visibility || "all_members",
        is_active: data.is_active ?? true,
      });

      if (insertError) throw insertError;

      toast.success("Tool created successfully");
      await fetchTools();
      return true;
    } catch (err: any) {
      console.error("Error creating tool:", err);
      toast.error(err.message || "Failed to create tool");
      return false;
    }
  }, [fetchTools]);

  const updateTool = useCallback(async (id: string, data: ToolInput): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from("tools")
        .update({
          title: data.title,
          description: data.description || null,
          category: data.category,
          tool_url: data.tool_url,
          visibility: data.visibility || "all_members",
          is_active: data.is_active ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      toast.success("Tool updated successfully");
      await fetchTools();
      return true;
    } catch (err: any) {
      console.error("Error updating tool:", err);
      toast.error(err.message || "Failed to update tool");
      return false;
    }
  }, [fetchTools]);

  const deleteTool = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from("tools")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      toast.success("Tool deleted successfully");
      await fetchTools();
      return true;
    } catch (err: any) {
      console.error("Error deleting tool:", err);
      toast.error(err.message || "Failed to delete tool");
      return false;
    }
  }, [fetchTools]);

  return {
    tools,
    loading,
    error,
    categories,
    refetch: fetchTools,
    createTool,
    updateTool,
    deleteTool,
  };
}

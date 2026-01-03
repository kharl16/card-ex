import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

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

interface UseToolsReturn {
  tools: Tool[];
  loading: boolean;
  error: string | null;
  categories: string[];
  refetch: () => Promise<void>;
}

export function useTools(): UseToolsReturn {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTools = async () => {
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
  };

  useEffect(() => {
    fetchTools();
  }, []);

  // Extract unique categories from the tools data
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(tools.map((tool) => tool.category))];
    return uniqueCategories.sort();
  }, [tools]);

  return {
    tools,
    loading,
    error,
    categories,
    refetch: fetchTools,
  };
}

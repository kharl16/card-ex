import { useMemo } from "react";
import { ToolCard } from "./ToolCard";
import type { Tool } from "@/hooks/useTools";

interface ToolsListProps {
  tools: Tool[];
  searchTerm: string;
  selectedCategory: string;
  isAdmin?: boolean;
  onEdit?: (tool: Tool) => void;
  onDelete?: (tool: Tool) => void;
}

export function ToolsList({
  tools,
  searchTerm,
  selectedCategory,
  isAdmin,
  onEdit,
  onDelete,
}: ToolsListProps) {
  // Filter tools based on search and category
  const filteredTools = useMemo(() => {
    let result = tools;

    // Filter by category
    if (selectedCategory !== "All") {
      result = result.filter((tool) => tool.category === selectedCategory);
    }

    // Filter by search term (title and description)
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      result = result.filter((tool) => {
        const titleMatch = tool.title.toLowerCase().includes(query);
        const descMatch = tool.description?.toLowerCase().includes(query);
        return titleMatch || descMatch;
      });
    }

    return result;
  }, [tools, searchTerm, selectedCategory]);

  // Group tools by category
  const groupedTools = useMemo(() => {
    const groups: Record<string, Tool[]> = {};
    
    filteredTools.forEach((tool) => {
      if (!groups[tool.category]) {
        groups[tool.category] = [];
      }
      groups[tool.category].push(tool);
    });

    // Sort categories alphabetically
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTools]);

  if (filteredTools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">
          {searchTerm || selectedCategory !== "All"
            ? "No tools match your search criteria."
            : "No tools available."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groupedTools.map(([category, categoryTools]) => (
        <div key={category}>
          <h2 className="mb-4 text-lg font-semibold text-foreground border-b border-border/50 pb-2">
            {category}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categoryTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                isAdmin={isAdmin}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

import { useMemo } from "react";
import { ToolCard } from "./ToolCard";
import type { Tool } from "@/hooks/useTools";
import { fuzzyScoreAny } from "@/lib/fuzzy";

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

    if (selectedCategory !== "All") {
      result = result.filter((tool) => tool.category === selectedCategory);
    }

    const q = searchTerm.trim();
    if (q) {
      const scored = result
        .map((tool) => ({
          tool,
          score: fuzzyScoreAny(q, [tool.title, tool.description, tool.category]),
        }))
        .filter((x) => x.score >= 0.55)
        .sort((a, b) => b.score - a.score);
      result = scored.map((x) => x.tool);
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

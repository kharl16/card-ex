import React from "react";
import { cn } from "@/lib/utils";
import type { DescriptionTableColumns } from "@/lib/carouselTypes";

interface DescriptionItem {
  imageUrl?: string;
  title?: string;
  description?: string;
}

interface DescriptionTableProps {
  items: DescriptionItem[];
  columns: DescriptionTableColumns;
  className?: string;
}

export default function DescriptionTable({ items, columns, className }: DescriptionTableProps) {
  // Only show items that have a description
  const itemsWithDescription = items.filter((item) => item.description?.trim());

  if (itemsWithDescription.length === 0) return null;

  return (
    <div className={cn("px-4 mt-3", className)}>
      <div
        className={cn(
          "grid gap-3",
          columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
        )}
      >
        {itemsWithDescription.map((item, idx) => (
          <div
            key={idx}
            className="flex gap-3 p-3 rounded-lg border border-border bg-card/50"
          >
            {item.imageUrl && (
              <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-muted">
                <img
                  src={item.imageUrl}
                  alt={item.title || ""}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {item.title && (
                <p className="text-sm font-medium text-foreground truncate">
                  {item.title}
                </p>
              )}
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

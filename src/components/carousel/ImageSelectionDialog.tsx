import React, { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Share2, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface CarouselImage {
  url: string;
  alt?: string;
}

type SelectionMode = "share" | "download";

interface ImageSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: CarouselImage[];
  maxSelection?: number;
  title?: string;
  onConfirm: (selectedUrls: string[]) => void;
  /** Mode: "share" or "download" - affects button label and icon */
  mode?: SelectionMode;
  /** Previously selected indices to restore when dialog opens */
  previousSelection?: Set<number>;
  /** Callback to persist selection when it changes */
  onSelectionChange?: (indices: Set<number>) => void;
}

export default function ImageSelectionDialog({
  open,
  onOpenChange,
  images,
  maxSelection = 10,
  title = "Select images to share",
  onConfirm,
  mode = "share",
  previousSelection,
  onSelectionChange,
}: ImageSelectionDialogProps) {
  // Default to previous selection or first maxSelection images
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(() => {
    if (previousSelection && previousSelection.size > 0) {
      return new Set(previousSelection);
    }
    const initial = new Set<number>();
    for (let i = 0; i < Math.min(images.length, maxSelection); i++) {
      initial.add(i);
    }
    return initial;
  });

  // Restore selection when dialog opens - use previous if available
  React.useEffect(() => {
    if (open) {
      if (previousSelection && previousSelection.size > 0) {
        // Filter out any indices that are now out of range
        const validSelection = new Set<number>();
        previousSelection.forEach((idx) => {
          if (idx < images.length) {
            validSelection.add(idx);
          }
        });
        if (validSelection.size > 0) {
          setSelectedIndices(validSelection);
          return;
        }
      }
      // Fall back to first maxSelection images
      const initial = new Set<number>();
      for (let i = 0; i < Math.min(images.length, maxSelection); i++) {
        initial.add(i);
      }
      setSelectedIndices(initial);
    }
  }, [open, images.length, maxSelection, previousSelection]);

  const toggleImage = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else if (next.size < maxSelection) {
        next.add(index);
      }
      return next;
    });
  }, [maxSelection]);

  const selectAll = useCallback(() => {
    const allSelected = new Set<number>();
    for (let i = 0; i < Math.min(images.length, maxSelection); i++) {
      allSelected.add(i);
    }
    setSelectedIndices(allSelected);
  }, [images.length, maxSelection]);

  const clearAll = useCallback(() => {
    setSelectedIndices(new Set());
  }, []);

  const handleConfirm = useCallback(() => {
    // Persist selection before confirming
    onSelectionChange?.(selectedIndices);
    const selectedUrls = Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map((idx) => images[idx].url);
    onConfirm(selectedUrls);
    onOpenChange(false);
  }, [selectedIndices, images, onConfirm, onOpenChange, onSelectionChange]);

  const canSelectMore = selectedIndices.size < maxSelection;
  
  // Button configuration based on mode
  const buttonConfig = mode === "download" 
    ? { icon: Download, label: "Download" }
    : { icon: Share2, label: "Share" };
  const ActionIcon = buttonConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b flex-shrink-0">
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {selectedIndices.size} of {maxSelection} selected ({images.length} total)
          </p>
        </DialogHeader>

        {/* Quick actions */}
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={selectedIndices.size === Math.min(images.length, maxSelection)}
          >
            Select first {Math.min(images.length, maxSelection)}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            disabled={selectedIndices.size === 0}
          >
            Clear all
          </Button>
        </div>

        {/* Image grid with proper scroll area - explicit max height for scrolling */}
        <ScrollArea className="flex-1 min-h-0 max-h-[50vh]">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-4">
            {images.map((img, index) => {
              const isSelected = selectedIndices.has(index);
              const canSelect = isSelected || canSelectMore;

              return (
                <button
                  key={index}
                  onClick={() => canSelect && toggleImage(index)}
                  disabled={!canSelect}
                  className={`
                    relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                    ${isSelected 
                      ? "border-primary ring-2 ring-primary/30" 
                      : canSelect 
                        ? "border-transparent hover:border-primary/50" 
                        : "border-transparent opacity-50 cursor-not-allowed"
                    }
                  `}
                >
                  <img
                    src={img.url}
                    alt={img.alt || `Image ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Selection overlay */}
                  <div
                    className={`
                      absolute inset-0 flex items-center justify-center transition-opacity
                      ${isSelected ? "bg-primary/30" : "bg-transparent"}
                    `}
                  >
                    {isSelected && (
                      <div className="bg-primary text-primary-foreground rounded-full p-1.5">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  {/* Index badge */}
                  <div className="absolute top-1 left-1 bg-background/80 text-foreground text-xs px-1.5 py-0.5 rounded">
                    {index + 1}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="px-4 py-3 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIndices.size === 0}
            className="gap-2"
          >
            <ActionIcon className="h-4 w-4" />
            {buttonConfig.label} {selectedIndices.size} image{selectedIndices.size !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
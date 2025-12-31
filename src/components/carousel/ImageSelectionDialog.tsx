import React, { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Share2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface CarouselImage {
  url: string;
  alt?: string;
}

interface ImageSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: CarouselImage[];
  maxSelection?: number;
  title?: string;
  onConfirm: (selectedUrls: string[]) => void;
}

export default function ImageSelectionDialog({
  open,
  onOpenChange,
  images,
  maxSelection = 10,
  title = "Select images to share",
  onConfirm,
}: ImageSelectionDialogProps) {
  // Default to first maxSelection images selected
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    for (let i = 0; i < Math.min(images.length, maxSelection); i++) {
      initial.add(i);
    }
    return initial;
  });

  // Reset selection when dialog opens with new images
  React.useEffect(() => {
    if (open) {
      const initial = new Set<number>();
      for (let i = 0; i < Math.min(images.length, maxSelection); i++) {
        initial.add(i);
      }
      setSelectedIndices(initial);
    }
  }, [open, images.length, maxSelection]);

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
    const selectedUrls = Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map((idx) => images[idx].url);
    onConfirm(selectedUrls);
    onOpenChange(false);
  }, [selectedIndices, images, onConfirm, onOpenChange]);

  const canSelectMore = selectedIndices.size < maxSelection;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {selectedIndices.size} of {maxSelection} selected ({images.length} total)
          </p>
        </DialogHeader>

        {/* Quick actions */}
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/30">
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

        {/* Image grid */}
        <ScrollArea className="flex-1 px-4 py-2">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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

        <DialogFooter className="px-4 py-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIndices.size === 0}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share {selectedIndices.size} image{selectedIndices.size !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

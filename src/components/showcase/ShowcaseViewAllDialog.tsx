import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ShowcaseItem from "@/components/showcase/ShowcaseItem";
import type { ShowcaseRowTile } from "@/components/showcase/ShowcaseRow";

interface ShowcaseViewAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  tiles: ShowcaseRowTile[];
  aspect?: "portrait" | "video";
  onSelect: (index: number) => void;
}

/** Grid view of every item in a showcase category. */
export default function ShowcaseViewAllDialog({
  open,
  onOpenChange,
  title,
  tiles,
  aspect = "portrait",
  onSelect,
}: ShowcaseViewAllDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto border-white/10 bg-neutral-950 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">
            {title}
            <span className="ml-2 text-sm font-normal text-white/50">{tiles.length}</span>
          </DialogTitle>
        </DialogHeader>

        <div
          className={
            aspect === "video"
              ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
              : "grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5"
          }
        >
          {tiles.map((tile, index) => (
            <ShowcaseItem
              key={tile.id}
              src={tile.src}
              alt={tile.alt}
              caption={tile.caption}
              srp={tile.srp}
              isVideo={tile.isVideo}
              aspect={aspect}
              onSelect={() => {
                onOpenChange(false);
                onSelect(index);
              }}
              className="w-full"
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

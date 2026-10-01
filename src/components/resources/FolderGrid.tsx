import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ResourceFolder } from "@/types/resources";
import { resourceImageUrl } from "@/lib/resourceImage";

interface FolderGridProps {
  folders: ResourceFolder[];
  basePath?: string;
  selectedFolder?: string | null;
  onSelectFolder?: (folderName: string) => void;
}

export function FolderGrid({ folders, basePath = "/resources/files", selectedFolder, onSelectFolder }: FolderGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {folders.map((folder) => {
        const isSelected = selectedFolder === folder.folder_name;

        const card = (
          <Card
            className={cn(
              "group relative overflow-hidden rounded-2xl border-primary/20 bg-background/80 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_18px_40px_-20px_hsl(var(--primary)/0.55)] hover:-translate-y-1 cursor-pointer",
              isSelected && "ring-2 ring-primary border-primary/50"
            )}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
            <div className="relative aspect-[4/3] overflow-hidden bg-background">
              {folder.images ? (
                <img
                  src={resourceImageUrl(folder.images)}
                  alt={folder.folder_name}
                  className="h-full w-full object-contain transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <FolderOpen className="h-10 w-10 text-primary/40 group-hover:text-primary/70 transition-colors" />
                </div>
              )}
              <div className="pointer-events-none absolute -bottom-8 left-1/2 h-16 w-3/4 -translate-x-1/2 rounded-full bg-primary/25 blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </div>
            <div className="relative flex min-h-[44px] items-center gap-2 border-t border-primary/15 px-3 py-2 [background:repeating-linear-gradient(90deg,hsl(var(--foreground)/0.03)_0px,hsl(var(--foreground)/0.03)_1px,transparent_1px,transparent_18px)]">
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
              <h3 className="font-semibold text-foreground text-xs leading-snug line-clamp-2">
                {folder.folder_name}
              </h3>
            </div>
              {isSelected && (
                <Badge className="absolute top-2 right-2 text-[9px] px-1.5 py-0 bg-primary/90 border-0">
                  Active
                </Badge>
              )}
            </div>
          </Card>
        );

        if (onSelectFolder) {
          return (
            <div key={folder.id} onClick={() => onSelectFolder(folder.folder_name)} role="button">
              {card}
            </div>
          );
        }

        return (
          <Link key={folder.id} to={`${basePath}?folder=${encodeURIComponent(folder.folder_name)}`}>
            {card}
          </Link>
        );
      })}
    </div>
  );
}

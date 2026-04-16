import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ResourceFolder } from "@/types/resources";

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
              "group relative overflow-hidden border-border/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer",
              isSelected && "ring-2 ring-primary border-primary/30 shadow-lg shadow-primary/10"
            )}
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-black/90">
              {folder.images ? (
                <img
                  src={folder.images}
                  alt={folder.folder_name}
                  className="h-full w-full object-contain transition-transform duration-700 ease-out group-hover:scale-110"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <FolderOpen className="h-10 w-10 text-primary/30 group-hover:text-primary/50 transition-colors" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-primary/5 via-transparent to-primary/5" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="font-semibold text-white text-xs leading-snug line-clamp-2 drop-shadow-lg">
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

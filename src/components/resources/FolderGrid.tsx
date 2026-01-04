import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";
import type { ResourceFolder } from "@/types/resources";

interface FolderGridProps {
  folders: ResourceFolder[];
  basePath?: string;
}

export function FolderGrid({ folders, basePath = "/resources/files" }: FolderGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {folders.map((folder) => (
        <Link
          key={folder.id}
          to={`${basePath}?folder=${encodeURIComponent(folder.folder_name)}`}
        >
          <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer">
            <div className="relative aspect-video overflow-hidden bg-muted">
              {folder.images ? (
                <img
                  src={folder.images}
                  alt={folder.folder_name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
                  <FolderOpen className="h-12 w-12 text-primary/50" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="font-semibold text-white text-sm line-clamp-2">
                  {folder.folder_name}
                </h3>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

import { useState, useMemo, useCallback } from "react";
import { Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ResourcesProvider } from "@/contexts/ResourcesContext";
import { useResourceData } from "@/hooks/useResourceData";
import { ResourcesHeader } from "@/components/resources/ResourcesHeader";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { FilePreviewDialog } from "@/components/resources/FilePreviewDialog";
import type { FileResource } from "@/types/resources";

function FavoritesPageContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [previewFile, setPreviewFile] = useState<FileResource | null>(null);
  const { files, loading, toggleFavorite, logEvent, isFavorite } = useResourceData();

  const favoriteFiles = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return files
      .filter((f) => isFavorite("file", String(f.id)))
      .filter((f) =>
        !term ||
        f.file_name.toLowerCase().includes(term) ||
        f.folder_name?.toLowerCase().includes(term)
      );
  }, [files, isFavorite, searchTerm]);

  const handleFileClick = useCallback((file: FileResource) => {
    logEvent("file", String(file.id), "view");
    setPreviewFile(file);
  }, [logEvent]);

  return (
    <div className="min-h-screen bg-background">
      <ResourcesHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        title="Favorites"
        showBackButton
      />
      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : favoriteFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/40 flex items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1">No favorites yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Tap the heart icon on any resource to save it here for quick access.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {favoriteFiles.map((file) => (
              <ResourceCard
                key={file.id}
                resource={file}
                compact
                isFavorite={isFavorite("file", String(file.id))}
                onToggleFavorite={() => toggleFavorite("file", String(file.id))}
                onLogEvent={(e) => logEvent("file", String(file.id), e)}
                onClick={() => handleFileClick(file)}
              />
            ))}
          </div>
        )}
      </div>

      <FilePreviewDialog
        file={previewFile}
        files={favoriteFiles}
        onClose={() => setPreviewFile(null)}
        onNavigate={setPreviewFile}
        onLogEvent={(eventType) => previewFile && logEvent("file", String(previewFile.id), eventType)}
      />
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <ResourcesProvider>
      <FavoritesPageContent />
    </ResourcesProvider>
  );
}

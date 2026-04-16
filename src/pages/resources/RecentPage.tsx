import { useState, useMemo, useCallback, useEffect } from "react";
import { Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ResourcesProvider } from "@/contexts/ResourcesContext";
import { useResourceData } from "@/hooks/useResourceData";
import { ResourcesHeader } from "@/components/resources/ResourcesHeader";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { FilePreviewDialog } from "@/components/resources/FilePreviewDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { FileResource } from "@/types/resources";

function RecentPageContent() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [previewFile, setPreviewFile] = useState<FileResource | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const { files, loading, toggleFavorite, logEvent, isFavorite } = useResourceData();

  useEffect(() => {
    if (!user) return;
    (async () => {
      setEventsLoading(true);
      const { data } = await supabase
        .from("resource_events")
        .select("resource_id, created_at")
        .eq("user_id", user.id)
        .eq("resource_type", "file")
        .eq("event_type", "view")
        .order("created_at", { ascending: false })
        .limit(100);
      const seen = new Set<string>();
      const ordered: string[] = [];
      (data || []).forEach((e) => {
        if (!seen.has(e.resource_id)) {
          seen.add(e.resource_id);
          ordered.push(e.resource_id);
        }
      });
      setRecentIds(ordered);
      setEventsLoading(false);
    })();
  }, [user]);

  const recentFiles = useMemo(() => {
    const map = new Map(files.map((f) => [String(f.id), f]));
    const term = searchTerm.toLowerCase();
    return recentIds
      .map((id) => map.get(id))
      .filter((f): f is FileResource => !!f)
      .filter((f) =>
        !term ||
        f.file_name.toLowerCase().includes(term) ||
        f.folder_name?.toLowerCase().includes(term)
      );
  }, [recentIds, files, searchTerm]);

  const handleFileClick = useCallback((file: FileResource) => {
    logEvent("file", String(file.id), "view");
    setPreviewFile(file);
  }, [logEvent]);

  const isLoading = loading || eventsLoading;

  return (
    <div className="min-h-screen bg-background">
      <ResourcesHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        title="Recent"
        showBackButton
      />
      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : recentFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/40 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1">Nothing recent yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Resources you view will show up here so you can pick up where you left off.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {recentFiles.map((file) => (
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
        files={recentFiles}
        open={!!previewFile}
        onOpenChange={(o) => !o && setPreviewFile(null)}
        isFavorite={previewFile ? isFavorite("file", String(previewFile.id)) : false}
        onToggleFavorite={() => previewFile && toggleFavorite("file", String(previewFile.id))}
        onNavigate={setPreviewFile}
        onLogEvent={(eventType) => previewFile && logEvent("file", String(previewFile.id), eventType)}
      />
    </div>
  );
}

export default function RecentPage() {
  return (
    <ResourcesProvider>
      <RecentPageContent />
    </ResourcesProvider>
  );
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  FileResource,
  Ambassador,
  IAMLink,
  Way13,
  DirectoryEntry,
  ResourceFolder,
  TrainingFolder,
  ResourceFavorite,
  ResourceType,
  EventType,
} from "@/types/resources";

interface UseResourceDataReturn {
  files: FileResource[];
  ambassadors: Ambassador[];
  links: IAMLink[];
  ways: Way13[];
  directory: DirectoryEntry[];
  folders: ResourceFolder[];
  trainingFolders: TrainingFolder[];
  favorites: ResourceFavorite[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  toggleFavorite: (resourceType: ResourceType, resourceId: string) => Promise<void>;
  logEvent: (resourceType: ResourceType, resourceId: string, eventType: EventType) => Promise<void>;
  isFavorite: (resourceType: ResourceType, resourceId: string) => boolean;
}

export function useResourceData(): UseResourceDataReturn {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileResource[]>([]);
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [links, setLinks] = useState<IAMLink[]>([]);
  const [ways, setWays] = useState<Way13[]>([]);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [trainingFolders, setTrainingFolders] = useState<TrainingFolder[]>([]);
  const [favorites, setFavorites] = useState<ResourceFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        filesRes,
        ambassadorsRes,
        linksRes,
        waysRes,
        directoryRes,
        foldersRes,
        trainingRes,
        favoritesRes,
      ] = await Promise.all([
        supabase.from("files_repository").select("*").order("folder_name").order("file_name"),
        supabase.from("ambassadors_library").select("*").order("endorser"),
        supabase.from("iam_links").select("*").order("name"),
        supabase.from("ways_13").select("*"),
        supabase.from("directory_entries").select("*").order("location"),
        supabase.from("resource_folders").select("*").order("folder_name"),
        supabase.from("training_folders").select("*").order("folder_name"),
        supabase.from("resource_favorites").select("*").eq("user_id", user.id),
      ]);

      if (filesRes.error) throw filesRes.error;
      if (ambassadorsRes.error) throw ambassadorsRes.error;
      if (linksRes.error) throw linksRes.error;
      if (waysRes.error) throw waysRes.error;
      if (directoryRes.error) throw directoryRes.error;
      if (foldersRes.error) throw foldersRes.error;
      if (trainingRes.error) throw trainingRes.error;
      if (favoritesRes.error) throw favoritesRes.error;

      setFiles((filesRes.data as FileResource[]) || []);
      setAmbassadors((ambassadorsRes.data as Ambassador[]) || []);
      setLinks((linksRes.data as IAMLink[]) || []);
      setWays((waysRes.data as Way13[]) || []);
      setDirectory((directoryRes.data as DirectoryEntry[]) || []);
      setFolders((foldersRes.data as ResourceFolder[]) || []);
      setTrainingFolders((trainingRes.data as TrainingFolder[]) || []);
      setFavorites((favoritesRes.data as ResourceFavorite[]) || []);
    } catch (err: unknown) {
      console.error("Error fetching resource data:", err);
      setError(err instanceof Error ? err.message : "Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleFavorite = useCallback(
    async (resourceType: ResourceType, resourceId: string) => {
      if (!user) return;

      const existing = favorites.find(
        (f) => f.resource_type === resourceType && f.resource_id === resourceId
      );

      if (existing) {
        // Remove favorite
        const { error } = await supabase
          .from("resource_favorites")
          .delete()
          .eq("id", existing.id);

        if (!error) {
          setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
          await logEvent(resourceType, resourceId, "favorite_remove");
        }
      } else {
        // Add favorite
        const { data, error } = await supabase
          .from("resource_favorites")
          .insert({
            user_id: user.id,
            resource_type: resourceType,
            resource_id: resourceId,
          })
          .select()
          .single();

        if (!error && data) {
          setFavorites((prev) => [...prev, data as ResourceFavorite]);
          await logEvent(resourceType, resourceId, "favorite_add");
        }
      }
    },
    [user, favorites]
  );

  const logEvent = useCallback(
    async (resourceType: ResourceType, resourceId: string, eventType: EventType) => {
      if (!user) return;

      await supabase.from("resource_events").insert({
        user_id: user.id,
        resource_type: resourceType,
        resource_id: resourceId,
        event_type: eventType,
      });
    },
    [user]
  );

  const isFavorite = useCallback(
    (resourceType: ResourceType, resourceId: string) => {
      return favorites.some(
        (f) => f.resource_type === resourceType && f.resource_id === resourceId
      );
    },
    [favorites]
  );

  return {
    files,
    ambassadors,
    links,
    ways,
    directory,
    folders,
    trainingFolders,
    favorites,
    loading,
    error,
    refetch: fetchData,
    toggleFavorite,
    logEvent,
    isFavorite,
  };
}

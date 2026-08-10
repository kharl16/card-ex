import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";
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

/**
 * Stale-while-revalidate cache. Resources data barely changes, so on repeat
 * visits we render the previous payload immediately (no skeleton, no image
 * re-flash) and silently refresh in the background.
 */
interface ResourceSnapshot {
  files: FileResource[];
  ambassadors: Ambassador[];
  links: IAMLink[];
  ways: Way13[];
  directory: DirectoryEntry[];
  folders: ResourceFolder[];
  trainingFolders: TrainingFolder[];
  favorites: ResourceFavorite[];
}

const EMPTY_SNAPSHOT: ResourceSnapshot = {
  files: [], ambassadors: [], links: [], ways: [],
  directory: [], folders: [], trainingFolders: [], favorites: [],
};

const CACHE_TTL_MS = 10 * 60 * 1000;
let memoryCache: { key: string; at: number; data: ResourceSnapshot } | null = null;

function cacheKey(userId: string, companyId: string) {
  return `cardex:resources:${companyId}:${userId}`;
}

function readCache(key: string): ResourceSnapshot | null {
  if (memoryCache && memoryCache.key === key) return memoryCache.data;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: ResourceSnapshot };
    if (!parsed?.data || Date.now() - parsed.at > CACHE_TTL_MS) return null;
    memoryCache = { key, at: parsed.at, data: parsed.data };
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: ResourceSnapshot) {
  memoryCache = { key, at: Date.now(), data };
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // sessionStorage full / unavailable — memory cache still helps
  }
}

export function useResourceData(): UseResourceDataReturn {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
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

  // Hydrate synchronously from cache so a repeat visit paints instantly.
  const hydratedKeyRef = useRef<string | null>(null);
  if (user && activeCompanyId) {
    const key = cacheKey(user.id, activeCompanyId);
    if (hydratedKeyRef.current !== key) {
      hydratedKeyRef.current = key;
      const cached = readCache(key);
      if (cached) {
        setFiles(cached.files);
        setAmbassadors(cached.ambassadors);
        setLinks(cached.links);
        setWays(cached.ways);
        setDirectory(cached.directory);
        setFolders(cached.folders);
        setTrainingFolders(cached.trainingFolders);
        setFavorites(cached.favorites);
        setLoading(false);
      }
    }
  }

  const fetchData = useCallback(async () => {
    if (!user || !activeCompanyId) {
      setLoading(false);
      return;
    }

    const key = cacheKey(user.id, activeCompanyId);
    const hasCache = readCache(key) !== null;
    if (!hasCache) setLoading(true);
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
        supabase.from("files_repository").select("*").eq("company_id", activeCompanyId).order("sort_order", { ascending: true, nullsFirst: false }).order("folder_name").order("file_name"),
        supabase.from("ambassadors_library").select("*").eq("company_id", activeCompanyId).order("endorser"),
        supabase.from("iam_links").select("*").eq("company_id", activeCompanyId).order("name"),
        supabase.from("ways_13").select("*").eq("company_id", activeCompanyId),
        supabase.from("directory_entries").select("*").eq("company_id", activeCompanyId).order("location"),
        supabase.from("resource_folders").select("*").order("folder_name"),
        supabase.from("training_folders").select("*").eq("company_id", activeCompanyId).order("folder_name"),
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

      writeCache(key, {
        ...EMPTY_SNAPSHOT,
        files: (filesRes.data as FileResource[]) || [],
        ambassadors: (ambassadorsRes.data as Ambassador[]) || [],
        links: (linksRes.data as IAMLink[]) || [],
        ways: (waysRes.data as Way13[]) || [],
        directory: (directoryRes.data as DirectoryEntry[]) || [],
        folders: (foldersRes.data as ResourceFolder[]) || [],
        trainingFolders: (trainingRes.data as TrainingFolder[]) || [],
        favorites: (favoritesRes.data as ResourceFavorite[]) || [],
      });
    } catch (err: unknown) {
      console.error("Error fetching resource data:", err);
      setError(err instanceof Error ? err.message : "Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, [user, activeCompanyId]);

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

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ToolLanguage = "english" | "tagalog";

export interface AffirmationsPrefs {
  language?: ToolLanguage;
  category?: string;
}

export interface BooksPrefs {
  language?: ToolLanguage;
  favoriteBookId?: string;
  lastViewedBookId?: string;
}

export interface MindsetResult {
  score: number;
  pct: number;
  label: string;
  taken_at: string;
}

export interface MindsetPrefs {
  lastResult?: MindsetResult;
}

export interface ToolPreferences {
  affirmations?: AffirmationsPrefs;
  books?: BooksPrefs;
  mindset?: MindsetPrefs;
}

/**
 * Per-user preferences for Tools Orb tools.
 * Stored in profiles.tool_preferences (JSONB).
 * Persists across cards and devices for the signed-in user.
 */
export function useToolPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<ToolPreferences>({});
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<ToolPreferences>({});

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setPrefs({});
      latestRef.current = {};
      setLoaded(true);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("tool_preferences")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.warn("[useToolPreferences] load failed:", error.message);
        setLoaded(true);
        return;
      }
      const raw = ((data?.tool_preferences ?? {}) as ToolPreferences) || {};
      latestRef.current = raw;
      setPrefs(raw);
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const persist = useCallback(
    (next: ToolPreferences) => {
      latestRef.current = next;
      if (!user) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const { error } = await supabase
          .from("profiles")
          .update({ tool_preferences: next as any })
          .eq("id", user.id);
        if (error) console.warn("[useToolPreferences] save failed:", error.message);
      }, 400);
    },
    [user]
  );

  const updateAffirmations = useCallback(
    (patch: Partial<AffirmationsPrefs>) => {
      const next: ToolPreferences = {
        ...latestRef.current,
        affirmations: { ...(latestRef.current.affirmations ?? {}), ...patch },
      };
      setPrefs(next);
      persist(next);
    },
    [persist]
  );

  const updateBooks = useCallback(
    (patch: Partial<BooksPrefs>) => {
      const next: ToolPreferences = {
        ...latestRef.current,
        books: { ...(latestRef.current.books ?? {}), ...patch },
      };
      setPrefs(next);
      persist(next);
    },
    [persist]
  );

  const updateMindset = useCallback(
    (patch: Partial<MindsetPrefs>) => {
      const next: ToolPreferences = {
        ...latestRef.current,
        mindset: { ...(latestRef.current.mindset ?? {}), ...patch },
      };
      setPrefs(next);
      persist(next);
    },
    [persist]
  );

  return { prefs, loaded, updateAffirmations, updateBooks, updateMindset };
}

import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GlobalLibraryTable } from "@/lib/globalOrdering";

/** Refresh open cards when library order changes, and re-read when a visitor returns. */
export function useGlobalLibraryRefresh(table: GlobalLibraryTable, reload: () => void) {
  useEffect(() => {
    const channel = supabase.channel(`library:${table}:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, reload)
      .subscribe();
    window.addEventListener("focus", reload);
    return () => {
      window.removeEventListener("focus", reload);
      void supabase.removeChannel(channel);
    };
  }, [table, reload]);
}
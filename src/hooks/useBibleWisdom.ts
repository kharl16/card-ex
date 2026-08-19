import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type WisdomSlot = "morning" | "midday" | "evening";
export type BibleWisdom = Tables<"bible_wisdom">;

export const SLOT_LABELS: Record<WisdomSlot, string> = {
  morning: "Morning",
  midday: "Midday",
  evening: "Evening",
};

const DEFAULT_REFERENCE_DATE = "2026-01-01";
const DAY_MS = 86_400_000;

/** Current slot based on local time: morning <12, midday <18, evening otherwise. */
export function getCurrentSlot(d: Date = new Date()): WisdomSlot {
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 18) return "midday";
  return "evening";
}

function startOfDayUTC(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/** day_number = ((today - referenceDate) mod 365) + 1 — loops forever. */
export function getDayNumber(referenceDate: string, today: Date = new Date()): number {
  const [y, m, d] = referenceDate.split("-").map(Number);
  const ref = Date.UTC(y, (m || 1) - 1, d || 1);
  const diff = Math.floor((startOfDayUTC(today) - ref) / DAY_MS);
  return (((diff % 365) + 365) % 365) + 1;
}

/**
 * Loads the 365-day Bible Entrepreneur Wisdom library plus the user's favorites.
 * Everything is cached in memory for the session; the schedule is derived
 * client-side from the admin-configured reference date.
 */
export function useBibleWisdom() {
  const [entries, setEntries] = useState<BibleWisdom[]>([]);
  const [referenceDate, setReferenceDate] = useState(DEFAULT_REFERENCE_DATE);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: rows }, { data: setting }, { data: auth }] = await Promise.all([
      supabase
        .from("bible_wisdom")
        .select("*")
        .eq("is_active", true)
        .order("day_number", { ascending: true })
        .order("display_order", { ascending: true })
        .limit(1200),
      supabase.from("app_settings").select("value").eq("key", "bible_wisdom_reference_date").maybeSingle(),
      supabase.auth.getUser(),
    ]);

    setEntries(rows ?? []);
    if (setting?.value) setReferenceDate(setting.value);

    const uid = auth?.user?.id ?? null;
    setUserId(uid);
    if (uid) {
      const { data: favs } = await supabase
        .from("bible_wisdom_favorites")
        .select("bible_wisdom_id")
        .eq("user_id", uid);
      setFavorites(new Set((favs ?? []).map((f) => f.bible_wisdom_id)));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dayNumber = useMemo(() => getDayNumber(referenceDate, now), [referenceDate, now]);
  const slot = useMemo(() => getCurrentSlot(now), [now]);

  const byDay = useMemo(() => {
    const map = new Map<number, BibleWisdom[]>();
    for (const e of entries) {
      const list = map.get(e.day_number) ?? [];
      list.push(e);
      map.set(e.day_number, list);
    }
    return map;
  }, [entries]);

  // The library is filled in batches, so fall back to looping over whatever
  // days are actually seeded instead of showing an empty day.
  const availableDays = useMemo(
    () => Array.from(byDay.keys()).sort((a, b) => a - b),
    [byDay]
  );
  const effectiveDayNumber = useMemo(() => {
    if (byDay.has(dayNumber)) return dayNumber;
    if (availableDays.length === 0) return dayNumber;
    return availableDays[(dayNumber - 1) % availableDays.length];
  }, [byDay, dayNumber, availableDays]);

  const todayEntries = useMemo(
    () => byDay.get(effectiveDayNumber) ?? [],
    [byDay, effectiveDayNumber]
  );
  const current = useMemo(
    () => todayEntries.find((e) => e.time_slot === slot) ?? todayEntries[0] ?? null,
    [todayEntries, slot]
  );


  const themes = useMemo(
    () => Array.from(new Set(entries.map((e) => e.theme))).sort((a, b) => a.localeCompare(b)),
    [entries]
  );
  const books = useMemo(
    () => Array.from(new Set(entries.map((e) => e.bible_book))).sort((a, b) => a.localeCompare(b)),
    [entries]
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      if (!userId) return;
      const isFav = favorites.has(id);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(id);
        else next.add(id);
        return next;
      });
      if (isFav) {
        await supabase
          .from("bible_wisdom_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("bible_wisdom_id", id);
      } else {
        await supabase
          .from("bible_wisdom_favorites")
          .insert({ user_id: userId, bible_wisdom_id: id });
      }
    },
    [favorites, userId]
  );

  return {
    entries,
    byDay,
    todayEntries,
    current,
    dayNumber,
    slot,
    themes,
    books,
    favorites,
    toggleFavorite,
    isSignedIn: !!userId,
    referenceDate,
    loading,
    reload: load,
  };
}

/** Coverage report used by the admin screen: missing days/slots and duplicates. */
export function analyzeCoverage(entries: BibleWisdom[]) {
  const seen = new Map<string, number>();
  for (const e of entries) {
    const key = `${e.day_number}-${e.time_slot}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const slots: WisdomSlot[] = ["morning", "midday", "evening"];
  const missing: { day: number; slot: WisdomSlot }[] = [];
  for (let day = 1; day <= 365; day++) {
    for (const s of slots) {
      if (!seen.has(`${day}-${s}`)) missing.push({ day, slot: s });
    }
  }
  const duplicates = Array.from(seen.entries())
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ key, count }));

  const refCounts = new Map<string, number>();
  for (const e of entries) refCounts.set(e.reference, (refCounts.get(e.reference) ?? 0) + 1);
  const repeatedReferences = Array.from(refCounts.entries())
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1]);

  return {
    total: entries.length,
    expected: 1095,
    missing,
    duplicates,
    repeatedReferences,
    completedDays: Array.from(new Set(entries.map((e) => e.day_number))).length,
  };
}

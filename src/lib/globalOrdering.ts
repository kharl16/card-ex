import { supabase } from "@/integrations/supabase/client";

export type GlobalLibraryTable =
  | "global_brochure_images"
  | "global_product_images"
  | "global_package_images"
  | "global_testimony_images"
  | "global_videos"
  | "global_cover_photos";

export function nextGlobalSortIndex(table: GlobalLibraryTable, boundary?: number): number {
  if (boundary === undefined) return 0;
  return boundary + (table === "global_cover_photos" ? 1 : -1);
}

/** Read the saved boundary, not a stale upload-loop closure. Keep prior custom order intact. */
export async function getGlobalInsertIndex(table: GlobalLibraryTable, companyId?: string): Promise<number> {
  // These libraries share sort_index; constrain the builder type to avoid
  // Supabase expanding the entire six-table union. Runtime table is unchanged.
  let query = supabase.from(table as "global_product_images").select("sort_index");
  if (companyId && table !== "global_videos" && table !== "global_cover_photos") {
    query = query.eq("company_id", companyId);
  }
  const { data, error } = await query
    .order("sort_index", { ascending: table !== "global_cover_photos" })
    .limit(1);
  if (error) throw error;
  return nextGlobalSortIndex(table, data?.[0]?.sort_index);
}

export function moveGlobalItem<T extends { sort_index: number }>(rows: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= rows.length || target < 0 || target >= rows.length) return rows;
  const ordered = [...rows];
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  return ordered.map((row, sort_index) => ({ ...row, sort_index }));
}
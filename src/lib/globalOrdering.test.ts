import { describe, expect, it, vi, beforeEach } from "vitest";
const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: db }));
import { getGlobalInsertIndex, moveGlobalItem, nextGlobalSortIndex, type GlobalLibraryTable } from "./globalOrdering";

describe("Global entry placement", () => {
  for (const table of ["global_brochure_images", "global_product_images", "global_package_images", "global_testimony_images", "global_videos"] as GlobalLibraryTable[]) {
    it(`${table}: latest entry appears first`, () => {
      expect(nextGlobalSortIndex(table, -4)).toBe(-5);
      expect(nextGlobalSortIndex(table)).toBe(0);
    });
  }
  it("Cover Photos: latest entry appears last", () => {
    expect(nextGlobalSortIndex("global_cover_photos", 7)).toBe(8);
    expect(nextGlobalSortIndex("global_cover_photos")).toBe(0);
  });
  it("saves manual order even when old sort values are duplicated", () => {
    const rows = [{ id: "a", sort_index: 0 }, { id: "b", sort_index: 0 }, { id: "c", sort_index: 9 }];
    expect(moveGlobalItem(rows, 1, -1)).toEqual([
      { id: "b", sort_index: 0 }, { id: "a", sort_index: 1 }, { id: "c", sort_index: 2 },
    ]);
    expect(rows[1].id).toBe("b");
    expect(moveGlobalItem(rows, 0, -1)).toBe(rows);
  });
});

describe("saved insertion boundary", () => {
  beforeEach(() => vi.clearAllMocks());
  function mockQuery(boundary: number, error: Error | null = null) {
    const q = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
    q.select.mockReturnValue(q); q.eq.mockReturnValue(q); q.order.mockReturnValue(q);
    q.limit.mockResolvedValue({ data: [{ sort_index: boundary }], error });
    db.from.mockReturnValue(q);
    return q;
  }
  it("reads the current company boundary again for each file in a batch", async () => {
    const q = mockQuery(-2);
    expect(await getGlobalInsertIndex("global_product_images", "company-a")).toBe(-3);
    q.limit.mockResolvedValue({ data: [{ sort_index: -3 }], error: null });
    expect(await getGlobalInsertIndex("global_product_images", "company-a")).toBe(-4);
    expect(q.eq).toHaveBeenCalledWith("company_id", "company-a");
    expect(q.order).toHaveBeenCalledWith("sort_index", { ascending: true });
  });
  it("reads the last Cover Photo rather than a company-scoped first item", async () => {
    const q = mockQuery(9);
    expect(await getGlobalInsertIndex("global_cover_photos")).toBe(10);
    expect(q.order).toHaveBeenCalledWith("sort_index", { ascending: false });
    expect(q.eq).not.toHaveBeenCalled();
  });
  it("does not insert at a guessed position if the read fails", async () => {
    mockQuery(0, new Error("Unavailable"));
    await expect(getGlobalInsertIndex("global_videos")).rejects.toThrow("Unavailable");
  });
});
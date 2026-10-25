import { describe, it, expect } from "vitest";
import { TEMPLATE_INDUSTRIES, filterByIndustry } from "./templateIndustries";

describe("template industries", () => {
  it("offers all 11 client-facing industries", () => {
    expect(TEMPLATE_INDUSTRIES).toHaveLength(11);
  });
  it("filters by industry and keeps all for 'all'", () => {
    const list = [{ category: "dental" }, { category: "legal" }, { category: null }];
    expect(filterByIndustry(list, "dental")).toEqual([{ category: "dental" }]);
    expect(filterByIndustry(list, "all")).toHaveLength(3);
  });
});

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

/**
 * Regression check: the "Resources" button label MUST be spelled
 * exactly "Resources" everywhere it appears across dashboard surfaces
 * AND the Tools Orb default, so dashboard CRUD/rename actions stay
 * visually consistent with the Actual Card Tools Orb item.
 */
describe("Resources label sync", () => {
  const surfaces: Array<{ file: string; mustContain: RegExp }> = [
    {
      file: "src/components/dashboard/MobileBottomNav.tsx",
      mustContain: /label:\s*"Resources",\s*path:\s*"\/resources"/,
    },
    {
      file: "src/components/dashboard/DashboardDock.tsx",
      mustContain: /label:\s*"Resources",\s*path:\s*"\/resources"/,
    },
    {
      file: "src/components/dashboard/DashboardQuickLinks.tsx",
      mustContain: /label:\s*"Resources",\s*path:\s*"\/resources"/,
    },
    {
      file: "src/components/dashboard/DashboardOrb.tsx",
      mustContain: /label:\s*"Resources",\s*path:\s*"\/resources"/,
    },
    {
      file: "src/hooks/useToolsOrb.ts",
      // Tools Orb default for the resources (id: "files") item.
      mustContain: /id:\s*"files",\s*label:\s*"Resources"/,
    },
    {
      file: "src/pages/resources/FilesPage.tsx",
      // Page heading must read "Resources" — never "Files".
      mustContain: />Resources</,
    },
  ];

  for (const { file, mustContain } of surfaces) {
    it(`${file} uses the canonical "Resources" label`, () => {
      const src = read(file);
      expect(src).toMatch(mustContain);
    });
  }

  it("dashboard and Tools Orb read from the same files_repository source", () => {
    // Dashboard Resources Hub data hook
    const dash = read("src/hooks/useResourceData.ts");
    expect(dash).toMatch(/files_repository/);

    // Tools Orb "Resources" section MUST query the same table so that
    // create / update / delete / rename actions performed from the
    // dashboard reflect on the Actual Card's Tools Orb for the same
    // user/card. If this assertion fails, the Tools Orb is reading a
    // divergent source and the two surfaces will drift.
    const orbSection = read("src/components/tools/sections/FilesSection.tsx");
    expect(
      orbSection,
      "FilesSection must query public.files_repository so it stays in sync with the dashboard Resources Hub"
    ).toMatch(/files_repository/);
  });
});

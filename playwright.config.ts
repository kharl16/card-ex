import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright regression suite for the carousel + lightbox image-fitting
 * behaviour documented in docs/qa-carousel-lightbox.md.
 *
 * The tests target a lightweight static fixture served by Vite so they run
 * deterministically in CI without hitting Supabase or real cards.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4173",
    trace: "on-first-retry",
  },
  projects: [
    { name: "mobile",  use: { ...devices["iPhone 13"] } },
    { name: "tablet",  use: { ...devices["iPad (gen 7)"] } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

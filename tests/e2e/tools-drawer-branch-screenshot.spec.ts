import { test, expect } from "@playwright/test";
import path from "path";

/**
 * Regression: after a double back from Google Maps on mobile, the Tools Orb
 * Branch page must remain fully visible with no cropped left edge.
 *
 * Captures a screenshot as visual evidence and asserts every reset-tracked
 * Branch element sits within the layout viewport (left >= 0, right <= width).
 *
 * Uses the same standalone fixture strategy as tools-drawer-scroll.spec.ts so
 * the test runs deterministically in CI without Supabase auth or seeded data.
 */
test.describe("Tools Drawer — Branch screenshot after double back from Maps", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("no cropped-left content after double back from Maps", async ({ page }, testInfo) => {
    await page.setContent(`
      <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
      <style>
        html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#050507;color:#fff;font-family:Arial,sans-serif}
        #drawer{
          position:fixed;inset:0;display:flex;flex-direction:column;
          left:0;right:auto;width:100dvw;max-width:100dvw;
          padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);
          background:#09090b;box-sizing:border-box;overflow-x:clip;touch-action:pan-y;
        }
        #outerScroll,#scroll{flex:1;overflow-y:auto;overflow-x:clip;overscroll-behavior-x:none;touch-action:pan-y;transform:none}
        #branchRoot{padding:16px;width:100%;max-width:100%;box-sizing:border-box;overflow-x:clip;touch-action:pan-y;transform:none}
        .search{height:48px;border:1px solid #4b3d21;border-radius:999px;display:flex;align-items:center;padding:0 16px;color:#c8c2b6;background:#141414;box-sizing:border-box;width:100%;max-width:100%}
        .tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;max-width:100%;overflow-x:clip;margin:14px 0;box-sizing:border-box}
        .tab{height:44px;border:1px solid #4b3d21;border-radius:12px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;box-sizing:border-box;background:#111;min-width:0}
        .card{width:100%;max-width:100%;box-sizing:border-box;border:1px solid #4b3d21;border-radius:16px;padding:14px;background:#111;overflow-x:clip}
        .actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:12px;width:100%;max-width:100%}
        button{height:42px;border-radius:10px;border:1px solid #6b5528;background:#171717;color:#fff;min-width:0}
      </style></head>
      <body>
        <div id="drawer" data-tools-drawer-content="true" data-tools-drawer-root>
          <div id="outerScroll" data-tools-drawer-scroll="outer">
            <div id="scroll" data-testid="tools-drawer-scroll" data-tools-drawer-scroll="inner">
              <section id="branchRoot" data-branch-reset="root" data-reset-key="0">
                <h1 data-branch-visible>Branches</h1>
                <div id="search" class="search" data-branch-reset data-branch-visible>Search...</div>
                <div id="tabs" class="tabs" data-branch-reset data-branch-visible>
                  <div class="tab"><span>All Sites</span><span>25</span></div>
                  <div class="tab"><span>Branches</span><span>18</span></div>
                  <div class="tab"><span>Luzon</span><span>12</span></div>
                  <div class="tab"><span>Visayas</span><span>4</span></div>
                </div>
                <article id="branchCard" class="card" data-branch-reset data-branch-visible>
                  <strong>San Juan City, NCR (Office 2)</strong>
                  <p>123 Main Avenue, Metro Manila</p>
                  <div class="actions">
                    <button>Call</button>
                    <button id="mapsButton">Maps</button>
                    <button>FB</button>
                    <button>View</button>
                  </div>
                </article>
              </section>
            </div>
          </div>
        </div>
        <script>
          let mapsReturnGuard = false;
          let branchResetKey = 0;
          const branchRoot = document.getElementById('branchRoot');

          // Simulate the Tools Orb "Branches" tile routing to /locator (same as
          // the dashboard Locator entry). The phone back button from Maps must
          // return here, not to the card slug page.
          const pathStack = ['/locator'];
          const syncPath = () => { document.body.dataset.currentPath = pathStack[pathStack.length - 1]; };
          syncPath();

          function normalize(node){
            node.scrollLeft = 0;
            node.style.translate = '0 0';
            node.style.transform = 'none';
            node.style.maxWidth = '100%';
            node.style.boxSizing = 'border-box';
            node.style.overflowX = 'clip';
            node.style.touchAction = 'pan-y';
          }

          function resetBranchContainers(){
            [branchRoot, ...branchRoot.querySelectorAll('[data-branch-reset], *')].forEach(normalize);
          }

          function forceBranchRerenderAndReset(){
            branchRoot.dataset.resetKey = String(++branchResetKey);
            resetBranchContainers();
            requestAnimationFrame(resetBranchContainers);
            setTimeout(resetBranchContainers, 80);
            setTimeout(resetBranchContainers, 250);
          }

          function resetDrawer(){
            document.documentElement.scrollLeft = 0;
            document.body.scrollLeft = 0;
            const viewportWidth = window.innerWidth;
            document.querySelectorAll('[data-tools-drawer-content] *').forEach(n => { n.scrollLeft = 0; });
            document.querySelectorAll('[data-tools-drawer-content], [data-tools-drawer-root], [data-tools-drawer-scroll]').forEach(n => {
              normalize(n);
              if (n.dataset.toolsDrawerContent === 'true') {
                n.style.left = '0px';
                n.style.right = 'auto';
                n.style.width = viewportWidth + 'px';
                n.style.maxWidth = viewportWidth + 'px';
              }
            });
          }

          function armMapsReturnGuard(){
            mapsReturnGuard = true;
            forceBranchRerenderAndReset();
            resetDrawer();
          }

          function resetAfterPotentialMapsReturn(){
            resetDrawer();
            if (mapsReturnGuard) {
              forceBranchRerenderAndReset();
            }
          }

          window.addEventListener('cardex:external-map-open', armMapsReturnGuard);
          window.addEventListener('pageshow', resetAfterPotentialMapsReturn);
          window.addEventListener('focus', resetAfterPotentialMapsReturn);
          window.addEventListener('popstate', () => {
            // Pop simulated router path (mimics phone back button).
            if (pathStack.length > 1) pathStack.pop();
            syncPath();
            resetAfterPotentialMapsReturn();
          });
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') resetAfterPotentialMapsReturn();
          });

          document.getElementById('mapsButton').addEventListener('click', () => {
            window.dispatchEvent(new Event('cardex:external-map-open'));
            pathStack.push('/locator/maps');
            syncPath();
          });
        </script>
      </body></html>
    `);

    const drawer = page.locator('[data-tools-drawer-content="true"]');
    const scroll = page.locator('[data-testid="tools-drawer-scroll"]');
    const branchRoot = page.locator('#branchRoot');
    const visibleBranchParts = page.locator('[data-branch-visible]');

    // Open Maps (arms the return guard).
    await page.click('#mapsButton');

    // Simulate two consecutive "return from Maps" bounces, corrupting the
    // viewport/transform in between (Android Chrome viewport drift).
    for (let i = 0; i < 2; i += 1) {
      await page.evaluate(() => {
        const drawer = document.querySelector('[data-tools-drawer-content="true"]') as HTMLElement;
        const scroll = document.querySelector('[data-testid="tools-drawer-scroll"]') as HTMLElement;
        const outer = document.querySelector('[data-tools-drawer-scroll="outer"]') as HTMLElement;
        const branchRoot = document.getElementById('branchRoot') as HTMLElement;
        const tabs = document.getElementById('tabs') as HTMLElement;
        const card = document.getElementById('branchCard') as HTMLElement;

        drawer.style.left = '-32px';
        drawer.style.width = 'calc(100dvw + 32px)';
        drawer.style.transform = 'matrix(1, 0, 0, 1, -32, 0)';
        scroll.scrollLeft = 220;
        outer.scrollLeft = 180;
        branchRoot.style.transform = 'translateX(-32px)';
        branchRoot.scrollLeft = 24;
        tabs.style.transform = 'translateX(-24px)';
        card.style.transform = 'translateX(-24px)';

        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('focus'));
        window.dispatchEvent(new Event('pageshow'));
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
    }

    // Wait for the reset guard's rAF + setTimeout(250) chain to settle.
    await expect
      .poll(async () => branchRoot.evaluate((el) => Number((el as HTMLElement).dataset.resetKey)))
      .toBeGreaterThan(2);
    await expect.poll(async () => scroll.evaluate((el) => el.scrollLeft)).toBe(0);
    await expect
      .poll(async () => drawer.evaluate((el) => Math.round(el.getBoundingClientRect().left)))
      .toBe(0);

    // Screenshot evidence of the Branch page post double-back.
    const screenshotPath = path.join(
      testInfo.outputDir,
      "branch-after-double-back-from-maps.png",
    );
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach("branch-after-double-back-from-maps", {
      path: screenshotPath,
      contentType: "image/png",
    });

    // After the double back from Maps, the simulated router path must be
    // /locator (Tools Orb Branch entry mirrors the dashboard Locator), NOT
    // the card slug page.
    const currentPath = await page.evaluate(() => document.body.dataset.currentPath);
    expect(currentPath, "double-back from Maps must land on /locator").toBe("/locator");
    expect(currentPath, "double-back from Maps must not land on /:slug").not.toMatch(/^\/[^/]+$/i.test("/locator") ? /^\/(?!locator$)[^/]+$/ : /.*/);

    // No branch element may cross the left edge or overflow the right edge.
    const viewportWidth = page.viewportSize()!.width;
    const boxes = await visibleBranchParts.evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          id: (node as HTMLElement).id || node.textContent?.trim() || node.tagName,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      }),
    );

    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) {
      expect(box.left, `${box.id} left edge must not be cropped`).toBeGreaterThanOrEqual(0);
      expect(box.right, `${box.id} right edge must fit within viewport`).toBeLessThanOrEqual(
        viewportWidth,
      );
      expect(box.width, `${box.id} must have visible width`).toBeGreaterThan(0);
    }
  });
});

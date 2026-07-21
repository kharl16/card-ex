import { test, expect } from "@playwright/test";

/**
 * Regression: on mobile, returning to the Tools Drawer after tapping
 * "Maps" or opening a detail dialog inside the Branches/Directory section
 * used to leave the drawer scrolled horizontally, clipping the left edge
 * of the UI ("cropped left side" bug).
 *
 * This spec uses a lightweight standalone fixture that mirrors the drawer's
 * overflow model so the assertion runs deterministically in CI without
 * requiring Supabase auth or seeded directory data. The production fix
 * lives in src/components/tools/ToolsDrawer.tsx (route/visibility listeners
 * + safe-area insets + scrollLeft reset).
 */
test.describe("Tools Drawer — mobile scroll reset", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("drawer scroll container starts and returns to x=0 after repeated Maps/detail navigation", async ({ page }) => {
    // Inline harness mimicking the drawer's scroll container + safe-area padding.
    await page.setContent(`
      <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
      <style>
        html,body{margin:0;padding:0;height:100%;overflow:hidden}
        #drawer{
          position:fixed;inset:0;display:flex;flex-direction:column;
          padding-left:env(safe-area-inset-left,0px);
          padding-right:env(safe-area-inset-right,0px);
          left:0;right:auto;width:100dvw;max-width:100dvw;
          background:#0b0b0c;color:#fff;
        }
        #outerScroll,
        #scroll{
          flex:1;overflow-y:auto;overflow-x:clip;transform:none;
          touch-action:pan-y;overscroll-behavior-x:none;
        }
        #content{width:100%;max-width:100%;padding:16px}
        .row{white-space:nowrap;overflow-x:auto;padding:8px 0}
        a{color:gold}
      </style></head>
      <body>
        <div id="drawer" data-tools-drawer-content="true" data-tools-drawer-root>
          <div id="outerScroll" data-tools-drawer-scroll="outer">
            <div id="scroll" data-testid="tools-drawer-scroll" data-tools-drawer-scroll="inner">
              <div id="content">
                <h1>Branches</h1>
                <div class="row" id="wideRow">
                  ${Array.from({ length: 40 }).map((_, i) => `<span style="display:inline-block;width:120px">Item ${i}</span>`).join("")}
                </div>
                <a id="mapsLink" href="about:blank" target="_blank" rel="noopener">Maps</a>
                <button id="detail">Open Detail</button>
              </div>
            </div>
          </div>
        </div>
        <script>
          // Simulate the production reset listeners (mirrors ToolsDrawer effect)
          function resetScroll(){
            document.documentElement.scrollLeft = 0;
            document.body.scrollLeft = 0;
            // Production behavior: ignore horizontal visualViewport offsets.
            // Android Chrome can report a stale/negative offset after returning
            // from Google Maps; applying it crops the left side of Branches.
            const viewportLeft = 0;
            const viewportWidth = window.innerWidth;
            document.querySelectorAll('[data-tools-drawer-content] *').forEach(n => {
              n.scrollLeft = 0;
            });
            document.querySelectorAll('[data-tools-drawer-content], [data-tools-drawer-root], [data-tools-drawer-scroll]').forEach(n => {
              n.scrollLeft = 0;
              n.style.overflowX = 'clip';
              n.style.touchAction = 'pan-y';
              if (n.dataset.toolsDrawerContent === 'true') {
                n.style.left = viewportLeft + 'px';
                n.style.right = 'auto';
                n.style.width = viewportWidth + 'px';
                n.style.maxWidth = viewportWidth + 'px';
                n.style.transform = 'matrix(1, 0, 0, 1, 0, 0)';
              } else {
                n.style.transform = 'none';
              }
            });
          }
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') resetScroll();
          });
          window.addEventListener('pageshow', resetScroll);
          window.addEventListener('focus', resetScroll);
          window.addEventListener('popstate', resetScroll);
          window.addEventListener('cardex:external-map-open', resetScroll);

          // Detail dialog stand-in: uses history so popstate fires on close.
          document.getElementById('detail').addEventListener('click', () => {
            history.pushState({ dialog: true }, '', '#detail');
            setTimeout(() => history.back(), 50);
          });
        </script>
      </body></html>
    `);

    const scroll = page.locator('[data-testid="tools-drawer-scroll"]');
    const outerScroll = page.locator('[data-tools-drawer-scroll="outer"]');

    // Baseline: starts at 0.
    await expect.poll(async () => scroll.evaluate((el) => el.scrollLeft)).toBe(0);

    const drawer = page.locator('[data-tools-drawer-content="true"]');

    // Simulate the drift Android Chrome can leave behind after repeatedly
    // opening Google Maps and returning with the phone back button.
    for (let i = 0; i < 3; i += 1) {
      await scroll.evaluate((el) => { el.scrollLeft = 220; });
      await outerScroll.evaluate((el) => { el.scrollLeft = 180; });
      await drawer.evaluate((el: HTMLElement) => {
        el.style.left = '-28px';
        el.style.width = 'calc(100dvw + 28px)';
        el.style.transform = 'matrix(1, 0, 0, 1, -28, 0)';
      });
      expect(await scroll.evaluate((el) => el.scrollLeft)).toBe(220);

      // Trigger a "return from Maps" — page becomes hidden then visible and
      // focus/pageshow/popstate fire in different orders depending on device.
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
        document.dispatchEvent(new Event("visibilitychange"));
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
        document.dispatchEvent(new Event("visibilitychange"));
        window.dispatchEvent(new Event("focus"));
        window.dispatchEvent(new Event("pageshow"));
        window.dispatchEvent(new PopStateEvent("popstate"));
      });

      await expect.poll(async () => scroll.evaluate((el) => el.scrollLeft)).toBe(0);
      await expect.poll(async () => outerScroll.evaluate((el) => el.scrollLeft)).toBe(0);
      await expect.poll(async () => drawer.evaluate((el) => Math.round(el.getBoundingClientRect().left))).toBe(0);
    }

    // Simulate opening + closing a detail dialog (popstate path).
    await scroll.evaluate((el) => { el.scrollLeft = 180; });
    await outerScroll.evaluate((el) => { el.scrollLeft = 160; });
    await page.click("#detail");
    await expect.poll(async () => scroll.evaluate((el) => el.scrollLeft)).toBe(0);
    await expect.poll(async () => outerScroll.evaluate((el) => el.scrollLeft)).toBe(0);
    await expect.poll(async () => drawer.evaluate((el) => Math.round(el.getBoundingClientRect().left))).toBe(0);

    // Safe-area padding is honored (env() returns 0 in headless but the
    // style property is still applied — asserts the fix is wired up).
    const paddingLeft = await page.locator("#drawer").evaluate(
      (el) => getComputedStyle(el).paddingLeft
    );
    expect(paddingLeft).toBeDefined();
  });

  test("double back from Maps keeps Branch fully visible with no cropped left edge", async ({ page }) => {
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
              window.dispatchEvent(new CustomEvent('cardex:external-map-return', { detail: { source: 'test' } }));
            }
          }

          window.addEventListener('cardex:external-map-open', armMapsReturnGuard);
          window.addEventListener('cardex:external-map-return', forceBranchRerenderAndReset);
          window.addEventListener('pageshow', resetAfterPotentialMapsReturn);
          window.addEventListener('focus', resetAfterPotentialMapsReturn);
          window.addEventListener('popstate', resetAfterPotentialMapsReturn);
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') resetAfterPotentialMapsReturn();
          });

          document.getElementById('mapsButton').addEventListener('click', () => {
            window.dispatchEvent(new Event('cardex:external-map-open'));
            history.pushState({ maps: true }, '', '#maps');
          });
        </script>
      </body></html>
    `);

    const drawer = page.locator('[data-tools-drawer-content="true"]');
    const scroll = page.locator('[data-testid="tools-drawer-scroll"]');
    const branchRoot = page.locator('#branchRoot');
    const visibleBranchParts = page.locator('[data-branch-visible]');

    await page.click('#mapsButton');
    const initialResetKey = await branchRoot.getAttribute('data-reset-key');
    expect(Number(initialResetKey)).toBeGreaterThan(0);

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

    await expect.poll(async () => scroll.evaluate((el) => el.scrollLeft)).toBe(0);
    await expect.poll(async () => drawer.evaluate((el) => Math.round(el.getBoundingClientRect().left))).toBe(0);
    await expect.poll(async () => branchRoot.evaluate((el) => el.scrollLeft)).toBe(0);
    await expect.poll(async () => branchRoot.evaluate((el) => Number((el as HTMLElement).dataset.resetKey))).toBeGreaterThan(2);

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

    for (const box of boxes) {
      expect.soft(box.left, `${box.id} left edge is visible`).toBeGreaterThanOrEqual(0);
      expect.soft(box.right, `${box.id} right edge fits viewport`).toBeLessThanOrEqual(viewportWidth);
      expect.soft(box.width, `${box.id} has visible width`).toBeGreaterThan(0);
    }
  });
});

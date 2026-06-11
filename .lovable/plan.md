# Add "Videos" to the Dashboard Orb

## Goal
Surface the **global Videos library** (the same content shown by the *Videos* button inside the in-card Tools Orb — sourced from `training_folders` + `training_items`) directly from the Dashboard floating orb, so users don't need to open a card to watch.

## Where it goes
Promote **Videos** to a first-class slot on the Dashboard Orb (the 8-button radial menu shown in the screenshot).

The orb's 8-slot symmetry is locked by design (per the Tools Orb Floating UI memory). To make room without breaking radial symmetry, we **merge Locator into Resources**:
- *Locator* is a niche destination already reachable from Resources / direct route `/locator`.
- Freed slot becomes **Videos** with a play-circle icon.

Final 8 slots:

```text
Tools     Leads     Prospects   Videos
Resources Appts     Analytics   Referrals
```

If the user prefers to keep Locator on the orb, alternative is to retire *Appts* (also reachable from the in-card Tools Orb and from `/appointments`).

## Behavior
- Tapping **Videos** opens a full-screen drawer/sheet on the dashboard (no navigation away).
- Drawer renders the existing `TrainingsSection` (folders → videos grid) — exactly the same component the in-card Tools Orb uses, so content stays 1:1 with the card experience and updates in real time when admins add videos.
- Fullscreen video playback reuses `VideoFullscreenDialog`.
- No card context required (content is global), matching the Dashboard Context Resolution rule.

## Files to touch (frontend only)

1. **`src/components/dashboard/DashboardOrb.tsx`**
   - Replace the *Locator* entry with a **Videos** entry (label, `PlayCircle` icon from lucide-react, gold accent consistent with luxury theme).
   - Add `onVideosClick` prop; wire it to open a new drawer.

2. **`src/pages/Dashboard.tsx`**
   - Add `videosOpen` state.
   - Render a new `<DashboardVideosDrawer open={videosOpen} onOpenChange={setVideosOpen} />`.
   - Pass `onVideosClick={() => setVideosOpen(true)}` to `DashboardOrb`.
   - Ensure Locator stays reachable via Resources tile / `/locator` route (no route changes).

3. **`src/components/dashboard/DashboardVideosDrawer.tsx` (new)**
   - Thin wrapper: shadcn `Sheet` (side="bottom", full height on mobile) with the brand glassmorphism styling.
   - Renders `<TrainingsSection />` inside a scrollable container.
   - Header: "Videos" + close button (44px target, senior-friendly).
   - No business logic — purely presentational shell that delegates to the existing global videos component.

4. **(Optional) `src/components/dashboard/MobileBottomNav.tsx`**
   - No change. Keeps senior-friendly target count intact.

## Non-goals / out of scope
- No DB schema changes (videos already global in `training_folders` / `training_items`).
- No edits to `TrainingsSection` itself — reused as-is so any admin update flows to both card and dashboard automatically.
- No change to per-card Tools Orb behavior or content.
- No backend / edge function changes.

## Validation
- Confirm the orb still renders 8 symmetric slots on mobile (390px viewport).
- Tap Videos → drawer opens → folders render → tap folder → videos render → tap video → fullscreen plays.
- Confirm Locator remains accessible via Resources tile and `/locator` direct URL.
- Verify zero horizontal overflow on mobile (per Core rule).

## Memory update after build
Add a short memory note under `mem://ux/dashboard-orb-slot-allocation` recording: *Dashboard Orb slots: Tools, Leads, Prospects, Videos, Resources, Appts, Analytics, Referrals. Locator merged into Resources tile to free a slot for global Videos.*

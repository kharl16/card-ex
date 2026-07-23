Plan: Replace the public-card Tools Orb with a persistent, branded tagex.app promo button

Current state
- `src/pages/PublicCard.tsx` renders `<ToolsOrb mode="public" cardOwnerId={card?.user_id} />` as a floating orb on every public card.
- The user considers this redundant because the same tools live in the dashboard.
- A fixed "Save Contact" bar already sits at the bottom of the public card.
- The owner’s referral code is already fetched in `PublicCard.tsx` via `get_referral_code_for_user` and used by the "Create your own Card-Ex" CTA.

Goal
Remove the public-card Tools Orb and add a very obvious, on-brand floating button that links visitors to tagex.app (with the owner’s referral code when available), without overlapping the Save Contact bar or breaking mobile layout.

Changes
1. Remove the Tools Orb from public cards
   - Delete the `<ToolsOrb mode="public" cardOwnerId={card?.user_id} />` line in `src/pages/PublicCard.tsx`.
   - Remove the unused `ToolsOrb` import from `PublicCard.tsx`.

2. Create a floating tagex.app promo button
   - Build a new small component `src/components/FloatingTagexButton.tsx`.
   - It will be a fixed, draggable-or-static floating pill (follow the existing `DraggableShareFab` pointer-event pattern for touch safety, but keep it simpler as a single pill/button rather than a radial menu).
   - Label: "Get Card-Ex" or "tagex.app" with a small Card-Ex logo/icon.
   - Link target: `/signup?ref={ownerReferralCode}` if a referral code exists; otherwise `https://tagex.app`.
   - Open in a new tab so the visitor can return to the card easily.
   - Position it in the bottom-right corner, above the Save Contact bar on mobile and above the bottom safe area on devices with rounded corners.
   - Style: glassmorphism with gold accent (`bg-card/60`, `backdrop-blur-xl`, `ring-1 ring-primary/40`, gold text/icon, shadow-lg). Match the existing luxury premium theme.

3. Integrate the button in `PublicCard.tsx`
   - Render `<FloatingTagexButton referralCode={ownerReferralCode} />` near the bottom of the public card layout, outside the `max-w-2xl` content wrapper so it floats relative to the viewport.
   - Keep the existing "Create your own Card-Ex" bottom CTA as well; the floating button is the prominent, always-visible entry point.

4. Mobile/safe-area considerations
   - Add `pb-safe` / `pr-safe` padding or explicit `env(safe-area-inset-*)` offsets so the button is not clipped by notches or rounded corners.
   - Ensure z-index ordering places it below the Save Contact bar (z-50) but above the card content (z-40 is fine).
   - Prevent horizontal overflow: keep the button within `max-w-[100vw]` and clamp on resize.

5. Optional analytics hook
   - Track a `cta_click` event via the existing `track-card-event` edge function when the button is clicked, so the card owner can see how many visitors clicked through to tagex.app.

6. Verification
   - Build the project and run a quick Playwright check on a public card route to confirm:
     - The Tools Orb is gone.
     - The new floating tagex.app button is visible and not clipped on mobile/tablet/desktop.
     - It links to the referral signup when a referral code is present.
     - The Save Contact bar remains fully accessible.

Technical details
- Existing file to edit: `src/pages/PublicCard.tsx`
- New file: `src/components/FloatingTagexButton.tsx`
- No backend changes needed; the referral code already exists in `PublicCard` state.
- Keep the change scoped to the public card view only; do not affect the dashboard Tools Orb.
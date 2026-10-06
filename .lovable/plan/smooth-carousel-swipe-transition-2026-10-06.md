# Smooth carousel swipe transition

## Goal
Make photo swipes settle into the next image with a visibly smoother, less abrupt motion while preserving direct finger tracking, rotation handling, Full Screen sizing, and reduced-motion accessibility.

## Changes
- Tune the shared Actual Card lightbox’s default spring to a softer, longer settle.
- Ensure old saved transition-speed values no longer force the removed fast control’s setting, so everyone receives the smoother standard motion.
- Keep instant navigation for people who enable reduced motion.
- Add a focused regression test for the transition preference and verify the public-card swipe at phone size.

## Technical details
- Update the lightbox transition preference hook and its spring mapping rather than adding a new visible control.
- Keep the proportional three-slide track and ResizeObserver logic unchanged.

# Project architecture

- Keep Resources Hub search results inside the existing Pavilion, grouped by resource type and sourced from the same access-scoped resource hook, so search respects the current user's visible content.
- Page the Actual Card lightbox with native CSS scroll-snap (one full-width page per photo) and sync the index after scrolling rests, so swipes are interruptible and feel like a phone's native gallery.
- Re-pin the lightbox scroller to the current photo via ResizeObserver, so Full Screen and phone rotation cannot expose stale-width neighboring photos.
- Keep public-card floating controls bounded to the centered card on wide screens; let Share use the photo viewer bounds while it is open so dragging stays useful in Full Screen.
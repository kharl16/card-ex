# Project architecture

- Keep Resources Hub search results inside the existing Pavilion, grouped by resource type and sourced from the same access-scoped resource hook, so search respects the current user's visible content.
- Measure the Actual Card lightbox track with a ResizeObserver on its stage rather than relying on window resize events, because Full Screen resizes the dialog independently of the window.
- Keep public-card floating controls bounded to the centered card on wide screens; let Share use the photo viewer bounds while it is open so dragging stays useful in Full Screen.
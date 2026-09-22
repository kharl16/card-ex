# Compact, height-aligned immersive carousels

## What will change
- Measure the actual proportions of every photo and video thumbnail in each carousel row.
- Set the row's shared media height from its shortest entry, so every visible item aligns evenly.
- Fit taller photos and videos inside that shared height without cropping or stretching.
- Let each carousel container shrink to its real content height, removing the large gray area below brochure and other rows.
- Keep current item counts, captions, prices, buttons, search, and infinite swiping unchanged.

## Technical details
- Report each loaded tile's natural aspect ratio to its parent row.
- Use the widest measured ratio as the row-wide aspect ratio, which produces the shortest natural media height.
- Apply that ratio consistently to original tiles and infinite-loop copies.
- Verify portrait phone, landscape phone, and desktop layouts.

# Unified Showcase Search and Tighter Carousel Spacing

## Goal
Make the immersive showcase more compact and replace the five carousel search fields with one shared search.

## Changes
- Add one search field above the showcase rows that searches Brochure, Videos, Products, Packages, and Testimonies together.
- Filter each row using the shared query while keeping matching rows and hiding rows with no results.
- Show a combined result count and clear control in the shared search.
- Keep infinite swiping active when search is empty and disable looping while results are filtered.
- Reduce the vertical gap between carousel sections, headings, image tracks, captions, and action buttons.
- Reduce excess space between each uploaded photo and its frame without cropping or stretching.
- Preserve the category-specific portrait and landscape item counts already approved.

## Technical Notes
- Lift search state into the immersive showcase and pass the query into each row.
- Remove row-level search controls and match-navigation state.
- Keep image metadata below the image and preserve natural image proportions.
- Verify the public card at phone portrait, phone landscape, and desktop widths.

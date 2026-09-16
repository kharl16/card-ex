# Clean and Standardize Global Brochure Pages

## Goal
Make every Global Brochure page look consistent with the edge-to-edge reference image while preserving all real page content.

## Implementation
1. **Add safe white-edge detection**
   - Detect only near-white bands connected to the outside edges.
   - Trim conservatively so white text, white panels, certificates, and other intentional interior content remain untouched.
   - Reject suspicious trims instead of risking removal of real content.

2. **Process every future brochure upload**
   - Apply edge cleanup before optimization and upload from the Global Brochure page.
   - Apply the same cleanup when replacing either photo slot.
   - Process images added by URL when the source permits secure browser access; otherwise show a clear instruction to upload the file directly rather than silently saving an unprocessed page.
   - Keep this behavior brochure-only so products, packages, testimonies, and other images are unchanged.

3. **Clean the existing Global Brochure library**
   - Add an admin-only “Clean existing pages” action with progress and a completion summary.
   - Reprocess each current main and alternate brochure image, upload the cleaned version, and update only its image URL.
   - Preserve captions, ordering, sections, visibility, templates, card overrides, and original stored files for rollback.

4. **Guarantee consistent presentation without cropping**
   - Display every brochure page inside the currently selected Portrait, Landscape, or Original frame.
   - Use proportional scaling with no stretching and no content crop.
   - Use the existing premium dark/gold framing for any unavoidable leftover space after a border is removed, rather than white bars.
   - Apply this consistently in Global Brochures, admin preview, card editor preview, Classic cards, Immersive cards, View All, and lightbox views.

5. **Validation**
   - Add focused tests for left/right white borders, four-sided borders, intentional interior white areas, already edge-to-edge pages, and mixed dimensions.
   - Verify the supplied files: `6.jpg` should lose its approximately 66px left and 64px right white margins; `5.jpg` should remain unchanged.
   - Check mobile and desktop displays for equal outer proportions, full uncropped content, no distortion, and no horizontal overflow.

## Technical Notes
- Extend the existing browser image optimizer with a brochure-only edge-trim option before resizing and encoding.
- Determine the trim rectangle from edge-connected near-white pixels with tolerance for JPEG compression, minimum band confidence, and conservative safety limits.
- Content-hashed filenames will create new immutable assets; existing database rows will point to the cleaned versions without deleting source files.
- No database schema change is required.

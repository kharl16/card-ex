# Premium testimony photo fitting

## Goal
Remove white margins from testimony photos and let each photo use as much of its carousel frame as possible, without stretching or cutting into the actual testimony content.

## What will change
- Apply the existing safe edge-cleaning process to all future testimony uploads in the card editor and Global Testimony Photos.
- Add a testimony-only cleanup action for existing card photos and shared global photos. It will create cleaned copies and update references while retaining the original stored files for rollback.
- Handle pasted image URLs through the same cleanup when the source permits downloading; otherwise ask for direct upload rather than silently keeping white margins.
- Keep testimony frames stable and use the cleaned photo’s natural proportions inside a premium dark frame, maximizing visible image size without content cropping.
- Improve testimony thumbnails in the editor/admin views so they preview the same no-margin result instead of using a cropped thumbnail.

## Safety and verification
- Reuse edge-connected near-white detection, including JPEG fringe removal; interior white areas and bright colored artwork remain untouched.
- Preserve captions, order, visibility, shared-card overrides, and all other card content.
- Add regression coverage for testimony cleanup and run the focused image tests plus the TypeScript check.
- Visually verify the public-card testimony row at desktop and mobile widths, including no horizontal overflow.

## Technical details
- Pass `trimWhiteEdges` only when the upload category is `testimonies`; products, packages, brochures, and videos are unchanged.
- Reprocess existing public Storage URLs client-side, upload content-hashed optimized replacements, then update only each testimony URL.
- Use natural image ratio for testimony tiles where supported, with bounded responsive dimensions and `object-contain` as the final no-crop safeguard.

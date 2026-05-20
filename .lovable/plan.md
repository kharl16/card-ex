# Resources Hub Reorganization — Senior-Friendly + Breezy Uploads

Scope: Files, Ambassadors, Quick Links, 13 Ways. **Directory is left as-is.**

## Goals
- Public side: cut clicks, increase tap targets, surface most-used content first.
- Admin side: turn "add 20 files with captions" from a 60-click chore into a single drag-and-drop screen.

---

## Part 1 — Public Resources Hub (senior-friendly browse)

### New layout (`/resources`)
```
┌─────────────────────────────────────────┐
│  Header: Logo · Title · Big Search box  │
├─────────────────────────────────────────┤
│  ⭐ FEATURED ROW (horizontal scroll)    │
│  [Recent files + Favorites mixed]       │
├─────────────────────────────────────────┤
│  📁 FILES — by folder (big tiles)       │
│  [Folder] [Folder] [Folder] [View all]  │
├─────────────────────────────────────────┤
│  🎬 AMBASSADOR CLIPS                    │
│  [thumb] [thumb] [thumb]  [View all]    │
├─────────────────────────────────────────┤
│  🔗 QUICK LINKS                         │
│  [big icon tiles]                       │
├─────────────────────────────────────────┤
│  📖 13 WAYS                             │
│  [first 3 cards, View all]              │
└─────────────────────────────────────────┘
```

### Senior-friendly rules applied
- Section headers `text-2xl` with category icon — easy to scan.
- All tiles minimum **96×96px** with text label visible at all times (no hover-only labels).
- Every tappable card uses `min-h-[88px]`, `text-base`, captions truncated to 2 lines.
- Single global Search at the top filters across **files, ambassadors, links, ways** at once (no scope toggle needed). Tapping a match opens the file/link directly.
- Remove the "stat cards" row (4 counters) — replaces with a single "Featured" row that is actually useful.
- Sticky bottom bar (mobile) — Home · Favorites · Recent — 56px tall, labeled icons.

### Inside `/resources/files`
- Folder pills become **large folder tiles** at the top (image + name + count), tapping drills in.
- File grid: same big-thumb layout but captions always visible underneath (not just on hover).
- Search is the existing inline search + Alt/desc/SRP scope already wired.

---

## Part 2 — Breezy Bulk Upload (admin side)

Replace the current "open editor → upload one image → type caption → save → repeat" flow with a single **Bulk Upload** screen on `/admin/resources` (Files tab).

### New "Bulk Upload" panel
1. Big dropzone: "Drop files here (images, PDFs, videos) or click to browse"
2. Each dropped file appears as a row:

```
┌──────┬──────────────────┬──────────────┬─────────┬────────┐
│ 🖼️   │ File name        │ Caption ____ │ Folder ▾│ Active │
│ thumb│ (editable)       │ (1-line text)│         │ switch │
└──────┴──────────────────┴──────────────┴─────────┴────────┘
```

3. Top-of-list controls:
   - "Apply folder to all"
   - "Apply visibility to all"
   - "Caption from filename" (auto-fills caption from cleaned filename)
4. One "Upload All" button → uploads to `resources` storage bucket in parallel, inserts rows into `files_repository` with `caption`, `folder_name`, `visibility_level`, `is_active`, `images` (public URL), `file_name`.
5. Progress bar per row + green check on success.

### Existing single-item editor
Kept for editing existing records and for non-file modules. The bulk uploader is a new component that lives **next to** the single editor — admins choose Add (one) vs Bulk Upload (many).

### Same uploader reused for Ambassadors & Links
The dropzone component is generic: pass `module` prop. For Ambassadors it captures endorser + caption + thumbnail; for Links it captures name + URL. (Skipping Directory per request.)

---

## Technical notes

### New files
- `src/components/admin/resources/BulkUploadDialog.tsx` — dropzone + rows table + parallel uploads.
- `src/components/resources/FeaturedRow.tsx` — top row mixing recent + favorites.
- `src/components/resources/SectionHeader.tsx` — large senior-friendly section title with icon + "View all".

### Modified files
- `src/pages/ResourcesHub.tsx` — replace stat cards with Featured row; add 13 Ways section; bigger headers; remove tiny text.
- `src/pages/admin/AdminResources.tsx` — add "Bulk Upload" button next to "Add" on Files/Ambassadors/Links tabs.
- `src/components/resources/ResourcesHeader.tsx` — bigger search input (`h-12 text-base`), single search across all modules.
- `src/pages/resources/FilesPage.tsx` — large folder tiles row above the grid; captions always visible.

### Database
No schema change needed — `caption`, `folder_name`, `visibility_level`, `is_active`, `images` already exist on `files_repository` (verified). Same for `ambassadors_library` and `iam_links`.

### Storage
Uses existing `resources` bucket. Bulk upload writes to `files/<timestamp>-<random>.<ext>`.

---

## Out of scope
- Directory module (kept exactly as-is per request).
- CSV import (kept as-is; bulk upload is the new preferred path).
- Editing existing items in bulk (future enhancement).

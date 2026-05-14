## Goal

When someone opens a file from a Folder under Resources (e.g. "Jade" package), show a structured 2-column details list under the action buttons — exactly like the boxed area in your screenshot (label on the left, price/value on the right, plus an optional heading like "The VIP package (Free additional products worth P50,000)").

You'll get an admin form that lets you enter:
- An optional heading line
- Any number of rows, each with two fields: **Label** and **Value**
- Add row / remove row / drag-to-reorder

---

## How it will work

### 1. Storage (database)
Add two new columns to the existing `IAM Files` table:
- `details_heading` — short text (e.g. "The VIP package (Free additional products worth P50,000)")
- `details_rows` — JSONB array, e.g.
  ```
  [
    { "label": "Just 4 You", "value": "₱200,000" },
    { "label": "Give Me 5", "value": "₱15,000" },
    { "label": "Wholesale Package Commission", "value": "₱20,000" },
    { "label": "Sales Match Commission (x2)", "value": "₱5,000" },
    { "label": "RQV", "value": "4,000" },
    { "label": "Infinity", "value": "₱5,000" }
  ]
  ```

JSONB keeps it flexible (any number of rows, easy to reorder, no extra table needed).

### 2. Admin form
Update `src/components/tools/admin/AdminFileDialog.tsx`:
- New "Heading" text input
- New "Details Rows" repeater section:
  - Each row = two inputs side-by-side (Label | Value) + a remove (×) button
  - "Add Row" button at the bottom
  - Up/down handles to reorder
- Also a small "Bulk paste" helper: paste tab- or `:`-separated text and it auto-splits into rows (handy when copying from a spreadsheet)

### 3. Public view
Update the file detail dialog in `src/components/tools/sections/FilesSection.tsx`:
- Below the existing image / Zoom / Download / Share buttons, render a card matching the screenshot:
  - Heading row (if set) in semibold
  - One row per `details_rows` entry: label left-aligned, value right-aligned, thin divider between rows
- Hidden entirely if no rows are set, so existing files are unaffected.

Reusing the existing `DescriptionTable.tsx` pattern is not a fit (that's for items with images). This is a simpler key/value list, so we add a small new `DetailsTable` component.

---

## Technical notes

- Migration: `ALTER TABLE "IAM Files" ADD COLUMN details_heading text, ADD COLUMN details_rows jsonb DEFAULT '[]'::jsonb;`
- The `FilesSection.fetchItems` mapper will pick up the two new columns and pass them into the dialog.
- Form state: `details_rows` kept as an array in React state; "Save" writes it back as JSONB.
- No changes to RLS — table already has the right policies.

---

## Open question

The screenshot shows currency on the right (₱200,000, ₱15,000, etc.). Do you want:
- **A)** A single free-text "Value" field (you type "₱200,000" yourself — most flexible), or
- **B)** Two separate inputs per row: numeric amount + currency dropdown (auto-formats)?

I recommend **A** for speed and flexibility. Let me know which you prefer and I'll build it.

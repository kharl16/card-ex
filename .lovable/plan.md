
# Mobile-Friendly Branches Category Tabs Optimization

## Current Issues (from your screenshot)
1. Category chip labels are heavily truncated ("Br...", "L...", "Vis...", "Mi...")
2. Chips appear cramped with labels not readable
3. Grid layout exists but text doesn't fit well

## Proposed Solution

### Approach: Vertical Stacked Tabs with Full Labels

Instead of forcing all tabs into a grid that truncates labels, we'll create a **mobile-first vertical tab list** that shows full labels clearly, then switch to horizontal on larger screens.

### UI Changes

**Mobile (below 640px):**
- Single column layout (6 rows)
- Each tab shows full label + count badge
- Large touch targets (48px height)
- Clear active state highlighting

**Tablet (640px-1024px):**
- 2 columns (3 rows)
- Labels still fully visible

**Desktop (1024px+):**
- 3 or 6 columns (1-2 rows)
- Compact but readable

### Technical Implementation

**File: `src/components/tools/sections/DirectoryCategoryChips.tsx`**

```
Mobile Layout Changes:
├── Change grid from "grid-cols-2" to "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
├── Increase chip height on mobile (h-12 vs h-11)
├── Remove truncate on mobile, allow full text display
├── Add icon for each category for visual recognition
├── Use shorter mobile-friendly labels (optional toggle)
└── Improve count badge visibility
```

**Styling Updates:**
- Remove `truncate` class on mobile viewport
- Use `text-left` alignment for better readability
- Add subtle icons per category for quick visual scanning
- Ensure count badges don't compress

### Alternative: Horizontal Scrolling Pill Bar (Optional)

If vertical stacking takes too much space, we could use a horizontal scrollable row with:
- `overflow-x-auto` with `scrollbar-hide`
- Fixed-width pills that don't truncate
- Snap scrolling for smooth navigation

But this violates your "no horizontal scrolling" requirement.

---

## Recommended Final Layout

| Viewport | Columns | Rows | Label Display |
|----------|---------|------|---------------|
| < 640px  | 1       | 6    | Full labels   |
| 640-1024px | 2     | 3    | Full labels   |
| > 1024px | 3 or 6  | 1-2  | Full labels   |

## Files to Modify

1. `src/components/tools/sections/DirectoryCategoryChips.tsx`
   - Update grid classes
   - Remove/conditionally apply truncate
   - Add category icons for visual aid
   - Increase touch target size

2. `src/components/tools/sections/DirectorySection.tsx`
   - Pass icons for each category
   - Possibly add mobile-friendly short labels

## Senior-Friendly Enhancements

- **Larger tap targets**: 48px minimum height
- **High contrast**: Clear active/inactive states
- **Icons**: Visual cues alongside text
- **No truncation**: Full readable labels
- **Consistent spacing**: Easy to tap without mistakes

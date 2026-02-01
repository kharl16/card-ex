

# Fix Directory Category Tabs Clipping/Overflow Bug

## Problem
The second column of Directory category tabs (Branches, Visayas, International) is being pushed off-screen on mobile and desktop due to nested `ScrollArea` components causing width mis-measurement issues.

## Root Cause
1. **Nested ScrollAreas**: Mobile drawer has an outer `ScrollArea` (line 193) wrapping `renderContent()`, which itself contains another `ScrollArea` (line 168). This causes Radix viewport width calculation bugs.
2. **Missing width constraints**: The content wrapper lacks `max-w-full` and `overflow-x-hidden` to prevent horizontal overflow.
3. **Desktop SheetContent**: Missing `overflow-x-hidden` to prevent clipping issues.

## Solution

### File 1: `src/components/tools/ToolsDrawer.tsx`

**Change A - Remove outer ScrollArea in mobile drawer (lines 192-194)**
```
Before:
<div className="flex-1 overflow-hidden">
  <ScrollArea className="h-full">{renderContent()}</ScrollArea>
</div>

After:
<div className="flex-1 overflow-y-auto overflow-x-hidden">
  {renderContent()}
</div>
```

**Change B - Replace inner ScrollArea with native scroll (lines 168-176)**
```
Before:
<ScrollArea className="flex-1">
  <div className="p-4">
    {activeSection === "trainings" && ...}
  </div>
</ScrollArea>

After:
<div className="flex-1 overflow-y-auto overflow-x-hidden">
  <div className="p-4">
    {activeSection === "trainings" && ...}
  </div>
</div>
```

**Change C - Add width constraints to renderContent() root wrapper (line 131)**
```
Before:
<div className="flex flex-col h-full">

After:
<div className="flex flex-col h-full w-full max-w-full overflow-x-hidden">
```

**Change D - Add overflow constraints to sticky header (line 132)**
```
Before:
<div className="sticky top-0 z-10 bg-background border-b p-4 space-y-3">

After:
<div className="sticky top-0 z-10 bg-background border-b p-4 space-y-3 w-full max-w-full overflow-x-hidden">
```

**Change E - Add overflow-x-hidden to desktop SheetContent (line 200)**
```
Before:
<SheetContent side="right" className="w-[480px] sm:max-w-[480px] p-0">

After:
<SheetContent side="right" className="w-[480px] sm:max-w-[480px] p-0 overflow-x-hidden">
```

### File 2: `src/components/tools/sections/DirectoryCategoryChips.tsx`

**Replace entire file with robust 2-column grid implementation:**
- Parent container: `w-full max-w-full overflow-hidden box-border`
- Grid: `grid grid-cols-2 gap-2` (simple, no extra constraints)
- Buttons: `w-full min-w-0 h-12` to properly fill grid cells
- Labels: `truncate` with `min-w-0` to prevent text overflow pushing columns

## Expected Result
- Directory tabs always show 2 columns (3 rows) on mobile and desktop
- No column gets pushed off-screen
- No horizontal scrolling needed
- Sticky header remains stable
- Scroll works correctly inside drawer/sheet

## Files to Modify
1. `src/components/tools/ToolsDrawer.tsx` - 5 changes
2. `src/components/tools/sections/DirectoryCategoryChips.tsx` - Full replacement



# Fix: Map View Crashing in Branches Tool

## Problem
Clicking the **Map** button in the Branches tool causes a crash with the error `render2 is not a function`. This happens because `react-leaflet` v5 requires **React 19**, but this project uses **React 18**.

## Root Cause
The `react-leaflet` package is at version `^5.0.0`, which is incompatible with React 18. When the map component lazy-loads and renders, it crashes due to a React Context API incompatibility.

## Solution
Downgrade `react-leaflet` to version **4.x** (the last version compatible with React 18) and adjust `leaflet` accordingly.

---

## Technical Details

### Step 1: Update Dependencies
- Change `react-leaflet` from `^5.0.0` to `^4.2.1`
- Keep `leaflet` at `^1.9.4` (compatible with both)
- Keep `@types/leaflet` at `^1.9.21` (compatible with both)

### Step 2: Verify API Compatibility
The `react-leaflet` v4 API is nearly identical to v5 for the components used:
- `MapContainer`, `TileLayer`, `Marker`, `Popup`, `useMap` -- all available in v4
- No code changes needed in `DirectoryMapView.tsx`

### Step 3: Test
- Open a published card (e.g., `/carl-tamayao`)
- Tap the Tools orb, then Branches, then the Map toggle
- Verify the map renders with markers instead of crashing

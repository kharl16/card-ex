# Scrollable Showcase and Direct Admin Photo Uploads

## Goal
Shorten the public card by placing all five immersive carousel sections inside one vertical scrolling area, while keeping the shared search above it. Make direct photo uploads unmistakable and reliable in the admin photo libraries.

## Changes
- Keep the shared search fixed above the carousel area so it searches all five sections at once.
- Wrap Brochure, Videos, Products, Packages, and Testimonies in a bounded vertical container with a visible scrollbar.
- Use a phone-friendly height and a larger desktop height, with normal page scrolling outside the container.
- Preserve horizontal swiping, infinite looping, captions, prices, buttons, and current item counts.
- Replace the plain admin file fields with a clear multi-photo upload area for Global Brochures, Products, Packages, and Testimonies.
- Keep link entry as an optional fallback, but make direct upload the primary action.
- Continue optimizing uploads into managed storage so uploaded carousel images use stable app-hosted URLs.

## Validation
- Check the public card in phone, landscape, and desktop sizes for nested scrolling and shared-search behavior.
- Confirm each admin library exposes direct multi-photo selection and retains its existing category-specific image processing.
- Run the project type check.

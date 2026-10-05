# Fix carousel overlap during phone rotation

## What will change
- Make the three-photo swipe track resize with the viewer immediately through percentage-based slide widths, avoiding the brief stale portrait width during rotation.
- Cancel any active swipe and reset the track to the current photo when orientation or viewer dimensions change.
- Keep Full Screen, 1:1 reset, arrows, captions, and swipe navigation unchanged.

## Verification
- Check the open viewer while switching portrait to landscape and back.
- Confirm only the current photo is visible after rotation and the next swipe still snaps one full viewer width.
- Confirm the project preview builds without errors.

## Technical details
- Use a 300%-wide track offset by one-third, with each slide occupying one-third of that track.
- Continue measuring the stage for swipe distance and drag constraints, but no longer use the delayed measured pixel width for visual slide layout.

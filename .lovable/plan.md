# Plan: Daily Quote on Public Cards

Add a rotating daily quotation to published cards, positioned just below the header (cover/profile area) and above the bio. Card owners control visibility per card via a toggle in the editor.

## Scope
- Public cards (`PublicCard.tsx`) and shared card view (`SharedCard.tsx`)
- New owner-controlled toggle in the Card Editor
- Reuses existing `daily_quotes` table and rotation logic from `MotivationalQuote`

## What gets built

### 1. Database
Add a single column to `cards`:
- `show_daily_quote BOOLEAN NOT NULL DEFAULT false`

Default `false` so existing cards stay visually unchanged until owner opts in.
Add `show_daily_quote` to the `cards_public` view so it surfaces to anonymous visitors.

### 2. Reusable component
Create `src/components/CardDailyQuote.tsx` — a card-tuned variant of the dashboard `MotivationalQuote`:
- Same rotation logic (day-of-year + time-of-day slot, pulled from `daily_quotes`)
- Styling tuned to the card's theme (uses `theme.primary` for accent line/icon, glassmorphism panel matching card aesthetic)
- Subtle "✦ Daily inspiration" micro-label so visitors don't attribute the quote to the card owner
- Compact padding (cards are denser than the dashboard)

### 3. Integration into CardView
In `src/components/CardView.tsx`, render `<CardDailyQuote />` immediately after the header block and before the bio section, gated on `card.show_daily_quote === true`.

Because `CardView` is the single source of truth, this automatically appears in:
- Editor live preview
- Public card (`/c/:slug`, `/:customSlug`)
- Shared card preview

### 4. Editor toggle
In `src/components/editor/sections/BasicInformationSection.tsx` (or the most relevant existing section — to confirm during implementation), add a single Switch:
- Label: "Show daily inspirational quote"
- Helper text: "A rotating quote from Card-Ex appears below your header"
- Wired through existing autosave; add `show_daily_quote` to the autosave column whitelist (per the autosave-whitelist memory)

### 5. Snapshot + types
- Add `show_daily_quote` to `cardSnapshot.ts` so duplications and snapshots carry it
- Supabase types regenerate automatically after migration

## Out of scope
- New quote sources (continues to use existing `daily_quotes` table managed via `/admin/daily-quotes`)
- Per-card custom quotes (owners can't pick specific quotes — keeps content moderation centralized)
- Animations beyond the existing subtle fade

## Technical details
- Migration must `DROP VIEW` and recreate `cards_public` to include the new column (same pattern used for `image_carousels` previously)
- Component reads from `daily_quotes` with the same query as `MotivationalQuote`; safe for anonymous users since that table already has public read RLS
- No new RLS policies needed

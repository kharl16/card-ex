

## Tiered Tools Orb Customization

**Goal**: Super admin controls the global default Tools Orb. Paid card holders can customize which items appear and their labels/order on their own card's orb. Free users see the global default only.

---

### Architecture

```text
┌─────────────────────────────┐
│  tools_orb_settings (existing) │  ← Admin-managed global defaults
└──────────────┬──────────────┘
               │ fallback
               ▼
┌─────────────────────────────┐
│  user_orb_overrides (new)   │  ← Per-user customizations (paid only)
│  user_id, items, orb_label, │
│  orb_image_url, updated_at  │
└─────────────────────────────┘
```

A paid card holder's orb merges their overrides on top of the global defaults. They can toggle items on/off, reorder, and rename labels — but cannot add entirely new tool sections (those are admin-only).

---

### Database Changes

**New table: `user_orb_overrides`**
- `id` uuid PK
- `user_id` uuid (unique, references auth.users ON DELETE CASCADE)
- `items` jsonb — array of `{ id, label, enabled, order, image_url? }` (only overrides per item)
- `orb_label` text nullable — custom orb label (null = use global)
- `orb_image_url` text nullable — custom orb image (null = use global)
- `created_at`, `updated_at` timestamps

**RLS policies:**
- Users can SELECT/INSERT/UPDATE/DELETE their own row (`user_id = auth.uid()`)
- Super admins can manage all rows

---

### Code Changes

1. **`src/hooks/useToolsOrb.ts`** — Add a `useUserOrbOverrides` hook (or extend existing) that:
   - Fetches global settings (existing)
   - Fetches `user_orb_overrides` for the current user
   - Merges them: user overrides win for `enabled`, `label`, `order`, `image_url`; global items not in overrides use global defaults
   - Exposes `mergedSettings` plus `userOverrides` and `saveUserOverrides()`

2. **`src/components/tools/ToolsOrb.tsx`** — Use merged settings instead of raw global settings. No structural change needed — just consumes the merged data.

3. **`src/components/tools/ToolsOrbCustomizer.tsx`** — Split into two modes:
   - **Admin mode** (existing): edits `tools_orb_settings` (global defaults, add/remove sections)
   - **User mode** (new): only shows toggle/reorder/rename for existing items; saves to `user_orb_overrides`. Gated behind `card.is_paid` check.

4. **Orb menu** — Show "Customize" button for paid users (non-admin) in the radial menu, opening the user-mode customizer.

5. **Access gate** — Check if the user has at least one paid card (`cards.is_paid = true`) before allowing customization. Free users see global defaults with no customize option.

---

### Technical Details

- The merge logic: start with global `items`, then for each item, apply matching user override fields. User `order` values re-sort the list. Items the user disabled are filtered out.
- If a user has no override row, they see pure global defaults (zero-cost path).
- Admin changes to global settings propagate immediately to users who haven't overridden those specific fields.
- The customizer dialog detects `isAdmin` vs `isPaidUser` to show the appropriate editing scope.


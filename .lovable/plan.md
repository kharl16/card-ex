# Multi-Company Support Plan

Today every library (Videos, Tools, Files, Presentations, Directory, Ambassadors, Daily Quotes, Products/Packages, Links) is shared by all users — effectively a single "IAM Worldwide" tenant. We'll introduce a **Company** layer so the super admin can spin up additional companies (e.g. Acme, Forever Living) and curate their own content, while each user is tied to one company and only sees that company's libraries.

---

## 1. Data model

New table:

- `companies` — `id`, `slug`, `name`, `logo_url`, `brand_color`, `is_active`, `is_default`, timestamps.
  - Seed row: `IAM Worldwide` (marked default).

Add `company_id uuid` (nullable → backfilled → set NOT NULL) to every company-scoped table:

- Videos: `training_items`, `training_folders`, `Videos`, `ambassadors_library`
- Tools/Links: `tools`, `iam_links`
- Files/Products: `IAM Files`, `files_repository`, `global_product_images`, `global_package_images`, `global_testimony_images`
- Other libraries: `presentations`, `directory_entries`, `daily_quotes`, `ways_13`
- Orb defaults: `tools_orb_settings` (one row per company)

Add `company_id` to `profiles` (user → company). Optional same column on `cards` mirrored from the owner profile for fast public-page lookups.

Backfill: set `company_id = <IAM id>` on every existing row in those tables and every existing profile/card.

## 2. Access rules

- Security-definer helper `current_user_company_id()` reads `profiles.company_id` for `auth.uid()`.
- Helper `is_super_admin(auth.uid())` already exists.
- Update RLS on every scoped table:
  - **Read**: `company_id = current_user_company_id() OR is_super_admin(auth.uid())`.
  - **Write**: super admin only (matches current admin-managed pattern).
- Public card pages keep working: `PublicCard` reads `cards.company_id` directly (no auth) and queries libraries filtered by that id via a SECURITY DEFINER RPC, so visitors still see the right brand's content.

## 3. Super-admin UI

New **Companies** page under Super Admin Console (`/superadmin/companies`):

- List companies (logo, name, slug, user count, active toggle).
- "Add company" dialog (name, slug, logo, brand color).
- Selecting a company sets an active-company context (persisted in localStorage).
- A **Company Switcher** chip appears at the top of every existing admin manager (Videos, Tools, Files, Presentations, Directory, Ambassadors, Daily Quotes, Products/Packages, Orb Settings). Inserts/updates from those managers automatically stamp the active `company_id`.

End-user UI is unchanged — their company is resolved from their profile.

## 4. User assignment

- `profiles.company_id` defaults to the IAM company on signup (via `handle_new_user`).
- Super admin can change a user's company from the existing Users admin page (add a Company dropdown column).
- Optional later: company-scoped signup links (`/signup?company=acme`) that pre-fill the company.

## 5. Rollout order

1. Migration: create `companies`, seed IAM row, add `company_id` columns, backfill, enable NOT NULL, add indexes.
2. Migration: helper function + new RLS policies on every scoped table (replacing the current "everyone reads" ones).
3. Update `handle_new_user` to assign IAM by default.
4. Frontend: shared `useActiveCompany` hook + Company Switcher chip.
5. Update every admin manager query/insert to use the active company id.
6. Update every public/end-user query (Videos page, Tools orb, Files, Presentations, etc.) to filter by `current_user_company_id()` (RLS handles this automatically once policies are in place — code mostly just stops assuming a single shared set).
7. Add `/superadmin/companies` page + user-admin company dropdown.

## 6. Out of scope (can come later)

- Per-company custom domains / theming on public cards.
- Cross-company content sharing.
- Self-service company onboarding (only super admin creates companies for now).

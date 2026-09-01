# Tools Vault privacy audit and hardening

## What I found (verified against the live code and database)

Partly correct today, with real anonymous-read holes at the database level.

Already correct:
- The public card page (`PublicCard.tsx`) renders no Tools Vault entry point. The floating pill on a public card is only the "Card-Ex" referral link, not the vault.
- The Tools Orb component already refuses to render for anyone who is not the card owner (`cardOwnerId` check), and every `/tools`, `/resources`, `/prospects` route sits behind `RequireAuth`.
- Per-user vault personalization (`user_orb_overrides`) is correctly locked to `user_id = auth.uid()` plus super admins.

Not correct today — the database still hands vault rows to anonymous visitors:
- `iam_links`, `directory_entries`, `ambassadors_library`, `training_items` each have a "Public can view active public..." policy with no `auth.uid()` check, and the `anon` role holds SELECT on all of them. An unauthenticated Supabase client can read those rows directly (fails TEST G).
- `tools_orb_settings` has a `USING (true)` read policy, so vault layout/labels leak to anon.
- `presentations`, `files_repository`, `tools`, `ways_13`, `resource_folders` are already authenticated-only, but `anon` still holds table-level SELECT grants that should be revoked as defence in depth.

One structural point to be aware of: Tools Vault content in Card-Ex is **shared library content owned by the company/super admin** (files, links, trainings, directory, presentations), not per-card private data. There is no `card_id`/`owner_id` on those tables. So "only the card owner may access" translates to: only signed-in Card-Ex members may read vault content, only the owning member may change their own vault personalization, and only admins may manage the shared library. The strict `auth.uid() = card.owner_id` rule applies fully to the per-card and per-user vault records (`user_orb_overrides`, card-scoped settings), which is where a card ID could otherwise be manipulated.

## What I will change

Database (single migration):
1. Drop every anon-facing "Public can view..." policy on `iam_links`, `directory_entries`, `ambassadors_library`, `training_items`.
2. Replace the `USING (true)` read policy on `tools_orb_settings` with an authenticated-only policy.
3. `REVOKE SELECT ... FROM anon` on all Tools Vault tables so no vault row is reachable without a session, even if a policy is later added by mistake.
4. Keep every existing authenticated-member and admin policy exactly as-is, so member reads and admin CRUD keep working.
5. Add an explicit owner-or-admin policy set on card-scoped vault records so a manipulated card ID can never return another member's rows.

Frontend (small, non-visual):
6. Add a dedicated authorization screen for direct vault URLs: signed-out users see "Tools Vault is Private" with a Sign In button; signed-in non-owners see "Access Denied — This Tools Vault belongs to another Card-Ex member." Neither state redirects to onboarding.
7. Leave the public card UI untouched — it already exposes no vault path.

Verification:
8. Run the anon and cross-account query tests (TEST G and TEST H) directly against Supabase and confirm zero rows, then confirm owner and admin reads still return data (TEST D, TEST F).

## Not touched

Public card sharing and URLs, QR/NFC, vCard save, card design, carousels, referrals, Google OAuth and email auth, admin tooling, and all existing vault CRUD for authorized owners and admins.

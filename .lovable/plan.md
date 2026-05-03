# Self-Service Card Onboarding & Automation

Goal: After signup + email verification, the user lands on an onboarding wizard that collects only the 5 fields you currently ask for, auto-creates their card, then routes them through payment. Eventually, payment confirmation and referral payouts run hands-free.

## Phase 1 — Onboarding Wizard (this iteration)

### New route: `/onboarding`
A 1–2 step wizard shown on the user's first authenticated visit after email verification.

**Fields collected:**
1. Full Name → split into `first_name` + `last_name` (auto-assembled into `cards.full_name` via existing `sync_full_name` trigger)
2. Mobile number → `cards.phone`
3. Email address → prefilled from `auth.user.email`, editable → `cards.email`
4. Facebook link → stored as a `card_links` row (`kind='url'`, `label='Facebook'`)
5. IAM ID number (8 digits) → stored two ways:
   - `profiles.iam_id` (new column) for canonical reference
   - Appended to the last item's URL in `cards.product_images` carousel (matches your current manual workflow)

### Routing logic
- Add `RequireOnboarding` wrapper around `/dashboard` and other authenticated app routes.
- Redirects to `/onboarding` if: user is verified, has no card yet (or has a card with no `phone`/`first_name`).
- Once onboarding is submitted → redirects to `/billing` (existing PlanSelector flow) so they can pay.

### What the wizard does on submit
1. Calls existing card-creation logic (similar to `AdminCreateCardDialog` but for self-serve):
   - Inserts a row in `cards` with the user as owner, status `is_published=false`, `is_paid=false`.
   - Generates a slug from the name.
2. Inserts the Facebook link into `card_links`.
3. Seeds `product_images` carousel with placeholder items, last item URL containing the IAM ID.
4. Updates `profiles` with `iam_id` and `phone`.
5. Navigates to `/billing?card=<id>`.

### DB migration needed
- `ALTER TABLE profiles ADD COLUMN iam_id text;` (with simple length/format check via trigger — 8 digits).
- Add `iam_id` validation in `validate_card_data` if you want it on cards too (optional).

## Phase 2 — Automated Payment (next iteration, not in this build)

You already have `process_card_payment` RPC, `payments` table, and `card_plans`. Today payment requires admin verification (evidence_url upload). To go fully automated:

- **PayMongo webhook** (PH GCash/Maya/Card) → new edge function `paymongo-webhook` that calls `process_card_payment` with `status='paid'` automatically when PayMongo confirms.
- **Stripe webhook** for international cards (already partially scaffolded).
- After webhook fires, `cards.is_paid=true` triggers `ensure_referral_on_card_paid_published` → card goes live + referral attribution locks in.
- Add a "Pay Now" button on `/billing` that opens PayMongo checkout link (already in `usePayments`).

## Phase 3 — Automated Referral Payouts (later)

You already track:
- `referrals` table (status: pending → qualified → paid_out)
- `notify_referrer_on_status_change` trigger sends in-app notification

To automate disbursement:
- Add `referrer_payout_method` to profiles (GCash number / bank account).
- New edge function `process-referral-payouts` (scheduled nightly via pg_cron):
  - Finds `referrals` with `status='qualified'` and age ≥ X days (cool-down).
  - Calls PayMongo Disbursements API (or Xendit) to send commission.
  - Updates `status='paid_out'` → existing trigger notifies referrer.
- Admin dashboard already exists at `AdminReferrals.tsx` for manual override.

## Scope of THIS plan (what gets built now)

Phase 1 only. Concretely:

1. **DB migration** — add `profiles.iam_id` column.
2. **New page** `src/pages/Onboarding.tsx` — single-form wizard (no multi-step needed for 5 fields).
3. **New guard** `src/components/auth/RequireOnboarding.tsx` — checks if user has a usable card; if not redirects to `/onboarding`. Wrap `/dashboard` route in `App.tsx`.
4. **Route registration** in `App.tsx`: `/onboarding` (auth-required, no onboarding guard).
5. **Submit handler** uses Supabase client to insert card + link + profile update, then `navigate('/billing')`.

Phases 2 & 3 are documented above so you can approve them as separate builds when you're ready to wire up PayMongo webhooks and disbursement automation.

## Technical notes

- Use existing `useAuth()` for the user; `cards` insert respects the `check_card_limit` trigger (1 card max for non-admins, which matches the goal).
- Slug generation: reuse logic in `AdminCreateCardDialog` (slugify full name + short hash).
- IAM ID validation: client-side `z.string().regex(/^\d{8}$/)`.
- Facebook link validation: must start with `https://` and contain `facebook.com` or `fb.com`.
- After onboarding the user lands on `/billing` where they pick a plan and pay. Until paid, the card exists as a draft (already supported by `is_paid=false`).

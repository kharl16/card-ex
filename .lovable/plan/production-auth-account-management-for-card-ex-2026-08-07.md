# Production Auth & Account Management for Card-Ex

Builds on what already exists (Supabase Auth, `profiles`, `user_roles`, admin edge functions, referral + payment flows). Nothing existing is removed.

## 1. Database

New enums and columns, added additively:

- `account_status`: `active`, `inactive`, `suspended`, `pending_verification`
- `app_role` gains `moderator` (existing `owner`, `admin`, `member` kept; `admin` = Super Admin today, so a new `super_admin` value is added and `kharl16@gmail.com` is granted it permanently)
- `profiles` gains: `card_ex_id` (auto short ID), `status`, `email_verified`, `phone_number`, `phone_verified`, `phone_verification_date`, `created_by`, `signup_method`, `last_login_at`, `must_change_password`, `subscription_status`
- New table `auth_logs`: `user_id`, `ip_address`, `browser`, `operating_system`, `country`, `signup_time`, `login_time`, `auth_provider`
- Helper functions: `is_permanent_super_admin()` (email-pinned), `has_min_role()`, `can_publish()` (blocks inactive/suspended)
- RLS: members read/write only their own rows; admins read permitted rows; super admin unrestricted. `auth_logs` readable by admins only, written by edge functions.

Existing card publishing RLS gains an account-status check so suspended/inactive users cannot publish.

## 2. Auth methods

- **Google OAuth (primary CTA)** on Login and Signup — large button above an OR divider. On callback, profile is upserted with full name, avatar, provider ID, `signup_method='google'`, `email_verified=true`, `last_login_at`.
- **Email + password (secondary)** — Full Name, Email, Password, with Cloudflare Turnstile. Signup blocked until the CAPTCHA token verifies. Email verification still required before access (already enforced by `RequireAuth`).

## 3. Anti-spam

- Turnstile widget on signup + a `verify-signup` edge function that validates the token server-side, rejects disposable domains (maintained blocklist), and rejects duplicates with a clear message.
- Signup/login IP, user agent → browser/OS, country, and timestamp written to `auth_logs` by edge function.
- Supabase email rate limits configured.

## 4. Admin

New `/admin/users` page (Super Admin only):

- Table: Avatar, Full Name, Email, Role, Status, Provider, Email Verified, Phone Verified, Created, Last Login — with search and filters.
- Row actions: View, Edit, Suspend, Activate, Reset Password, Login As User, Delete.
- **Create User** dialog: First Name, Last Name, Email, Mobile, Sponsor/Referral Code, Role, Temporary Password, with "Create Account" and "Send Invitation Email". Duplicate email shows: "This email address already has a Card-Ex account." First login forces a password change.

All privileged operations run in edge functions using the service role (extending the existing `admin-*` functions plus new `admin-set-status`, `admin-reset-password`, `admin-impersonate`). No service key ever reaches the browser.

## 5. Password flows

Forgot Password (existing `/reset-password`), Admin-triggered reset, and Force Password Change on first login via a gate that redirects to a change-password screen while `must_change_password` is true.

## 6. UI

Login and Signup restyled to the current dark luxury Card-Ex theme: prominent Google button, OR divider, email form, Sign Up / Forgot Password links, responsive on mobile and desktop, 44px+ touch targets.

## What is needed from you

Cloudflare Turnstile keys (site key + secret) from dash.cloudflare.com → Turnstile. I will request the secret securely when I reach that step; signup keeps working without CAPTCHA until then.

## Order of work

1. Migration (schema, enums, RLS, helpers)
2. Edge functions (turnstile verify, auth logging, admin ops)
3. Auth/Signup UI + Google provider wiring + password-change gate
4. Admin Users page

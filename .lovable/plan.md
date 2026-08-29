# Zero-Email Admin Card Creation (Unlimited per Hour)

Goal: let the Super Admin create as many card accounts per hour as needed, without touching Supabase's built-in email rate limit, while keeping every created account traceable and genuine.

## The core idea

Supabase's "2 emails/hour" cap only applies to mail sent by its built-in mailer (signup confirmation, invite, magic link, recovery). Admin creation does not need any of those. So the recommended setup is **credential handoff, not email handoff**:

1. Admin creates the account server-side with the service role, already email-confirmed.
2. No invite/magic-link/recovery mail is triggered at all.
3. The admin receives a copyable "Login Info" block (email + temporary password + login URL) to hand to the card holder personally — the same way cards are already shared today.
4. The account is flagged so the user must change the password on first login.

That path has no per-hour ceiling.

## Changes to make

### 1. Default the Create User dialog to no-email
- In the admin Users screen, flip "Send invitation email" to OFF by default and relabel it "Send invitation email (uses email quota — not needed)".
- Always require a temporary password when the switch is off, and auto-generate a strong one with a "Generate" button so the admin never has to invent one.
- On success, show a copy-ready block: full name, email, temporary password, login URL — with a Copy button (using the existing clipboard fallback so it works on mobile).

### 2. Make the create path explicitly email-free
- In the account-creation function, keep `email_confirm: true` (account is usable immediately, no confirmation mail) and only produce an invitation link when the admin explicitly asked for one.
- When an invitation link is requested, return the link for copying rather than relying on Supabase to deliver it — so even that path costs zero email quota.
- Same treatment for the admin "Reset password" action: default to setting a temporary password directly instead of generating a recovery mail.

### 3. Bulk creation for volume
- Add a "Bulk create" mode to the admin Users screen: paste or upload a CSV of first name, last name, email, mobile, sponsor code, role.
- The server creates each account sequentially, skips duplicates instead of failing the batch, and returns a results table (created / skipped / failed with reason).
- The whole batch is exportable as a CSV of credentials for handoff.

### 4. Keeping accounts authentic (no bogus accounts)
These stay or get added on the admin path:
- Disposable/temporary email domains rejected (already enforced) — keep and surface the reason clearly in bulk results.
- Duplicate email rejected with the existing clear message.
- Basic email format and MX-shape validation before creation, so typo addresses do not become permanent accounts.
- Every creation continues to be written to the super-admin audit log with the actor, target, role and sponsor code; bulk creation logs one row per account.
- Each profile keeps `signup_method = 'admin'`, `created_by = <admin id>`, and `must_change_password = true`, so admin-made accounts are distinguishable from self-signups and cannot linger on a shared password.
- Optional additional guard: mark admin-created accounts as unverified-contact until the holder completes first login and password change, and show that state in the Users table.

Public self-signup is untouched — it keeps Turnstile, email verification, and disposable-domain blocking, so the email quota is only ever spent on real strangers signing themselves up.

## Technical notes

- Files involved: `src/pages/admin/AdminUsers.tsx` (dialog defaults, password generator, credential copy block, bulk mode), `supabase/functions/admin-create-user/index.ts` (no-email default, validation, batch support), `supabase/functions/admin-user-actions/index.ts` (reset password defaults to temporary password).
- No schema change is required; `profiles.must_change_password`, `signup_method`, `created_by` and `superadmin_audit_log` already exist.
- Rate limiting on the admin function itself stays service-role gated to the Super Admin, so no new public surface is added.

# Fix resent email confirmation and destination flow

## Goal
Make every resent confirmation email open the secure Tagex browser flow, accept its matching fresh 6-digit code, and continue users to the correct next screen.

## Changes
- Generate one authoritative Supabase confirmation challenge per resend and return its exact verification type to the confirmation page.
- Replace the raw Supabase action URL in resend emails with a `tagex.app` confirmation URL carrying the hashed token, so clicking the button always opens the browser without exposing the project ID.
- Update the callback page to verify hashed confirmation tokens directly, while keeping existing PKCE, OAuth, and legacy link handling intact.
- Verify a typed 6-digit code only once with the exact challenge type issued by the resend request; remove fallback attempts that can consume or invalidate a fresh code.
- Preserve the email and challenge type across reloads/new tabs, clear stale code state after every resend, and keep the current failed-attempt lockout.
- After successful link or code verification, resolve the account destination: new users without a card go to profile/card setup; existing users continue through the dashboard to their applicable card experience.
- Deploy the updated resend function and validate both the email-button path and fresh-code path.

## Technical details
- Use Supabase `hashed_token` plus `verification_type` for branded browser links.
- Use the returned `email_otp` with the same `verification_type` for manual code verification.
- Keep `token_hash` handling compatible with PKCE and the existing 24-hour confirmation expiry.

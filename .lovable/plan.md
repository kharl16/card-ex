# Verify Custom SMTP (Resend) After Supabase Configuration

No stored SMTP credentials exist in the project — auth email is sent via Resend API through `auth-email-hook`. The user will configure Supabase Custom SMTP manually using Resend's SMTP values (host `smtp.resend.com`, port 465/587, username `resend`, password = their Resend API key, sender `noreply@tagex.app`).

This plan covers what happens AFTER the user finishes that manual step — validating the new email path works end-to-end at higher volume.

## Steps

1. **Confirm SMTP is active**: check Supabase project auth settings show Custom SMTP enabled (user confirms or via dashboard).
2. **Test signup email delivery**: run a test signup through the public Signup page (with Turnstile) and confirm the verification email arrives, sent via Resend SMTP instead of Supabase's built-in sender.
3. **Test rate-limit removal**: trigger several auth emails in succession (signups/resends) and confirm none are blocked by the old hourly cap.
4. **Verify no regressions**: existing flows that send email still work — signup verification, password reset (`/reset-password`), device-auth OTP (edge function, unchanged), admin manual verification fallback.
5. **Note**: admin-created accounts already bypass email entirely (`email_confirm: true`), so nothing changes there.

## Technical details

- Files: no code changes expected. Validation only; touch `auth-signup-check` / `auth-email-hook` only if a test fails.
- Secrets: no new secrets needed; SMTP password is entered by the user directly into the Supabase dashboard (not the app secret store).
- Rollback: disabling Custom SMTP in Supabase restores the previous behavior instantly.

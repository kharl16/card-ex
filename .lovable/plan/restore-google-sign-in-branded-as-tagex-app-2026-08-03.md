# Restore Google Sign-In branded as tagex.app

## Current state

The app code for Google sign-in is already complete and still wired up:

- `src/pages/Auth.tsx` and `src/pages/Signup.tsx` both render a Google button that calls `supabase.auth.signInWithOAuth({ provider: "google" })`.
- `src/lib/authUrl.ts` already forces the redirect back to `https://tagex.app/auth/callback` when the user is on the tagex.app domain.
- `src/pages/AuthCallback.tsx` handles the PKCE code exchange and hash-token flows.

So nothing is missing in code. What is missing is the provider configuration on the Supabase side, and the OAuth handshake currently goes through `lorowpouhpjjxembvwyi.supabase.co` — that project-ref URL is what shows on the Google consent screen and in the Google Cloud redirect URI.

## What "no project ID" requires

The consent-screen domain and the callback URI are owned by Supabase Auth, not by the app. The only supported way to replace `<project-ref>.supabase.co` with your own domain is Supabase's **Custom Domain / vanity subdomain add-on** (paid, per project). Once enabled with e.g. `auth.tagex.app`, the callback becomes `https://auth.tagex.app/auth/v1/callback` and users never see the project ref.

There is no code-only workaround: proxying `/auth/v1/*` through tagex.app is not a Supabase-supported configuration and breaks token issuance and cookie/PKCE handling.

## Steps

1. **Supabase Dashboard → Settings → General → Custom Domains**: activate the custom domain add-on and register `auth.tagex.app`. Supabase will give a CNAME and a TXT record.
2. **DNS (wherever tagex.app is managed)**: add those records, then click Verify and Activate in Supabase.
3. **Google Cloud Console → APIs & Services → Credentials**, on the existing OAuth 2.0 Web client:
   - Authorized JavaScript origins: `https://tagex.app`, `https://www.tagex.app`
   - Authorized redirect URIs: `https://auth.tagex.app/auth/v1/callback`
   - OAuth consent screen → Authorized domains: `tagex.app`
   - Scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`
4. **Supabase Dashboard → Authentication → Providers → Google**: enable it and paste the Client ID and Client Secret.
5. **Supabase Dashboard → Authentication → URL Configuration**:
   - Site URL: `https://tagex.app`
   - Redirect URLs: `https://tagex.app/auth/callback`, `https://www.tagex.app/auth/callback`, and the Lovable preview callback so testing keeps working.
6. **Verify**: sign in with Google from `https://tagex.app/auth` and confirm the consent screen shows `tagex.app` and you land on `/dashboard`.

## Code changes in this plan

None required. If step 1 cannot be done (add-on not purchased), the alternative is to keep the existing `.supabase.co` callback — Google sign-in works either way, only the branding differs.

## If you want, I can additionally

- Swap the generic `Chrome` icon for a proper multicolour Google "G" mark on both auth pages.
- Add a `VITE_APP_URL` fallback note so preview builds keep redirecting correctly.

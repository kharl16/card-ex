import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/adminAuth.ts";
import { isDisposableEmail } from "../_shared/disposableDomains.ts";

/**
 * Pre-signup gate: validates Cloudflare Turnstile, rejects disposable email
 * domains and duplicate registrations. Public endpoint (no JWT).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const captchaToken = typeof body?.captchaToken === "string" ? body.captchaToken : "";

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email) || email.length > 255) {
      return json({ ok: false, code: "invalid_email", error: "Please enter a valid email address." }, 400);
    }

    if (isDisposableEmail(email)) {
      return json({
        ok: false,
        code: "disposable_email",
        error: "Temporary or disposable email addresses are not allowed. Please use a permanent email address.",
      }, 400);
    }

    // Cloudflare Turnstile
    const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (secret) {
      if (!captchaToken) {
        return json({ ok: false, code: "captcha_required", error: "Please complete the security check." }, 400);
      }
      const form = new FormData();
      form.append("secret", secret);
      form.append("response", captchaToken);
      const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      if (ip) form.append("remoteip", ip);

      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: form,
      });
      const verify = await verifyRes.json();
      if (!verify?.success) {
        console.warn("Turnstile failed", verify?.["error-codes"]);
        return json({
          ok: false,
          code: "captcha_failed",
          error: "Security check failed. Please try again.",
        }, 400);
      }
    }

    // Duplicate email check via service role
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = existing?.users?.some((u) => (u.email ?? "").toLowerCase() === email);
    if (found) {
      return json({
        ok: false,
        code: "email_exists",
        error: "This email address already has a Card-Ex account.",
      }, 409);
    }

    return json({ ok: true });
  } catch (error) {
    console.error("auth-signup-check error:", error);
    return json({ ok: false, error: "Internal server error" }, 500);
  }
});

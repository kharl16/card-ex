import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/adminAuth.ts";
import { isDisposableEmail } from "../_shared/disposableDomains.ts";

/**
 * Pre-signup gate: validates Cloudflare Turnstile, rejects disposable email
 * domains and duplicate registrations, and applies burst-based abuse
 * detection. Public endpoint (no JWT).
 *
 * There is deliberately NO flat "N accounts per hour" cap. Legitimate users
 * are never blocked by volume alone — only clearly automated patterns
 * (rapid bursts, repeated captcha failures, repeated disposable attempts)
 * are throttled.
 */

// Burst thresholds — tuned so a human (or a household/office behind one NAT
// IP) can never realistically trip them, while scripted abuse does.
const RULES = {
  IP_BURST_WINDOW_MIN: 10,
  IP_BURST_MAX: 12, // successful gate passes from one IP in 10 minutes
  IP_FAILED_CAPTCHA_WINDOW_MIN: 15,
  IP_FAILED_CAPTCHA_MAX: 6,
  IP_DISPOSABLE_WINDOW_MIN: 60,
  IP_DISPOSABLE_MAX: 5,
  EMAIL_RETRY_WINDOW_MIN: 5,
  EMAIL_RETRY_MAX: 10,
};

async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function minutesAgo(min: number) {
  return new Date(Date.now() - min * 60_000).toISOString();
}

async function countAttempts(
  admin: SupabaseClient,
  filter: { ip_hash?: string; email_hash?: string },
  outcomes: string[],
  windowMinutes: number,
): Promise<number> {
  let q = admin
    .from("signup_attempts")
    .select("id", { count: "exact", head: true })
    .in("outcome", outcomes)
    .gte("created_at", minutesAgo(windowMinutes));
  if (filter.ip_hash) q = q.eq("ip_hash", filter.ip_hash);
  if (filter.email_hash) q = q.eq("email_hash", filter.email_hash);
  const { count } = await q;
  return count ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let ipHash: string | null = null;
  let emailHash: string | null = null;
  let emailDomain: string | null = null;

  const record = async (outcome: string) => {
    try {
      await admin.from("signup_attempts").insert({
        ip_hash: ipHash,
        email_hash: emailHash,
        email_domain: emailDomain,
        outcome,
      });
    } catch (e) {
      console.warn("signup_attempts insert failed", e);
    }
  };

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const captchaToken = typeof body?.captchaToken === "string" ? body.captchaToken : "";

    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    if (ip) ipHash = await sha256(ip);

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email) || email.length > 255) {
      await record("invalid_email");
      return json({ ok: false, code: "invalid_email", error: "Please enter a valid email address." }, 400);
    }

    emailHash = await sha256(email);
    emailDomain = email.split("@")[1] ?? null;

    // --- Abuse gate (checked before any expensive work) ---
    if (ipHash) {
      const failedCaptcha = await countAttempts(
        admin,
        { ip_hash: ipHash },
        ["captcha_failed", "captcha_required"],
        RULES.IP_FAILED_CAPTCHA_WINDOW_MIN,
      );
      if (failedCaptcha >= RULES.IP_FAILED_CAPTCHA_MAX) {
        await record("blocked_captcha_abuse");
        return json({
          ok: false,
          code: "temporarily_blocked",
          error: "Too many failed security checks. Please wait a few minutes and try again.",
        }, 429);
      }

      const disposableTries = await countAttempts(
        admin,
        { ip_hash: ipHash },
        ["disposable_email"],
        RULES.IP_DISPOSABLE_WINDOW_MIN,
      );
      if (disposableTries >= RULES.IP_DISPOSABLE_MAX) {
        await record("blocked_disposable_abuse");
        return json({
          ok: false,
          code: "temporarily_blocked",
          error: "Repeated use of temporary email addresses was detected. Please use a permanent email address.",
        }, 429);
      }

      const burst = await countAttempts(admin, { ip_hash: ipHash }, ["allowed"], RULES.IP_BURST_WINDOW_MIN);
      if (burst >= RULES.IP_BURST_MAX) {
        await record("blocked_burst");
        return json({
          ok: false,
          code: "temporarily_blocked",
          error: "Unusual signup activity detected from your network. Please try again shortly.",
        }, 429);
      }
    }

    const emailRetries = await countAttempts(
      admin,
      { email_hash: emailHash },
      ["allowed", "captcha_failed", "email_exists"],
      RULES.EMAIL_RETRY_WINDOW_MIN,
    );
    if (emailRetries >= RULES.EMAIL_RETRY_MAX) {
      await record("blocked_email_retry");
      return json({
        ok: false,
        code: "temporarily_blocked",
        error: "Too many attempts for this email address. Please wait a few minutes and try again.",
      }, 429);
    }

    // --- Disposable domains ---
    if (isDisposableEmail(email)) {
      await record("disposable_email");
      return json({
        ok: false,
        code: "disposable_email",
        error: "Temporary or disposable email addresses are not allowed. Please use a permanent email address.",
      }, 400);
    }

    // --- Cloudflare Turnstile (server-side verification) ---
    const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (secret) {
      if (!captchaToken) {
        await record("captcha_required");
        return json({ ok: false, code: "captcha_required", error: "Please complete the security check." }, 400);
      }
      const form = new FormData();
      form.append("secret", secret);
      form.append("response", captchaToken);
      if (ip) form.append("remoteip", ip);

      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: form,
      });
      const verify = await verifyRes.json();
      if (!verify?.success) {
        console.warn("Turnstile failed", verify?.["error-codes"]);
        await record("captcha_failed");
        return json({
          ok: false,
          code: "captcha_failed",
          error: "Security check failed. Please try again.",
        }, 400);
      }
    }

    // --- Duplicate email check via service role ---
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = existing?.users?.some((u) => (u.email ?? "").toLowerCase() === email);
    if (found) {
      await record("email_exists");
      return json({
        ok: false,
        code: "email_exists",
        error: "This email address already has a Card-Ex account.",
      }, 409);
    }

    await record("allowed");

    // Opportunistic housekeeping (~2% of requests).
    if (Math.random() < 0.02) {
      await admin.rpc("cleanup_old_signup_attempts").catch(() => {});
    }

    return json({ ok: true });
  } catch (error) {
    console.error("auth-signup-check error:", error);
    return json({ ok: false, error: "Internal server error" }, 500);
  }
});

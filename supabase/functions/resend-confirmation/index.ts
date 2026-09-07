// Resends the "Confirm your email" link reliably.
// Uses the service role to generate a fresh signup link and delivers it via
// Resend (custom domain), bypassing GoTrue's built-in mailer rate limits.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = (Deno.env.get("RESEND_API_KEY") ?? "").trim();
const FROM_ADDRESS = "Card-Ex <noreply@tagex.app>";
const RAW_FROM = (Deno.env.get("RESEND_FROM_EMAIL") ?? "").trim().replace(/^["']|["']$/g, "");
const VALID_FROM = /^(?:[^<>]+<[^@<>\s]+@[^@<>\s]+\.[^@<>\s]+>|[^@<>\s]+@[^@<>\s]+\.[^@<>\s]+)$/;
const RESEND_FROM = VALID_FROM.test(RAW_FROM) ? RAW_FROM : FROM_ADDRESS;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, redirect_to } = await req.json().catch(() => ({}));
    if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: "Please enter a valid email address." }, 400);
    }
    const redirectTo = typeof redirect_to === "string" && redirect_to.startsWith("http")
      ? redirect_to
      : "https://tagex.app/auth/callback";

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Generate a fresh confirmation link (works even if older links expired).
    const { data, error } = await sb.auth.admin.generateLink({
      type: "signup",
      email,
      password: crypto.randomUUID(), // ignored for existing users
      options: { redirectTo },
    });

    let actionLink = data?.properties?.action_link as string | undefined;

    if (error || !actionLink) {
      const msg = (error?.message ?? "").toLowerCase();
      if (msg.includes("already been registered") || msg.includes("already registered")) {
        // Existing unconfirmed users: magiclink still confirms the address.
        const retry = await sb.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo },
        });
        actionLink = retry.data?.properties?.action_link as string | undefined;
        if (!actionLink) {
          return json({ error: "This email is already confirmed. Please sign in instead." }, 200);
        }
      } else {
        console.error("generateLink failed:", error?.message);
        return json({ error: "We couldn't create a new confirmation link. Please try again." }, 500);
      }
    }

    if (!RESEND_API_KEY) {
      return json({ error: "Email service is not configured." }, 500);
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0a0a0a;color:#f5f5f5;border-radius:12px;">
        <h2 style="color:#D4AF37;margin-top:0;">Confirm your email</h2>
        <p>Tap the button below to confirm your Card-Ex account. This link opens in a new tab so you can switch back easily.</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${actionLink}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block;padding:14px 28px;background:#D4AF37;color:#0a0a0a;font-weight:bold;border-radius:8px;text-decoration:none;">
            Confirm your email
          </a>
        </p>
        <p style="color:#888;font-size:13px;">If the button doesn't work, request a new confirmation email from the sign-in page.</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject: "Confirm your Card-Ex email",
        html,
        text: "Confirm your Card-Ex email by opening this message in a mail app and tapping the confirm button.",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Resend send failed [${res.status}]: ${body}`);
      return json({ error: "We couldn't send the email right now. Please try again shortly." }, 502);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("resend-confirmation error:", (e as Error).message);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});

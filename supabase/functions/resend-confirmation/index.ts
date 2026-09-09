// Resends the "Confirm your email" link reliably.
// Uses the service role to generate a fresh signup link and delivers it via
// Resend (custom domain), bypassing GoTrue's built-in mailer rate limits.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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
    const { email } = await req.json().catch(() => ({}));
    if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: "Please enter a valid email address." }, 400);
    }
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // The signup already created the account. A magic-link challenge safely
    // confirms an existing unverified address without changing its password.
    const { data, error } = await sb.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: "https://tagex.app/auth/callback" },
    });

    const emailOtp = data?.properties?.email_otp;
    const hashedToken = data?.properties?.hashed_token;
    const verificationType = data?.properties?.verification_type;
    if (error || !emailOtp || !hashedToken || verificationType !== "magiclink") {
      console.error("generateLink failed:", error?.message ?? "missing challenge properties");
      return json({ error: "We couldn't create a new confirmation link. Please try again." }, 500);
    }

    // Keep the Supabase project URL out of the message and verify the hash in
    // our browser callback. This works across browsers and devices without PKCE.
    const confirmUrl = new URL("https://tagex.app/auth/callback");
    confirmUrl.searchParams.set("token_hash", hashedToken);
    confirmUrl.searchParams.set("type", verificationType);
    confirmUrl.searchParams.set("email", email);

    if (!RESEND_API_KEY) {
      return json({ error: "Email service is not configured." }, 500);
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0a0a0a;color:#f5f5f5;border-radius:12px;">
        <h2 style="color:#D4AF37;margin-top:0;">Confirm your email</h2>
        <p>Tap the button below to confirm your Card-Ex account. This link opens in a new tab so you can switch back easily.</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${confirmUrl.toString()}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block;padding:14px 28px;background:#D4AF37;color:#0a0a0a;font-weight:bold;border-radius:8px;text-decoration:none;">
            Confirm your email
          </a>
        </p>
        ${emailOtp ? `
        <p style="text-align:center;color:#ccc;margin:0 0 8px;">Or enter this 6-digit code on the confirmation page:</p>
        <div style="font-size:34px;font-weight:bold;letter-spacing:8px;color:#D4AF37;text-align:center;padding:14px;background:#1a1a1a;border-radius:8px;margin:0 0 16px;">
          ${emailOtp}
        </div>` : ""}
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
        text: emailOtp
          ? `Confirm your Card-Ex email. Your 6-digit confirmation code is ${emailOtp}. Enter it on the confirmation page, or tap the confirm button in this email.`
          : "Confirm your Card-Ex email by opening this message in a mail app and tapping the confirm button.",
      }),
    });


    if (!res.ok) {
      const body = await res.text();
      console.error(`Resend send failed [${res.status}]: ${body}`);
      return json({ error: "We couldn't send the email right now. Please try again shortly." }, 502);
    }

    return json({ ok: true, otp_type: verificationType });
  } catch (e) {
    console.error("resend-confirmation error:", (e as Error).message);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});

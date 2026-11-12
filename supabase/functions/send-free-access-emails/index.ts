// Sends the free-week emails: a reminder 2 days before a cardholder's free access ends,
// and a notice when it has ended. Each email goes out once per person (reserved in the
// database before sending), so repeated or overlapping runs never send duplicates.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const APP_URL = "https://tagex.app";
const DEFAULT_FROM = "Card-Ex <noreply@tagex.app>";
const RESEND_API_KEY = (Deno.env.get("RESEND_API_KEY") ?? "").trim();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function resolveFrom(): string {
  const raw = (Deno.env.get("RESEND_FROM_EMAIL") ?? "").replace(/\s+/g, " ").replace(/^["'`]|["'`]$/g, "").trim();
  const angle = raw.match(/^(.*)<([^>\s]+@[^>\s]+\.[^>\s]+)>$/);
  if (angle) return `${angle[1].trim() || "Card-Ex"} <${angle[2]}>`;
  if (/^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/.test(raw)) return `Card-Ex <${raw}>`;
  return DEFAULT_FROM;
}
const FROM = resolveFrom();

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const manilaDate = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", {
    timeZone: "Asia/Manila", weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
  });

type Kind = "reminder" | "ended";

function buildEmail(kind: Kind, name: string, endsAt: string, activateUrl: string) {
  const first = escapeHtml(name.split(/\s+/)[0] || "there");
  const when = escapeHtml(manilaDate(endsAt));
  const subject = kind === "reminder"
    ? "2 days left in your Card-Ex free access"
    : "Your Card-Ex free access has ended";
  const heading = kind === "reminder" ? "Your free week ends in 2 days" : "Your free week has ended";
  const body = kind === "reminder"
    ? `<p>Hi ${first},</p>
       <p>Your 7-day free access to Card-Ex ends on <strong style="color:#f3e2b3;">${when}</strong>.</p>
       <p>Activate your plan now to keep your card online and keep using your editor, presentations, AI assistant and tools without interruption.</p>`
    : `<p>Hi ${first},</p>
       <p>Your 7-day free access to Card-Ex ended on <strong style="color:#f3e2b3;">${when}</strong>.</p>
       <p>Your card is paused and your account is locked for now. Don't worry, all your details are saved. Activate your plan and everything comes back right away.</p>`;
  const button = kind === "reminder" ? "Activate My Plan" : "Activate My Plan Now";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#010309;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#010309;padding:32px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0b0d14;border:1px solid rgba(212,175,55,0.35);border-radius:16px;overflow:hidden;">
<tr><td style="padding:28px 28px 8px;text-align:center;">
<div style="font-size:13px;letter-spacing:3px;color:#d4af37;text-transform:uppercase;">Card-Ex by Tagex.app</div>
<h1 style="margin:14px 0 0;font-size:26px;line-height:1.3;color:#f3e2b3;font-weight:700;">${heading}</h1>
</td></tr>
<tr><td style="padding:16px 28px 8px;color:#d6d6dc;font-size:18px;line-height:1.6;">${body}</td></tr>
<tr><td align="center" style="padding:16px 28px 28px;">
<a href="${activateUrl}" style="display:inline-block;background:linear-gradient(135deg,#f3e2b3 0%,#d4af37 55%,#b8902a 100%);color:#010309;text-decoration:none;font-weight:700;font-size:18px;padding:16px 36px;border-radius:999px;">${button}</a>
<p style="margin:18px 0 0;font-size:14px;color:#8a8a94;">Or open this link: <a href="${activateUrl}" style="color:#d4af37;">${activateUrl}</a></p>
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid rgba(212,175,55,0.2);text-align:center;color:#6b6b75;font-size:12px;">
You're receiving this because you created a Card-Ex card. &copy; ${new Date().getFullYear()} Card-Ex.
</td></tr></table></td></tr></table></body></html>`;

  const text = `${heading}\n\nHi ${name.split(/\s+/)[0] || "there"},\n` +
    (kind === "reminder"
      ? `Your 7-day free access to Card-Ex ends on ${manilaDate(endsAt)}. Activate your plan to keep your card online.`
      : `Your 7-day free access to Card-Ex ended on ${manilaDate(endsAt)}. Your card is paused and your details are saved. Activate your plan to restore everything.`) +
    `\n\nActivate your plan: ${activateUrl}\n`;
  return { subject, html, text };
}

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (!RESEND_API_KEY) return json({ error: "Email sending is not configured" }, 500);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: due, error } = await admin.rpc("claim_free_access_emails");
  if (error) {
    console.error("claim_free_access_emails failed:", error.message);
    return json({ error: "Could not load due emails" }, 500);
  }

  let sent = 0, failed = 0;
  for (const row of (due ?? []) as { user_id: string; card_id: string | null; kind: Kind; ends_at: string }[]) {
    try {
      const { data: u, error: uErr } = await admin.auth.admin.getUserById(row.user_id);
      const email = u?.user?.email;
      if (uErr || !email) throw new Error(uErr?.message ?? "no email on account");

      let cardId = row.card_id;
      if (!cardId) {
        const { data: c } = await admin.from("cards").select("id").eq("user_id", row.user_id)
          .eq("is_template", false).order("created_at", { ascending: true }).limit(1).maybeSingle();
        cardId = c?.id ?? null;
      }
      const { data: p } = await admin.from("profiles").select("full_name").eq("id", row.user_id).maybeSingle();
      const name = (p?.full_name || (u.user.user_metadata?.full_name as string) || "").trim();
      const activateUrl = cardId ? `${APP_URL}/billing/${cardId}` : `${APP_URL}/dashboard`;

      const { subject, html, text } = buildEmail(row.kind, name, row.ends_at, activateUrl);
      await sendEmail(email, subject, html, text);
      sent++;
      console.log(`Sent ${row.kind} email for user ${row.user_id}`);
    } catch (e) {
      failed++;
      console.error(`Failed ${row.kind} email for user ${row.user_id}:`, (e as Error).message);
      // Put it back so the next run retries.
      await admin.rpc("release_free_access_email", { _user_id: row.user_id, _kind: row.kind });
    }
  }
  return json({ due: due?.length ?? 0, sent, failed });
});

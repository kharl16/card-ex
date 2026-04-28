// Device-binding auth: handles check / approve / deny / revoke / first-device OTP / sign-out-all.
// All sensitive writes happen here with the service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendLovableEmail } from "npm:@lovable.dev/email-js@0.0.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SENDER_DOMAIN = "notify.tagex.app";
const FROM_ADDRESS = `Card-Ex Security <noreply@tagex.app>`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getIpHash(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return sha256(ip + "tagex_ip_salt");
}

async function getUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const token = auth.replace("Bearer ", "");
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (!action) return json({ error: "Missing action" }, 400);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const user = await getUser(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const ipHash = await getIpHash(req);
    const userAgent = req.headers.get("user-agent") || "";

    // ─── CHECK / REGISTER DEVICE ─────────────────────────────────────────
    if (action === "check") {
      const { fingerprint_hash, device_label } = body;
      if (!fingerprint_hash) return json({ error: "Missing fingerprint" }, 400);

      // Already trusted?
      const { data: trusted } = await sb
        .from("trusted_devices")
        .select("id")
        .eq("user_id", user.id)
        .eq("device_fingerprint_hash", fingerprint_hash)
        .is("revoked_at", null)
        .maybeSingle();

      if (trusted) {
        // Update last_seen
        await sb
          .from("trusted_devices")
          .update({ last_seen_at: new Date().toISOString(), ip_hash: ipHash })
          .eq("id", trusted.id);

        await sb.from("auth_audit_log").insert({
          user_id: user.id,
          event_type: "login_attempt_trusted",
          device_fingerprint_hash: fingerprint_hash,
          device_label,
          user_agent: userAgent,
          ip_hash: ipHash,
        });

        return json({ status: "trusted" });
      }

      // Check if user has any trusted devices (bootstrap case)
      const { count: trustedCount } = await sb
        .from("trusted_devices")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("revoked_at", null);

      const isFirstDevice = (trustedCount ?? 0) === 0;

      // Find or create pending request
      const { data: existingReq } = await sb
        .from("device_approval_requests")
        .select("id, status, expires_at")
        .eq("user_id", user.id)
        .eq("device_fingerprint_hash", fingerprint_hash)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      let requestId = existingReq?.id;
      let approvalToken: string | undefined;

      if (!requestId) {
        approvalToken = isFirstDevice
          ? Math.floor(100000 + Math.random() * 900000).toString()
          : undefined;

        const { data: newReq, error: insertErr } = await sb
          .from("device_approval_requests")
          .insert({
            user_id: user.id,
            device_fingerprint_hash: fingerprint_hash,
            device_label,
            user_agent: userAgent,
            ip_hash: ipHash,
            approval_token: approvalToken ? await sha256(approvalToken) : null,
          })
          .select("id")
          .single();

        if (insertErr) return json({ error: insertErr.message }, 500);
        requestId = newReq.id;

        await sb.from("auth_audit_log").insert({
          user_id: user.id,
          event_type: "login_attempt_new_device",
          device_fingerprint_hash: fingerprint_hash,
          device_label,
          user_agent: userAgent,
          ip_hash: ipHash,
          metadata: { is_first_device: isFirstDevice },
        });

        // Notify or email OTP
        if (isFirstDevice && approvalToken && RESEND_API_KEY && user.email) {
          try {
            const resend = new Resend(RESEND_API_KEY);
            await resend.emails.send({
              from: `Card-Ex Security <${RESEND_FROM}>`,
              to: user.email,
              subject: `Your Card-Ex device verification code: ${approvalToken}`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0a0a0a;color:#f5f5f5;border-radius:12px;">
                  <h2 style="color:#D4AF37;margin-top:0;">Verify your device</h2>
                  <p>Someone is trying to sign in to your Card-Ex account from a new device:</p>
                  <p style="background:#1a1a1a;padding:12px;border-radius:8px;border-left:3px solid #D4AF37;">
                    <strong>${device_label || "Unknown device"}</strong>
                  </p>
                  <p>If this was you, enter this 6-digit code to approve:</p>
                  <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#D4AF37;text-align:center;padding:16px;background:#1a1a1a;border-radius:8px;margin:16px 0;">
                    ${approvalToken}
                  </div>
                  <p style="color:#888;font-size:13px;">This code expires in 10 minutes. If you didn't request this, ignore this email and consider changing your password.</p>
                </div>`,
            });

            await sb.from("auth_audit_log").insert({
              user_id: user.id,
              event_type: "first_device_otp_sent",
              device_fingerprint_hash: fingerprint_hash,
              device_label,
              ip_hash: ipHash,
            });
          } catch (e) {
            console.error("OTP email failed:", e);
          }
        } else if (!isFirstDevice) {
          // In-app notification to existing trusted devices
          await sb.from("notifications").insert({
            user_id: user.id,
            type: "device_approval_request",
            title: "🔒 New device login attempt",
            message: `Someone is trying to sign in from ${device_label || "a new device"}. Approve or deny in Security settings.`,
            metadata: { request_id: requestId, device_label },
          });
        }
      }

      return json({
        status: "pending",
        request_id: requestId,
        is_first_device: isFirstDevice,
      });
    }

    // ─── APPROVE A PENDING REQUEST (from a trusted device) ───────────────
    if (action === "approve") {
      const { request_id, approving_fingerprint_hash } = body;
      if (!request_id) return json({ error: "Missing request_id" }, 400);

      // Verify approving device is trusted
      const { data: approver } = await sb
        .from("trusted_devices")
        .select("id")
        .eq("user_id", user.id)
        .eq("device_fingerprint_hash", approving_fingerprint_hash)
        .is("revoked_at", null)
        .maybeSingle();

      if (!approver) return json({ error: "Approving device is not trusted" }, 403);

      const { data: reqRow } = await sb
        .from("device_approval_requests")
        .select("*")
        .eq("id", request_id)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (!reqRow) return json({ error: "Request not found or already resolved" }, 404);
      if (new Date(reqRow.expires_at) < new Date()) return json({ error: "Request expired" }, 410);

      // Add to trusted devices
      await sb.from("trusted_devices").upsert(
        {
          user_id: user.id,
          device_fingerprint_hash: reqRow.device_fingerprint_hash,
          device_label: reqRow.device_label,
          user_agent: reqRow.user_agent,
          ip_hash: reqRow.ip_hash,
        },
        { onConflict: "user_id,device_fingerprint_hash" }
      );

      await sb
        .from("device_approval_requests")
        .update({
          status: "approved",
          resolved_at: new Date().toISOString(),
          approved_by_device_id: approver.id,
        })
        .eq("id", request_id);

      await sb.from("auth_audit_log").insert({
        user_id: user.id,
        event_type: "device_approved",
        device_fingerprint_hash: reqRow.device_fingerprint_hash,
        device_label: reqRow.device_label,
      });

      return json({ status: "approved" });
    }

    // ─── VERIFY OTP (first device) ───────────────────────────────────────
    if (action === "verify_otp") {
      const { request_id, otp } = body;
      if (!request_id || !otp) return json({ error: "Missing fields" }, 400);

      const { data: reqRow } = await sb
        .from("device_approval_requests")
        .select("*")
        .eq("id", request_id)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (!reqRow) return json({ error: "Request not found" }, 404);
      if (new Date(reqRow.expires_at) < new Date()) return json({ error: "Code expired" }, 410);
      if (!reqRow.approval_token) return json({ error: "No OTP for this request" }, 400);

      const otpHash = await sha256(otp);
      if (otpHash !== reqRow.approval_token) return json({ error: "Invalid code" }, 401);

      await sb.from("trusted_devices").upsert(
        {
          user_id: user.id,
          device_fingerprint_hash: reqRow.device_fingerprint_hash,
          device_label: reqRow.device_label,
          user_agent: reqRow.user_agent,
          ip_hash: reqRow.ip_hash,
        },
        { onConflict: "user_id,device_fingerprint_hash" }
      );

      await sb
        .from("device_approval_requests")
        .update({ status: "approved", resolved_at: new Date().toISOString() })
        .eq("id", request_id);

      await sb.from("auth_audit_log").insert({
        user_id: user.id,
        event_type: "first_device_otp_verified",
        device_fingerprint_hash: reqRow.device_fingerprint_hash,
        device_label: reqRow.device_label,
      });

      return json({ status: "approved" });
    }

    // ─── DENY ────────────────────────────────────────────────────────────
    if (action === "deny") {
      const { request_id } = body;
      if (!request_id) return json({ error: "Missing request_id" }, 400);

      const { data: reqRow } = await sb
        .from("device_approval_requests")
        .select("*")
        .eq("id", request_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!reqRow) return json({ error: "Not found" }, 404);

      await sb
        .from("device_approval_requests")
        .update({ status: "denied", resolved_at: new Date().toISOString() })
        .eq("id", request_id);

      await sb.from("auth_audit_log").insert({
        user_id: user.id,
        event_type: "device_denied",
        device_fingerprint_hash: reqRow.device_fingerprint_hash,
        device_label: reqRow.device_label,
      });

      return json({ status: "denied" });
    }

    // ─── REVOKE A TRUSTED DEVICE ─────────────────────────────────────────
    if (action === "revoke") {
      const { device_id } = body;
      if (!device_id) return json({ error: "Missing device_id" }, 400);

      const { data: device } = await sb
        .from("trusted_devices")
        .select("*")
        .eq("id", device_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!device) return json({ error: "Not found" }, 404);

      await sb
        .from("trusted_devices")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", device_id);

      await sb.from("auth_audit_log").insert({
        user_id: user.id,
        event_type: "device_revoked",
        device_fingerprint_hash: device.device_fingerprint_hash,
        device_label: device.device_label,
      });

      return json({ status: "revoked" });
    }

    // ─── SIGN OUT ALL DEVICES ────────────────────────────────────────────
    if (action === "sign_out_all") {
      await sb
        .from("trusted_devices")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("revoked_at", null);

      await sb.from("auth_audit_log").insert({
        user_id: user.id,
        event_type: "sign_out_all_devices",
        ip_hash: ipHash,
      });

      // Invalidate all Supabase sessions for this user
      try {
        await sb.auth.admin.signOut(user.id, "global" as any);
      } catch (e) {
        console.error("admin.signOut failed:", e);
      }

      return json({ status: "signed_out_all" });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("device-auth error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});

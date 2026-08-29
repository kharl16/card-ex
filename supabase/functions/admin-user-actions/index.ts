import { corsHeaders, json, requireSuperAdmin } from "../_shared/adminAuth.ts";

const SITE_ORIGIN = Deno.env.get("SITE_ORIGIN") ?? "https://tagex.app";
const VALID_STATUSES = ["active", "inactive", "suspended", "pending_verification"];
const VALID_ROLES = ["super_admin", "admin", "moderator", "member"];

/**
 * Super-admin only account operations:
 *  set_status | set_role | reset_password | force_password_change | impersonate
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const guard = await requireSuperAdmin(req);
    if (guard instanceof Response) return guard;
    const { admin, userId: actorId } = guard;

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;
    const targetUserId = body?.user_id as string;

    if (!action || !targetUserId) return json({ error: "action and user_id are required" }, 400);

    const { data: targetAuth } = await admin.auth.admin.getUserById(targetUserId);
    const targetEmail = targetAuth?.user?.email ?? null;

    // Permanent super admin can never be suspended, demoted or deleted.
    const isPermanent = (targetEmail ?? "").toLowerCase() === "kharl16@gmail.com";

    switch (action) {
      case "set_status": {
        const status = body?.status as string;
        if (!VALID_STATUSES.includes(status)) return json({ error: "Invalid status" }, 400);
        if (isPermanent && status !== "active") {
          return json({ error: "The permanent Super Admin account cannot be deactivated." }, 400);
        }
        const { error } = await admin.from("profiles").update({ status }).eq("id", targetUserId);
        if (error) return json({ error: error.message }, 400);
        // Suspended users are signed out everywhere.
        if (status === "suspended") {
          await admin.auth.admin.signOut(targetUserId, "global").catch(() => {});
        }
        break;
      }

      case "set_role": {
        const role = body?.role as string;
        if (!VALID_ROLES.includes(role)) return json({ error: "Invalid role" }, 400);
        if (isPermanent && role !== "super_admin" && role !== "admin") {
          return json({ error: "The permanent Super Admin role cannot be changed." }, 400);
        }
        await admin.from("user_roles").delete().eq("user_id", targetUserId);
        if (role !== "member") {
          const { error } = await admin
            .from("user_roles")
            .insert({ user_id: targetUserId, role, granted_by: actorId });
          if (error) return json({ error: error.message }, 400);
        }
        break;
      }

      case "reset_password": {
        if (!targetEmail) return json({ error: "User has no email" }, 400);
        const requested = body?.temporary_password as string | undefined;
        const useEmail = body?.send_email === true;

        if (useEmail) {
          // Explicit opt-in only: this path uses the email quota.
          const { error } = await admin.auth.admin.generateLink({
            type: "recovery",
            email: targetEmail,
            options: { redirectTo: `${SITE_ORIGIN}/reset-password` },
          });
          if (error) return json({ error: error.message }, 400);
          break;
        }

        // Default: set a temporary password directly — zero emails sent.
        const newPassword = requested && requested.length >= 8 ? requested : randomPassword();
        if (requested && requested.length > 0 && requested.length < 8) {
          return json({ error: "Temporary password must be at least 8 characters" }, 400);
        }
        const { error } = await admin.auth.admin.updateUserById(targetUserId, { password: newPassword });
        if (error) return json({ error: error.message }, 400);
        await admin.from("profiles").update({ must_change_password: true }).eq("id", targetUserId);
        await admin.from("superadmin_audit_log").insert({
          actor_user_id: actorId,
          action: "reset_password",
          target_user_id: targetUserId,
          details: { email: targetEmail, email_sent: false },
        });
        return json({ success: true, temporary_password: newPassword, email: targetEmail });
      }


      case "force_password_change": {
        const { error } = await admin
          .from("profiles")
          .update({ must_change_password: body?.value !== false })
          .eq("id", targetUserId);
        if (error) return json({ error: error.message }, 400);
        break;
      }

      case "impersonate": {
        if (!targetEmail) return json({ error: "User has no email" }, 400);
        const { data, error } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email: targetEmail,
          options: { redirectTo: `${SITE_ORIGIN}/dashboard` },
        });
        if (error) return json({ error: error.message }, 400);
        await admin.from("superadmin_audit_log").insert({
          actor_user_id: actorId,
          action: "impersonate",
          target_user_id: targetUserId,
          details: { email: targetEmail },
        });
        return json({ success: true, action_link: data?.properties?.action_link ?? null });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }

    await admin.from("superadmin_audit_log").insert({
      actor_user_id: actorId,
      action,
      target_user_id: targetUserId,
      details: body ?? {},
    });

    return json({ success: true });
  } catch (error) {
    console.error("admin-user-actions error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});

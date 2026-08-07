import { corsHeaders, json, requireSuperAdmin } from "../_shared/adminAuth.ts";
import { isDisposableEmail } from "../_shared/disposableDomains.ts";

const SITE_ORIGIN = Deno.env.get("SITE_ORIGIN") ?? "https://tagex.app";
const VALID_ROLES = ["super_admin", "admin", "moderator", "member"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const guard = await requireSuperAdmin(req);
    if (guard instanceof Response) return guard;
    const { admin, userId: actorId } = guard;

    const body = await req.json().catch(() => ({}));
    const first_name = (body?.first_name ?? "").toString().trim();
    const last_name = (body?.last_name ?? "").toString().trim();
    const full_name = (body?.full_name ?? `${first_name} ${last_name}`).toString().trim();
    const email = (body?.email ?? "").toString().trim().toLowerCase();
    const password = (body?.password ?? body?.temporary_password ?? "").toString();
    const mobile = (body?.mobile_number ?? "").toString().trim();
    const sponsorCode = (body?.sponsor_code ?? "").toString().trim();
    const role = VALID_ROLES.includes(body?.role) ? body.role : "member";
    const sendInvite = body?.send_invitation === true;

    if (!email || !full_name) return json({ error: "Email and name are required" }, 400);
    if (!password || password.length < 8) {
      return json({ error: "Temporary password must be at least 8 characters" }, 400);
    }
    if (isDisposableEmail(email)) {
      return json({ error: "Temporary or disposable email addresses are not allowed." }, 400);
    }

    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (existing?.users?.some((u) => (u.email ?? "").toLowerCase() === email)) {
      return json({ error: "This email address already has a Card-Ex account." }, 409);
    }

    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, first_name, last_name, created_by_admin: true },
    });

    if (createError || !newUser?.user) {
      console.error("Create user error:", createError);
      const msg = (createError?.message ?? "").toLowerCase().includes("already")
        ? "This email address already has a Card-Ex account."
        : createError?.message ?? "Failed to create user";
      return json({ error: msg }, 400);
    }

    const newId = newUser.user.id;

    // Resolve sponsor / referral attribution
    let sponsorPatch: Record<string, unknown> = {};
    if (sponsorCode) {
      const { data: sponsor } = await admin
        .from("profiles")
        .select("id, full_name, referral_code")
        .eq("referral_code", sponsorCode)
        .maybeSingle();
      if (sponsor) {
        sponsorPatch = {
          referred_by_user_id: sponsor.id,
          referred_by_code: sponsor.referral_code,
          referred_by_name: sponsor.full_name,
        };
      }
    }

    await admin.from("profiles").upsert(
      {
        id: newId,
        full_name,
        phone: mobile || null,
        created_by: actorId,
        signup_method: "admin",
        status: "active",
        email_verified: true,
        must_change_password: true,
        ...sponsorPatch,
      },
      { onConflict: "id" },
    );

    if (role !== "member") {
      await admin.from("user_roles").delete().eq("user_id", newId);
      await admin.from("user_roles").insert({ user_id: newId, role, granted_by: actorId });
    }

    let invitation_link: string | null = null;
    if (sendInvite) {
      const { data: link, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${SITE_ORIGIN}/change-password` },
      });
      if (linkError) console.error("Invite link error:", linkError);
      invitation_link = link?.properties?.action_link ?? null;
    }

    await admin.from("superadmin_audit_log").insert({
      actor_user_id: actorId,
      action: "create_user",
      target_user_id: newId,
      details: { email, role, sponsor_code: sponsorCode || null },
    });

    return json({
      success: true,
      user: { id: newId, email, full_name, role },
      invitation_link,
    });
  } catch (error) {
    console.error("admin-create-user error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});

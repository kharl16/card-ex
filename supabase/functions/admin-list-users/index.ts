import { corsHeaders, json, requireSuperAdmin } from "../_shared/adminAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const guard = await requireSuperAdmin(req);
    if (guard instanceof Response) return guard;
    const { admin } = guard;

    const { data: authUsers, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      console.error("List users error:", listError);
      return json({ error: listError.message }, 400);
    }

    const ids = authUsers.users.map((u) => u.id);

    const { data: profiles } = await admin
      .from("profiles")
      .select(
        "id, full_name, avatar_url, card_ex_id, status, email_verified, phone, phone_verified, signup_method, last_login_at, referral_code, referred_by_code, referred_by_name, subscription_status, must_change_password, created_at",
      )
      .in("id", ids);

    const { data: roles } = await admin.from("user_roles").select("user_id, role").in("user_id", ids);
    const { data: cards } = await admin.from("cards").select("user_id, is_published").in("user_id", ids);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
    const publishedCounts = new Map<string, number>();
    (cards ?? []).forEach((c) => {
      if (c.is_published) publishedCounts.set(c.user_id, (publishedCounts.get(c.user_id) ?? 0) + 1);
    });

    // Backwards-compatible maps used by existing admin screens
    const userEmails: Record<string, string> = {};
    const userConfirmed: Record<string, string | null> = {};

    const records = authUsers.users.map((u) => {
      userEmails[u.id] = u.email || "";
      userConfirmed[u.id] = u.email_confirmed_at || null;
      const p: Record<string, unknown> = profileMap.get(u.id) ?? {};
      const email = (u.email ?? "").toLowerCase();
      const isPermanent = email === "kharl16@gmail.com";
      return {
        id: u.id,
        email: u.email ?? "",
        full_name: (p.full_name as string) ?? (u.user_metadata as Record<string, string>)?.full_name ?? "",
        avatar_url: (p.avatar_url as string) ?? (u.user_metadata as Record<string, string>)?.avatar_url ?? null,
        card_ex_id: (p.card_ex_id as string) ?? null,
        role: isPermanent ? "super_admin" : (roleMap.get(u.id) ?? "member"),
        is_permanent_super_admin: isPermanent,
        status: (p.status as string) ?? "active",
        provider: u.app_metadata?.provider ?? (p.signup_method as string) ?? "email",
        email_verified: !!u.email_confirmed_at || !!p.email_verified,
        phone: (p.phone as string) ?? null,
        phone_verified: !!p.phone_verified,
        created_at: u.created_at,
        last_login_at: (p.last_login_at as string) ?? u.last_sign_in_at ?? null,
        referral_code: (p.referral_code as string) ?? null,
        sponsor: (p.referred_by_name as string) ?? (p.referred_by_code as string) ?? null,
        published_cards: publishedCounts.get(u.id) ?? 0,
        subscription_status: (p.subscription_status as string) ?? "free",
        must_change_password: !!p.must_change_password,
      };
    });

    return json({ success: true, users: userEmails, confirmed: userConfirmed, records });
  } catch (error) {
    console.error("Error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});

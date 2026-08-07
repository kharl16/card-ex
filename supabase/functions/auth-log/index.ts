import { corsHeaders, json, serviceClient, userIdFromAuthHeader } from "../_shared/adminAuth.ts";

function parseUserAgent(ua: string) {
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\/|Opera/.test(ua) ? "Opera" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" : "Unknown";

  const os =
    /Windows NT/.test(ua) ? "Windows" :
    /Android/.test(ua) ? "Android" :
    /(iPhone|iPad|iPod)/.test(ua) ? "iOS" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Linux/.test(ua) ? "Linux" : "Unknown";

  return { browser, os };
}

/**
 * Records a signup or login event in auth_logs and refreshes profile auth
 * metadata (last login, verification state, provider, avatar).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const admin = serviceClient();
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    const { data: userData } = await admin.auth.getUser(token);
    const userId = userData?.user?.id ?? userIdFromAuthHeader(authHeader);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const event = body?.event === "signup" ? "signup" : "login";
    const provider =
      typeof body?.provider === "string" && body.provider.length < 40 ? body.provider : "email";

    const ua = req.headers.get("user-agent") ?? "";
    const { browser, os } = parseUserAgent(ua);
    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    const country = req.headers.get("cf-ipcountry") ?? null;
    const now = new Date().toISOString();

    await admin.from("auth_logs").insert({
      user_id: userId,
      ip_address: ip,
      browser,
      operating_system: os,
      country,
      signup_time: event === "signup" ? now : null,
      login_time: event === "login" ? now : null,
      auth_provider: provider,
    });

    const authUser = userData?.user;
    const patch: Record<string, unknown> = { last_login_at: now };
    if (authUser?.email_confirmed_at) patch.email_verified = true;
    if (event === "signup") patch.signup_method = provider;
    if (provider === "google") {
      patch.signup_method = patch.signup_method ?? "google";
      patch.email_verified = true;
      const meta = (authUser?.user_metadata ?? {}) as Record<string, string>;
      if (meta.avatar_url) patch.avatar_url = meta.avatar_url;
      if (meta.full_name || meta.name) patch.full_name = meta.full_name ?? meta.name;
      const googleIdentity = authUser?.identities?.find((i) => i.provider === "google");
      if (googleIdentity?.id) patch.avatar_provider_id = googleIdentity.id;
    }

    await admin.from("profiles").update(patch).eq("id", userId);

    return json({ ok: true });
  } catch (error) {
    console.error("auth-log error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});

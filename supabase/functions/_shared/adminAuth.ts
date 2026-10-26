import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * Verifies the caller is a super admin. Returns the caller's user id,
 * or a Response to return immediately when the check fails.
 */
export async function requireSuperAdmin(
  req: Request,
): Promise<{ userId: string; admin: SupabaseClient } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "No authorization header" }, 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  const { data, error } = await userClient.auth.getUser(authHeader.slice(7));
  const userId = data?.user?.id;
  if (error || !userId || data.user?.is_anonymous) return json({ error: "Unauthorized" }, 401);

  const admin = serviceClient();
  const { data: isAdmin } = await admin.rpc("is_super_admin", { _user_id: userId });
  if (!isAdmin) return json({ error: "Access denied: Super Admin only" }, 403);

  return { userId, admin };
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getUserIdFromAuthHeader(authHeader: string): string | null {
  try {
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : authHeader;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload?.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { user_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const targetUserId = (body.user_id || "").trim();
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let currentUserId: string | null = null;
    const { data: userData } = await userClient.auth.getUser();
    currentUserId = userData?.user?.id ?? getUserIdFromAuthHeader(authHeader);

    if (!currentUserId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await userClient.rpc("is_super_admin", { _user_id: currentUserId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Access denied: Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Primary: direct lookup by ID
    let email = "";
    let confirmed_at: string | null = null;
    try {
      const { data, error } = await adminClient.auth.admin.getUserById(targetUserId);
      if (!error && data?.user) {
        email = data.user.email || "";
        confirmed_at = data.user.email_confirmed_at || null;
      } else if (error) {
        console.warn("getUserById failed, will try fallback:", error.message);
      }
    } catch (e) {
      console.warn("getUserById threw:", (e as Error).message);
    }

    // Fallback: paginated listUsers scan (handles edge cases where getUserById is flaky)
    if (!email) {
      try {
        for (let page = 1; page <= 5; page++) {
          const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
          if (error) break;
          const match = data.users.find((u) => u.id === targetUserId);
          if (match) {
            email = match.email || "";
            confirmed_at = match.email_confirmed_at || null;
            break;
          }
          if (!data.users.length || data.users.length < 1000) break;
        }
      } catch (e) {
        console.warn("listUsers fallback threw:", (e as Error).message);
      }
    }

    // Always succeed — empty email is acceptable; the caller decides what to do.
    return new Response(
      JSON.stringify({ success: true, user_id: targetUserId, email, confirmed_at }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("admin-get-user-email error:", error);
    // Return 200 with empty email so the UI flow is never blocked.
    return new Response(
      JSON.stringify({ success: false, email: "", error: (error as Error).message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

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
    const payloadJson = atob(padded);
    const payload = JSON.parse(payloadJson);
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create client with user's token to verify they're admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get current user (fallback to JWT sub if session is missing)
    let currentUserId: string | null = null;
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userData?.user?.id) {
      currentUserId = userData.user.id;
    } else {
      console.warn("admin-update-user: auth.getUser failed, falling back to JWT sub", {
        error: userError?.message,
      });
      currentUserId = getUserIdFromAuthHeader(authHeader);
    }

    if (!currentUserId) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: "Missing/invalid user token. Please sign out and sign in again.",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if current user is super admin
    const { data: isAdmin, error: adminError } = await userClient.rpc("is_super_admin", {
      _user_id: currentUserId,
    });

    if (adminError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Access denied: Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { user_id, email, password, email_confirm } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email && !password && !email_confirm) {
      return new Response(JSON.stringify({ error: "Email, password, or email_confirm is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate password length if provided
    if (password && password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(JSON.stringify({ error: "Invalid email format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Build update object
    const updateData: { email?: string; password?: string; email_confirm?: boolean } = {};
    // Admin email changes are applied directly and marked confirmed so GoTrue does not
    // attempt to send a confirmation email (which can fail and return a 500).
    if (email) {
      updateData.email = email;
      updateData.email_confirm = true;
    }
    if (password) updateData.password = password;
    if (email_confirm) updateData.email_confirm = true;


    console.log(`Admin ${currentUserId} updating user ${user_id}:`, {
      email: email ? "***" : undefined,
      password: password ? "[set]" : undefined,
      email_confirm: email_confirm || undefined,
    });

    // Guard against duplicate emails, which surface as an opaque 500 from GoTrue
    if (email) {
      const { data: existing } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const clash = existing?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase() && u.id !== user_id
      );
      if (clash) {
        return new Response(
          JSON.stringify({ error: "This email address already belongs to another Card-Ex account." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update user — apply email and password separately so one failure doesn't block the other
    let updatedUser: { user: { id: string; email?: string | null } } | null = null;
    const steps: Array<Record<string, unknown>> = [];
    if (updateData.email) steps.push({ email: updateData.email, email_confirm: true });
    if (updateData.password) steps.push({ password: updateData.password });
    if (steps.length === 0 && updateData.email_confirm) steps.push({ email_confirm: true });

    for (const step of steps) {
      const { data, error: updateError } = await adminClient.auth.admin.updateUserById(user_id, step);
      if (updateError) {
        console.error("Update user error:", { step: Object.keys(step), error: updateError });
        return new Response(
          JSON.stringify({
            error:
              updateError.message === "Error updating user"
                ? `Supabase rejected the ${Object.keys(step).join("/")} change. Please try again in a moment.`
                : updateError.message,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      updatedUser = data as any;
    }

    if (!updatedUser) {
      return new Response(JSON.stringify({ error: "Nothing to update" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: updatedUser.user.id,
          email: updatedUser.user.email,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


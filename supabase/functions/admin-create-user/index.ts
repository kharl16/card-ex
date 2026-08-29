import { corsHeaders, json, requireSuperAdmin } from "../_shared/adminAuth.ts";
import { isDisposableEmail } from "../_shared/disposableDomains.ts";

const SITE_ORIGIN = Deno.env.get("SITE_ORIGIN") ?? "https://tagex.app";
const VALID_ROLES = ["super_admin", "admin", "moderator", "member"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

interface CreateInput {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  password?: string;
  temporary_password?: string;
  mobile_number?: string;
  sponsor_code?: string;
  role?: string;
  send_invitation?: boolean;
}

interface CreateResult {
  email: string;
  status: "created" | "skipped" | "failed";
  reason?: string;
  user_id?: string;
  full_name?: string;
  password?: string;
  role?: string;
  invitation_link?: string | null;
}

function randomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/**
 * Creates one account with the service role. No Supabase mailer is used:
 * the account is created already-confirmed, so it never consumes the
 * built-in "emails per hour" quota. Credentials are returned for handoff.
 */
async function createOne(
  admin: ReturnType<typeof requireSuperAdmin> extends Promise<infer T>
    ? T extends { admin: infer A } ? A : never
    : never,
  actorId: string,
  input: CreateInput,
  existingEmails: Set<string>,
): Promise<CreateResult> {
  const first_name = (input.first_name ?? "").toString().trim();
  const last_name = (input.last_name ?? "").toString().trim();
  const full_name = (input.full_name ?? `${first_name} ${last_name}`).toString().trim();
  const email = (input.email ?? "").toString().trim().toLowerCase();
  const mobile = (input.mobile_number ?? "").toString().trim();
  const sponsorCode = (input.sponsor_code ?? "").toString().trim();
  const role = VALID_ROLES.includes(input.role ?? "") ? input.role! : "member";
  const sendInvite = input.send_invitation === true;

  let password = (input.password ?? input.temporary_password ?? "").toString();
  if (!password) password = randomPassword();

  if (!email || !EMAIL_RE.test(email)) {
    return { email: email || "(missing)", status: "failed", reason: "Invalid email address" };
  }
  if (!full_name) {
    return { email, status: "failed", reason: "Name is required" };
  }
  if (password.length < 8) {
    return { email, status: "failed", reason: "Temporary password must be at least 8 characters" };
  }
  if (isDisposableEmail(email)) {
    return { email, status: "failed", reason: "Temporary or disposable email addresses are not allowed." };
  }
  if (existingEmails.has(email)) {
    return { email, status: "skipped", reason: "This email address already has a Card-Ex account." };
  }

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    // Confirms the address server-side — no confirmation email is dispatched.
    email_confirm: true,
    user_metadata: { full_name, first_name, last_name, created_by_admin: true },
  });

  if (createError || !newUser?.user) {
    console.error("Create user error:", createError);
    const already = (createError?.message ?? "").toLowerCase().includes("already");
    return {
      email,
      status: already ? "skipped" : "failed",
      reason: already
        ? "This email address already has a Card-Ex account."
        : createError?.message ?? "Failed to create user",
    };
  }

  const newId = newUser.user.id;
  existingEmails.add(email);

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

  // Only generated when explicitly requested. generateLink returns a link for
  // manual handoff and does not send mail through the Supabase mailer.
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
    details: { email, role, sponsor_code: sponsorCode || null, email_sent: false },
  });

  return {
    email,
    status: "created",
    user_id: newId,
    full_name,
    password,
    role,
    invitation_link,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const guard = await requireSuperAdmin(req);
    if (guard instanceof Response) return guard;
    const { admin, userId: actorId } = guard;

    const body = await req.json().catch(() => ({}));

    // Snapshot existing emails once so batches skip duplicates cheaply.
    const existingEmails = new Set<string>();
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of existing?.users ?? []) {
      if (u.email) existingEmails.add(u.email.toLowerCase());
    }

    // Bulk mode
    if (Array.isArray(body?.users)) {
      const rows: CreateInput[] = body.users.slice(0, 200);
      const results: CreateResult[] = [];
      for (const row of rows) {
        try {
          results.push(await createOne(admin, actorId, row, existingEmails));
        } catch (e) {
          console.error("bulk row failed", e);
          results.push({
            email: (row?.email ?? "(unknown)").toString(),
            status: "failed",
            reason: "Unexpected error",
          });
        }
      }
      return json({
        success: true,
        results,
        summary: {
          created: results.filter((r) => r.status === "created").length,
          skipped: results.filter((r) => r.status === "skipped").length,
          failed: results.filter((r) => r.status === "failed").length,
        },
      });
    }

    // Single mode
    const result = await createOne(admin, actorId, body as CreateInput, existingEmails);
    if (result.status !== "created") {
      return json({ error: result.reason ?? "Failed to create user" }, result.status === "skipped" ? 409 : 400);
    }

    return json({
      success: true,
      user: {
        id: result.user_id,
        email: result.email,
        full_name: result.full_name,
        role: result.role,
        temporary_password: result.password,
      },
      invitation_link: result.invitation_link ?? null,
    });
  } catch (error) {
    console.error("admin-create-user error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});

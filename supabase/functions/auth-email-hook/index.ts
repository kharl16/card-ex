import { verifyWebhookRequest, type EmailWebhookPayload } from "@lovable.dev/webhooks-js";
import { parseEmailWebhookPayload, sendLovableEmail } from "@lovable.dev/email-js";
import { render } from "npm:@react-email/components@0.0.22";
import SignupEmail from "../_shared/email-templates/signup.tsx";
import RecoveryEmail from "../_shared/email-templates/recovery.tsx";
import MagicLinkEmail from "../_shared/email-templates/magic-link.tsx";
import InviteEmail from "../_shared/email-templates/invite.tsx";
import EmailChangeEmail from "../_shared/email-templates/email-change.tsx";
import ReauthenticationEmail from "../_shared/email-templates/reauthentication.tsx";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

const templateMap: Record<string, (props: Record<string, string>) => JSX.Element> = {
  signup: (props) => SignupEmail(props as any),
  recovery: (props) => RecoveryEmail(props as any),
  magiclink: (props) => MagicLinkEmail(props as any),
  invite: (props) => InviteEmail(props as any),
  email_change: (props) => EmailChangeEmail(props as any),
  reauthentication: (props) => ReauthenticationEmail(props as any),
};

const subjectMap: Record<string, string> = {
  signup: "Verify your Card-Ex account",
  recovery: "Reset your Card-Ex password",
  magiclink: "Your Card-Ex sign-in link",
  invite: "You're invited to Card-Ex",
  email_change: "Confirm your email change",
  reauthentication: "Your Card-Ex verification code",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    // Verify webhook signature and parse payload
    const { body } = await verifyWebhookRequest<EmailWebhookPayload>({
      req,
      secret: LOVABLE_API_KEY,
    });

    const payload = parseEmailWebhookPayload(body);

    const emailData = payload.data;
    if (!emailData) {
      throw new Error("Missing email data in payload");
    }

    const actionType = (emailData.email_action_type ?? "signup").toLowerCase();
    const tokenHash = emailData.token_hash ?? "";
    const token = emailData.token ?? "";
    const siteUrl = emailData.site_url ?? "";
    const email = emailData.email ?? "";

    // Always redirect to the app's auth callback so users land on the dashboard
    const appCallbackUrl = "https://tagex.app/auth/callback";
    const confirmationUrl = `${siteUrl}/auth/v1/verify?token=${tokenHash}&type=${actionType}&redirect_to=${encodeURIComponent(appCallbackUrl)}`;

    const templateProps: Record<string, string> = {
      siteName: "Card-Ex",
      siteUrl: "https://tagex.app",
      confirmationUrl,
      recipient: email,
      token: token,
    };

    const templateFn = templateMap[actionType] ?? templateMap.signup;
    const subject = subjectMap[actionType] ?? "Card-Ex Notification";

    const html = await render(templateFn(templateProps));

    const apiBaseUrl = emailData.api_base_url ?? "https://api.lovable.dev";

    await sendLovableEmail(
      {
        run_id: payload.run_id ?? crypto.randomUUID(),
        to: email,
        from: "Card-Ex <noreply@notify.tagex.app>",
        subject,
        html,
        text: subject,
        purpose: "transactional",
      },
      { apiKey: LOVABLE_API_KEY, apiBaseUrl },
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Auth email hook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.statusCode ?? 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

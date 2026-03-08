import { Webhook } from "@lovable.dev/webhooks-js";
import { Resend } from "@lovable.dev/email-js";
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
    const webhook = new Webhook(LOVABLE_API_KEY);
    const payload = await webhook.verify(req);

    const {
      email_data: {
        email_action_type,
        token_hash,
        redirect_to,
        token,
        site_url,
      },
      email,
      callback_url,
    } = payload as any;

    const actionType = email_action_type?.toLowerCase() ?? "signup";

    const confirmationUrl = redirect_to
      ? `${site_url}/auth/v1/verify?token=${token_hash}&type=${actionType}&redirect_to=${redirect_to}`
      : `${site_url}/auth/v1/verify?token=${token_hash}&type=${actionType}`;

    const templateProps: Record<string, string> = {
      siteName: "Card-Ex",
      siteUrl: "https://tagex.app",
      confirmationUrl,
      recipient: email,
      token: token ?? "",
    };

    const templateFn = templateMap[actionType] ?? templateMap.signup;
    const subject = subjectMap[actionType] ?? "Card-Ex Notification";

    const html = await render(templateFn(templateProps));

    const resend = new Resend(LOVABLE_API_KEY, callback_url);
    await resend.emails.send({
      to: [email],
      subject,
      html,
    });

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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = (Deno.env.get("RESEND_API_KEY") ?? "").trim();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReferralNotificationRequest {
  referrer_user_id: string;
  referred_user_name: string;
  old_status: string;
  new_status: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Card-Ex <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return response.json();
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    console.log(
      `Resend key loaded: startsWithRe=${RESEND_API_KEY.startsWith("re_")}, length=${RESEND_API_KEY.length}`
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { referrer_user_id, referred_user_name, old_status, new_status }: ReferralNotificationRequest = await req.json();

    console.log(`Processing referral notification for user ${referrer_user_id}: ${old_status} -> ${new_status}`);

    // Get referrer's email from auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(referrer_user_id);
    
    if (userError || !userData?.user?.email) {
      console.error("Error fetching user email:", userError);
      return new Response(
        JSON.stringify({ error: "Could not fetch user email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const referrerEmail = userData.user.email;
    const referrerName = userData.user.user_metadata?.full_name || "there";

    // Get referrer's profile name as fallback
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", referrer_user_id)
      .single();

    const displayName = profileData?.full_name || referrerName;

    // Determine email content based on status
    let subject: string;
    let heading: string;
    let message: string;
    let emoji: string;

    if (new_status === "qualified") {
      emoji = "🎉";
      subject = `${emoji} Your referral has qualified!`;
      heading = "Congratulations! Your Referral Qualified!";
      message = `
        <p>Great news, ${displayName}!</p>
        <p><strong>${referred_user_name || "Your referral"}</strong> has successfully qualified, and your commission is now being processed.</p>
        <p>Keep up the great work! The more people you refer, the more you earn.</p>
      `;
    } else if (new_status === "paid_out") {
      emoji = "💰";
      subject = `${emoji} Your commission has been paid out!`;
      heading = "Your Commission Has Been Paid!";
      message = `
        <p>Exciting news, ${displayName}!</p>
        <p>Your commission for referring <strong>${referred_user_name || "a user"}</strong> has been paid out.</p>
        <p>Thank you for being part of our referral program. Keep sharing and earning!</p>
      `;
    } else {
      console.log(`Skipping email for status change to: ${new_status}`);
      return new Response(
        JSON.stringify({ message: "No email sent for this status change" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                        ${emoji} Card-Ex Referral Program
                      </h1>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px; font-weight: 600;">
                        ${heading}
                      </h2>
                      <div style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                        ${message}
                      </div>
                      <div style="margin-top: 30px; text-align: center;">
                        <a href="https://tagex.app/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          View Your Dashboard
                        </a>
                      </div>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="color: #6b7280; font-size: 14px; margin: 0;">
                        You're receiving this email because you're part of the Card-Ex Referral Program.
                      </p>
                      <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0;">
                        © ${new Date().getFullYear()} Card-Ex. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const emailResponse = await sendEmail(referrerEmail, subject, emailHtml);

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-referral-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

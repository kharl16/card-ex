import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, paymongo-signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYMONGO_WEBHOOK_SECRET = Deno.env.get("PAYMONGO_WEBHOOK_SECRET");

async function verifySignature(payload: string, signatureHeader: string | null): Promise<boolean> {
  if (!PAYMONGO_WEBHOOK_SECRET) return true; // Skip if not configured (dev)
  if (!signatureHeader) return false;

  // PayMongo signature format: t=<timestamp>,te=<test_sig>,li=<live_sig>
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=") as [string, string])
  );
  const timestamp = parts.t;
  const sig = parts.li || parts.te;
  if (!timestamp || !sig) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PAYMONGO_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === sig;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("paymongo-signature");

    const valid = await verifySignature(rawBody, signature);
    if (!valid) {
      console.warn("Invalid PayMongo signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(rawBody);
    const eventType = event?.data?.attributes?.type;
    console.log("PayMongo event:", eventType);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (
      eventType === "checkout_session.payment.paid" ||
      eventType === "payment.paid"
    ) {
      const eventData = event.data.attributes.data;
      const sessionId = eventData?.id || eventData?.attributes?.checkout_session_id;
      const paymentId = eventData?.id;
      const metadata = eventData?.attributes?.metadata || {};

      // Find the payment session
      let { data: session } = await supabase
        .from("payment_sessions")
        .select("*")
        .eq("checkout_session_id", sessionId)
        .maybeSingle();

      if (!session && metadata.card_id) {
        // Fallback by metadata
        const { data: bySession } = await supabase
          .from("payment_sessions")
          .select("*")
          .eq("card_id", metadata.card_id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        session = bySession;
      }

      if (!session) {
        console.warn("Session not found for", sessionId);
        return new Response(JSON.stringify({ received: true, warning: "session not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (session.status === "paid") {
        return new Response(JSON.stringify({ received: true, already_processed: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Process the payment via the existing RPC
      const { error: rpcError } = await supabase.rpc("process_card_payment", {
        p_card_id: session.card_id,
        p_user_id: session.user_id,
        p_plan_id: session.plan_id,
        p_amount: Number(session.amount),
        p_payment_method: "PAYMONGO",
        p_provider_reference: paymentId,
      });

      if (rpcError) {
        console.error("process_card_payment failed:", rpcError);
        return new Response(JSON.stringify({ error: rpcError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("payment_sessions")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          paymongo_payment_id: paymentId,
        })
        .eq("id", session.id);

      console.log("Card marked paid:", session.card_id);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

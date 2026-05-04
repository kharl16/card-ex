import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYMONGO_SECRET_KEY = Deno.env.get("PAYMONGO_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_ORIGIN = Deno.env.get("SITE_ORIGIN") || "https://tagex.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!PAYMONGO_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "PayMongo not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { cardId, planId } = await req.json();
    if (!cardId || !planId) {
      return new Response(JSON.stringify({ error: "Missing cardId or planId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: card, error: cardErr } = await supabase
      .from("cards")
      .select("id, full_name, user_id, is_paid")
      .eq("id", cardId)
      .maybeSingle();

    console.log("checkout debug", { cardId, userId: user.id, card, cardErr });

    if (!card) {
      return new Response(JSON.stringify({ error: "Card not found", cardId }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (card.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Card does not belong to user", cardOwner: card.user_id, userId: user.id }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (card.is_paid) {
      return new Response(JSON.stringify({ error: "Card already paid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: plan } = await supabase
      .from("card_plans")
      .select("id, name, retail_price")
      .eq("id", planId)
      .single();

    if (!plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountCentavos = Math.round(Number(plan.retail_price) * 100);

    // Create PayMongo checkout session
    const pmResponse = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(PAYMONGO_SECRET_KEY + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            description: `${plan.name} - ${card.full_name}`,
            line_items: [{
              name: plan.name,
              amount: amountCentavos,
              currency: "PHP",
              quantity: 1,
            }],
            payment_method_types: ["gcash", "card", "paymaya", "grab_pay"],
            success_url: `${SITE_ORIGIN}/billing/${cardId}/success`,
            cancel_url: `${SITE_ORIGIN}/billing/${cardId}`,
            metadata: {
              card_id: cardId,
              plan_id: planId,
              user_id: user.id,
            },
          },
        },
      }),
    });

    const pmData = await pmResponse.json();
    if (!pmResponse.ok) {
      console.error("PayMongo error:", pmData);
      return new Response(JSON.stringify({ error: "PayMongo checkout failed", details: pmData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionId = pmData.data.id;
    const checkoutUrl = pmData.data.attributes.checkout_url;

    await supabase.from("payment_sessions").insert({
      user_id: user.id,
      card_id: cardId,
      plan_id: planId,
      checkout_session_id: sessionId,
      checkout_url: checkoutUrl,
      amount: plan.retail_price,
      status: "pending",
    });

    return new Response(JSON.stringify({ checkoutUrl, sessionId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PERSONAL_PLAN_CODE = "personal";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log("Starting missing referrals backfill...");

    // Find cards with referred_by_user_id that are published and paid
    const { data: cardsWithReferrer, error: cardsError } = await supabase
      .from("cards")
      .select("id, user_id, plan_id, referred_by_user_id, full_name, is_published, is_paid")
      .not("referred_by_user_id", "is", null)
      .eq("is_published", true)
      .eq("is_paid", true);

    if (cardsError) throw cardsError;

    console.log(`Found ${cardsWithReferrer?.length || 0} published/paid cards with referred_by_user_id`);

    // Get existing referrals
    const { data: existingReferrals, error: referralsError } = await supabase
      .from("referrals")
      .select("referred_user_id");

    if (referralsError) throw referralsError;

    const existingReferredUserIds = new Set(existingReferrals?.map(r => r.referred_user_id) || []);

    // Filter to cards missing referral records
    const cardsMissingReferrals = cardsWithReferrer?.filter(card => 
      !existingReferredUserIds.has(card.user_id)
    ) || [];

    console.log(`Found ${cardsMissingReferrals.length} cards missing referral records`);

    if (cardsMissingReferrals.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No missing referrals to create", created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get plan info for eligibility check
    const planIds = [...new Set(cardsMissingReferrals.filter(c => c.plan_id).map(c => c.plan_id))];
    const { data: plans } = planIds.length > 0 
      ? await supabase.from("card_plans").select("id, code, referral_eligible").in("id", planIds)
      : { data: [] };

    const eligiblePlanIds = new Set(
      plans?.filter(p => p.referral_eligible && p.code?.toLowerCase() !== PERSONAL_PLAN_CODE).map(p => p.id) || []
    );

    // Get latest payments for these cards
    const cardIds = cardsMissingReferrals.map(c => c.id);
    const { data: payments } = await supabase
      .from("payments")
      .select("id, card_id")
      .in("card_id", cardIds)
      .order("created_at", { ascending: false });

    const paymentMap = new Map<string, string>();
    payments?.forEach(p => {
      if (!paymentMap.has(p.card_id)) {
        paymentMap.set(p.card_id, p.id);
      }
    });

    let createdCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const card of cardsMissingReferrals) {
      // Skip if plan is not eligible
      if (card.plan_id && !eligiblePlanIds.has(card.plan_id)) {
        console.log(`Skipped ${card.full_name}: Plan not referral-eligible`);
        skippedCount++;
        continue;
      }

      // Create referral record
      const { error: insertError } = await supabase.from("referrals").insert({
        referrer_user_id: card.referred_by_user_id,
        referred_user_id: card.user_id,
        referred_card_id: card.id,
        payment_id: paymentMap.get(card.id) ?? null,
        plan_id: card.plan_id,
        status: "pending",
      });

      if (insertError) {
        console.error(`Failed to create referral for ${card.full_name}: ${insertError.message}`);
        errors.push(`${card.full_name}: ${insertError.message}`);
      } else {
        console.log(`Created referral for ${card.full_name}`);
        createdCount++;
      }
    }

    console.log(`Backfill complete: created ${createdCount}, skipped ${skippedCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        created: createdCount, 
        skipped: skippedCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Backfill error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

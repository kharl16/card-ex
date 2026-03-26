import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { action, prospect, activities, followups } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = "";
    let userPrompt = "";

    const prospectContext = `
Prospect: ${prospect.full_name}
Status: ${prospect.pipeline_status}
Interest Level: ${prospect.interest_level}
Company: ${prospect.company || "N/A"}
Occupation: ${prospect.occupation || "N/A"}
Notes: ${prospect.notes || "None"}
Last Contacted: ${prospect.last_contacted_at || "Never"}
Last Activity: ${prospect.last_activity_at || "None"}
Created: ${prospect.created_at}
Recent Activities: ${(activities || []).slice(0, 5).map((a: any) => `${a.activity_type}: ${a.activity_title || ""} ${a.activity_note || ""}`).join(" | ") || "None"}
Pending Follow-ups: ${(followups || []).filter((f: any) => f.status === "pending").map((f: any) => `${f.scheduled_at}: ${f.note || ""}`).join(" | ") || "None"}
`;

    if (action === "suggest_reply") {
      systemPrompt = `You are a friendly sales/networking assistant for a network marketer. Generate a short, natural message reply for Messenger or SMS. Keep it:
- Conversational and warm (not salesy)
- Under 3 sentences
- Personalized using the prospect info
- Appropriate for the current pipeline stage
Do NOT use emojis excessively. Output ONLY the message text, nothing else.`;
      userPrompt = `Generate a follow-up message for this prospect:\n${prospectContext}`;
    } else if (action === "summary") {
      systemPrompt = `You are a CRM assistant. Generate a brief, actionable summary of this prospect. Include:
1. Who they are (1 line)
2. Current status & interest level
3. Last interaction summary
4. Recommended next step
Keep it under 5 lines. Be concise and action-oriented.`;
      userPrompt = `Summarize this prospect:\n${prospectContext}`;
    } else if (action === "next_action") {
      systemPrompt = `You are a sales coach. Based on the prospect data, suggest ONE specific next best action. Consider:
- Pipeline status
- Last activity date
- Follow-up history
- Interest level
Output format: A single clear action recommendation in 1-2 sentences.`;
      userPrompt = `What's the next best action for this prospect?\n${prospectContext}`;
    } else {
      throw new Error("Invalid action");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await aiResponse.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("prospect-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

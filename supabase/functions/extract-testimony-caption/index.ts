import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are reading a testimony / feedback poster image.

Look ONLY at the text that appears in the UPPER-RIGHT corner of the image — it is usually written in a contrasting color (often red, dark, or highlighted) and lists the medical condition(s) or main complaint the testimony is about. Examples: "DIABETES, HIGH BLOOD & PCOS", "HIGH CHOLESTEROL AND PCOS (POLYCYSTIC OVARY SYNDROME)", "HYPOTHYROID, OVARIAN CYST, HIGH BLOOD, HYPERTENSION".

Return ONLY that text as plain text:
- Preserve commas and ampersands.
- Use Title Case (e.g. "Diabetes, High Blood & PCOS"). Keep medical acronyms (PCOS, FDA, HBP) UPPERCASE.
- No quotes, no labels, no extra commentary.
- If no such text is visible, return exactly: NONE`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(JSON.stringify({ error: "AI gateway error", detail: errText }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    let caption: string = data?.choices?.[0]?.message?.content?.trim() ?? "";
    if (/^none$/i.test(caption)) caption = "";
    // Strip surrounding quotes if model added them
    caption = caption.replace(/^["'`]+|["'`]+$/g, "").trim();

    return new Response(JSON.stringify({ caption }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("extract-testimony-caption error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

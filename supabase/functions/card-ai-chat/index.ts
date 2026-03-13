import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, cardId } = await req.json();

    if (!cardId) {
      return new Response(JSON.stringify({ error: "cardId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch card data for context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select("full_name, title, company, bio, email, phone, website, location, product_images, social_links")
      .eq("id", cardId)
      .eq("is_published", true)
      .single();

    if (cardError || !card) {
      return new Response(JSON.stringify({ error: "Card not found or not published" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch card links
    const { data: cardLinks } = await supabase
      .from("card_links")
      .select("kind, label, value")
      .eq("card_id", cardId);

    // Build context from card data
    const productImages = Array.isArray(card.product_images) ? card.product_images : [];
    const products = productImages
      .map((p: any) => p.alt_text || p.description)
      .filter(Boolean)
      .join(", ");

    const socialLinks = Array.isArray(card.social_links) ? card.social_links : [];
    const socials = socialLinks
      .map((s: any) => `${s.label || s.kind}: ${s.value}`)
      .join("\n");

    const links = (cardLinks || [])
      .map((l: any) => `${l.label} (${l.kind}): ${l.value}`)
      .join("\n");

    const systemPrompt = `You are an AI assistant for ${card.full_name}'s digital business card. You answer visitor questions using ONLY the information provided below. Be friendly, professional, and concise. If you don't have the information to answer a question, politely say so and suggest contacting ${card.full_name} directly.

CARD OWNER INFORMATION:
Name: ${card.full_name}
${card.title ? `Title: ${card.title}` : ""}
${card.company ? `Company: ${card.company}` : ""}
${card.bio ? `Bio: ${card.bio}` : ""}
${card.email ? `Email: ${card.email}` : ""}
${card.phone ? `Phone: ${card.phone}` : ""}
${card.website ? `Website: ${card.website}` : ""}
${card.location ? `Location: ${card.location}` : ""}
${products ? `Products/Services: ${products}` : ""}
${socials ? `Social Media:\n${socials}` : ""}
${links ? `Links:\n${links}` : ""}

RULES:
- Only answer based on the information above
- Never make up information not present in the card data
- Keep answers brief and helpful
- If asked about pricing, availability, or details not in the data, suggest contacting the card owner directly
- You can help with: what services/products are offered, contact information, social media links, location, and general inquiries about the card owner's business`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...(messages || []).slice(-10), // Keep last 10 messages for context
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("card-ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

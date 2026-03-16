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
    const { cardId } = await req.json();
    if (!cardId) {
      return new Response(JSON.stringify({ error: "cardId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch card data
    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select("full_name, title, company, bio, email, phone, website, location, product_images, social_links")
      .eq("id", cardId)
      .single();

    if (cardError || !card) {
      return new Response(JSON.stringify({ error: "Card not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch card links
    const { data: cardLinks } = await supabase
      .from("card_links")
      .select("kind, label, value")
      .eq("card_id", cardId);

    // Fetch Tools Orb content in parallel
    const [linksRes, filesRes, presentationsRes, trainingsRes, directoryRes, ambassadorsRes] = await Promise.all([
      supabase.from("iam_links").select("name, link, category").eq("is_active", true).limit(30),
      supabase.from("files_repository").select("file_name, description, folder_name, price_srp, price_dp").eq("is_active", true).limit(30),
      supabase.from("presentations").select("title, description, category").eq("is_active", true).limit(20),
      supabase.from("training_items").select("title, description, category").eq("is_active", true).limit(20),
      supabase.from("directory_entries").select("owner, location, address, sites, operating_hours").eq("is_active", true).limit(20),
      supabase.from("ambassadors_library").select("endorser, product_endorsed").eq("is_active", true).limit(20),
    ]);

    const productImages = Array.isArray(card.product_images) ? card.product_images : [];
    const products = productImages.map((p: any) => p.alt_text || p.description).filter(Boolean).join(", ");
    const socialLinks = Array.isArray(card.social_links) ? card.social_links : [];
    const socials = socialLinks.map((s: any) => `${s.label || s.kind}: ${s.value}`).join(", ");
    const links = (cardLinks || []).map((l: any) => `${l.label} (${l.kind}): ${l.value}`).join(", ");

    // Build Tools Orb context
    const toolsLinks = (linksRes.data || []).map((l: any) => `${l.name}${l.category ? ` [${l.category}]` : ""}: ${l.link}`).join("\n");
    const toolsFiles = (filesRes.data || []).map((f: any) => {
      const parts = [f.file_name];
      if (f.description) parts.push(f.description);
      if (f.folder_name) parts.push(`Folder: ${f.folder_name}`);
      if (f.price_srp) parts.push(`SRP: ${f.price_srp}`);
      if (f.price_dp) parts.push(`DP: ${f.price_dp}`);
      return parts.join(" | ");
    }).join("\n");
    const toolsPresentations = (presentationsRes.data || []).map((p: any) => `${p.title}${p.category ? ` [${p.category}]` : ""}${p.description ? `: ${p.description}` : ""}`).join("\n");
    const toolsTrainings = (trainingsRes.data || []).map((t: any) => `${t.title}${t.category ? ` [${t.category}]` : ""}${t.description ? `: ${t.description}` : ""}`).join("\n");
    const toolsDirectory = (directoryRes.data || []).map((d: any) => {
      const parts = [];
      if (d.owner) parts.push(d.owner);
      if (d.location) parts.push(d.location);
      if (d.address) parts.push(d.address);
      if (d.sites) parts.push(`Sites: ${d.sites}`);
      if (d.operating_hours) parts.push(`Hours: ${d.operating_hours}`);
      return parts.join(" | ");
    }).join("\n");
    const toolsAmbassadors = (ambassadorsRes.data || []).map((a: any) => `${a.endorser || "Unknown"} endorses ${a.product_endorsed || "N/A"}`).join("\n");

    const cardContext = `
Name: ${card.full_name}
${card.title ? `Title: ${card.title}` : ""}
${card.company ? `Company: ${card.company}` : ""}
${card.bio ? `Bio: ${card.bio}` : ""}
${card.email ? `Email: ${card.email}` : ""}
${card.phone ? `Phone: ${card.phone}` : ""}
${card.website ? `Website: ${card.website}` : ""}
${card.location ? `Location: ${card.location}` : ""}
${products ? `Products/Services: ${products}` : ""}
${socials ? `Social Media: ${socials}` : ""}
${links ? `Links: ${links}` : ""}
${toolsLinks ? `\nAvailable Quick Links:\n${toolsLinks}` : ""}
${toolsFiles ? `\nProducts/Files Catalog:\n${toolsFiles}` : ""}
${toolsPresentations ? `\nPresentations:\n${toolsPresentations}` : ""}
${toolsTrainings ? `\nTraining Materials:\n${toolsTrainings}` : ""}
${toolsDirectory ? `\nStore/Distributor Directory:\n${toolsDirectory}` : ""}
${toolsAmbassadors ? `\nAmbassador Endorsements:\n${toolsAmbassadors}` : ""}
`.trim();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a Q&A generator for a digital business card chatbot. Based on the card data provided, generate 5-8 relevant Q&A pairs that visitors might ask. Make answers specific using the actual data. Return ONLY a JSON array of objects with "question" and "answer" fields. No markdown, no explanation.`,
          },
          {
            role: "user",
            content: `Generate Q&A pairs for this card:\n\n${cardContext}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_qa_pairs",
              description: "Return suggested Q&A pairs for the card chatbot.",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        answer: { type: "string" },
                      },
                      required: ["question", "answer"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_qa_pairs" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
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
      throw new Error("AI service error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let suggestions: any[] = [];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        suggestions = parsed.suggestions || [];
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-qa-suggestions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

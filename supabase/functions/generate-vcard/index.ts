import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { profileToVCardV3, type Profile } from "../_shared/canonicalVCard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { card_id: cardId, include_photo: includePhoto = true } = await req.json();

    if (!cardId) {
      return new Response(
        JSON.stringify({ error: "card_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Generating vCard for card:", cardId, "Include photo:", includePhoto);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch card data — only published cards may be exported
    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select("*")
      .eq("id", cardId)
      .eq("is_published", true)
      .maybeSingle();

    if (cardError || !card) {
      console.error("Error fetching card or card not published:", cardError);
      return new Response(
        JSON.stringify({ error: "Card not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Fetch social links and additional contacts
    const { data: cardLinks } = await supabase
      .from("card_links")
      .select("kind, label, value")
      .eq("card_id", cardId);

    console.log("Card data:", card);
    console.log("Card links:", cardLinks);

    // Map social links to canonical format
    const socials: Profile['socials'] = {};
    const additionalEmails: Profile['emails'] = [];
    const additionalPhones: Profile['phones'] = [];
    const additionalWebsites: Profile['websites'] = [];
    const additionalAddresses: Profile['addresses'] = [];

    if (cardLinks) {
      for (const link of cardLinks) {
        const kind = link.kind?.toLowerCase();
        const label = link.label?.toLowerCase() || '';
        
        // Check if it's an additional contact (not primary)
        const isAdditional = label.includes('additional') || 
                            label.includes('alternate') || 
                            label.includes('other') || 
                            label.includes('secondary') ||
                            label.includes('work') ||
                            label.includes('home') ||
                            label.includes('mobile') ||
                            label.includes('office');
        
        if (kind === 'email' && isAdditional) {
          additionalEmails.push({ type: 'OTHER', value: link.value, label: link.label });
        } else if (kind === 'phone' && isAdditional) {
          additionalPhones.push({ type: 'OTHER', value: link.value });
        } else if (kind === 'url' && isAdditional) {
          additionalWebsites.push({ type: 'OTHER', value: link.value, label: link.label });
        } else if (kind === 'custom' && label.includes('location')) {
          additionalAddresses.push({ street: link.value, type: 'OTHER', label: link.label });
        } else if (kind === 'facebook') socials.facebook = link.value;
        else if (kind === 'instagram') socials.instagram = link.value;
        else if (kind === 'tiktok') socials.tiktok = link.value;
        else if (kind === 'youtube') socials.youtube = link.value;
        else if (kind === 'linkedin') socials.linkedin = link.value;
        else if (kind === 'x' || kind === 'twitter') socials.twitter = link.value;
        else if (kind === 'whatsapp') socials.whatsapp = link.value;
      }
    }

    // Build custom URL from slug if available, else fall back to website field
    const customUrl = card.custom_slug
      ? `https://tagex.app/${card.custom_slug}`
      : (card.website || undefined);

    // Build canonical profile
    const profile: Profile = {
      prefix: card.prefix || undefined,
      first_name: card.first_name || '',
      middle_name: card.middle_name || undefined,
      last_name: card.last_name || '',
      suffix: card.suffix || undefined,
      org: card.company || undefined,
      title: card.title || undefined,
      email: card.email || undefined,
      emails: additionalEmails.length > 0 ? additionalEmails : undefined,
      phones: card.phone ? [{ type: 'CELL', value: card.phone }, ...additionalPhones] : (additionalPhones.length > 0 ? additionalPhones : undefined),
      website: customUrl,
      // Skip address: card.location is a free-text region (e.g. "Philippines"),
      // not a structured postal address — emitting ADR causes contacts apps
      // to render misleading "Work = Philippines" entries.
      notes: card.bio || undefined,
      photo_url: includePhoto ? (card.avatar_url || undefined) : undefined,
      socials: Object.keys(socials).length > 0 ? socials : undefined,
      uid: `cardex-${card.id}`,
    };

    console.log("Generating vCard with canonical format");
    const vcardContent = await profileToVCardV3(profile);

    console.log("vCard generated successfully");

    // Return the vCard with proper headers
    return new Response(vcardContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/vcard;charset=utf-8",
        "Content-Disposition": `attachment; filename="${card.full_name.replace(/\s+/g, "-")}.vcf"`,
      },
    });
  } catch (error) {
    console.error("Error generating vCard:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
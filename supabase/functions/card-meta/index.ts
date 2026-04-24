// Crawler-facing HTML with per-card Open Graph tags.
// Real users are served the SPA via vercel.json rewrites that only match
// known bot user agents. This function looks up the card by slug or
// custom_slug and renders OG tags pointing at the card owner's avatar.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PUBLIC_SITE = "https://tagex.app";
const FALLBACK_IMAGE = `${PUBLIC_SITE}/placeholder.svg`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(opts: {
  title: string;
  description: string;
  image: string;
  url: string;
}): string {
  const { title, description, image, url } = opts;
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const i = escapeHtml(image);
  const u = escapeHtml(url);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${t}</title>
<meta name="description" content="${d}" />
<link rel="canonical" href="${u}" />

<!-- Open Graph -->
<meta property="og:type" content="profile" />
<meta property="og:site_name" content="Card-Ex" />
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:url" content="${u}" />
<meta property="og:image" content="${i}" />
<meta property="og:image:secure_url" content="${i}" />
<meta property="og:image:width" content="800" />
<meta property="og:image:height" content="800" />
<meta property="og:image:alt" content="${t}" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" />
<meta name="twitter:image" content="${i}" />

<meta http-equiv="refresh" content="0; url=${u}" />
</head>
<body>
<p><a href="${u}">${t}</a></p>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Accept ?slug=... (custom slug) or ?code=... (built-in /c/:slug code).
    const customSlug = url.searchParams.get("slug")?.trim() || null;
    const code = url.searchParams.get("code")?.trim() || null;

    if (!customSlug && !code) {
      return new Response("Missing slug or code", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase
      .from("cards")
      .select("full_name, title, company, bio, avatar_url, slug, custom_slug, is_published")
      .eq("is_published", true)
      .limit(1);

    if (customSlug) {
      query = query.eq("custom_slug", customSlug);
    } else {
      query = query.eq("slug", code!);
    }

    const { data: card, error } = await query.maybeSingle();

    // Fallback: generic site preview if card not found / unpublished.
    if (error || !card) {
      const html = buildHtml({
        title: "Card-Ex — Digital Business Portfolio",
        description: "Your premium digital business card.",
        image: FALLBACK_IMAGE,
        url: PUBLIC_SITE,
      });
      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    const titleParts = [card.full_name];
    if (card.title) titleParts.push(card.title);
    if (card.company) titleParts.push(card.company);
    const ogTitle = titleParts.filter(Boolean).join(" — ");

    const ogDescription =
      card.bio?.trim() ||
      [card.title, card.company].filter(Boolean).join(" • ") ||
      "View my digital business card.";

    const cardUrl = card.custom_slug
      ? `${PUBLIC_SITE}/${card.custom_slug}`
      : `${PUBLIC_SITE}/c/${card.slug}`;

    const html = buildHtml({
      title: ogTitle,
      description: ogDescription,
      image: card.avatar_url || FALLBACK_IMAGE,
      url: cardUrl,
    });

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    console.error("card-meta error:", err);
    return new Response("Internal error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});

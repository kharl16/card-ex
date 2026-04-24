// Generates a luxury gold-on-black OG fallback image as SVG.
// Used by card-meta when a card has no avatar_url so social previews
// never show the generic placeholder.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getInitials(name: string): string {
  const parts = (name || "")
    .trim()
    .split(/\s+/)
    .filter((p) => /[A-Za-z0-9]/.test(p));
  if (parts.length === 0) return "CE";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSvg(opts: { initials: string; name: string; subtitle: string }): string {
  const { initials, name, subtitle } = opts;
  const safeName = escapeXml(name);
  const safeSub = escapeXml(subtitle);
  const safeInit = escapeXml(initials);

  // 1200x630 — Facebook/Twitter recommended OG size
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="50%" stop-color="#1a1410"/>
      <stop offset="100%" stop-color="#050505"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f4d57a"/>
      <stop offset="50%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#a8841f"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#d4af37" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#d4af37" stop-opacity="0"/>
    </radialGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
      <feOffset dx="0" dy="3"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <ellipse cx="600" cy="315" rx="500" ry="350" fill="url(#glow)"/>

  <!-- Subtle diagonal pattern lines -->
  <g stroke="#d4af37" stroke-opacity="0.06" stroke-width="1">
    <line x1="0" y1="100" x2="1200" y2="-100"/>
    <line x1="0" y1="300" x2="1200" y2="100"/>
    <line x1="0" y1="500" x2="1200" y2="300"/>
    <line x1="0" y1="700" x2="1200" y2="500"/>
  </g>

  <!-- Gold border frame -->
  <rect x="30" y="30" width="1140" height="570" fill="none" stroke="url(#gold)" stroke-width="2" rx="20"/>
  <rect x="42" y="42" width="1116" height="546" fill="none" stroke="#d4af37" stroke-opacity="0.25" stroke-width="1" rx="16"/>

  <!-- Avatar circle with initials -->
  <g filter="url(#softShadow)">
    <circle cx="600" cy="245" r="120" fill="#0a0a0a" stroke="url(#gold)" stroke-width="3"/>
    <circle cx="600" cy="245" r="112" fill="none" stroke="#d4af37" stroke-opacity="0.4" stroke-width="1"/>
    <text x="600" y="245" text-anchor="middle" dominant-baseline="central"
          font-family="Georgia, 'Times New Roman', serif" font-size="96" font-weight="700"
          fill="url(#gold)">${safeInit}</text>
  </g>

  <!-- Name -->
  <text x="600" y="430" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-size="56" font-weight="600"
        fill="#f5f5f5">${safeName}</text>

  <!-- Subtitle -->
  ${
    safeSub
      ? `<text x="600" y="480" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif" font-size="26" font-weight="400"
        fill="#d4af37" opacity="0.9">${safeSub}</text>`
      : ""
  }

  <!-- Brand mark -->
  <text x="600" y="560" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif" font-size="16" font-weight="600"
        letter-spacing="6" fill="#d4af37" opacity="0.7">CARD-EX • TAGEX.APP</text>
</svg>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const name = url.searchParams.get("name")?.trim() || "Card-Ex";
    const subtitle = url.searchParams.get("subtitle")?.trim() || "";
    const initialsParam = url.searchParams.get("initials")?.trim();
    const initials = initialsParam || getInitials(name);

    // Truncate to keep layout tidy.
    const safeName = name.length > 36 ? name.slice(0, 35) + "…" : name;
    const safeSub = subtitle.length > 60 ? subtitle.slice(0, 59) + "…" : subtitle;
    const safeInit = initials.slice(0, 3);

    const svg = buildSvg({ initials: safeInit, name: safeName, subtitle: safeSub });

    return new Response(svg, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (err) {
    console.error("og-image error:", err);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});

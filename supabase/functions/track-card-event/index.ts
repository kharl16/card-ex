import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const eventSchema = z.object({
  card_id: z.string().uuid(),
  kind: z.enum(['view', 'qr_scan', 'vcard_download', 'cta_click']),
  share_code: z.string().max(50).regex(/^[a-zA-Z0-9_-]*$/).optional().nullable(),
});

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_EVENTS_PER_WINDOW = 10;

function hashIP(ip: string): string {
  // Simple hash function for IP addresses - produces non-reversible hash
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Anonymize user agent to just browser category - prevents user fingerprinting
function anonymizeUserAgent(ua: string | null): string | null {
  if (!ua) return null;
  const uaLower = ua.toLowerCase();
  
  // Return only browser category, not version or OS details
  if (uaLower.includes('chrome') && !uaLower.includes('edg')) return 'Chrome';
  if (uaLower.includes('firefox')) return 'Firefox';
  if (uaLower.includes('safari') && !uaLower.includes('chrome')) return 'Safari';
  if (uaLower.includes('edg')) return 'Edge';
  if (uaLower.includes('opera') || uaLower.includes('opr')) return 'Opera';
  if (uaLower.includes('bot') || uaLower.includes('crawler') || uaLower.includes('spider')) return 'Bot';
  return 'Other';
}

// Anonymize referrer to just domain - prevents tracking full URLs
function anonymizeReferrer(ref: string | null): string | null {
  if (!ref) return null;
  try {
    const url = new URL(ref);
    return url.hostname; // Only store domain, not full path
  } catch {
    return null;
  }
}

async function checkRateLimit(supabase: any, ipHash: string, cardId: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  // Try to get existing rate limit record
  const { data: existing, error: selectError } = await supabase
    .from('rate_limits')
    .select('event_count, window_start')
    .eq('ip_hash', ipHash)
    .eq('card_id', cardId)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    console.error('Rate limit check failed', { error_code: selectError.code });
    return true; // Allow on error to prevent false blocks
  }

  // If no record exists or window expired, create new record
  if (!existing || new Date(existing.window_start) < windowStart) {
    const { error: upsertError } = await supabase
      .from('rate_limits')
      .upsert({
        ip_hash: ipHash,
        card_id: cardId,
        event_count: 1,
        window_start: new Date(),
        updated_at: new Date(),
      }, {
        onConflict: 'ip_hash,card_id'
      });

    if (upsertError) {
      console.error('Rate limit upsert failed', { error_code: upsertError.code });
      return true; // Allow on error
    }
    return true;
  }

  // Check if limit exceeded
  if (existing.event_count >= MAX_EVENTS_PER_WINDOW) {
    return false;
  }

  // Increment counter
  const { error: updateError } = await supabase
    .from('rate_limits')
    .update({
      event_count: existing.event_count + 1,
      updated_at: new Date(),
    })
    .eq('ip_hash', ipHash)
    .eq('card_id', cardId);

  if (updateError) {
    console.error('Rate limit update failed', { error_code: updateError.code });
    return true; // Allow on error
  }

  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input with Zod
    const validation = eventSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { card_id, kind, share_code } = validation.data;

    // Get client IP and validate inputs
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const ipHash = hashIP(clientIP);
    
    // Anonymize user agent to browser category only (prevents fingerprinting)
    const rawUserAgent = req.headers.get('user-agent');
    const userAgent = anonymizeUserAgent(rawUserAgent);
    
    // Anonymize referrer to domain only (prevents tracking full URLs)
    const rawReferrer = req.headers.get('referer');
    const referrer = anonymizeReferrer(rawReferrer);

    // Create Supabase client with service role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check rate limit (server-side, persists across cold starts)
    const rateLimitOk = await checkRateLimit(supabase, ipHash, card_id);
    if (!rateLimitOk) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify card exists and is published
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('id, is_published')
      .eq('id', card_id)
      .single();

    if (cardError || !card?.is_published) {
      return new Response(
        JSON.stringify({ error: 'Card not found or not published' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert event
    const { error: insertError } = await supabase
      .from('card_events')
      .insert({
        card_id,
        kind,
        ip_hash: ipHash,
        user_agent: userAgent,
        referrer: referrer,
        share_code: share_code || null,
      });

    if (insertError) {
      console.error('Failed to insert event', { kind, error_code: insertError.code });
      return new Response(
        JSON.stringify({ error: 'Failed to track event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Request processing failed');
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

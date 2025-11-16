import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { card_id, include_photo = true } = await req.json();

    if (!card_id) {
      return new Response(
        JSON.stringify({ error: 'card_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for storage access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch card data
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', card_id)
      .single();

    if (cardError || !card) {
      return new Response(
        JSON.stringify({ error: 'Card not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch social links
    const { data: socialLinks } = await supabase
      .from('card_links')
      .select('*')
      .eq('card_id', card_id)
      .order('sort_index', { ascending: true });

    // Helper function to escape vCard values
    const escapeVCardValue = (value: string = ""): string => {
      return value
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
    };

    // Helper function to assemble FN (formatted name)
    const assembleFN = (card: any): string => {
      const base = [card.prefix, card.first_name, card.middle_name, card.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      
      if (!card.suffix) return base;
      
      // Use comma for generational suffixes (Jr., Sr., II, III, IV)
      const isGenerational = /^(Jr\.?|Sr\.?|II|III|IV)$/i.test(card.suffix);
      const separator = isGenerational ? ", " : " ";
      
      return `${base}${separator}${card.suffix}`.trim();
    };

    // Helper function to fold long lines to 75 characters
    const foldLine = (line: string): string => {
      if (line.length <= 75) return line;
      
      const result: string[] = [];
      let pos = 0;
      
      // First line can be 75 chars
      result.push(line.substring(0, 75));
      pos = 75;
      
      // Continuation lines start with space and can have 74 more chars
      while (pos < line.length) {
        result.push(' ' + line.substring(pos, pos + 74));
        pos += 74;
      }
      
      return result.join('\r\n');
    };

    // Build vCard lines
    const vcardLines: string[] = [
      'BEGIN:VCARD',
      'VERSION:3.0',
    ];

    // vCard 3.0 spec: N = Family(Last); Given(First); Additional(Middle); Honorific Prefix; Honorific Suffix
    const lastName = card.last_name || '';
    const firstName = card.first_name || '';
    const middleName = card.middle_name || '';
    const prefix = card.prefix || '';
    const suffix = card.suffix || '';
    
    const N = [
      escapeVCardValue(lastName),    // Family name
      escapeVCardValue(firstName),   // Given name
      escapeVCardValue(middleName),  // Additional names
      escapeVCardValue(prefix),      // Honorific prefix
      escapeVCardValue(suffix)       // Honorific suffix
    ].join(';');
    
    vcardLines.push(`N:${N}`);
    vcardLines.push(`FN:${escapeVCardValue(assembleFN(card))}`);

    // ORG field
    if (card.company) {
      vcardLines.push(`ORG:${escapeVCardValue(card.company)};`);
    }

    // TITLE field
    if (card.title) {
      vcardLines.push(`TITLE:${escapeVCardValue(card.title)}`);
    }

    // EMAIL field
    if (card.email) {
      vcardLines.push(`EMAIL;TYPE=WORK,INTERNET:${escapeVCardValue(card.email)}`);
    }

    // TEL field
    if (card.phone) {
      vcardLines.push(`TEL;TYPE=CELL:${escapeVCardValue(card.phone)}`);
    }

    // Website URL
    if (card.website) {
      vcardLines.push(`URL:${escapeVCardValue(card.website)}`);
    }

    // Social links as additional URLs
    if (socialLinks && socialLinks.length > 0) {
      for (const link of socialLinks) {
        if (link.value) {
          vcardLines.push(`URL:${escapeVCardValue(link.value)}`);
        }
      }
    }

    // ADR field (Address)
    if (card.location) {
      vcardLines.push(`ADR;TYPE=WORK:;;${escapeVCardValue(card.location)};;;;`);
    }

    // NOTE field
    if (card.bio) {
      vcardLines.push(`NOTE:${escapeVCardValue(card.bio)}`);
    }

    // PHOTO field with Base64 encoding
    if (include_photo && card.avatar_url) {
      try {
        // Extract the storage path from the full URL
        const urlParts = card.avatar_url.split('/storage/v1/object/public/');
        if (urlParts.length === 2) {
          const storagePath = urlParts[1];
          
          // Download image from storage
          const { data: imageData, error: downloadError } = await supabase
            .storage
            .from('media')
            .download(storagePath.replace('media/', ''));

          if (!downloadError && imageData) {
            // Convert blob to array buffer then to base64
            const arrayBuffer = await imageData.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Detect MIME type (default to JPEG)
            let photoType = 'JPEG';
            if (card.avatar_url.toLowerCase().includes('.png')) {
              photoType = 'PNG';
            }
            
            // Convert to base64
            const base64 = btoa(String.fromCharCode(...uint8Array));
            
            // Build photo line with proper folding
            const photoLine = `PHOTO;TYPE=${photoType};ENCODING=BASE64:${base64}`;
            vcardLines.push(foldLine(photoLine));
          } else {
            console.error('Failed to download image:', downloadError);
          }
        }
      } catch (photoError) {
        console.error('Error processing photo:', photoError);
        // Continue without photo if there's an error
      }
    }

    vcardLines.push('END:VCARD');

    // Join with CRLF line endings
    const vcardContent = vcardLines.join('\r\n');

    // Generate filename
    const filename = `${card.full_name.replace(/\s+/g, '-').toLowerCase()}.vcf`;

    return new Response(vcardContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/vcard; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error generating vCard:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate vCard' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

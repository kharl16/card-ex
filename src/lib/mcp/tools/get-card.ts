import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function client() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_card",
  title: "Get a card by slug",
  description:
    "Fetch a published Card-Ex card by its slug or custom_slug. Returns public profile, contact, and social details.",
  inputSchema: {
    slug: z.string().trim().min(1).describe("The card's slug or custom_slug (e.g. 'iameboybautista')."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }) => {
    const supabase = client();
    const { data, error } = await supabase
      .from("cards")
      .select(
        "id, slug, custom_slug, full_name, title, company, bio, email, phone, location, avatar_url, cover_url, social_links, public_url, is_published",
      )
      .or(`slug.eq.${slug},custom_slug.eq.${slug}`)
      .eq("is_published", true)
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    if (!data) {
      return { content: [{ type: "text", text: `No published card found for slug "${slug}".` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { card: data },
    };
  },
});

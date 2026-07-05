import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function client() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "search_cards",
  title: "Search published cards",
  description:
    "Search Card-Ex published business cards by name, company, title, or bio. Returns basic public info.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Text to match against name, company, title, or bio."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const supabase = client();
    const pattern = `%${query}%`;
    const { data, error } = await supabase
      .from("cards")
      .select("id, slug, custom_slug, full_name, title, company, bio, avatar_url")
      .eq("is_published", true)
      .or(
        `full_name.ilike.${pattern},company.ilike.${pattern},title.ilike.${pattern},bio.ilike.${pattern}`,
      )
      .limit(limit ?? 10);

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { results: data ?? [] },
    };
  },
});

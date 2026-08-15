import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchCards from "./tools/search-cards";
import getCard from "./tools/get-card";
import listRecentCards from "./tools/list-recent-cards";

const supabaseUrl = (
  process.env.SUPABASE_URL ?? "https://lorowpouhpjjxembvwyi.supabase.co"
).replace(/\/+$/, "");

export default defineMcp({
  name: "card-ex-mcp",
  title: "Card-Ex by Tagex.app",
  version: "0.1.0",
  instructions:
    "Tools for discovering and reading public Card-Ex business cards on tagex.app. Use `search_cards` to find people or companies, `get_card` to fetch full details for a known slug, and `list_recent_cards` to browse recently published cards.",
  // Require a verified Supabase OAuth bearer token before any tool can run.
  auth: auth.oauth.issuer({
    issuer: `${supabaseUrl}/auth/v1`,
    acceptedAudiences: "authenticated",
    jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
    resourceName: "Card-Ex MCP",
  }),
  tools: [searchCards, getCard, listRecentCards],
});

import { defineMcp } from "@lovable.dev/mcp-js";
import searchCards from "./tools/search-cards";
import getCard from "./tools/get-card";
import listRecentCards from "./tools/list-recent-cards";

export default defineMcp({
  name: "card-ex-mcp",
  title: "Card-Ex by Tagex.app",
  version: "0.1.0",
  instructions:
    "Tools for discovering and reading public Card-Ex business cards on tagex.app. Use `search_cards` to find people or companies, `get_card` to fetch full details for a known slug, and `list_recent_cards` to browse recently published cards.",
  tools: [searchCards, getCard, listRecentCards],
});

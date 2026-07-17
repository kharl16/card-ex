import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SEO } from "@/components/SEO";
import DirectorySection from "@/components/tools/sections/DirectorySection";
import { useSearchQueryParam } from "@/hooks/useSearchQueryParam";

export default function DistributorLocator() {
  const [searchQuery, setSearchQuery] = useState("");
  useSearchQueryParam(setSearchQuery);

  return (
    <div className="min-h-screen bg-background flex flex-col w-full max-w-full overflow-x-hidden">
      <SEO
        title="Distributor Locator — Find a Card-Ex partner near you"
        description="Browse Card-Ex partner locations and distributors. Search by name, sort by distance, and view contact details."
        path="/locator"
      />

      {/* Sticky header (matches Tools Orb Branch UX) */}
      <div className="sticky top-0 z-40 bg-background border-b p-4 space-y-3 w-full max-w-full overflow-x-hidden">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to home"
              className="h-12 w-12 rounded-full shrink-0"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Branches</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base rounded-full bg-muted/50"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-x-hidden">
        <div className="p-4">
          <DirectorySection
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery("")}
          />
        </div>
      </main>
    </div>
  );
}

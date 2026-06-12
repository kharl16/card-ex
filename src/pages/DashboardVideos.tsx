import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TrainingsSection from "@/components/tools/sections/TrainingsSection";
import ContinueWatching from "@/components/dashboard/ContinueWatching";

export default function DashboardVideos() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background overflow-x-hidden max-w-[100vw] pb-20">
      <header className="sticky top-0 z-40 border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center gap-2 px-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={() => navigate("/dashboard")}
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PlayCircle className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold tracking-tight">Videos</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        <TrainingsSection searchQuery={searchQuery} />
      </main>
    </div>
  );
}

import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { universalBooks, discBooks, loveLanguageBooks, mindsetBooks, Book } from "@/data/bookRecommendations";
import { BookOpen, Sparkles, Search } from "lucide-react";

export default function BookRecommendationsSection() {
  const { user } = useAuth();
  const [discType, setDiscType] = useState<string | null>(null);
  const [llType, setLlType] = useState<string | null>(null);
  const [mindset, setMindset] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("cards")
        .select("disc_result, love_language_result, mindset_result")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (data) {
        const disc = data.disc_result as any;
        const ll = data.love_language_result as any;
        const ms = data.mindset_result as any;
        if (disc?.type) setDiscType(disc.type);
        if (ll?.type) setLlType(ll.type);
        if (ms?.pct != null) setMindset(ms.pct >= 60 ? "growth" : "fixed");
      }
      setLoading(false);
    })();
  }, [user]);

  const personalized: { source: string; books: Book[] }[] = useMemo(() => {
    const out: { source: string; books: Book[] }[] = [];
    if (discType && discBooks[discType]) {
      out.push({ source: `Based on your DISC type: ${discType}`, books: discBooks[discType] });
    }
    if (llType && loveLanguageBooks[llType]) {
      out.push({ source: `Based on your Love Language`, books: loveLanguageBooks[llType] });
    }
    if (mindset && mindsetBooks[mindset]) {
      out.push({ source: `Based on your Mindset score`, books: mindsetBooks[mindset] });
    }
    return out;
  }, [discType, llType, mindset]);

  const renderBook = (b: Book) => {
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(`${b.title} ${b.author}`)}&i=stripbooks`;
    return (
      <Card key={`${b.title}-${b.author}`} className="p-3 flex gap-3 items-start hover:border-primary/40 transition-colors">
        <div className="text-2xl shrink-0">{b.emoji}</div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm leading-tight">{b.title}</h4>
          <p className="text-xs text-muted-foreground mb-1">by {b.author}</p>
          <p className="text-xs leading-relaxed">{b.why}</p>
        </div>
        <Button asChild variant="ghost" size="icon" className="shrink-0 h-8 w-8">
          <a href={searchUrl} target="_blank" rel="noopener noreferrer" aria-label={`Search for ${b.title}`}>
            <Search className="h-3.5 w-3.5" />
          </a>
        </Button>
      </Card>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-base font-bold">Books Picked For You</h3>
        <p className="text-xs text-muted-foreground">
          Recommendations based on your DISC, Love Language, and Mindset results.
        </p>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-6">Loading recommendations…</p>
      ) : personalized.length === 0 ? (
        <Card className="p-4 text-center text-sm text-muted-foreground">
          <Sparkles className="h-5 w-5 mx-auto mb-2 text-primary" />
          Take the DISC, Love Language, or Mindset quiz to unlock personalized picks.
        </Card>
      ) : (
        personalized.map((group, i) => (
          <div key={i} className="space-y-2">
            <Badge variant="secondary" className="text-[11px]">{group.source}</Badge>
            <div className="space-y-2">{group.books.map(renderBook)}</div>
          </div>
        ))
      )}

      <div className="space-y-2 pt-2 border-t border-border/50">
        <Badge variant="outline" className="text-[11px]">Universal Classics</Badge>
        <div className="space-y-2">{universalBooks.map(renderBook)}</div>
      </div>
    </div>
  );
}

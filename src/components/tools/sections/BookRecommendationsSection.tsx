import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { universalBooks, discBooks, loveLanguageBooks, mindsetBooks, Book } from "@/data/bookRecommendations";
import { BookOpen, Sparkles, FileText, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

export default function BookRecommendationsSection() {
  const { user } = useAuth();
  const [discType, setDiscType] = useState<string | null>(null);
  const [llType, setLlType] = useState<string | null>(null);
  const [mindset, setMindset] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [openBook, setOpenBook] = useState<Book | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [cache, setCache] = useState<Record<string, string>>({});

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

  const fetchSummary = async (book: Book) => {
    const key = `${book.title}|${book.author}`;
    setOpenBook(book);
    if (cache[key]) {
      setSummary(cache[key]);
      return;
    }
    setSummary("");
    setSummaryLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("book-summary", {
        body: { title: book.title, author: book.author },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const text = data?.summary || "No summary available.";
      setSummary(text);
      setCache((c) => ({ ...c, [key]: text }));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load summary");
      setSummary("Sorry, we couldn't generate a summary right now. Please try again later.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const renderBook = (b: Book) => (
    <Card key={`${b.title}-${b.author}`} className="p-3 flex gap-3 items-start hover:border-primary/40 transition-colors">
      <div className="text-2xl shrink-0">{b.emoji}</div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm leading-tight">{b.title}</h4>
        <p className="text-xs text-muted-foreground mb-1">by {b.author}</p>
        <p className="text-xs leading-relaxed">{b.why}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-8 w-8"
        onClick={() => fetchSummary(b)}
        aria-label={`Read summary of ${b.title}`}
      >
        <FileText className="h-3.5 w-3.5" />
      </Button>
    </Card>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-base font-bold">Books Picked For You</h3>
        <p className="text-xs text-muted-foreground">
          Tap the page icon to read a quick AI-powered summary of any book.
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

      <Dialog open={!!openBook} onOpenChange={(o) => !o && setOpenBook(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{openBook?.emoji}</span>
              <span className="leading-tight">{openBook?.title}</span>
            </DialogTitle>
            <DialogDescription>by {openBook?.author}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-3 -mr-3">
            {summaryLoading ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                <p className="text-sm">Generating summary…</p>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:mt-4 prose-headings:mb-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

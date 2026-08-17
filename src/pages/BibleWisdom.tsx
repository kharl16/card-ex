import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Heart,
  Search,
  Share2,
  Sun,
  Sunrise,
  Moon,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import {
  useBibleWisdom,
  SLOT_LABELS,
  type BibleWisdom as WisdomRow,
  type WisdomSlot,
} from "@/hooks/useBibleWisdom";

const SLOT_ICON: Record<WisdomSlot, typeof Sun> = {
  morning: Sunrise,
  midday: Sun,
  evening: Moon,
};

function WisdomCard({
  entry,
  isFavorite,
  onToggleFavorite,
  onShare,
  highlight,
}: {
  entry: WisdomRow;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
  highlight?: boolean;
}) {
  const Icon = SLOT_ICON[entry.time_slot as WisdomSlot] ?? BookOpen;
  return (
    <article
      className={`relative overflow-hidden rounded-3xl border p-5 backdrop-blur-xl transition-colors ${
        highlight
          ? "border-primary/40 bg-card/60 shadow-lg shadow-primary/10"
          : "border-border/40 bg-card/40"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Icon className="h-3.5 w-3.5" />
          {SLOT_LABELS[entry.time_slot as WisdomSlot] ?? entry.time_slot}
        </span>
        <Badge variant="outline" className="text-[11px]">
          Day {entry.day_number}
        </Badge>
        <Badge variant="secondary" className="text-[11px]">
          {entry.theme}
        </Badge>
      </div>

      <h3 className="text-base font-bold tracking-tight sm:text-lg">{entry.title}</h3>

      <blockquote className="mt-2 border-l-2 border-primary/50 pl-3 text-sm italic leading-relaxed text-foreground/90">
        “{entry.verse_text}”
        <footer className="mt-1 text-xs font-semibold not-italic text-primary/80">
          — {entry.reference} ({entry.bible_translation})
        </footer>
      </blockquote>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{entry.reflection}</p>

      <div className="mt-3 rounded-2xl border border-border/40 bg-background/40 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
          Business action
        </p>
        <p className="mt-1 text-sm font-medium">{entry.business_principle}</p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button
          type="button"
          variant={isFavorite ? "default" : "outline"}
          size="sm"
          className="h-11 gap-2"
          onClick={onToggleFavorite}
          aria-pressed={isFavorite}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
          {isFavorite ? "Saved" : "Save"}
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-11 gap-2" onClick={onShare}>
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>
    </article>
  );
}

export default function BibleWisdomPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    entries,
    byDay,
    todayEntries,
    dayNumber,
    slot,
    themes,
    books,
    favorites,
    toggleFavorite,
    isSignedIn,
    loading,
  } = useBibleWisdom();

  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState("all");
  const [book, setBook] = useState("all");
  const [slotFilter, setSlotFilter] = useState("all");
  const [browseDay, setBrowseDay] = useState<number | null>(null);

  const share = async (entry: WisdomRow) => {
    const text = `${entry.title}\n\n“${entry.verse_text}”\n— ${entry.reference}\n\nAction: ${entry.business_principle}\n\nvia Card-Ex`;
    try {
      if (navigator.share) {
        await navigator.share({ title: entry.title, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Wisdom copied to your clipboard." });
    } catch {
      /* user cancelled share */
    }
  };

  const onToggle = (id: string) => {
    if (!isSignedIn) {
      toast({ title: "Sign in required", description: "Sign in to save favorites." });
      return;
    }
    void toggleFavorite(id);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (theme !== "all" && e.theme !== theme) return false;
      if (book !== "all" && e.bible_book !== book) return false;
      if (slotFilter !== "all" && e.time_slot !== slotFilter) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.verse_text.toLowerCase().includes(q) ||
        e.reference.toLowerCase().includes(q) ||
        e.reflection.toLowerCase().includes(q) ||
        e.business_principle.toLowerCase().includes(q) ||
        e.theme.toLowerCase().includes(q)
      );
    });
  }, [entries, query, theme, book, slotFilter]);

  const favoriteEntries = useMemo(
    () => entries.filter((e) => favorites.has(e.id)),
    [entries, favorites]
  );

  const availableDays = useMemo(
    () => Array.from(byDay.keys()).sort((a, b) => a - b),
    [byDay]
  );
  const browsedEntries = browseDay ? byDay.get(browseDay) ?? [] : [];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-24 sm:pb-8">
      <SEO
        title="Bible Wisdom for Entrepreneurs | Card-Ex"
        description="A 365-day Bible wisdom system for entrepreneurs — morning, midday and evening scripture with a practical business action for every day."
      />

      <header className="sticky top-0 z-40 border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center gap-2 px-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={() => navigate("/dashboard/workspace")}
            aria-label="Back to workspace"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="truncate text-lg font-bold tracking-tight">Bible Wisdom</h1>
          <Badge variant="outline" className="ml-auto shrink-0 text-[11px]">
            Day {dayNumber} / 365
          </Badge>
        </div>
      </header>

      <main className="container mx-auto space-y-5 px-4 py-5">
        <Tabs defaultValue="today">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today" className="h-11">
              Today
            </TabsTrigger>
            <TabsTrigger value="explore" className="h-11">
              Explore
            </TabsTrigger>
            <TabsTrigger value="favorites" className="h-11">
              Favorites
            </TabsTrigger>
          </TabsList>

          {/* TODAY */}
          <TabsContent value="today" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Three readings a day — morning, midday and evening. The cycle loops every 365 days.
            </p>
            {loading && <p className="text-sm text-muted-foreground">Loading today’s wisdom…</p>}
            {!loading && todayEntries.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No entries scheduled for day {dayNumber} yet.
              </p>
            )}
            <div className="space-y-4">
              {todayEntries.map((e) => (
                <WisdomCard
                  key={e.id}
                  entry={e}
                  highlight={e.time_slot === slot}
                  isFavorite={favorites.has(e.id)}
                  onToggleFavorite={() => onToggle(e.id)}
                  onShare={() => void share(e)}
                />
              ))}
            </div>
          </TabsContent>

          {/* EXPLORE */}
          <TabsContent value="explore" className="mt-4 space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-12 pl-9"
                  placeholder="Search verse, theme, or action…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All themes</SelectItem>
                    {themes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={book} onValueChange={setBook}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Book" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All books</SelectItem>
                    {books.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={slotFilter} onValueChange={setSlotFilter}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Time of day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All times</SelectItem>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="midday">Midday</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Day browser */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Button
                  size="sm"
                  variant={browseDay === null ? "default" : "outline"}
                  className="h-10 shrink-0"
                  onClick={() => setBrowseDay(null)}
                >
                  All days
                </Button>
                {availableDays.map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={browseDay === d ? "default" : "outline"}
                    className="h-10 shrink-0"
                    onClick={() => setBrowseDay(d)}
                  >
                    Day {d}
                  </Button>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {browseDay
                ? `${browsedEntries.length} entries on day ${browseDay}`
                : `${filtered.length} of ${entries.length} entries`}
            </p>

            <div className="space-y-4">
              {(browseDay ? browsedEntries : filtered).slice(0, 60).map((e) => (
                <WisdomCard
                  key={e.id}
                  entry={e}
                  isFavorite={favorites.has(e.id)}
                  onToggleFavorite={() => onToggle(e.id)}
                  onShare={() => void share(e)}
                />
              ))}
            </div>
            {!browseDay && filtered.length > 60 && (
              <p className="text-center text-xs text-muted-foreground">
                Showing the first 60 matches — refine your search to narrow further.
              </p>
            )}
          </TabsContent>

          {/* FAVORITES */}
          <TabsContent value="favorites" className="mt-4 space-y-4">
            {!isSignedIn && (
              <p className="text-sm text-muted-foreground">Sign in to save your favorites.</p>
            )}
            {isSignedIn && favoriteEntries.length === 0 && (
              <div className="rounded-3xl border border-border/40 bg-card/40 p-6 text-center">
                <Sparkles className="mx-auto h-6 w-6 text-primary" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Nothing saved yet. Tap “Save” on any wisdom to keep it here.
                </p>
              </div>
            )}
            <div className="space-y-4">
              {favoriteEntries.map((e) => (
                <WisdomCard
                  key={e.id}
                  entry={e}
                  isFavorite
                  onToggleFavorite={() => onToggle(e.id)}
                  onShare={() => void share(e)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <MobileBottomNav />
    </div>
  );
}

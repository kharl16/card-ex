import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { affirmationCategories, AffirmationCategory } from "@/data/affirmations";
import { Sparkles, Copy, Share2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Language = "english" | "tagalog";

const CATEGORIES = Object.keys(affirmationCategories) as AffirmationCategory[];

export default function AffirmationsSection() {
  const [language, setLanguage] = useState<Language>("english");
  const [category, setCategory] = useState<AffirmationCategory>("success");
  const [seed, setSeed] = useState(0);

  const current = useMemo(() => {
    const list = affirmationCategories[category].affirmations;
    return list[seed % list.length];
  }, [category, seed]);

  const text = language === "english" ? current.english : current.tagalog;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success(language === "english" ? "Copied!" : "Nakopya!");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: "Daily Affirmation", text }).catch(() => handleCopy());
    } else {
      handleCopy();
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {language === "english" ? "Today's Affirmation" : "Ngayong Araw"}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setLanguage((p) => p === "english" ? "tagalog" : "english")} className="text-xs">
          {language === "english" ? "🇵🇭 Tagalog" : "🇺🇸 English"}
        </Button>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => {
          const meta = affirmationCategories[c];
          const active = c === category;
          return (
            <button
              key={c}
              onClick={() => { setCategory(c); setSeed(0); }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/40"
              }`}
            >
              <span className="mr-1">{meta.emoji}</span>
              {language === "english" ? meta.en : meta.tl}
            </button>
          );
        })}
      </div>

      {/* Affirmation card */}
      <Card className="p-6 text-center bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 min-h-[140px] flex flex-col justify-center">
        <div className="text-3xl mb-2">{affirmationCategories[category].emoji}</div>
        <p className="text-base font-semibold leading-relaxed italic">"{text}"</p>
      </Card>

      <div className="flex gap-2">
        <Button onClick={() => setSeed((s) => s + 1)} className="flex-1 gap-1">
          <RefreshCw className="h-4 w-4" />
          {language === "english" ? "New Affirmation" : "Bago"}
        </Button>
        <Button variant="outline" size="icon" onClick={handleCopy}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleShare}>
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {language === "english"
          ? "💡 Read aloud 3x each morning for best results."
          : "💡 Basahin nang malakas 3 beses tuwing umaga."}
      </p>
    </div>
  );
}

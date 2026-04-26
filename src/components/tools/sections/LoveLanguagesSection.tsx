import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { loveLanguageQuestions, LoveLanguageType } from "@/data/loveLanguageQuestions";
import { loveLanguageResults } from "@/data/loveLanguageResults";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  RotateCcw,
  Share2,
  Save,
  Heart,
  Target,
  Users,
  CheckCircle2,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import SaveToCardPicker from "./SaveToCardPicker";

type Screen = "welcome" | "quiz" | "results";
type Language = "english" | "tagalog";

interface LoveLanguagesSectionProps {
  searchQuery?: string;
  cardId?: string;
}

const TYPE_ORDER: LoveLanguageType[] = ["WORDS", "ACTS", "GIFTS", "TIME", "TOUCH"];

function ExploreAllTypes({ language, defaultType }: { language: Language; defaultType?: LoveLanguageType }) {
  const text = language === "english"
    ? { exploreTypes: "Explore All Love Languages", howToLove: "How to Love This Person", examples: "Real-Life Examples" }
    : { exploreTypes: "Tuklasin ang Lahat ng Love Languages", howToLove: "Paano Mahalin ang Taong Ito", examples: "Mga Halimbawa" };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{text.exploreTypes}</h3>
      <Tabs defaultValue={defaultType || "WORDS"} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-4 h-auto p-1 gap-1">
          {loveLanguageResults.map((r) => (
            <TabsTrigger
              key={r.type}
              value={r.type}
              className="flex flex-col items-center gap-1 data-[state=active]:bg-foreground data-[state=active]:text-background px-1 py-2 text-[10px] min-w-0"
            >
              <span className="text-lg">{r.emoji}</span>
              <span className="hidden sm:inline truncate text-[9px]">
                {r.type}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {loveLanguageResults.map((r) => {
          const typeTitle = language === "english" ? r.englishTitle : r.tagalogTitle;
          const typeDesc = language === "english" ? r.englishDescription : r.tagalogDescription;
          const howToList = language === "english" ? r.howToLove.english : r.howToLove.tagalog;
          const examplesList = language === "english" ? r.examples.english : r.examples.tagalog;

          return (
            <TabsContent key={r.type} value={r.type} className="space-y-4">
              <div className="rounded-lg overflow-hidden p-4" style={{ backgroundColor: r.bgColor }}>
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0"
                    style={{ backgroundColor: r.color }}
                  >
                    {r.emoji}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-bold" style={{ color: "#1a1a2e" }}>{typeTitle}</h4>
                  </div>
                </div>
                <p className="text-xs" style={{ color: "#374151" }}>{typeDesc}</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <div className="w-1 h-5 rounded" style={{ backgroundColor: r.color }} />
                  {text.howToLove}
                </h4>
                <ul className="space-y-1.5">
                  {howToList.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: r.color }} />
                      <span className="text-sm">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" style={{ color: r.color }} />
                  {text.examples}
                </h4>
                <ul className="space-y-1.5">
                  {examplesList.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px] shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <span className="text-sm">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

export default function LoveLanguagesSection({ searchQuery, cardId }: LoveLanguagesSectionProps) {
  const { user } = useAuth();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [language, setLanguage] = useState<Language>("english");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<LoveLanguageType[]>(Array(loveLanguageQuestions.length).fill(""));
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => {
    const c: Record<LoveLanguageType, number> = { WORDS: 0, ACTS: 0, GIFTS: 0, TIME: 0, TOUCH: 0 };
    answers.forEach((a) => {
      if (a) c[a]++;
    });
    return c;
  }, [answers]);

  const primaryType = useMemo((): LoveLanguageType => {
    const sorted = TYPE_ORDER.map((t) => [t, counts[t]] as const).sort((a, b) => b[1] - a[1]);
    return sorted[0][0];
  }, [counts]);

  const result = useMemo(
    () => loveLanguageResults.find((r) => r.type === primaryType)!,
    [primaryType]
  );

  const handleStartTest = () => {
    setAnswers(Array(loveLanguageQuestions.length).fill(""));
    setCurrentQuestion(0);
    setScreen("quiz");
  };

  const handleAnswer = (optionKey: "A" | "B") => {
    const question = loveLanguageQuestions[currentQuestion];
    const type = question.options[optionKey].type;
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = type;
    setAnswers(newAnswers);

    // Auto-advance
    setTimeout(() => {
      if (currentQuestion === loveLanguageQuestions.length - 1) {
        setScreen("results");
      } else {
        setCurrentQuestion((p) => p + 1);
      }
    }, 250);
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) setCurrentQuestion((p) => p - 1);
  };

  const handleRetake = () => {
    setAnswers(Array(loveLanguageQuestions.length).fill(""));
    setCurrentQuestion(0);
    setScreen("welcome");
  };

  const [pickerOpen, setPickerOpen] = useState(false);

  const performSave = useCallback(
    async (targetCardId: string) => {
      if (!user) {
        toast.error("Please sign in to save your results.");
        return;
      }
      setSaving(true);
      try {
        const lovData = {
          type: primaryType,
          counts,
          title: language === "english" ? result.englishTitle : result.tagalogTitle,
          emoji: result.emoji,
          taken_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("cards")
          .update({ love_language_result: lovData as unknown as any })
          .eq("id", targetCardId);

        if (error) throw error;

        toast.success(
          language === "english"
            ? "Love Languages results saved to your card!"
            : "Nai-save ang Love Languages resulta sa iyong card!"
        );
        setPickerOpen(false);
      } catch (err: any) {
        console.error("Error saving Love Languages result:", err);
        toast.error("Failed to save results. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [user, primaryType, counts, result, language]
  );

  const handleSaveToCard = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to save your results.");
      return;
    }
    if (cardId) {
      await performSave(cardId);
      return;
    }
    const { data } = await supabase
      .from("cards")
      .select("id")
      .eq("user_id", user.id);
    const list = data ?? [];
    if (list.length === 0) {
      toast.error("No card found. Create a card first.");
      return;
    }
    if (list.length === 1) {
      await performSave(list[0].id);
      return;
    }
    setPickerOpen(true);
  }, [user, cardId, performSave]);

  const handleShare = () => {
    const title = language === "english" ? result.englishTitle : result.tagalogTitle;
    const text =
      language === "english"
        ? `My love language is ${title}! ${result.emoji} Take the quiz to discover yours.`
        : `Ang love language ko ay ${title}! ${result.emoji} Subukan ang quiz para malaman ang sa iyo.`;

    if (navigator.share) {
      navigator.share({ title: "5 Love Languages Test Results", text }).catch(() => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
      });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    }
  };

  // Filter by search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    if (!["love", "language", "languages", "love language", "love languages", "5 love"].some((k) => k.includes(q) || q.includes(k))) {
      return null;
    }
  }

  // ---- WELCOME SCREEN ----
  if (screen === "welcome") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLanguage((p) => (p === "english" ? "tagalog" : "english"))}
            className="text-xs"
          >
            {language === "english" ? "🇵🇭 Tagalog" : "🇺🇸 English"}
          </Button>
        </div>

        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">
            {language === "english"
              ? "Discover Your Love Language"
              : "Tuklasin ang Iyong Love Language"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {language === "english"
              ? "Learn how you give and receive love best"
              : "Alamin kung paano mo pinakaipinapakita at tinatanggap ang pag-ibig"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Target, en: "24 questions", tl: "24 na tanong" },
            { icon: Users, en: "Strengthen relationships", tl: "Patatagin ang relasyon" },
            { icon: Heart, en: "5 love languages", tl: "5 love languages" },
            { icon: CheckCircle2, en: "Pick A or B", tl: "Pumili ng A o B" },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
              <f.icon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-medium">{language === "english" ? f.en : f.tl}</span>
            </div>
          ))}
        </div>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">
            {language === "english" ? "How It Works" : "Paano Ito Gumagana"}
          </h3>
          {[
            { en: "Choose between two scenarios", tl: "Pumili sa dalawang sitwasyon" },
            { en: "Pick what feels more meaningful", tl: "Piliin kung alin ang mas makahulugan" },
            { en: "Discover your primary love language", tl: "Tuklasin ang iyong primary love language" },
            { en: "Save and share with loved ones", tl: "I-save at ibahagi sa mga mahal sa buhay" },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                {i + 1}
              </div>
              <span className="text-sm">{language === "english" ? step.en : step.tl}</span>
            </div>
          ))}
        </Card>

        <Button onClick={handleStartTest} size="lg" className="w-full gap-2">
          <Sparkles className="w-4 h-4" />
          {language === "english" ? "Start Test" : "Simulan ang Test"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          {language === "english"
            ? "Takes about 5 minutes to complete"
            : "Tumatagal ng mga 5 minuto"}
        </p>

        <ExploreAllTypes language={language} />
      </div>
    );
  }

  // ---- QUIZ SCREEN ----
  if (screen === "quiz") {
    const safeIndex = Math.min(Math.max(currentQuestion, 0), loveLanguageQuestions.length - 1);
    const question = loveLanguageQuestions[safeIndex];
    if (!question) return null;
    const progressPct = ((safeIndex + 1) / loveLanguageQuestions.length) * 100;
    const selected = answers[safeIndex];

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-medium">
            {currentQuestion + 1} / {loveLanguageQuestions.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLanguage((p) => (p === "english" ? "tagalog" : "english"))}
            className="text-xs"
          >
            {language === "english" ? "🇵🇭" : "🇺🇸"}
          </Button>
        </div>

        <Progress value={progressPct} className="h-2" />

        <Card className="p-5 space-y-4">
          <h3 className="text-lg font-bold leading-relaxed">
            {language === "english" ? question.english : question.tagalog}
          </h3>

          <div className="space-y-2">
            {(["A", "B"] as const).map((key) => {
              const option = question.options[key];
              const isSelected = selected === option.type;
              return (
                <button
                  key={key}
                  onClick={() => handleAnswer(key)}
                  className={`w-full text-left p-3.5 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {key}
                    </div>
                    <p className="text-sm flex-1">{language === "english" ? option.english : option.tagalog}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="flex gap-2">
          <Button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            variant="outline"
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {language === "english" ? "Back" : "Balik"}
          </Button>
        </div>
      </div>
    );
  }

  // ---- RESULTS SCREEN ----
  const sortedTypes = TYPE_ORDER.map((t) => ({
    type: t,
    count: counts[t],
    pct: Math.round((counts[t] / loveLanguageQuestions.length) * 100),
    info: loveLanguageResults.find((r) => r.type === t)!,
  })).sort((a, b) => b.count - a.count);

  const title = language === "english" ? result.englishTitle : result.tagalogTitle;
  const description = language === "english" ? result.englishDescription : result.tagalogDescription;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLanguage((p) => (p === "english" ? "tagalog" : "english"))}
          className="text-xs"
        >
          {language === "english" ? "🇵🇭 Tagalog" : "🇺🇸 English"}
        </Button>
      </div>

      {/* Hero result card */}
      <div
        className="relative rounded-2xl p-6 text-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${result.color}, ${result.color}dd)`,
        }}
      >
        <div className="text-6xl mb-3">{result.emoji}</div>
        <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1">
          {language === "english" ? "Your Love Language" : "Ang Iyong Love Language"}
        </p>
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-white/90 text-sm leading-relaxed">{description}</p>
      </div>

      {/* Score breakdown */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-bold">
          {language === "english" ? "Your Score Breakdown" : "Ang Iyong Resulta"}
        </h3>
        {sortedTypes.map((item) => {
          const itemTitle = language === "english" ? item.info.englishTitle : item.info.tagalogTitle;
          return (
            <div key={item.type} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <span>{item.info.emoji}</span>
                  {itemTitle}
                </span>
                <span className="font-bold" style={{ color: item.info.color }}>
                  {item.count} ({item.pct}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${item.pct}%`, backgroundColor: item.info.color }}
                />
              </div>
            </div>
          );
        })}
      </Card>

      {/* How to love a person with this language */}
      <Card className="p-4 space-y-3" style={{ borderColor: result.color, borderWidth: 2 }}>
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Heart className="w-4 h-4" style={{ color: result.color }} />
          {language === "english"
            ? "How Others Can Love You Best"
            : "Paano Ka Pinakamamahal ng Iba"}
        </h3>
        <ul className="space-y-1.5">
          {(language === "english" ? result.howToLove.english : result.howToLove.tagalog).map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: result.color }} />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={handleSaveToCard} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving
            ? language === "english" ? "Saving..." : "Sina-save..."
            : language === "english" ? "Save to Card" : "I-save sa Card"}
        </Button>
        <Button onClick={handleShare} variant="outline" className="gap-2">
          <Share2 className="w-4 h-4" />
          {language === "english" ? "Share" : "Ibahagi"}
        </Button>
      </div>

      <Button onClick={handleRetake} variant="ghost" className="w-full gap-2">
        <RotateCcw className="w-4 h-4" />
        {language === "english" ? "Retake Test" : "Ulitin ang Test"}
      </Button>

      <ExploreAllTypes language={language} defaultType={primaryType} />

      <SaveToCardPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onConfirm={performSave}
        saving={saving}
        title={language === "english" ? "Save Love Language to which card?" : "Saang card i-save ang Love Language?"}
        description={
          language === "english"
            ? "Each card stores its own Love Language result."
            : "Bawat card ay may sariling Love Language na resulta."
        }
      />
    </div>
  );
}

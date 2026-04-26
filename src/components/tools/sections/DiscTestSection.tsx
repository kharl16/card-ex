import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { discQuestions } from "@/data/discQuestions";
import { discResults, DiscPersonalityResult } from "@/data/discResults";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Share2,
  Save,
  Brain,
  Target,
  Users,
  CheckCircle2,
  TrendingUp,
  Lightbulb,
  Sparkles,
} from "lucide-react";

import eagleImg from "@/assets/disc/eagle.jpg";
import roosterImg from "@/assets/disc/rooster.jpg";
import carabaoImg from "@/assets/disc/carabao.jpg";
import tarsierImg from "@/assets/disc/tarsier.jpg";

const animalImages: Record<string, string> = {
  D: eagleImg,
  I: roosterImg,
  S: carabaoImg,
  C: tarsierImg,
};

type Screen = "welcome" | "quiz" | "results";
type Language = "english" | "tagalog";

// Shuffle Fisher-Yates
const shuffleArray = <T,>(array: T[]): T[] => {
  const s = [...array];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
};

interface DiscTestSectionProps {
  searchQuery?: string;
  cardId?: string;
}

function ExploreAllTypes({ language, defaultType }: { language: Language; defaultType?: "D" | "I" | "S" | "C" }) {
  const content = {
    english: {
      exploreTypes: "Explore All Personality Types",
      strengths: "Strengths",
      growthTips: "Growth Tips",
    },
    tagalog: {
      exploreTypes: "Tuklasin ang Lahat ng Uri ng Personalidad",
      strengths: "Kalakasan",
      growthTips: "Mga Payo sa Paglaki",
    },
  };
  const text = content[language];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{text.exploreTypes}</h3>
      <Tabs defaultValue={defaultType || "D"} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4 h-auto p-1 gap-1">
          {discResults.map((r) => (
            <TabsTrigger
              key={r.type}
              value={r.type}
              className="flex flex-col items-center gap-1 data-[state=active]:bg-foreground data-[state=active]:text-background px-1 py-2 text-[10px] min-w-0"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: r.color }}
              >
                {r.type}
              </div>
              <span className="hidden sm:inline truncate text-[10px]">
                {language === "english" ? r.englishTitle.split(" - ")[1] : r.tagalogTitle.split(" - ")[1]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {discResults.map((r) => {
          const typeTitle = language === "english" ? r.englishTitle : r.tagalogTitle;
          const typeDesc = language === "english" ? r.englishDescription : r.tagalogDescription;
          const strengthsList = language === "english" ? r.strengths.english : r.strengths.tagalog;
          const growthTipsList = language === "english" ? r.growthTips.english : r.growthTips.tagalog;

          return (
            <TabsContent key={r.type} value={r.type} className="space-y-4">
              {/* Type header with animal image */}
              <div className="rounded-lg overflow-hidden" style={{ backgroundColor: r.bgColor }}>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4">
                  <img
                    src={animalImages[r.type]}
                    alt={r.animalName}
                    className="w-24 h-24 sm:w-36 sm:h-24 object-cover rounded-lg shadow-md"
                    loading="lazy"
                  />
                  <div className="flex-1 text-center sm:text-left space-y-1">
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: r.color }}
                      >
                        {r.type}
                      </div>
                      <h4 className="text-base font-bold" style={{ color: '#1a1a2e' }}>{typeTitle}</h4>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: r.color }}>
                      {r.animalName}
                    </p>
                    <p className="text-xs" style={{ color: '#374151' }}>{typeDesc}</p>
                  </div>
                </div>
              </div>

              {/* Strengths */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <div className="w-1 h-5 rounded" style={{ backgroundColor: r.color }} />
                  {text.strengths}
                </h4>
                <ul className="space-y-1.5">
                  {strengthsList.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: r.color }} />
                      <span className="text-sm">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Growth Tips */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <div className="w-1 h-5 rounded" style={{ backgroundColor: r.color }} />
                  {text.growthTips}
                </h4>
                <ul className="space-y-1.5">
                  {growthTipsList.map((t, i) => (
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

export default function DiscTestSection({ searchQuery, cardId }: DiscTestSectionProps) {
  const { user } = useAuth();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [language, setLanguage] = useState<Language>("english");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(discQuestions.length).fill(""));
  const [saving, setSaving] = useState(false);

  const [shuffledOptions] = useState(() =>
    discQuestions.map(() => shuffleArray(["A", "B", "C", "D"]))
  );

  const counts = useMemo(() => {
    const c = { D: 0, I: 0, S: 0, C: 0 };
    answers.forEach((a) => {
      if (a) c[a as keyof typeof c]++;
    });
    return c;
  }, [answers]);

  const personalityType = useMemo((): "D" | "I" | "S" | "C" => {
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0][0] as "D" | "I" | "S" | "C";
  }, [counts]);

  const result = useMemo(
    () => discResults.find((r) => r.type === personalityType)!,
    [personalityType]
  );

  const handleStartTest = () => {
    setAnswers(Array(discQuestions.length).fill(""));
    setCurrentQuestion(0);
    setScreen("quiz");
  };

  const handleAnswer = (optionKey: string) => {
    const question = discQuestions[currentQuestion];
    const type = question.options[optionKey as keyof typeof question.options].type;
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = type;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion === discQuestions.length - 1 && answers[currentQuestion]) {
      setScreen("results");
    } else if (answers[currentQuestion]) {
      setCurrentQuestion((p) => p + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) setCurrentQuestion((p) => p - 1);
  };

  const handleRetake = () => {
    setAnswers(Array(discQuestions.length).fill(""));
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
        const discData = {
          type: personalityType,
          counts,
          title: language === "english" ? result.englishTitle : result.tagalogTitle,
          animal: result.animalName,
          emoji: result.emoji,
          taken_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("cards")
          .update({ disc_result: discData as unknown as any })
          .eq("id", targetCardId);

        if (error) throw error;

        toast.success(
          language === "english"
            ? "DISC results saved to your card!"
            : "Nai-save ang DISC resulta sa iyong card!"
        );
        setPickerOpen(false);
      } catch (err: any) {
        console.error("Error saving DISC result:", err);
        toast.error("Failed to save results. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [user, personalityType, counts, result, language]
  );

  const handleSaveToCard = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to save your results.");
      return;
    }
    // If a specific card is in context (e.g. opened from a public card), save directly.
    if (cardId) {
      await performSave(cardId);
      return;
    }
    // Otherwise, fetch user's cards. If only one, save directly; else let user pick.
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
        ? `I just discovered I'm a ${title}! ${result.emoji} Take the D.I.S.C. personality test to find yours.`
        : `Nalaman ko na ako ay ${title}! ${result.emoji} Subukan ang D.I.S.C. personality test.`;

    if (navigator.share) {
      navigator.share({ title: "D.I.S.C. Personality Test Results", text }).catch(() => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
      });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    }
  };

  // Filter by search
  if (searchQuery && !("disc test personality".includes(searchQuery.toLowerCase()))) {
    // Still show if query is somewhat relevant
    const q = searchQuery.toLowerCase();
    if (!["disc", "personality", "test", "d.i.s.c"].some((k) => k.includes(q) || q.includes(k))) {
      return null;
    }
  }

  // ---- WELCOME SCREEN ----
  if (screen === "welcome") {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Language toggle */}
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

        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">
            {language === "english"
              ? "Discover Your D.I.S.C. Personality Type"
              : "Tuklasin ang Iyong D.I.S.C. Uri ng Personalidad"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {language === "english"
              ? "Understand yourself and improve your relationships"
              : "Unawain ang iyong sarili at pagbutihin ang iyong relasyon"}
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Target, en: "24 questions", tl: "24 na tanong" },
            { icon: Users, en: "Better self-awareness", tl: "Mas mabuting kaalaman sa sarili" },
            { icon: TrendingUp, en: "Growth tips", tl: "Mga payo sa paglaki" },
            { icon: CheckCircle2, en: "No wrong answers", tl: "Walang maling sagot" },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
              <f.icon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-medium">{language === "english" ? f.en : f.tl}</span>
            </div>
          ))}
        </div>

        {/* Steps */}
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">
            {language === "english" ? "How It Works" : "Paano Ito Gumagana"}
          </h3>
          {[
            { en: "Answer 24 questions honestly", tl: "Sagutin ang 24 na tanong nang tapat" },
            { en: "Discover your dominant personality type", tl: "Tuklasin ang iyong dominanteng personalidad" },
            { en: "Learn your strengths and growth areas", tl: "Alamin ang iyong kalakasan" },
            { en: "Save results to your card", tl: "I-save ang resulta sa iyong card" },
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
            ? "Takes about 5-7 minutes to complete"
            : "Tumatagal ng mga 5-7 minuto"}
        </p>

        {/* Explore All Personality Types */}
        <ExploreAllTypes language={language} />
      </div>
    );
  }

  // ---- QUIZ SCREEN ----
  if (screen === "quiz") {
    const question = discQuestions[currentQuestion];
    const optionOrder = shuffledOptions[currentQuestion];
    const isLast = currentQuestion === discQuestions.length - 1;
    const hasAnswered = answers[currentQuestion] !== "";
    const progressPct = ((currentQuestion + 1) / discQuestions.length) * 100;

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Language toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-medium">
            {currentQuestion + 1} / {discQuestions.length}
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

        {/* Progress */}
        <Progress value={progressPct} className="h-2" />

        {/* Question */}
        <Card className="p-5 space-y-4">
          <h3 className="text-lg font-bold leading-relaxed">
            {language === "english" ? question.english : question.tagalog}
          </h3>

          <div className="space-y-2">
            {optionOrder.map((key) => {
              const option = question.options[key as keyof typeof question.options];
              const isSelected = answers[currentQuestion] === option.type;
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
                  <p className="text-sm">{language === "english" ? option.english : option.tagalog}</p>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Navigation */}
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
          <Button onClick={handleNext} disabled={!hasAnswered} className="flex-1 gap-1">
            {isLast
              ? language === "english"
                ? "Finish"
                : "Tapusin"
              : language === "english"
              ? "Next"
              : "Susunod"}
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  }

  // ---- RESULTS SCREEN ----
  const title = language === "english" ? result.englishTitle : result.tagalogTitle;
  const description = language === "english" ? result.englishDescription : result.tagalogDescription;
  const strengthsList = language === "english" ? result.strengths.english : result.strengths.tagalog;
  const growthTipsList = language === "english" ? result.growthTips.english : result.growthTips.tagalog;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Language toggle */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLanguage((p) => (p === "english" ? "tagalog" : "english"))}
          className="text-xs"
        >
          {language === "english" ? "🇵🇭 Tagalog" : "🇺🇸 English"}
        </Button>
      </div>

      {/* Result Hero */}
      <Card
        className="relative p-6 text-center space-y-3 border-0 shadow-lg overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${result.bgColor} 0%, hsl(220 10% 15%) 40%, hsl(220 12% 10%) 100%)`,
        }}
      >
        {/* Subtle radial glow behind animal */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${result.color}, transparent 60%)`,
          }}
        />
        <div className="relative z-10 space-y-3">
          <img
            src={animalImages[result.type]}
            alt={result.animalName}
            className="w-28 h-28 object-cover rounded-full mx-auto shadow-xl border-4"
            style={{ borderColor: result.color }}
          />
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {language === "english" ? "Your Personality Type" : "Ang Iyong Uri ng Personalidad"}
          </p>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <p className="text-lg font-semibold" style={{ color: result.color }}>
            {result.animalName}
          </p>
          <p className="text-sm text-foreground/75 max-w-xs mx-auto">{description}</p>
        </div>
      </Card>

      {/* Score Breakdown */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-sm">
          {language === "english" ? "Score Breakdown" : "Breakdown ng Iskor"}
        </h3>
        {discResults.map((r) => {
          const count = counts[r.type];
          const pct = (count / 24) * 100;
          const isHighest = r.type === personalityType;
          return (
            <div key={r.type} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className={`font-medium ${isHighest ? "font-bold" : ""}`}>
                  {r.emoji} {language === "english" ? r.englishTitle : r.tagalogTitle}
                </span>
                <span className="font-bold">{count}/24</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: r.color }}
                />
              </div>
            </div>
          );
        })}
      </Card>

      {/* Strengths */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <div className="w-1 h-5 rounded" style={{ backgroundColor: result.color }} />
          {language === "english" ? "Strengths" : "Kalakasan"}
        </h3>
        <ul className="space-y-2">
          {strengthsList.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: result.color }} />
              <span className="text-sm">{s}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Growth Tips */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <div className="w-1 h-5 rounded" style={{ backgroundColor: result.color }} />
          {language === "english" ? "Growth Tips" : "Mga Payo sa Paglaki"}
        </h3>
        <ul className="space-y-2">
          {growthTipsList.map((t, i) => (
            <li key={i} className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
              <span className="text-sm">{t}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Motivation */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <p className="text-xs text-center leading-relaxed">
          {language === "english"
            ? "Every personality type has unique strengths. There are no right or wrong results — embrace who you are and continue growing!"
            : "Bawat uri ng personalidad ay may natatanging kalakasan. Walang tama o maling resulta — tanggapin kung sino ka at magpatuloy na lumago!"}
        </p>
      </Card>

      {/* Explore All Personality Types */}
      <ExploreAllTypes language={language} defaultType={personalityType} />

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <Button onClick={handleSaveToCard} disabled={saving} className="w-full gap-2">
          <Save className="h-4 w-4" />
          {saving
            ? language === "english"
              ? "Saving..."
              : "Sine-save..."
            : language === "english"
            ? "Save to My Card"
            : "I-save sa Aking Card"}
        </Button>
        <div className="flex gap-2">
          <Button onClick={handleShare} variant="outline" className="flex-1 gap-2">
            <Share2 className="h-4 w-4" />
            {language === "english" ? "Share" : "Ibahagi"}
          </Button>
          <Button onClick={handleRetake} variant="outline" className="flex-1 gap-2">
            <RotateCcw className="h-4 w-4" />
            {language === "english" ? "Retake" : "Ulitin"}
          </Button>
        </div>
      </div>
    </div>
  );
}

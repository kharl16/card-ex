import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { mindsetQuestions } from "@/data/mindsetQuestions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, RotateCcw, Save, Brain, Sparkles } from "lucide-react";
import { useToolPreferences } from "@/hooks/useToolPreferences";

type Screen = "welcome" | "quiz" | "results";
type Language = "english" | "tagalog";

const SCALE = [1, 2, 3, 4, 5];

interface Props { cardId?: string }

export default function MindsetQuizSection({ cardId }: Props) {
  const { user } = useAuth();
  const { prefs, loaded: prefsLoaded, updateMindset } = useToolPreferences();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [language, setLanguage] = useState<Language>("english");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(mindsetQuestions.length).fill(0));
  const [saving, setSaving] = useState(false);

  // If user has a saved result and hasn't started a new quiz, jump to results
  useEffect(() => {
    if (!prefsLoaded) return;
    const last = prefs.mindset?.lastResult;
    if (last && screen === "welcome" && !answers.some((a) => a > 0)) {
      setScreen("results");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsLoaded]);

  // Score: each "growth" answer adds (rating), each "fixed" adds (6 - rating)
  // Max score = 5 * questions = pure growth mindset
  const { score, pct, label, blurb, color } = useMemo(() => {
    let s = 0;
    answers.forEach((rating, i) => {
      if (!rating) return;
      const q = mindsetQuestions[i];
      s += q.type === "growth" ? rating : 6 - rating;
    });
    const maxScore = mindsetQuestions.length * 5;
    let pct = Math.round((s / maxScore) * 100);

    // Fallback to last saved result if no answers entered yet (deep-link / refresh case)
    const hasAnswers = answers.some((a) => a > 0);
    const saved = prefs.mindset?.lastResult;
    if (!hasAnswers && saved) {
      s = saved.score;
      pct = saved.pct;
    }

    let label: string, blurb: string, color: string;
    if (pct >= 80) {
      label = language === "english" ? "Strong Growth Mindset" : "Matatag na Growth Mindset";
      blurb = language === "english"
        ? "You believe abilities can grow through effort. Keep stretching beyond your comfort zone."
        : "Naniniwala kang lumalago ang kakayahan sa pagsisikap. Magpatuloy sa pagsubok sa sarili.";
      color = "#10b981";
    } else if (pct >= 60) {
      label = language === "english" ? "Growth Leaning" : "Patungo sa Growth";
      blurb = language === "english"
        ? "Mostly growth-minded with a few fixed beliefs. Identify and reframe them."
        : "Karaniwan ay growth-minded ngunit may ilang fixed na paniniwala — kilalanin at baguhin mo.";
      color = "#3b82f6";
    } else if (pct >= 40) {
      label = language === "english" ? "Mixed Mindset" : "Halong Mindset";
      blurb = language === "english"
        ? "You're balanced between fixed and growth thinking. Embrace challenges to tip the scale."
        : "Balanse ka sa pagitan ng fixed at growth. Tanggapin ang mga hamon para makahilig sa growth.";
      color = "#f59e0b";
    } else {
      label = language === "english" ? "Fixed Leaning" : "Patungo sa Fixed";
      blurb = language === "english"
        ? "Many beliefs lean fixed. Small mindset shifts will unlock big possibilities."
        : "Marami sa iyong paniniwala ay fixed. Ang maliit na pagbabago sa pag-iisip ay magbubukas ng malalaking posibilidad.";
      color = "#ef4444";
    }
    return { score: s, pct, label, blurb, color };
  }, [answers, language, prefs.mindset?.lastResult]);

  const handleStart = () => {
    setAnswers(Array(mindsetQuestions.length).fill(0));
    setCurrentQuestion(0);
    setScreen("quiz");
  };

  const handleAnswer = (rating: number) => {
    const next = [...answers];
    next[currentQuestion] = rating;
    setAnswers(next);
    setTimeout(() => {
      if (currentQuestion === mindsetQuestions.length - 1) setScreen("results");
      else setCurrentQuestion((p) => p + 1);
    }, 200);
  };

  const handleRetake = () => {
    setAnswers(Array(mindsetQuestions.length).fill(0));
    setCurrentQuestion(0);
    setScreen("welcome");
  };

  const handleSave = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to save your results.");
      return;
    }
    setSaving(true);
    try {
      let targetCardId = cardId;
      if (!targetCardId) {
        const { data: cards } = await supabase.from("cards").select("id").eq("user_id", user.id).limit(1);
        targetCardId = cards?.[0]?.id;
      }
      if (!targetCardId) {
        toast.error("No card found. Create a card first.");
        return;
      }
      const data = { score, pct, label, taken_at: new Date().toISOString() };
      const { error } = await supabase
        .from("cards")
        .update({ mindset_result: data as any })
        .eq("id", targetCardId);
      if (error) throw error;
      toast.success(language === "english" ? "Mindset score saved to your card!" : "Nai-save ang Mindset Score sa iyong card!");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to save results.");
    } finally {
      setSaving(false);
    }
  }, [user, cardId, score, pct, label, language]);

  if (screen === "welcome") {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setLanguage((p) => p === "english" ? "tagalog" : "english")} className="text-xs">
            {language === "english" ? "🇵🇭 Tagalog" : "🇺🇸 English"}
          </Button>
        </div>
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">
            {language === "english" ? "What's Your Mindset?" : "Ano ang Iyong Mindset?"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {language === "english"
              ? "Discover where you fall on the Fixed vs Growth Mindset spectrum (Carol Dweck)."
              : "Tuklasin kung nasaan ka sa Fixed vs Growth Mindset (Carol Dweck)."}
          </p>
        </div>
        <Card className="p-4 text-sm space-y-2">
          <p>
            <strong>{language === "english" ? "16 statements" : "16 na pahayag"}</strong> · {language === "english" ? "Rate 1–5 how much you agree" : "I-rate 1–5 kung gaano ka sumasang-ayon"}
          </p>
          <p className="text-muted-foreground text-xs">
            {language === "english" ? "Takes ~3 minutes" : "Tumatagal ng ~3 minuto"}
          </p>
        </Card>
        <Button onClick={handleStart} size="lg" className="w-full gap-2">
          <Sparkles className="w-4 h-4" />
          {language === "english" ? "Start Quiz" : "Simulan"}
        </Button>
      </div>
    );
  }

  if (screen === "quiz") {
    const q = mindsetQuestions[currentQuestion];
    const progress = ((currentQuestion + 1) / mindsetQuestions.length) * 100;
    const selected = answers[currentQuestion];

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-medium">{currentQuestion + 1} / {mindsetQuestions.length}</span>
          <Button variant="ghost" size="sm" onClick={() => setLanguage((p) => p === "english" ? "tagalog" : "english")} className="text-xs">
            {language === "english" ? "🇵🇭" : "🇺🇸"}
          </Button>
        </div>
        <Progress value={progress} className="h-2" />
        <Card className="p-5 space-y-4">
          <h3 className="text-base font-semibold leading-relaxed">
            {language === "english" ? q.english : q.tagalog}
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {SCALE.map((n) => (
              <button
                key={n}
                onClick={() => handleAnswer(n)}
                className={`aspect-square rounded-lg border-2 font-bold transition-all ${
                  selected === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{language === "english" ? "Strongly Disagree" : "Hindi Sumasang-ayon"}</span>
            <span>{language === "english" ? "Strongly Agree" : "Lubos na Sumasang-ayon"}</span>
          </div>
        </Card>
        <Button variant="outline" disabled={currentQuestion === 0} onClick={() => setCurrentQuestion((p) => p - 1)} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          {language === "english" ? "Back" : "Balik"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div
        className="rounded-2xl p-6 text-center text-white"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
      >
        <p className="text-white/80 text-xs uppercase tracking-widest mb-1">
          {language === "english" ? "Your Mindset" : "Ang Iyong Mindset"}
        </p>
        <div className="text-5xl font-bold mb-2">{pct}%</div>
        <h2 className="text-xl font-bold mb-2">{label}</h2>
        <p className="text-white/90 text-sm">{blurb}</p>
      </div>

      <Card className="p-4 space-y-3">
        <h3 className="font-bold text-sm">{language === "english" ? "Tips to Grow" : "Mga Payo para Lumago"}</h3>
        <ul className="text-sm space-y-2 text-muted-foreground">
          <li>✓ {language === "english" ? "Add 'yet' — \"I can't do this yet.\"" : "Idagdag ang \"pa\" — \"Hindi ko pa kaya.\""}</li>
          <li>✓ {language === "english" ? "Embrace mistakes as data, not failures." : "Tanggapin ang pagkakamali bilang aral."}</li>
          <li>✓ {language === "english" ? "Praise effort and strategy, not 'talent'." : "Purihin ang sipag, hindi ang \"talento.\""}</li>
          <li>✓ {language === "english" ? "Seek feedback — it's a shortcut to growth." : "Humingi ng feedback — daan ito sa paglago."}</li>
        </ul>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="flex-1 gap-1">
          <Save className="h-4 w-4" />
          {language === "english" ? "Save to Card" : "I-save sa Card"}
        </Button>
        <Button variant="outline" onClick={handleRetake} className="gap-1">
          <RotateCcw className="h-4 w-4" />
          {language === "english" ? "Retake" : "Ulitin"}
        </Button>
      </div>
    </div>
  );
}

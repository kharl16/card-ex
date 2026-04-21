import { useEffect, useState, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { universalBooks, discBooks, loveLanguageBooks, mindsetBooks, Book } from "@/data/bookRecommendations";
import { BookOpen, Sparkles, FileText, Headphones, Loader2, Play, Pause, Square, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

type SpeechChunk = { text: string; wordStart: number; wordCount: number };

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
  const [ttsState, setTtsState] = useState<"idle" | "playing" | "paused">("idle");
  const [spokenText, setSpokenText] = useState<string>("");
  const [activeWordIdx, setActiveWordIdx] = useState<number>(-1);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const chunksRef = useRef<SpeechChunk[]>([]);
  const chunkIdxRef = useRef<number>(0);
  const keepAliveRef = useRef<number | null>(null);
  const stoppedRef = useRef<boolean>(false);
  const wordTimerRef = useRef<number | null>(null);
  const utterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const requeueTimerRef = useRef<number | null>(null);
  const mobileWatchdogRef = useRef<number | null>(null);
  const activeWordIdxRef = useRef<number>(-1);
  const lastSpokenWordRef = useRef<number>(0);
  const lastProgressAtRef = useRef<number>(Date.now());
  const speechRateRef = useRef<number>(1);
  const spokenTextRef = useRef<string>("");

  const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  const tokenizeText = (text: string) => {
    const tokens: { word: string; start: number }[] = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      tokens.push({ word: m[0], start: m.index });
    }
    return tokens;
  };

  // Build word index map: [{ word, start }]
  const wordTokens = useMemo(() => {
    if (!spokenText) return [] as { word: string; start: number }[];
    return tokenizeText(spokenText);
  }, [spokenText]);

  const clearKeepAlive = () => {
    if (keepAliveRef.current !== null) {
      window.clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  };

  const clearWordTimer = () => {
    if (wordTimerRef.current !== null) {
      window.clearTimeout(wordTimerRef.current);
      wordTimerRef.current = null;
    }
  };

  const clearRequeueTimer = () => {
    if (requeueTimerRef.current !== null) {
      window.clearTimeout(requeueTimerRef.current);
      requeueTimerRef.current = null;
    }
  };

  const clearMobileWatchdog = () => {
    if (mobileWatchdogRef.current !== null) {
      window.clearInterval(mobileWatchdogRef.current);
      mobileWatchdogRef.current = null;
    }
  };

  const logSpeechStop = (reason: string, detail?: unknown) => {
    console.info("TTS mobile stop/recovery:", {
      reason,
      detail,
      chunkIndex: chunkIdxRef.current,
      lastSpokenWord: lastSpokenWordRef.current,
      queuedChunks: chunksRef.current.length,
      speaking: typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis.speaking : false,
      pending: typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis.pending : false,
    });
  };

  const updateActiveWord = (idx: number) => {
    activeWordIdxRef.current = idx;
    lastProgressAtRef.current = Date.now();
    if (idx >= 0) lastSpokenWordRef.current = idx;
    setActiveWordIdx(idx);
  };

  const stopSpeech = () => {
    stoppedRef.current = true;
    clearKeepAlive();
    clearWordTimer();
    clearRequeueTimer();
    clearMobileWatchdog();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    chunksRef.current = [];
    utterancesRef.current = [];
    chunkIdxRef.current = 0;
    setTtsState("idle");
    updateActiveWord(-1);
  };

  const pickVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => v.localService && /^en/i.test(v.lang)) ||
      voices.find((v) => /^en/i.test(v.lang)) ||
      voices[0]
    );
  };

  const createChunks = (text: string, startWord = 0): SpeechChunk[] => {
    const tokens = tokenizeText(text);
    const startChar = tokens[startWord]?.start ?? 0;
    const remaining = text.slice(startChar).trim();
    const maxLen = isMobile ? 2800 : 200;
    const sentences = remaining.match(/[^.!?\n]+[.!?]?[\n]?/g) || [remaining];
    const chunks: SpeechChunk[] = [];
    let buf = "";
    let wordCursor = startWord;
    const flush = () => {
      const t = buf.trim();
      if (!t) return;
      const wc = (t.match(/\S+/g) || []).length;
      chunks.push({ text: t, wordStart: wordCursor, wordCount: wc });
      wordCursor += wc;
      buf = "";
    };
    for (const sentence of sentences) {
      if ((buf + sentence).length > maxLen) flush();
      buf += sentence;
    }
    flush();
    return chunks;
  };

  const estimateWordDuration = (word: string, rate: number, voice?: SpeechSynthesisVoice | null) => {
    const syllables = Math.max(1, (word.toLowerCase().match(/[aeiouy]+/g) || []).length);
    const punctuationPause = /[.!?]$/.test(word) ? 260 : /[,;:]$/.test(word) ? 130 : 0;
    const voiceFactor = voice?.localService ? 0.94 : 1.08;
    return Math.max(145, ((165 + syllables * 72 + punctuationPause) * voiceFactor) / rate);
  };

  const startWordTimer = (chunk: SpeechChunk, rate: number, voice?: SpeechSynthesisVoice | null) => {
    clearWordTimer();
    if (chunk.wordCount <= 0) return;
    const words = chunk.text.match(/\S+/g) || [];
    let i = 0;
    updateActiveWord(chunk.wordStart);
    const tick = () => {
      i += 1;
      if (i >= chunk.wordCount) {
        clearWordTimer();
        return;
      }
      updateActiveWord(chunk.wordStart + i);
      wordTimerRef.current = window.setTimeout(tick, estimateWordDuration(words[i] || "", rate, voice));
    };
    wordTimerRef.current = window.setTimeout(tick, estimateWordDuration(words[0] || "", rate, voice));
  };

  const requeueFromWord = (wordIdx: number, reason: string) => {
    if (!isMobile || stoppedRef.current || !spokenTextRef.current) return;
    const totalWords = tokenizeText(spokenTextRef.current).length;
    const safeWord = Math.min(Math.max(wordIdx, 0), Math.max(totalWords - 1, 0));
    if (safeWord >= totalWords - 1) return;
    logSpeechStop(reason, { requeueFromWord: safeWord });
    window.speechSynthesis.cancel();
    clearWordTimer();
    utterancesRef.current = [];
    chunksRef.current = createChunks(spokenTextRef.current, safeWord);
    speakChunk(0, true);
  };

  const scheduleMobileRecovery = (reason: string) => {
    if (!isMobile || stoppedRef.current) return;
    clearRequeueTimer();
    requeueTimerRef.current = window.setTimeout(() => {
      if (stoppedRef.current) return;
      const totalWords = tokenizeText(spokenTextRef.current).length;
      const hasMoreWords = lastSpokenWordRef.current < totalWords - 2;
      const synthIdle = !window.speechSynthesis.speaking && !window.speechSynthesis.pending;
      if (hasMoreWords && synthIdle) requeueFromWord(lastSpokenWordRef.current + 1, reason);
    }, 450);
  };

  const startMobileWatchdog = () => {
    if (!isMobile) return;
    clearMobileWatchdog();
    mobileWatchdogRef.current = window.setInterval(() => {
      if (stoppedRef.current || ttsState === "paused" || !spokenTextRef.current) return;
      const totalWords = tokenizeText(spokenTextRef.current).length;
      const hasMoreWords = lastSpokenWordRef.current < totalWords - 2;
      if (!hasMoreWords) return;
      const idle = !window.speechSynthesis.speaking && !window.speechSynthesis.pending;
      const stalled = Date.now() - lastProgressAtRef.current > 2800;
      if (idle || stalled) {
        logSpeechStop(idle ? "mobile_synth_idle" : "mobile_progress_stalled", { stalledMs: Date.now() - lastProgressAtRef.current });
        requeueFromWord(lastSpokenWordRef.current + 1, idle ? "watchdog_idle" : "watchdog_stalled");
      }
    }, 1200);
  };

  const findChunkIndexByWord = (wordIdx: number) => {
    const chunks = chunksRef.current;
    const idx = chunks.findIndex((chunk) => wordIdx >= chunk.wordStart && wordIdx < chunk.wordStart + chunk.wordCount);
    return idx >= 0 ? idx : 0;
  };

  const speakChunk = (idx: number, queued = false) => {
    if (stoppedRef.current) return;
    const chunks = chunksRef.current;
    if (idx >= chunks.length) {
      clearKeepAlive();
      clearWordTimer();
      utterancesRef.current = [];
      setTtsState("idle");
      updateActiveWord(-1);
      return;
    }
    chunkIdxRef.current = idx;
    const chunk = chunks[idx];
    const u = new SpeechSynthesisUtterance(chunk.text);
    const rate = 1;
    speechRateRef.current = rate;
    u.rate = rate;
    u.pitch = 1;
    u.lang = "en-US";
    const v = pickVoice();
    if (v) u.voice = v;

    let boundaryFired = false;
    u.onstart = () => {
      chunkIdxRef.current = idx;
      updateActiveWord(chunk.wordStart);
      // On mobile, onboundary is unreliable, so start fallback highlighting immediately.
      if (isMobile) startWordTimer(chunk, rate, v);
    };
    u.onboundary = (e: SpeechSynthesisEvent) => {
      if (isMobile) return;
      if (e.name && e.name !== "word") return;
      boundaryFired = true;
      clearWordTimer();
      const before = chunk.text.slice(0, e.charIndex);
      const wordsBefore = (before.match(/\S+/g) || []).length;
      updateActiveWord(chunk.wordStart + wordsBefore);
    };
    u.onend = () => {
      clearWordTimer();
      if (stoppedRef.current) return;
      if (queued) {
        if (idx < chunks.length - 1) {
          speakChunk(idx + 1, true);
        } else {
          const totalWords = tokenizeText(spokenTextRef.current).length;
          if (lastSpokenWordRef.current < totalWords - 2) {
            scheduleMobileRecovery("mobile_ended_before_complete");
            return;
          }
          clearKeepAlive();
          clearMobileWatchdog();
          utterancesRef.current = [];
          setTtsState("idle");
          updateActiveWord(-1);
        }
        return;
      }
      // On mobile, chaining via onend often gets blocked by autoplay policy.
      // Defer the next speak() to break out of the callback context.
      if (isMobile) {
        window.setTimeout(() => {
          if (!stoppedRef.current) speakChunk(idx + 1);
        }, 50);
      } else {
        speakChunk(idx + 1);
      }
    };
    u.onerror = (e: any) => {
      clearWordTimer();
      if (e?.error === "interrupted" || e?.error === "canceled") return;
      logSpeechStop("utterance_error", e?.error);
      if (queued) {
        scheduleMobileRecovery(`queued_error_${e?.error || "unknown"}`);
        return;
      }
      if (!stoppedRef.current) {
        window.setTimeout(() => {
          if (!stoppedRef.current) speakChunk(idx + 1);
        }, 50);
      }
    };

    utterancesRef.current.push(u);
    window.speechSynthesis.speak(u);
  };

  const startKeepAlive = () => {
    clearKeepAlive();
    // Chrome bug: speech stops after ~15s. Pause/resume keeps it alive.
    keepAliveRef.current = window.setInterval(() => {
      if (!window.speechSynthesis.speaking) return;
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 10000);
  };

  const playSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Your browser doesn't support text-to-speech.");
      return;
    }
    if (!summary) return;

    if (ttsState === "paused") {
      window.speechSynthesis.resume();
      setTtsState("playing");
      startKeepAlive();
      if (isMobile) startMobileWatchdog();
      return;
    }

    window.speechSynthesis.cancel();
    stoppedRef.current = false;

    const clean = summary
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[#*_`>]/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/\(Sound of[^)]*\)/gi, "")
      .replace(/\n{2,}/g, "\n\n")
      .trim();

    setSpokenText(clean);
    spokenTextRef.current = clean;
    setActiveWordIdx(-1);

    const chunks = createChunks(clean, 0);
    chunksRef.current = chunks;

    setTtsState("playing");
    startKeepAlive();
    if (isMobile) {
      startMobileWatchdog();
      // Mobile speech engines are more reliable with one retained long utterance and watchdog recovery.
      speakChunk(0, true);
    } else {
      speakChunk(0);
    }
  };

  const pauseSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
      clearKeepAlive();
      clearMobileWatchdog();
      setTtsState("paused");
    }
  };

  const restartFromLastWord = () => {
    if (!spokenTextRef.current || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const totalWords = tokenizeText(spokenTextRef.current).length;
    const startWord = Math.min(Math.max(lastSpokenWordRef.current, 0), Math.max(totalWords - 1, 0));
    logSpeechStop("manual_restart_from_last_word", { startWord });
    window.speechSynthesis.cancel();
    clearWordTimer();
    clearRequeueTimer();
    stoppedRef.current = false;
    utterancesRef.current = [];
    chunksRef.current = createChunks(spokenTextRef.current, startWord);
    setTtsState("playing");
    startKeepAlive();
    if (isMobile) {
      startMobileWatchdog();
      speakChunk(0, true);
    }
    else speakChunk(0);
  };

  const scrubToWord = (value: number[]) => {
    const nextWord = value[0] ?? 0;
    lastSpokenWordRef.current = nextWord;
    updateActiveWord(nextWord);
  };

  // Auto-scroll active word into view
  useEffect(() => {
    if (activeWordIdx >= 0 && activeWordRef.current) {
      activeWordRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeWordIdx]);

  useEffect(() => {
    return () => stopSpeech();
  }, []);

  useEffect(() => {
    stopSpeech();
    setSpokenText("");
  }, [summary]);

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

  const fetchSummary = async (book: Book, mode: "summary" | "deep" = "summary") => {
    const key = `${book.title}|${book.author}|${mode}`;
    setOpenBook(book);
    if (cache[key]) {
      setSummary(cache[key]);
      return;
    }
    setSummary("");
    setSummaryLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("book-summary", {
        body: { title: book.title, author: book.author, mode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const text = data?.summary || "No summary available.";
      setSummary(text);
      setCache((c) => ({ ...c, [key]: text }));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load content");
      setSummary("Sorry, we couldn't generate this right now. Please try again later.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const renderBook = (b: Book) => (
    <Card key={`${b.title}-${b.author}`} className="p-4 flex gap-3 items-start hover:border-primary/40 transition-colors">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xl shrink-0" aria-hidden="true">
        {b.emoji}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <h4 className="font-semibold text-sm leading-snug text-foreground whitespace-normal break-words">{b.title}</h4>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground whitespace-normal break-words">{b.author}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{b.why}</p>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => fetchSummary(b, "summary")}
          aria-label={`Quick summary of ${b.title}`}
          title="Quick summary"
        >
          <FileText className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-primary"
          onClick={() => fetchSummary(b, "deep")}
          aria-label={`Deep dive of ${b.title}`}
          title="Audiobook-style deep dive"
        >
          <Headphones className="h-3.5 w-3.5" />
        </Button>
      </div>
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

      <Dialog open={!!openBook} onOpenChange={(o) => { if (!o) { stopSpeech(); setOpenBook(null); } }}>
        <DialogContent className="max-w-lg h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 pb-4 border-b border-border/50 shrink-0 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl" aria-hidden="true">
              {openBook?.emoji}
            </div>
            <div className="min-w-0 space-y-1 px-6">
              <DialogTitle className="text-lg leading-snug font-bold text-center whitespace-normal break-words">
                {openBook?.title}
              </DialogTitle>
              <DialogDescription className="text-center text-xs uppercase tracking-wide whitespace-normal break-words">
                {openBook?.author}
              </DialogDescription>
            </div>
            <div className="flex items-center justify-center gap-1">
              {!summaryLoading && summary && (
                <>
                  {ttsState === "playing" ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={pauseSpeech} title="Pause">
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={playSpeech} title={ttsState === "paused" ? "Resume" : "Listen"}>
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  {ttsState !== "idle" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={stopSpeech} title="Stop">
                      <Square className="h-4 w-4" />
                    </Button>
                  )}
                  {spokenText && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={restartFromLastWord} title="Restart from current word">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
            {ttsState !== "idle" && spokenText && wordTokens.length > 0 && (
              <div className="space-y-2 px-1">
                <Slider value={[Math.max(activeWordIdx, 0)]} min={0} max={Math.max(wordTokens.length - 1, 0)} step={1} onValueChange={scrubToWord} />
                <p className="text-[11px] text-muted-foreground text-center">
                  Word {Math.min(Math.max(activeWordIdx + 1, 1), wordTokens.length)} of {wordTokens.length}
                </p>
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            {summaryLoading ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                <p className="text-sm">Generating summary…</p>
              </div>
            ) : ttsState !== "idle" && spokenText ? (
              <div className="text-sm leading-loose whitespace-pre-wrap">
                {wordTokens.map((t, i) => {
                  const prev = i === 0 ? 0 : wordTokens[i - 1].start + wordTokens[i - 1].word.length;
                  const gap = spokenText.slice(prev, t.start);
                  const isActive = i === activeWordIdx;
                  return (
                    <span key={i}>
                      {gap}
                      <span
                        ref={isActive ? activeWordRef : undefined}
                        className={isActive ? "bg-primary text-primary-foreground rounded px-0.5 transition-colors" : "transition-colors"}
                      >
                        {t.word}
                      </span>
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm leading-relaxed space-y-3
                [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2
                [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-primary
                [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1
                [&_p]:mb-2
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:mb-2
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:mb-2
                [&_li]:leading-relaxed
                [&_strong]:font-semibold [&_strong]:text-foreground
                [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
                [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

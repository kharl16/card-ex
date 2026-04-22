import { useEffect, useState, useMemo, useRef } from "react";
import { useToolPreferences } from "@/hooks/useToolPreferences";
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

function isMobileEnv() {
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export default function BookRecommendationsSection() {
  const { user } = useAuth();
  const { prefs, loaded: prefsLoaded, updateBooks, resetBooks } = useToolPreferences();
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
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const durationFactorRef = useRef<number>(1);
  const calibrationSamplesRef = useRef<number>(0);
  const calibrationKeyRef = useRef<string>("");
  const boundaryReliableRef = useRef<boolean>(!isMobileEnv());
  const boundaryEventCountRef = useRef<number>(0);
  const boundaryProbeStartedAtRef = useRef<number>(0);
  const smoothingWindowRef = useRef<number[]>([]);

  const isMobile = isMobileEnv();

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

  // Smoothing window: track a short rolling history of recent word durations so a single
  // outlier (a long word, a stutter from the engine) does not desync the highlighter.
  const pushSmoothingSample = (durationMs: number) => {
    const win = smoothingWindowRef.current;
    win.push(durationMs);
    if (win.length > 6) win.shift();
  };
  const smoothedDuration = (rawMs: number) => {
    const win = smoothingWindowRef.current;
    if (win.length < 3) return rawMs;
    const avg = win.reduce((a, b) => a + b, 0) / win.length;
    return Math.max(110, rawMs * 0.55 + avg * 0.45);
  };
  const resetSmoothingWindow = () => {
    smoothingWindowRef.current = [];
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
    const maxLen = isMobile ? 180 : 200;
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

  const getCalibrationKey = (voice: SpeechSynthesisVoice | null | undefined, rate: number) =>
    `cardex-tts-calibration:${voice?.voiceURI || voice?.name || "default"}:${voice?.lang || "unknown"}:${rate.toFixed(2)}`;

  const clampDurationFactor = (value: number) => Math.min(1.65, Math.max(0.62, value));

  const loadDurationCalibration = (voice: SpeechSynthesisVoice | null | undefined, rate: number) => {
    const key = getCalibrationKey(voice, rate);
    calibrationKeyRef.current = key;
    calibrationSamplesRef.current = 0;
    durationFactorRef.current = 1;
    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { factor?: number; samples?: number };
      if (typeof parsed.factor === "number") durationFactorRef.current = clampDurationFactor(parsed.factor);
      if (typeof parsed.samples === "number") calibrationSamplesRef.current = Math.max(0, parsed.samples);
    } catch {
      durationFactorRef.current = 1;
      calibrationSamplesRef.current = 0;
    }
  };

  const saveDurationCalibration = () => {
    if (!calibrationKeyRef.current) return;
    try {
      window.localStorage.setItem(
        calibrationKeyRef.current,
        JSON.stringify({ factor: durationFactorRef.current, samples: calibrationSamplesRef.current })
      );
    } catch {
      // Ignore storage failures; live calibration still applies during this session.
    }
  };

  const estimateWordDuration = (word: string, rate: number, voice?: SpeechSynthesisVoice | null, factor = durationFactorRef.current) => {
    const syllables = Math.max(1, (word.toLowerCase().match(/[aeiouy]+/g) || []).length);
    const punctuationPause = /[.!?]$/.test(word) ? 260 : /[,;:]$/.test(word) ? 130 : 0;
    const voiceFactor = voice?.localService ? 0.94 : 1.08;
    return Math.max(120, (((165 + syllables * 72 + punctuationPause) * voiceFactor) / rate) * factor);
  };

  const estimateChunkDuration = (chunk: SpeechChunk, rate: number, voice?: SpeechSynthesisVoice | null, factor = durationFactorRef.current): number => {
    const words: string[] = chunk.text.match(/\S+/g) || [];
    let total = 0;
    for (const word of words) total += estimateWordDuration(word, rate, voice, factor);
    return total;
  };

  const tuneDurationModel = (chunk: SpeechChunk, elapsedMs: number, rate: number, voice?: SpeechSynthesisVoice | null) => {
    if (!isMobile || chunk.wordCount < 3 || elapsedMs < 350) return;
    const baseEstimate = estimateChunkDuration(chunk, rate, voice, 1);
    if (!Number.isFinite(baseEstimate) || baseEstimate <= 0) return;
    const observedFactor = clampDurationFactor(elapsedMs / baseEstimate);
    const sampleWeight = calibrationSamplesRef.current < 4 ? 0.45 : 0.2;
    durationFactorRef.current = clampDurationFactor(durationFactorRef.current * (1 - sampleWeight) + observedFactor * sampleWeight);
    calibrationSamplesRef.current += 1;
    saveDurationCalibration();
    logSpeechStop("mobile_duration_model_tuned", {
      elapsedMs: Math.round(elapsedMs),
      estimatedMs: Math.round(baseEstimate),
      observedFactor: Number(observedFactor.toFixed(3)),
      activeFactor: Number(durationFactorRef.current.toFixed(3)),
      samples: calibrationSamplesRef.current,
    });
  };

  const startWordTimer = (chunk: SpeechChunk, rate: number, voice?: SpeechSynthesisVoice | null) => {
    clearWordTimer();
    if (chunk.wordCount <= 0) return;
    const words = chunk.text.match(/\S+/g) || [];
    let i = 0;
    updateActiveWord(chunk.wordStart);
    const scheduleNext = () => {
      const raw = estimateWordDuration(words[i] || "", rate, voice);
      const ms = smoothedDuration(raw);
      pushSmoothingSample(raw);
      wordTimerRef.current = window.setTimeout(tick, ms);
    };
    const tick = () => {
      i += 1;
      if (i >= chunk.wordCount) {
        clearWordTimer();
        return;
      }
      updateActiveWord(chunk.wordStart + i);
      scheduleNext();
    };
    scheduleNext();
  };

  const requeueFromWord = (wordIdx: number, reason: string) => {
    if (!isMobile || stoppedRef.current || !spokenTextRef.current) return;
    const totalWords = tokenizeText(spokenTextRef.current).length;
    const safeWord = Math.min(Math.max(wordIdx, 0), Math.max(totalWords - 1, 0));
    if (safeWord >= totalWords - 1) return;
    logSpeechStop(reason, { requeueFromWord: safeWord, durationFactor: durationFactorRef.current });
    window.speechSynthesis.cancel();
    clearWordTimer();
    utterancesRef.current = [];
    chunksRef.current = createChunks(spokenTextRef.current, safeWord);
    queueMobileChunks(0, reason);
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
    }, 120);
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
      const stalledMs = Date.now() - lastProgressAtRef.current;
      const stalled = stalledMs > Math.max(1300, estimateWordDuration(wordTokens[lastSpokenWordRef.current]?.word || "", speechRateRef.current, selectedVoiceRef.current) * 2.8);
      if (idle || stalled) {
        logSpeechStop(idle ? "mobile_synth_idle" : "mobile_progress_stalled", {
          stalledMs,
          durationFactor: durationFactorRef.current,
        });
        requeueFromWord(lastSpokenWordRef.current + 1, idle ? "watchdog_idle" : "watchdog_stalled");
      }
    }, 450);
  };

  const createUtterance = (idx: number, queued = false, voice = selectedVoiceRef.current) => {
    const chunks = chunksRef.current;
    const chunk = chunks[idx];
    const u = new SpeechSynthesisUtterance(chunk.text);
    const rate = speechRateRef.current;
    u.rate = rate;
    u.pitch = 1;
    u.lang = "en-US";
    if (voice) u.voice = voice;

    let startedAt = 0;
    let chunkBoundaryCount = 0;
    let timerStarted = false;
    const ensureTimerHighlighting = () => {
      if (timerStarted) return;
      timerStarted = true;
      resetSmoothingWindow();
      startWordTimer(chunk, rate, voice);
    };
    u.onstart = () => {
      startedAt = performance.now();
      boundaryProbeStartedAtRef.current = startedAt;
      chunkIdxRef.current = idx;
      updateActiveWord(chunk.wordStart);
      // If boundary events have already been observed as unreliable on this device,
      // start the smoothed timer immediately as the fallback highlighter.
      if (!boundaryReliableRef.current) ensureTimerHighlighting();
      // Probe: if 700ms pass with zero boundary events on a multi-word chunk, mark unreliable.
      window.setTimeout(() => {
        if (stoppedRef.current) return;
        if (chunk.wordCount > 1 && chunkBoundaryCount === 0 && boundaryReliableRef.current) {
          boundaryReliableRef.current = false;
          logSpeechStop("boundary_unreliable_detected", { chunkIdx: idx, wordCount: chunk.wordCount });
          ensureTimerHighlighting();
        }
      }, 700);
    };
    u.onboundary = (e: SpeechSynthesisEvent) => {
      if (e.name && e.name !== "word") return;
      chunkBoundaryCount += 1;
      boundaryEventCountRef.current += 1;
      // First reliable boundary in this chunk: stop the timer fallback if it was running.
      if (timerStarted) {
        timerStarted = false;
        clearWordTimer();
      }
      const before = chunk.text.slice(0, e.charIndex);
      const wordsBefore = (before.match(/\S+/g) || []).length;
      updateActiveWord(chunk.wordStart + wordsBefore);
    };
    u.onend = () => {
      clearWordTimer();
      if (stoppedRef.current) return;
      const totalWords = tokenizeText(spokenTextRef.current).length;
      const expectedEndWord = chunk.wordStart + chunk.wordCount - 1;
      const hasMoreWords = expectedEndWord < totalWords - 1;
      const elapsedMs = startedAt ? performance.now() - startedAt : 0;
      const expectedMs = estimateChunkDuration(chunk, rate, voice);

      if (isMobile && hasMoreWords && elapsedMs > 0 && elapsedMs < expectedMs * 0.38) {
        logSpeechStop("mobile_early_onend", {
          expectedEndWord,
          actualLastWord: lastSpokenWordRef.current,
          elapsedMs: Math.round(elapsedMs),
          expectedMs: Math.round(expectedMs),
        });
        requeueFromWord(lastSpokenWordRef.current + 1, "mobile_early_onend");
        return;
      }

      if (isMobile && elapsedMs > 0) tuneDurationModel(chunk, elapsedMs, rate, voice);
      updateActiveWord(expectedEndWord);

      if (queued) {
        if (idx === chunks.length - 1) {
          clearKeepAlive();
          clearMobileWatchdog();
          utterancesRef.current = [];
          setTtsState("idle");
          updateActiveWord(-1);
        } else if (isMobile) {
          scheduleMobileRecovery("mobile_queue_gap_after_chunk");
        }
        return;
      }

      speakChunk(idx + 1);
    };
    u.onerror = (e: any) => {
      clearWordTimer();
      if (e?.error === "interrupted" || e?.error === "canceled") return;
      logSpeechStop("utterance_error", e?.error);
      if (queued) {
        scheduleMobileRecovery(`queued_error_${e?.error || "unknown"}`);
        return;
      }
      if (!stoppedRef.current) speakChunk(idx + 1);
    };

    return u;
  };

  const queueMobileChunks = (startIdx = 0, reason = "mobile_initial_queue") => {
    if (stoppedRef.current) return;
    const chunks = chunksRef.current;
    if (startIdx >= chunks.length) return;
    chunkIdxRef.current = startIdx;
    logSpeechStop(reason, { queuedChunks: chunks.length - startIdx, durationFactor: durationFactorRef.current });
    for (let i = startIdx; i < chunks.length; i += 1) {
      const utterance = createUtterance(i, true);
      utterancesRef.current.push(utterance);
      window.speechSynthesis.speak(utterance);
    }
  };

  const speakChunk = (idx: number) => {
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
    const utterance = createUtterance(idx, false);
    utterancesRef.current.push(utterance);
    window.speechSynthesis.speak(utterance);
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
    speechRateRef.current = 1;
    const selectedVoice = pickVoice();
    selectedVoiceRef.current = selectedVoice || null;
    loadDurationCalibration(selectedVoice, speechRateRef.current);
    // Re-probe boundary reliability for each new narration; mobile defaults to unreliable.
    boundaryReliableRef.current = !isMobile;
    boundaryEventCountRef.current = 0;
    resetSmoothingWindow();

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
      // Queue every utterance inside the tap handler so mobile browsers preserve the media gesture context.
      queueMobileChunks(0, "mobile_initial_queue");
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
    selectedVoiceRef.current = selectedVoiceRef.current || pickVoice() || null;
    loadDurationCalibration(selectedVoiceRef.current, speechRateRef.current);
    setTtsState("playing");
    startKeepAlive();
    if (isMobile) {
      startMobileWatchdog();
      queueMobileChunks(0, "manual_restart_queue");
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
    // Persist last viewed book id (title|author) so it can reopen on refresh
    updateBooks({ lastViewedBookId: `${book.title}|${book.author}` });
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
        <Button
          variant="ghost"
          size="sm"
          className="mx-auto text-xs gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => {
            resetBooks();
            toast.success("Book preferences reset");
          }}
        >
          <RotateCcw className="h-3 w-3" />
          Reset preferences
        </Button>
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
          <DialogHeader className="px-6 pt-7 pb-5 border-b border-border/50 shrink-0 space-y-4">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/20 flex items-center justify-center text-2xl shadow-sm" aria-hidden="true">
                {openBook?.emoji}
              </div>
              <div className="w-full space-y-2">
                <DialogTitle className="text-xl sm:text-2xl font-serif font-semibold leading-tight tracking-tight text-foreground text-balance whitespace-normal break-words">
                  {openBook?.title}
                </DialogTitle>
                <div className="flex items-center justify-center gap-2">
                  <span className="h-px w-6 bg-border" aria-hidden="true" />
                  <DialogDescription className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground whitespace-normal break-words m-0">
                    {openBook?.author}
                  </DialogDescription>
                  <span className="h-px w-6 bg-border" aria-hidden="true" />
                </div>
              </div>
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

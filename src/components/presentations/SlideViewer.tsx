import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ChevronLeft, ChevronRight, Maximize, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface SlideViewerProps {
  url: string;
  title: string;
}

/** Senior-friendly slide viewer: one page at a time, big Back/Next buttons, page counter. */
export function SlideViewer({ url, title }: SlideViewerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isFull, setIsFull] = useState(false);
  const [width, setWidth] = useState(0);
  // Viewport height is tracked separately so rotation re-scales the slide.
  const [vh, setVh] = useState(() => window.innerHeight);
  const [drag, setDrag] = useState(0);
  const [anim, setAnim] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPage(1);
    // Streams by range so the first slide shows before the whole file downloads.
    const task = pdfjs.getDocument({ url, disableAutoFetch: true, rangeChunkSize: 1 << 20 });
    task.onProgress = (p: { loaded: number; total: number }) => {
      if (p.total) setProgress(Math.round((p.loaded / p.total) * 100));
    };
    task.promise
      .then((d) => !cancelled && setDoc(d))
      .catch(() => !cancelled && setError("We couldn't open this presentation. Please try again."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [url]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!doc || !canvasRef.current || !width) return;
    let task: pdfjs.RenderTask | null = null;
    let cancelled = false;
    doc.getPage(page).then((p) => {
      if (cancelled || !canvasRef.current) return;
      const base = p.getViewport({ scale: 1 });
      // Full screen floats the controls over the slide, so only a hair of margin
      // is reserved — the slide fills the screen on phones, including landscape.
      const maxH = isFull ? vh - 16 : Infinity;
      const scale = Math.min(width / base.width, maxH / base.height);
      const dpr = window.devicePixelRatio || 1;
      const vp = p.getViewport({ scale: scale * dpr });
      const c = canvasRef.current;
      c.width = vp.width;
      c.height = vp.height;
      c.style.width = `${vp.width / dpr}px`;
      c.style.height = `${vp.height / dpr}px`;
      task = p.render({ canvasContext: c.getContext("2d")!, viewport: vp });
      task.promise.catch(() => undefined);
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, page, width, isFull, vh]);

  const total = doc?.numPages ?? 0;
  const go = useCallback((d: number) => setPage((p) => Math.min(Math.max(1, p + d), total || 1)), [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "Escape") setIsFull(false);
    };
    const onFs = () => { if (!document.fullscreenElement) setIsFull(false); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [go]);

  const toggleFull = () => {
    if (!isFull) {
      setIsFull(true);
      rootRef.current?.requestFullscreen?.().catch(() => undefined);
    } else {
      setIsFull(false);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    }
  };

  useEffect(() => {
    if (!isFull) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isFull]);

  // Swipe: slide follows the finger, then glides to the next/previous slide.
  const onDown = (e: React.PointerEvent) => {
    if (!isFull || !total) return;
    startX.current = e.clientX;
    setAnim(false);
  };
  const onMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    let dx = e.clientX - startX.current;
    if ((dx > 0 && page <= 1) || (dx < 0 && page >= total)) dx *= 0.3;
    setDrag(dx);
  };
  const onUp = () => {
    if (startX.current === null) return;
    startX.current = null;
    const w = width || window.innerWidth;
    const dir = drag < -60 && page < total ? 1 : drag > 60 && page > 1 ? -1 : 0;
    setAnim(true);
    if (!dir) { setDrag(0); return; }
    setDrag(-dir * w);
    window.setTimeout(() => {
      setAnim(false);
      go(dir);
      setDrag(dir * w * 0.25);
      requestAnimationFrame(() => requestAnimationFrame(() => { setAnim(true); setDrag(0); }));
    }, 220);
  };

  const pill = "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-primary/50 bg-background/50 text-primary shadow-lg backdrop-blur-md transition hover:bg-background/80 disabled:opacity-0 sm:h-14 sm:w-14";

  return (
    <div
      ref={rootRef}
      data-full={isFull}
      className={isFull
        ? "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
        : "flex flex-col gap-4 rounded-2xl border border-primary/30 bg-card p-4"}
    >
      <div
        ref={wrapRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={onUp}
        className={isFull
          ? "relative flex h-full w-full touch-pan-y select-none items-center justify-center overflow-hidden"
          : "relative flex min-h-[40vh] w-full items-center justify-center overflow-hidden rounded-xl bg-background"}
      >
        {loading && (
          <div className="flex flex-col items-center gap-3 p-10 text-lg text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            Opening presentation{progress ? ` (${progress}%)` : "…"}
          </div>
        )}
        {error && <p className="p-10 text-center text-lg text-destructive">{error}</p>}
        <canvas
          ref={canvasRef}
          aria-label={`${title}, slide ${page} of ${total}`}
          style={{ transform: `translateX(${drag}px)`, transition: anim ? "transform 220ms ease-out" : "none" }}
          className={(loading || error ? "hidden" : "block") + (isFull ? " rounded-lg shadow-2xl" : "")}
        />
        {isFull && !loading && !error && (
          <>
            <button aria-label="Previous slide" onClick={() => go(-1)} disabled={page <= 1} className={pill + " left-1 sm:left-6"}>
              <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
            </button>
            <button aria-label="Next slide" onClick={() => go(1)} disabled={page >= total} className={pill + " right-1 sm:right-6"}>
              <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
            </button>
          </>
        )}
      </div>

      {isFull && (
        <>
          <button
            aria-label="Close full screen"
            onClick={toggleFull}
            className="absolute right-2 top-2 z-20 flex h-10 items-center gap-1 rounded-full border border-primary/50 bg-background/60 px-3 text-sm font-semibold text-primary backdrop-blur-md sm:right-4 sm:top-4 sm:h-12 sm:gap-2 sm:px-4 sm:text-base"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" /> Close
          </button>
          {!loading && !error && (
            <p className="absolute bottom-1.5 left-1.5 z-20 rounded-full border border-primary/25 bg-background/20 px-2.5 py-0.5 text-[13px] font-semibold leading-5 text-foreground/75 backdrop-blur-sm transition hover:bg-background/60 hover:text-foreground sm:bottom-4 sm:left-4 sm:px-3 sm:py-1 sm:text-sm" aria-live="polite">
              Slide {page} of {total}
            </p>
          )}
        </>
      )}

      {!isFull && !loading && !error && (
        <>
          <p className="text-center text-xl font-semibold text-foreground" aria-live="polite">
            Slide {page} of {total}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => go(-1)} disabled={page <= 1} variant="outline" className="h-16 gap-2 rounded-xl text-xl font-semibold">
              <ChevronLeft className="h-7 w-7" /> Back
            </Button>
            <Button onClick={() => go(1)} disabled={page >= total} className="h-16 gap-2 rounded-xl text-xl font-semibold">
              Next <ChevronRight className="h-7 w-7" />
            </Button>
          </div>
          <Button onClick={toggleFull} variant="ghost" className="h-12 gap-2 text-base">
            <Maximize className="h-5 w-5" /> Full Screen
          </Button>
        </>
      )}
    </div>
  );
}

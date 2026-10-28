import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ChevronLeft, ChevronRight, Maximize, Minimize, Loader2 } from "lucide-react";
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
      const maxH = isFull ? window.innerHeight - 120 : Infinity;
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
  }, [doc, page, width, isFull]);

  const total = doc?.numPages ?? 0;
  const go = useCallback((d: number) => setPage((p) => Math.min(Math.max(1, p + d), total || 1)), [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    const onFs = () => setIsFull(!!document.fullscreenElement);
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [go]);

  const toggleFull = () => {
    const host = wrapRef.current?.parentElement;
    if (!document.fullscreenElement) host?.requestFullscreen?.().catch(() => undefined);
    else document.exitFullscreen();
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-primary/30 bg-card p-4 data-[full=true]:justify-center" data-full={isFull}>
      <div ref={wrapRef} className="relative flex min-h-[40vh] w-full items-center justify-center overflow-hidden rounded-xl bg-background">
        {loading && (
          <div className="flex flex-col items-center gap-3 p-10 text-lg text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            Opening presentation{progress ? ` (${progress}%)` : "…"}
          </div>
        )}
        {error && <p className="p-10 text-center text-lg text-destructive">{error}</p>}
        <canvas ref={canvasRef} aria-label={`${title}, slide ${page} of ${total}`} className={loading || error ? "hidden" : "block"} />
      </div>

      {!loading && !error && (
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
            {isFull ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            {isFull ? "Exit Full Screen" : "Full Screen"}
          </Button>
        </>
      )}
    </div>
  );
}

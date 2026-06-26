import { useRef, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { Download, ExternalLink, Play, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TopRightActions } from "@/components/ui/top-right-actions";
import { cn } from "@/lib/utils";
import type { FileResource, EventType } from "@/types/resources";

interface FilePreviewDialogProps {
  file: FileResource | null;
  files: FileResource[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onLogEvent: (eventType: EventType) => void;
  onNavigate: (file: FileResource) => void;
}

export function FilePreviewDialog({
  file,
  files,
  open,
  onOpenChange,
  isFavorite,
  onToggleFavorite,
  onLogEvent,
  onNavigate,
}: FilePreviewDialogProps) {
  if (!file) return null;

  const currentIndex = files.findIndex((f) => f.id === file.id);
  const total = files.length;
  const canLoop = total > 1;
  const hasPrev = canLoop;
  const hasNext = canLoop;
  const prevIndex = canLoop ? (currentIndex - 1 + total) % total : -1;
  const nextIndex = canLoop ? (currentIndex + 1) % total : -1;
  const prevFile = hasPrev ? files[prevIndex] : null;
  const nextFile = hasNext ? files[nextIndex] : null;

  const goPrev = () => { if (hasPrev) onNavigate(files[prevIndex]); };
  const goNext = () => { if (hasNext) onNavigate(files[nextIndex]); };

  // Phone-gallery style swipe: track drag, follow finger, snap with animation
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragStart = useRef<{ x: number; y: number; width: number; locked: boolean | null } | null>(null);
  const mouseListeners = useRef<{ move: (event: MouseEvent) => void; up: (event: MouseEvent) => void } | null>(null);
  const [dragX, setDragX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number; active: boolean } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const zoomRef = useRef(1);
  const animatingRef = useRef(false);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const tapStartRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const touchHandledEvents = useRef<WeakSet<Event>>(new WeakSet());
  const pinchRef = useRef({ active: false, startDist: 0, startZoom: 1 });
  const SWIPE_RATIO = 0.2; // 20% of width triggers navigation
  const SWIPE_VELOCITY_PX = 60;
  const DOUBLE_TAP_MS = 320;
  const TAP_MOVE_TOLERANCE = 24;

  const clampPan = useCallback((x: number, y: number, z: number) => {
    const el = trackRef.current;
    const img = imgRef.current;
    if (!el || !img || z <= 1.01) return { x: 0, y: 0 };
    const rect = img.getBoundingClientRect();
    // rect already reflects current scale via CSS transform on the rendered img
    const maxX = Math.max(0, (rect.width - el.clientWidth) / 2);
    const maxY = Math.max(0, (rect.height - el.clientHeight) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  }, []);

  const clampZoom = (value: number) => +Math.min(4, Math.max(1, value)).toFixed(3);
  const commitZoom = useCallback((value: number | ((current: number) => number)) => {
    setZoom((current) => {
      const raw = typeof value === "function" ? value(current) : value;
      const next = clampZoom(raw);
      zoomRef.current = next;
      if (next <= 1.01) {
        panRef.current = { x: 0, y: 0 };
        setPan({ x: 0, y: 0 });
      } else {
        // Re-clamp existing pan to new zoom bounds on next frame
        requestAnimationFrame(() => {
          const clamped = clampPan(panRef.current.x, panRef.current.y, next);
          panRef.current = clamped;
          setPan(clamped);
        });
      }
      return next;
    });
  }, [clampPan]);

  const removeMouseListeners = useCallback(() => {
    if (!mouseListeners.current) return;
    window.removeEventListener("mousemove", mouseListeners.current.move);
    window.removeEventListener("mouseup", mouseListeners.current.up);
    mouseListeners.current = null;
  }, []);

  useEffect(() => removeMouseListeners, [removeMouseListeners]);

  useLayoutEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useLayoutEffect(() => {
    animatingRef.current = animating;
  }, [animating]);

  // Reset drag/pan whenever the active file changes
  useEffect(() => {
    setDragX(0);
    setAnimating(false);
    animatingRef.current = false;
    dragStart.current = null;
    panStartRef.current = null;
    panRef.current = { x: 0, y: 0 };
    setPan({ x: 0, y: 0 });
    removeMouseListeners();
  }, [file.id, removeMouseListeners]);

  const beginPan = (x: number, y: number) => {
    panStartRef.current = {
      x, y,
      panX: panRef.current.x,
      panY: panRef.current.y,
      active: false,
    };
  };

  const updatePan = (x: number, y: number) => {
    const start = panStartRef.current;
    if (!start) return false;
    const dx = x - start.x;
    const dy = y - start.y;
    if (!start.active) {
      if (Math.hypot(dx, dy) < 4) return false;
      start.active = true;
    }
    const next = clampPan(start.panX + dx, start.panY + dy, zoomRef.current);
    panRef.current = next;
    setPan(next);
    return true;
  };

  const endPan = () => {
    const wasActive = panStartRef.current?.active === true;
    panStartRef.current = null;
    return wasActive;
  };

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement && Boolean(target.closest("button, a, [role='button']"));

  const beginSwipe = (x: number, y: number) => {
    // Cancel any in-flight animation so a new swipe can start immediately
    if (animatingRef.current) {
      setAnimating(false);
      animatingRef.current = false;
      setDragX(0);
    }
    const width = trackRef.current?.clientWidth ?? window.innerWidth;
    dragStart.current = { x, y, width, locked: null };
  };

  const updateSwipe = (x: number, y: number) => {
    if (!dragStart.current) return false;
    const dx = x - dragStart.current.x;
    const dy = y - dragStart.current.y;
    // Lock axis after small movement so vertical scroll still works
    if (dragStart.current.locked === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return false;
      const horizontal = Math.abs(dx) > Math.abs(dy) * 1.1;
      dragStart.current.locked = horizontal;
    }
    if (!dragStart.current.locked) return false;
    let next = dx;
    // Add rubber-band resistance at the ends
    if ((dx > 0 && !hasPrev) || (dx < 0 && !hasNext)) {
      next = dx * 0.25;
    }
    setDragX(next);
    return true;
  };

  const finishSwipe = (dx: number, width: number) => {
    const threshold = width * SWIPE_RATIO;
    const goingNext = dx < 0 && hasNext && (Math.abs(dx) > threshold || dx < -SWIPE_VELOCITY_PX * 2);
    const goingPrev = dx > 0 && hasPrev && (Math.abs(dx) > threshold || dx > SWIPE_VELOCITY_PX * 2);
    setAnimating(true);
    if (goingNext) {
      setDragX(-width);
      window.setTimeout(() => { goNext(); setAnimating(false); }, 220);
    } else if (goingPrev) {
      setDragX(width);
      window.setTimeout(() => { goPrev(); setAnimating(false); }, 220);
    } else {
      setDragX(0);
      window.setTimeout(() => setAnimating(false), 220);
    }
  };

  const endSwipe = (x: number) => {
    if (!dragStart.current) return;
    const dx = x - dragStart.current.x;
    const width = dragStart.current.width;
    const locked = dragStart.current.locked;
    dragStart.current = null;
    if (locked) finishSwipe(dx, width);
    else setDragX(0);
  };

  const cancelSwipe = () => {
    removeMouseListeners();
    dragStart.current = null;
    setAnimating(true);
    setDragX(0);
    window.setTimeout(() => setAnimating(false), 220);
  };

  const resetZoomToActualSize = useCallback(() => {
    commitZoom(1);
  }, [commitZoom]);

  const distanceBetweenTouches = (touches: TouchList | React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const maybeHandleDoubleTap = useCallback((touch: Pick<Touch, "clientX" | "clientY">) => {
    const start = tapStartRef.current;
    tapStartRef.current = null;
    if (!start) return;
    const moved = Math.hypot(touch.clientX - start.x, touch.clientY - start.y);
    const elapsed = Date.now() - start.time;
    if (moved > TAP_MOVE_TOLERANCE || elapsed > 360) return;

    const previous = lastTapRef.current;
    const current = { time: Date.now(), x: touch.clientX, y: touch.clientY };
    if (
      previous &&
      current.time - previous.time <= DOUBLE_TAP_MS &&
      Math.hypot(current.x - previous.x, current.y - previous.y) <= TAP_MOVE_TOLERANCE * 1.5
    ) {
      lastTapRef.current = null;
      dragStart.current = null;
      setDragX(0);
      resetZoomToActualSize();
    } else {
      lastTapRef.current = current;
    }
  }, [resetZoomToActualSize]);

  const handleTouchStartCore = (touches: TouchList | React.TouchList, target: EventTarget | null) => {
    if (isInteractiveTarget(target) || touches.length === 0) return false;
    if (touches.length === 2) {
      pinchRef.current.active = true;
      pinchRef.current.startDist = distanceBetweenTouches(touches);
      pinchRef.current.startZoom = zoomRef.current;
      dragStart.current = null;
      panStartRef.current = null;
      tapStartRef.current = null;
      return true;
    }
    const t = touches[0];
    tapStartRef.current = { time: Date.now(), x: t.clientX, y: t.clientY };
    if (touches.length !== 1) return false;
    if (zoomRef.current > 1.01) {
      beginPan(t.clientX, t.clientY);
      return false;
    }
    beginSwipe(t.clientX, t.clientY);
    return false;
  };

  const handleTouchMoveCore = (touches: TouchList | React.TouchList) => {
    if (pinchRef.current.active && touches.length === 2) {
      const ratio = distanceBetweenTouches(touches) / (pinchRef.current.startDist || 1);
      commitZoom(pinchRef.current.startZoom * ratio);
      return true;
    }
    if (touches.length !== 1) return false;
    const t = touches[0];
    if (tapStartRef.current) {
      const moved = Math.hypot(t.clientX - tapStartRef.current.x, t.clientY - tapStartRef.current.y);
      if (moved > TAP_MOVE_TOLERANCE) tapStartRef.current = null;
    }
    if (panStartRef.current) {
      return updatePan(t.clientX, t.clientY);
    }
    return updateSwipe(t.clientX, t.clientY);
  };

  const handleTouchEndCore = (touches: TouchList | React.TouchList, changedTouches: TouchList | React.TouchList) => {
    if (pinchRef.current.active) {
      if (touches.length < 2) pinchRef.current.active = false;
      return;
    }
    const t = changedTouches[0];
    if (!t) return;
    const wasSwipe = dragStart.current?.locked === true;
    const wasPan = endPan();
    endSwipe(t.clientX);
    if (!wasSwipe && !wasPan) maybeHandleDoubleTap(t);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isInteractiveTarget(e.target)) return;
    e.preventDefault();
    removeMouseListeners();
    const zoomed = zoomRef.current > 1.01;
    if (zoomed) {
      beginPan(e.clientX, e.clientY);
    } else {
      beginSwipe(e.clientX, e.clientY);
    }

    const move = (event: MouseEvent) => {
      if (panStartRef.current) {
        if (updatePan(event.clientX, event.clientY)) event.preventDefault();
      } else if (updateSwipe(event.clientX, event.clientY)) {
        event.preventDefault();
      }
    };
    const up = (event: MouseEvent) => {
      removeMouseListeners();
      endPan();
      endSwipe(event.clientX);
    };
    mouseListeners.current = { move, up };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };


  // Native pinch-to-zoom + single-finger swipe. Refs keep iOS Safari gestures
  // stable while zoom state changes during a continuous pinch.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const safariGesture = { active: false, startZoom: 1 };
    const onStart = (e: TouchEvent) => {
      touchHandledEvents.current.add(e);
      if (handleTouchStartCore(e.touches, e.target)) e.preventDefault();
    };
    const onMove = (e: TouchEvent) => {
      touchHandledEvents.current.add(e);
      if (handleTouchMoveCore(e.touches)) e.preventDefault();
    };
    const onEnd = (e: TouchEvent) => {
      touchHandledEvents.current.add(e);
      handleTouchEndCore(e.touches, e.changedTouches);
    };
    const onWheel = (e: WheelEvent) => {
      // Trackpad pinch gestures arrive as wheel events with ctrlKey
      if (!e.ctrlKey) return;
      e.preventDefault();
      commitZoom((z) => z - e.deltaY * 0.01);
    };
    const onDblClick = () => resetZoomToActualSize();
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      safariGesture.active = true;
      safariGesture.startZoom = zoomRef.current;
      dragStart.current = null;
      tapStartRef.current = null;
    };
    const onGestureChange = (e: Event) => {
      if (!safariGesture.active) return;
      e.preventDefault();
      const gesture = e as Event & { scale?: number };
      commitZoom(safariGesture.startZoom * (gesture.scale ?? 1));
    };
    const onGestureEnd = (e: Event) => {
      e.preventDefault();
      safariGesture.active = false;
    };
    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", cancelSwipe, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("dblclick", onDblClick);
    el.addEventListener("gesturestart", onGestureStart, { passive: false } as AddEventListenerOptions);
    el.addEventListener("gesturechange", onGestureChange, { passive: false } as AddEventListenerOptions);
    el.addEventListener("gestureend", onGestureEnd, { passive: false } as AddEventListenerOptions);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", cancelSwipe);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("dblclick", onDblClick);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
      el.removeEventListener("gestureend", onGestureEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id, hasPrev, hasNext, commitZoom, resetZoomToActualSize, handleTouchStartCore, handleTouchMoveCore, handleTouchEndCore]);

  const onReactTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchHandledEvents.current.has(e.nativeEvent)) return;
    if (handleTouchStartCore(e.touches, e.target) && e.cancelable) e.preventDefault();
  };

  const onReactTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchHandledEvents.current.has(e.nativeEvent)) return;
    if (handleTouchMoveCore(e.touches) && e.cancelable) e.preventDefault();
  };

  const onReactTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchHandledEvents.current.has(e.nativeEvent)) return;
    handleTouchEndCore(e.touches, e.changedTouches);
  };

  // Reset zoom whenever the previewed file changes
  useEffect(() => { commitZoom(1); }, [file.id, commitZoom]);




  const isZoomed = zoom > 1.01;

  const renderImage = (f: FileResource | null, isCurrent = false) => {
    if (!f) return <div className="w-full h-full" />;
    if (f.images) {
      const scale = isCurrent ? zoom : 1;
      const tx = isCurrent ? pan.x : 0;
      const ty = isCurrent ? pan.y : 0;
      const isPanning = isCurrent && (panStartRef.current?.active || pinchRef.current.active);
      return (
        <img
          ref={isCurrent ? imgRef : undefined}
          src={f.images}
          alt={f.file_name}
          className={cn(
            "w-full h-full object-contain max-h-[55vh] select-none pointer-events-none",
            isPanning ? "" : "transition-transform duration-200"
          )}
          style={{ transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`, transformOrigin: "center center" }}
          draggable={false}
          referrerPolicy="no-referrer"
        />
      );
    }
    return (
      <div className="flex items-center justify-center h-48 w-full text-muted-foreground/20">
        <Download className="h-16 w-16" />
      </div>
    );
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] p-0 gap-0 overflow-hidden bg-background border-border/30 shadow-2xl shadow-black/20 rounded-2xl">
        {/* Image area */}
        <div
          ref={trackRef}
          className={cn(
            "relative bg-black/95 overflow-hidden min-h-[40vh] max-h-[55vh]",
            !isZoomed ? "touch-pan-y cursor-grab active:cursor-grabbing" : "touch-none cursor-zoom-out"
          )}
          onMouseDown={onMouseDown}
          onTouchStart={onReactTouchStart}
          onTouchMove={onReactTouchMove}
          onTouchEnd={onReactTouchEnd}
          style={{ touchAction: isZoomed ? "none" : "pan-y" }}
        >
          {/* Sliding track: [prev][current][next] */}
          <div
            className="flex h-full min-h-[40vh] max-h-[55vh] will-change-transform"
            style={{
              width: "300%",
              transform: `translate3d(calc(-33.3333% + ${dragX}px), 0, 0)`,
              transition: animating ? "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
            }}
          >
            <div className="w-1/3 flex items-center justify-center shrink-0">
              {renderImage(prevFile)}
            </div>
            <div className="w-1/3 flex items-center justify-center shrink-0">
              {renderImage(file, true)}
            </div>
            <div className="w-1/3 flex items-center justify-center shrink-0">
              {renderImage(nextFile)}
            </div>
          </div>





          {/* Nav arrows */}
          {hasPrev && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md border border-white/10"
              onClick={goPrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          {hasNext && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md border border-white/10"
              onClick={goNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}

          {/* Counter pill */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white/80 text-[10px] font-medium px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
            {currentIndex + 1} / {files.length}
          </div>

          {/* Top-right actions (reserves space for Dialog's built-in X) */}
          <TopRightActions reserveCloseSlot>
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-9 w-9 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md border border-white/10",
                isFavorite && "text-red-500"
              )}
              onClick={onToggleFavorite}
            >
              <Heart className={cn("h-4 w-4", isFavorite && "fill-current drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]")} />
            </Button>
          </TopRightActions>
        </div>


        {/* Details */}
        <div className="p-5 space-y-4">
          <div>
            <h2 className="font-bold text-base leading-snug line-clamp-2">
              {file.file_name}
            </h2>
            {file.folder_name && (
              <Badge variant="secondary" className="mt-1.5 text-[10px] font-medium">
                {file.folder_name}
              </Badge>
            )}
          </div>

          {file.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {file.description}
            </p>
          )}

          {(file.price_dp || file.price_srp) && (
            <div className="flex items-start gap-2">
              {file.price_dp && (
                <div className="font-mono text-xs px-2.5 py-1.5 rounded-md bg-primary/90 border-0 shadow-md shadow-primary/20 text-primary-foreground whitespace-pre-wrap leading-relaxed">
                  <span className="font-semibold">DP:</span> {file.price_dp}
                </div>
              )}
              {file.price_srp && (
                <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1 shrink-0">
                  SRP: {file.price_srp}
                </Badge>
              )}
            </div>
          )}

          {(() => {
            const f = file as typeof file & { custom_fields?: Array<{ label: string; value: string }> };
            const rows: Array<[string, string | number]> = [];
            const push = (label: string, v: unknown) => {
              if (v === null || v === undefined) return;
              const s = String(v).trim();
              if (s) rows.push([label, s]);
            };
            push("Unilevel Points", f.unilevel_points);
            push("Package Points (SMC)", f.package_points_smc);
            push("RQV", f.rqv);
            push("Infinity", f.infinity);
            push("Check Match", f.check_match);
            push("Give Me 5", f.give_me_5);
            push("Just 4 You", f.just_4_you);
            push("Wholesale Commission", f.wholesale_package_commission);
            (f.custom_fields ?? []).forEach((c) => push(c.label, c.value));
            if (rows.length === 0) return null;
            return (
              <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:[&>*:nth-child(odd)]:border-r divide-border/50 sm:[&>*:nth-child(n+3)]:border-t">
                  {rows.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 px-3 py-2 border-border/50">
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                        {label}
                      </span>
                      <span className="text-xs font-semibold text-foreground font-mono text-right">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {file.drive_link_share && (
              <Button asChild size="sm" className="flex-1 min-w-[100px] gap-2 rounded-xl shadow-md shadow-primary/10">
                <a href={file.drive_link_share} target="_blank" rel="noopener noreferrer" onClick={() => onLogEvent("view")}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </a>
              </Button>
            )}
            {file.drive_link_download && (
              <Button asChild size="sm" variant="secondary" className="flex-1 min-w-[100px] gap-2 rounded-xl">
                <a href={file.drive_link_download} target="_blank" rel="noopener noreferrer" onClick={() => onLogEvent("download")}>
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </Button>
            )}
            {file.view_video_url && (
              <Button asChild size="sm" variant="outline" className="flex-1 min-w-[90px] gap-2 rounded-xl border-border/50">
                <a href={file.view_video_url} target="_blank" rel="noopener noreferrer" onClick={() => onLogEvent("watch")}>
                  <Play className="h-3.5 w-3.5" />
                  Watch
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

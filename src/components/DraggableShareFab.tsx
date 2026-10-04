import React, { useCallback, useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DraggableShareFabProps {
  onClick: () => void;
  storageKey?: string;
}

const STORAGE_KEY_DEFAULT = "share_fab_pos_v1";
const SIZE = 48;
const EDGE = 12;
const DRAG_THRESHOLD = 6;
type Position = { x: number; y: number };

// On laptops the public card is narrower than the viewport. The photo viewer
// temporarily expands the available drag area to the viewer itself.
function bounds() {
  const viewer = document.querySelector<HTMLElement>("[data-card-lightbox][data-state='open']");
  const card = document.querySelector<HTMLElement>("[data-card-page]");
  const rect = viewer?.getBoundingClientRect() ?? card?.getBoundingClientRect();
  const left = rect ? Math.max(0, rect.left) : 0;
  const right = rect ? Math.min(window.innerWidth, rect.right) : window.innerWidth;
  return {
    minX: left + EDGE,
    maxX: Math.max(left + EDGE, right - SIZE - EDGE),
    minY: EDGE,
    maxY: Math.max(EDGE, window.innerHeight - SIZE - EDGE),
  };
}

function clamp({ x, y }: Position): Position {
  const { minX, maxX, minY, maxY } = bounds();
  return { x: Math.max(minX, Math.min(maxX, x)), y: Math.max(minY, Math.min(maxY, y)) };
}

function defaultPosition(): Position {
  const { maxX, maxY } = bounds();
  return { x: maxX, y: Math.max(EDGE, maxY - (window.innerWidth < 640 ? 76 : 20)) };
}

export default function DraggableShareFab({ onClick, storageKey = STORAGE_KEY_DEFAULT }: DraggableShareFabProps) {
  const [pos, setPos] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origin: Position; moved: boolean } | null>(null);
  const posRef = useRef<Position | null>(null);
  const suppressClick = useRef(false);

  const moveTo = useCallback((next: Position) => {
    const safe = clamp(next);
    posRef.current = safe;
    setPos(safe);
    return safe;
  }, []);

  useEffect(() => {
    let saved: Position | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) saved = parsed;
      }
    } catch { /* Use the default position if storage is unavailable. */ }
    moveTo(saved ?? defaultPosition());
  }, [storageKey, moveTo]);

  useEffect(() => {
    const reclamp = () => moveTo(posRef.current ?? defaultPosition());
    window.addEventListener("resize", reclamp);
    window.addEventListener("orientationchange", reclamp);
    // The lightbox is portaled; opening and resizing it need not resize the window.
    let observedViewer: HTMLElement | null = null;
    const resizeObserver = new ResizeObserver(() => { if (!dragRef.current) reclamp(); });
    const syncViewer = () => {
      const viewer = document.querySelector<HTMLElement>("[data-card-lightbox][data-state='open']");
      if (viewer === observedViewer) return;
      if (observedViewer) resizeObserver.unobserve(observedViewer);
      observedViewer = viewer;
      if (viewer) resizeObserver.observe(viewer);
      if (!dragRef.current) reclamp();
    };
    const observer = new MutationObserver(syncViewer);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-state"] });
    return () => {
      window.removeEventListener("resize", reclamp);
      window.removeEventListener("orientationchange", reclamp);
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [moveTo]);

  const persist = (next: Position) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Non-persistent drag still works. */ }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!posRef.current || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: posRef.current, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    setDragging(true);
    moveTo({ x: drag.origin.x + dx, y: drag.origin.y + dy });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    suppressClick.current = true;
    if (drag?.moved) {
      if (posRef.current) persist(posRef.current);
    } else if (drag) {
      onClick();
    }
  };

  if (!pos) return null;

  return (
    <Button
      type="button"
      data-share-fab
      size="icon"
      variant="ghost"
      aria-label="Share card (drag to move)"
      title="Share card · drag to move"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { dragRef.current = null; setDragging(false); }}
      onClick={(e) => {
        if (suppressClick.current) { e.preventDefault(); suppressClick.current = false; return; }
        onClick(); // Keyboard activation
      }}
      style={{ left: pos.x, top: pos.y, touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
      className="fixed z-[60] !h-12 !w-12 rounded-full border border-primary/55 bg-card/90 text-primary shadow-gold backdrop-blur-xl ring-1 ring-inset ring-primary/20 hover:bg-accent hover:text-primary focus-visible:ring-primary active:scale-95"
    >
      <Share2 className="!h-[18px] !w-[18px]" strokeWidth={1.7} />
    </Button>
  );
}
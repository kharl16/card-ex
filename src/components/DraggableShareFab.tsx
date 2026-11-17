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

// Share may be dragged anywhere on the screen (laptops included). Phones were
// already full-width, so their behaviour is unchanged.
function bounds() {
  return {
    minX: EDGE,
    maxX: Math.max(EDGE, window.innerWidth - SIZE - EDGE),
    minY: EDGE,
    maxY: Math.max(EDGE, window.innerHeight - SIZE - EDGE),
  };
}

// First appearance is at middle-right: beside the card's right edge (laptops)
// or the screen's right edge (phones), vertically centred.
function defaultPosition(): Position {
  const { maxX } = bounds();
  const card = document.querySelector<HTMLElement>("[data-card-page]")?.getBoundingClientRect();
  const x = card ? Math.min(maxX, Math.max(EDGE, card.right - SIZE - EDGE)) : maxX;
  return { x, y: Math.max(EDGE, Math.round((window.innerHeight - SIZE) / 2)) };
}

function clamp({ x, y }: Position): Position {
  const { minX, maxX, minY, maxY } = bounds();
  return { x: Math.max(minX, Math.min(maxX, x)), y: Math.max(minY, Math.min(maxY, y)) };
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
    return () => {
      window.removeEventListener("resize", reclamp);
      window.removeEventListener("orientationchange", reclamp);
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
      data-floating-control
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
      // pointerEvents: open windows switch off taps on the page behind them; the
      // Share button opts back in so it can be dragged or tapped at any time.
      style={{ left: pos.x, top: pos.y, touchAction: "none", pointerEvents: "auto", cursor: dragging ? "grabbing" : "grab" }}
      className="fixed z-[60] !h-12 !w-12 rounded-full border border-primary/55 bg-card/90 text-primary shadow-gold backdrop-blur-xl ring-1 ring-inset ring-primary/20 hover:bg-accent hover:text-primary focus-visible:ring-primary active:scale-95"
    >
      <Share2 className="!h-[18px] !w-[18px]" strokeWidth={1.7} />
    </Button>
  );
}
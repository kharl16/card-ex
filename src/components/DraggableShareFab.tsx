import React, { useEffect, useRef, useState, useCallback } from "react";
import { Share2 } from "lucide-react";

interface DraggableShareFabProps {
  onClick: () => void;
  storageKey?: string;
}

const STORAGE_KEY_DEFAULT = "share_fab_pos_v1";
const FAB_SIZE_MOBILE = 56;
const FAB_SIZE_DESKTOP = 64;
const EDGE_PADDING = 12;
const DRAG_THRESHOLD = 6; // px before considered a drag (suppress click)

const getDefaultPos = () => {
  if (typeof window === "undefined") return { x: 16, y: 88 };
  const size = window.innerWidth >= 640 ? FAB_SIZE_DESKTOP : FAB_SIZE_MOBILE;
  // bottom-right default; offset above mobile bottom nav
  const isMobile = window.innerWidth < 640;
  const right = isMobile ? 16 : 32;
  const bottom = isMobile ? 88 : 32;
  return {
    x: window.innerWidth - size - right,
    y: window.innerHeight - size - bottom,
  };
};

const clampPos = (x: number, y: number, size: number) => {
  if (typeof window === "undefined") return { x, y };
  return {
    x: Math.max(EDGE_PADDING, Math.min(window.innerWidth - size - EDGE_PADDING, x)),
    y: Math.max(EDGE_PADDING, Math.min(window.innerHeight - size - EDGE_PADDING, y)),
  };
};

export default function DraggableShareFab({ onClick, storageKey = STORAGE_KEY_DEFAULT }: DraggableShareFabProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragStateRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  const sizeRef = useRef<number>(typeof window !== "undefined" && window.innerWidth >= 640 ? FAB_SIZE_DESKTOP : FAB_SIZE_MOBILE);

  // Hydrate from localStorage / defaults
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          setPos(clampPos(parsed.x, parsed.y, sizeRef.current));
          return;
        }
      }
    } catch {}
    setPos(getDefaultPos());
  }, [storageKey]);

  // Re-clamp on resize / orientation change
  useEffect(() => {
    const onResize = () => {
      sizeRef.current = window.innerWidth >= 640 ? FAB_SIZE_DESKTOP : FAB_SIZE_MOBILE;
      setPos((p) => (p ? clampPos(p.x, p.y, sizeRef.current) : getDefaultPos()));
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const persist = useCallback(
    (next: { x: number; y: number }) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    },
    [storageKey]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const st = dragStateRef.current;
    if (!st) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (!st.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!st.moved) {
      st.moved = true;
      setDragging(true);
    }
    const next = clampPos(st.origX + dx, st.origY + dy, sizeRef.current);
    setPos(next);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const st = dragStateRef.current;
    dragStateRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    if (st?.moved && pos) {
      persist(pos);
      // Suppress the synthesized click after drag
      setTimeout(() => setDragging(false), 0);
    } else {
      setDragging(false);
      onClick();
    }
  };

  if (!pos) return null;

  const size = sizeRef.current;

  return (
    <button
      type="button"
      aria-label="Share Card (drag to move)"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragStateRef.current = null;
        setDragging(false);
      }}
      onClick={(e) => {
        // Click handling is done in onPointerUp to differentiate from drag
        e.preventDefault();
      }}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: size,
        height: size,
        touchAction: "none",
        cursor: dragging ? "grabbing" : "grab",
        transition: dragging ? "none" : "transform 150ms ease, box-shadow 150ms ease",
      }}
      className="z-[60] rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary))]/70 text-primary-foreground shadow-2xl shadow-[hsl(var(--primary))]/40 ring-1 ring-[hsl(var(--primary))]/40 flex items-center justify-center hover:scale-105 active:scale-95"
    >
      <Share2 className="h-6 w-6 pointer-events-none" />
      <span className="sr-only">Share Card</span>
    </button>
  );
}

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ExternalLink } from "lucide-react";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
import { supabase } from "@/integrations/supabase/client";

interface FloatingTagexButtonProps {
  referralCode?: string | null;
  cardId?: string;
  storageKey?: string;
}

const STORAGE_KEY_DEFAULT = "tagex_fab_pos_v2";
const EDGE_PADDING = 12;
const DRAG_THRESHOLD = 6; // px before considered a drag (suppress click)

const getDefaultPos = (width: number, height: number) => {
  if (typeof window === "undefined") return { x: 16, y: 100 };
  const isMobile = window.innerWidth < 640;
  // Centered horizontally: sits between the profile photo (left) and company logo (right)
  const x = Math.max(EDGE_PADDING, (window.innerWidth - width) / 2);
  // Just below the cover photo area
  const y = isMobile ? 150 : 190;
  return { x, y };
};

const clampPos = (x: number, y: number, width: number, height: number) => {
  if (typeof window === "undefined") return { x, y };
  return {
    x: Math.max(EDGE_PADDING, Math.min(window.innerWidth - width - EDGE_PADDING, x)),
    y: Math.max(EDGE_PADDING, Math.min(window.innerHeight - height - EDGE_PADDING, y)),
  };
};

export default function FloatingTagexButton({
  referralCode,
  cardId,
  storageKey = STORAGE_KEY_DEFAULT,
}: FloatingTagexButtonProps) {
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [size, setSize] = useState({ width: 210, height: 48 });
  const [visible, setVisible] = useState(false);
  const dragStateRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);

  // Measure the rendered pill size whenever it is in the DOM
  const measureSize = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
      return { width: rect.width, height: rect.height };
    }
    return size;
  }, [size]);

  // Hydrate position from localStorage / defaults after the first paint.
  // The button is rendered with opacity-0 until pos is set so its real size can be measured.
  useEffect(() => {
    const currentSize = measureSize();
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          setPos(clampPos(parsed.x, parsed.y, currentSize.width, currentSize.height));
          setVisible(true);
          return;
        }
      }
    } catch {}
    setPos(getDefaultPos(currentSize.width, currentSize.height));
    setVisible(true);
  }, [storageKey, measureSize]);

  // Re-clamp and re-measure on resize / orientation change
  useEffect(() => {
    const onResize = () => {
      const currentSize = measureSize();
      setPos((p) => (p ? clampPos(p.x, p.y, currentSize.width, currentSize.height) : getDefaultPos(currentSize.width, currentSize.height)));
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [measureSize]);

  const persist = useCallback(
    (next: { x: number; y: number }) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    },
    [storageKey]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLAnchorElement>) => {
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

  const onPointerMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const st = dragStateRef.current;
    if (!st) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (!st.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!st.moved) {
      st.moved = true;
      setDragging(true);
    }
    const next = clampPos(st.origX + dx, st.origY + dy, size.width, size.height);
    setPos(next);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const st = dragStateRef.current;
    dragStateRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    if (st?.moved && pos) {
      persist(pos);
      setTimeout(() => setDragging(false), 0);
    } else {
      setDragging(false);
    }
  };

  // Always go to the dashboard; unauthenticated visitors get prompted to log in there.
  const href = "/dashboard";

  const handleClick = () => {
    if (dragging) return;
    if (cardId) {
      supabase.functions
        .invoke("track-card-event", { body: { card_id: cardId, kind: "cta_click" } })
        .catch((err) => console.error("Failed to track tagex CTA click:", err));
    }
  };

  const effectivePos = pos || getDefaultPos(size.width, size.height);

  return (
    <a
      ref={buttonRef}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open Tools Vault (drag to move)"
      aria-hidden={!visible}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragStateRef.current = null;
        setDragging(false);
      }}
      onClick={(e) => {
        if (dragging) {
          e.preventDefault();
          return;
        }
        handleClick();
      }}
      style={{
        position: "fixed",
        left: effectivePos.x,
        top: effectivePos.y,
        touchAction: "none",
        cursor: dragging ? "grabbing" : "grab",
        transition: dragging ? "none" : "transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
      className={[
        "z-40",
        "inline-flex items-center gap-2",
        "min-w-fit",
        "rounded-full",
        "bg-card/70 backdrop-blur-xl",
        "border border-[hsl(var(--primary))]/40",
        "shadow-lg shadow-black/50",
        "pl-2 pr-4 py-2",
        "text-sm font-semibold",
        "text-[hsl(var(--primary))]",
        "hover:scale-105 hover:shadow-xl hover:shadow-[hsl(var(--primary))]/20",
        "active:scale-95",
        "select-none",
        "group",
      ].join(" ")}
    >
      <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[hsl(var(--primary))]/10 ring-1 ring-[hsl(var(--primary))]/30">
        <img
          src={CardExLogo}
          alt=""
          className="h-5 w-5 object-contain"
        />
      </span>
      <span className="whitespace-nowrap tracking-wide">Get Card-Ex</span>
      <ExternalLink className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
      <span className="sr-only">Opens in a new tab</span>
    </a>
  );
}

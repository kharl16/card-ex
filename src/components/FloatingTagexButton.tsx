import React, { useEffect, useRef, useState, useCallback } from "react";
import { ExternalLink } from "lucide-react";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
import { supabase } from "@/integrations/supabase/client";

interface FloatingTagexButtonProps {
  referralCode?: string | null;
  cardId?: string;
  storageKey?: string;
  /** Render statically inside a preview container instead of fixed to the viewport */
  variant?: "fixed" | "preview";
  containerRef?: React.RefObject<HTMLElement>;
}

const STORAGE_KEY_DEFAULT = "tagex_fab_pos_v5";
const EDGE_PADDING = 12;
const DRAG_THRESHOLD = 6; // px before considered a drag (suppress click)
// Small gap below the cover photo so the pill sits just under the bottom border
// without touching it, while still staying clear of the avatar/logo row.
const COVER_CLEARANCE = 16;

const getCoverBottom = (): number | null => {
  if (typeof document === "undefined") return null;
  const cover = document.querySelector("[data-card-cover]") as HTMLElement | null;
  if (!cover) return null;
  return cover.getBoundingClientRect().bottom;
};

const getDefaultPos = (width: number, height: number) => {
  if (typeof window === "undefined") return { x: 16, y: 100 };
  const isMobile = window.innerWidth < 640;
  // Centered horizontally: sits between the profile photo (left) and company logo (right)
  const x = Math.max(EDGE_PADDING, (window.innerWidth - width) / 2);
  const coverBottom = getCoverBottom();
  const fallback = isMobile ? 230 : 280;
  const y = coverBottom != null ? coverBottom + COVER_CLEARANCE : fallback;
  return { x, y };
};

const clampPos = (x: number, y: number, width: number, height: number) => {
  if (typeof window === "undefined") return { x, y };
  return {
    x: Math.max(EDGE_PADDING, Math.min(window.innerWidth - width - EDGE_PADDING, x)),
    y: Math.max(EDGE_PADDING, Math.min(window.innerHeight - height - EDGE_PADDING, y)),
  };
};

const pillClasses = [
  "inline-flex items-center gap-1.5",
  "min-w-fit",
  "rounded-full",
  "bg-card/80 backdrop-blur-xl",
  "border border-[hsl(var(--primary))]",
  "animate-tile-glow-pulse",
  "pl-1.5 pr-3 py-1",
  "text-xs font-semibold",
  "text-[hsl(var(--primary))]",
  "select-none",
  "group",
].join(" ");

const PillContent = () => (
  <>
    <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-[hsl(var(--primary))]/10 ring-1 ring-[hsl(var(--primary))]/40">
      <img src={CardExLogo} alt="" className="h-3.5 w-3.5 object-contain" />
    </span>
    <span className="whitespace-nowrap tracking-wide">Tools Vault</span>
    <ExternalLink className="h-3 w-3 opacity-70 group-hover:opacity-100 transition-opacity" />
  </>
);

export default function FloatingTagexButton({
  referralCode,
  cardId,
  storageKey = STORAGE_KEY_DEFAULT,
  variant = "fixed",
  containerRef,
}: FloatingTagexButtonProps) {
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [size, setSize] = useState({ width: 150, height: 32 });
  const [visible, setVisible] = useState(false);
  const [previewTop, setPreviewTop] = useState<number | null>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);

  const isPreview = variant === "preview";

  // Measure the rendered pill size whenever it is in the DOM
  const measureSize = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
      return { width: rect.width, height: rect.height };
    }
    return size;
  }, [size]);

  // Preview mode: position just below the cover inside the preview container
  useEffect(() => {
    if (!isPreview) return;
    const compute = () => {
      const container = containerRef?.current;
      const cover = container?.querySelector("[data-card-cover]") as HTMLElement | null;
      if (!container || !cover) return;
      const top = cover.getBoundingClientRect().bottom - container.getBoundingClientRect().top + COVER_CLEARANCE;
      setPreviewTop(top);
      setVisible(true);
    };
    compute();
    const id = window.setTimeout(compute, 300);
    window.addEventListener("resize", compute);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", compute);
    };
  }, [isPreview, containerRef]);

  // Hydrate position from localStorage / defaults after the first paint.
  useEffect(() => {
    if (isPreview) return;
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
    // Cover image may still be loading — recompute shortly after mount.
    setPos(getDefaultPos(currentSize.width, currentSize.height));
    setVisible(true);
    const id = window.setTimeout(() => {
      try {
        if (localStorage.getItem(storageKey)) return;
      } catch {}
      setPos(getDefaultPos(currentSize.width, currentSize.height));
    }, 500);
    return () => window.clearTimeout(id);
  }, [storageKey, measureSize, isPreview]);

  // Re-clamp and re-measure on resize / orientation change
  useEffect(() => {
    if (isPreview) return;
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
  }, [measureSize, isPreview]);

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

  if (isPreview) {
    return (
      <div
        className="pointer-events-none absolute left-1/2 z-40 -translate-x-1/2"
        style={{ top: previewTop ?? 0, opacity: previewTop != null ? 1 : 0 }}
        aria-hidden="true"
      >
        <span className={pillClasses}>
          <PillContent />
        </span>
      </div>
    );
  }

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
      className={["z-40", pillClasses, "hover:scale-105", "active:scale-95"].join(" ")}
    >
      <PillContent />
      <span className="sr-only">Opens in a new tab</span>
    </a>
  );
}

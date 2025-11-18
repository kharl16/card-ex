import React, { useEffect, useMemo, useRef, useState } from "react";

export type CarouselItem = {
  url: string;
  alt?: string;
  link?: string;
  description?: string;
};

interface Props {
  items?: CarouselItem[];
  /** autoplay interval in ms */
  interval?: number;
  /** translateZ ring radius in px (auto if not provided) */
  radius?: number;
}

const EMERALD = "#10b981"; // emerald
const GOLD = "#f59e0b";    // amber/gold

const placeholders: CarouselItem[] = [
  { url: "/cardex/placeholders/product-emerald-1.svg", alt: "Upload your product" },
  { url: "/cardex/placeholders/product-gold-2.svg",    alt: "Showcase item" },
  { url: "/cardex/placeholders/product-emerald-3.svg", alt: "Add more images" },
];

export default function Carousel3DRing({ items, interval = 3400, radius }: Props) {
  // Ensure at least 3 items for a proper ring
  const base = (items?.length ?? 0) > 0 ? items! : placeholders;
  const items3: CarouselItem[] = useMemo(() => {
    const arr = [...base];
    while (arr.length < 3) arr.push(base[arr.length % base.length]);
    return arr;
  }, [base]);

  const N = items3.length;
  const step = 360 / N;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [isHover, setIsHover] = useState(false);
  const [drag, setDrag] = useState<{x:number; start:boolean}>({ x: 0, start: false });
  const [autoRadius, setAutoRadius] = useState<number>(radius ?? 0);

  // Auto-compute radius from width if not provided
  useEffect(() => {
    if (radius) return;
    const el = containerRef.current;
    if (!el) return;
    const compute = () => {
      const w = el.clientWidth;
      // ring radius scales with width; tuned for strong 3D
      setAutoRadius(Math.max(260, Math.min(520, Math.round(w * 0.42))));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [radius]);

  const ringRadius = radius ?? autoRadius;

  // Autoplay with reduced-motion + tab visibility guards
  useEffect(() => {
    if (isHover) return; // pause on hover
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return;
    let id: number | null = null;
    let t = 0;
    const tick = (ts: number) => {
      if (!t) t = ts;
      if (document.hidden) { id = requestAnimationFrame(tick); return; }
      if (ts - t >= interval) {
        t = ts;
        setActive((a) => (a + 1) % N);
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => { if (id) cancelAnimationFrame(id); };
  }, [interval, N, isHover]);

  // Drag / swipe
  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setDrag({ x: e.clientX, start: true });
  };
  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!drag.start) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 28) {
      if (dx < 0) setActive((a) => (a + 1) % N);
      else setActive((a) => (a - 1 + N) % N);
      setDrag({ x: e.clientX, start: false });
    }
  };
  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = () => setDrag({ x: 0, start: false });

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setActive((a) => (a + 1) % N);
      if (e.key === 'ArrowLeft')  setActive((a) => (a - 1 + N) % N);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [N]);

  // Helpers
  const ringRotation = active * step; // rotate ring so active comes to front

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      style={{ perspective: "1400px" }}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      {/* Background subtle glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 blur-2xl opacity-30"
        style={{
          background: `radial-gradient(60% 40% at 50% 60%, ${EMERALD}33, transparent 70%), radial-gradient(50% 35% at 60% 40%, ${GOLD}33, transparent 70%)`,
        }}
      />

      {/* Ring */}
      <div
        role="region"
        aria-label="Product carousel"
        className="mx-auto h-[320px] sm:h-[360px] md:h-[420px] max-w-full"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="relative h-full w-full will-change-transform"
          style={{
            transformStyle: "preserve-3d",
            transform: `translateZ(-${ringRadius}px) rotateY(${-ringRotation}deg)`,
            transition: drag.start ? "none" : "transform 800ms cubic-bezier(.22,.61,.36,1)",
          }}
        >
          {items3.map((it, i) => {
            const angle = i * step;
            // distance from active (0..180), used for emphasis
            const diff = Math.min(
              Math.abs(((i - active + N) % N) * step),
              Math.abs(((active - i + N) % N) * step)
            );
            const focus = Math.max(0, 1 - diff / 180); // 1 at active, ~0 far
            const scale = 0.78 + 0.42 * focus;        // 0.78..1.20
            const opacity = 0.48 + 0.52 * focus;      // 0.48..1.00
            const zIndex = Math.round(100 + 100 * focus);

            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 will-change-transform"
                style={{
                  transformStyle: "preserve-3d",
                  transform: `rotateY(${angle}deg) translateZ(${ringRadius}px) translate(-50%, -50%) scale(${scale})`,
                  zIndex,
                  opacity,
                  transition: drag.start ? "none" : "transform 800ms cubic-bezier(.22,.61,.36,1), opacity 600ms ease",
                }}
              >
                <CardFrame url={it.url} alt={it.alt} link={it.link} description={it.description} focus={focus} active={i === active} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-2 flex items-center justify-center gap-2">
        <button
          aria-label="Previous"
          onClick={() => setActive((a) => (a - 1 + N) % N)}
          className="rounded-full px-3 py-1.5 text-white/90 backdrop-blur-sm border border-white/15 hover:border-white/30"
          style={{ background: "linear-gradient(90deg, #0008, #0002)" }}
        >
          ◀
        </button>
        <div className="flex gap-1.5">
          {items3.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to item ${i+1}`}
              onClick={() => setActive(i)}
              className="h-1.5 w-5 rounded-full transition-all"
              style={{
                background: i === active
                  ? `linear-gradient(90deg, ${EMERALD}, ${GOLD})`
                  : "#ffffff33",
                boxShadow: i === active ? `0 0 16px ${GOLD}88` : undefined,
              }}
            />
          ))}
        </div>
        <button
          aria-label="Next"
          onClick={() => setActive((a) => (a + 1) % N)}
          className="rounded-full px-3 py-1.5 text-white/90 backdrop-blur-sm border border-white/15 hover:border-white/30"
          style={{ background: "linear-gradient(90deg, #0002, #0008)" }}
        >
          ▶
        </button>
      </div>
    </div>
  );
}

function CardFrame({ url, alt, link, description, focus, active }: { url: string; alt?: string; link?: string; description?: string; focus: number; active: boolean }) {
  const [showDesc, setShowDesc] = useState(false);
  
  // Gold/Emerald gradient frame with inner glow + drop shadow. Reflection for pop.
  const frame = (
    <div
      className="relative overflow-hidden rounded-2xl border"
      onMouseEnter={() => setShowDesc(true)}
      onMouseLeave={() => setShowDesc(false)}
      onClick={() => setShowDesc(!showDesc)}
      style={{
        width: 260,
        height: 180,
        borderColor: "#ffffff22",
        background: `linear-gradient(135deg, ${EMERALD}22, transparent 35%), linear-gradient(315deg, ${GOLD}22, transparent 35%)`,
        boxShadow: `0 12px 30px rgba(0,0,0,0.35), 0 0 22px ${GOLD}${Math.round(80*focus).toString(16)}`,
      }}
    >
      <div
        className="absolute inset-[1px] rounded-[15px]"
        style={{
          background: `linear-gradient(90deg, ${EMERALD}22, ${GOLD}22)`,
          filter: `saturate(${1 + focus * 0.3}) contrast(${1 + focus * 0.1})`,
        }}
      />
      {/* Image */}
      <img
        src={url}
        alt={alt ?? "Product"}
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          transform: `translateZ(${8 * focus}px)`,
          willChange: "transform",
        }}
        loading="lazy"
      />
      {/* Description overlay */}
      {description && active && showDesc && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300">
          <p className="text-white text-sm text-center">{description}</p>
        </div>
      )}
      {/* Reflection */}
      <div
        aria-hidden
        className="absolute -bottom-16 left-0 right-0 h-16 scale-y-[-1] opacity-35"
        style={{
          backgroundImage: `url(${url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
          filter: "blur(2px)",
        }}
      />
      {/* clickable overlay */}
      {link && <a className="absolute inset-0" href={link} target="_blank" rel="noreferrer" aria-label="Open product" />}
    </div>
  );

  return frame;
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface ProductImage {
  id: string;
  image_url: string;
  alt_text?: string | null;
  sort_order: number;
}

interface ProductCarouselProps {
  images: ProductImage[];
  className?: string;
}

export default function ProductCarousel({ images, className = '' }: ProductCarouselProps) {
  // Ensure minimum 3 slides for smooth wrap effect
  const slides = useMemo(() => {
    const base = images?.length ? images : [];
    if (base.length === 0) return [];
    if (base.length >= 3) return base;
    // Duplicate to ensure minimum 3 items
    return [...base, ...base, ...base].slice(0, Math.max(3, base.length));
  }, [images]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const hoverRef = useRef(false);

  // Wrap index to stay within bounds
  const wrapIndex = (n: number) => {
    if (slides.length === 0) return 0;
    return ((n % slides.length) + slides.length) % slides.length;
  };

  // Autoplay: advance every 2.8s when not hovering
  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      if (!hoverRef.current) {
        setCurrentIndex((i) => wrapIndex(i + 1));
      }
    }, 2800);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setCurrentIndex((i) => wrapIndex(i + 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setCurrentIndex((i) => wrapIndex(i - 1));
    }
  };

  if (slides.length === 0) return null;

  return (
    <section
      aria-label="Product images"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
      className={`relative w-full py-8 md:py-10 gold-gradient ${className}`}
    >
      <div className="mx-auto max-w-6xl px-4">
        {/* 3D Carousel Container */}
        <div className="perspective-1200">
          <div className="relative h-72 md:h-80 lg:h-96">
            {slides.map((slide, i) => {
              // Calculate relative position from current index
              const rel = ((((i - currentIndex) % slides.length) + slides.length) % slides.length);
              const leftSide = rel > slides.length / 2 ? rel - slides.length : rel;
              const depth = Math.abs(leftSide);
              const scale = 1 - depth * 0.08;
              const translateX = leftSide * 240;
              const translateZ = -120 * depth;
              const rotateY = -22 * leftSide;
              const isActive = depth === 0;

              return (
                <motion.figure
                  key={`${slide.id}-${i}`}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${slides.length}`}
                  className="absolute inset-0 flex items-center justify-center will-change-transform cursor-grab active:cursor-grabbing"
                  style={{
                    transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
                    transformStyle: 'preserve-3d',
                    zIndex: isActive ? 20 : 10 - depth,
                  }}
                  animate={{ scale }}
                  transition={{
                    type: 'spring',
                    stiffness: 220,
                    damping: 26,
                  }}
                  onClick={() => setCurrentIndex(i)}
                >
                  <div
                    className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
                      isActive ? 'shadow-cardex ring-cardex' : 'shadow-lg'
                    }`}
                  >
                    <img
                      src={slide.image_url}
                      alt={slide.alt_text || `Product image ${i + 1}`}
                      loading="lazy"
                      className="h-72 w-80 md:h-80 md:w-[32rem] lg:h-96 lg:w-[36rem] object-cover select-none"
                      draggable={false}
                    />
                    {/* Shine overlay */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent mix-blend-overlay" />
                  </div>
                </motion.figure>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            className="rounded-full px-5 py-2.5 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border border-emerald-400/40 transition-all font-medium"
            onClick={() => setCurrentIndex((i) => wrapIndex(i - 1))}
            aria-label="Previous slide"
          >
            ◀
          </button>

          <div className="flex gap-2.5">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={currentIndex === i ? 'true' : 'false'}
                onClick={() => setCurrentIndex(i)}
                className={`h-2.5 w-2.5 rounded-full border transition-all ${
                  currentIndex === i
                    ? 'bg-[hsl(var(--gold))] border-[hsl(var(--gold))] scale-125'
                    : 'bg-[hsl(var(--gold))]/20 border-[hsl(var(--gold))]/70 hover:bg-[hsl(var(--gold))]/40'
                }`}
              />
            ))}
          </div>

          <button
            className="rounded-full px-5 py-2.5 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border border-emerald-400/40 transition-all font-medium"
            onClick={() => setCurrentIndex((i) => wrapIndex(i + 1))}
            aria-label="Next slide"
          >
            ▶
          </button>
        </div>
      </div>
    </section>
  );
}

import { useState, useRef, useCallback, useEffect } from "react";

export type CarouselDirection = "rtl" | "ltr";

export interface UseRouletteCarouselOptions {
  count: number;
  autoPlayMs?: number | null;
  visibleSlides?: number;
  prefersReducedMotion?: boolean;
  /** Direction of carousel scroll: "rtl" (right-to-left) or "ltr" (left-to-right) */
  direction?: CarouselDirection;
}

export interface UseRouletteCarouselResult {
  position: number;
  setPosition: React.Dispatch<React.SetStateAction<number>>;
  logicalCenter: number;
  translatePercent: number;
  slideWidthPercent: number;
  bindTouchHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchCancel: (e: React.TouchEvent) => void;
  };
  cyclicDistance: (a: number, b: number) => number;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
}

export function useRouletteCarousel({
  count,
  autoPlayMs = 4000,
  visibleSlides = 5,
  prefersReducedMotion = false,
  direction = "rtl",
}: UseRouletteCarouselOptions): UseRouletteCarouselResult {
  // Position in "slides" (can be fractional), always kept in [0, count)
  const [position, setPosition] = useState(0);

  // Momentum velocity (extra speed from swipe), slides per ms
  const velocityRef = useRef(0);

  // Touch gesture support (for momentum)
  const touchStartX = useRef<number | null>(null);
  const touchLastX = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);

  const slideWidthPercent = 100 / visibleSlides;
  const centerOffset = Math.floor(visibleSlides / 2);
  const logicalCenter = count > 0 ? (position + centerOffset) % count : 0;

  // Cyclic distance calculation
  const cyclicDistance = useCallback(
    (a: number, b: number) => {
      if (count === 0) return 0;
      const diff = Math.abs(a - b);
      return Math.min(diff, count - diff);
    },
    [count]
  );

  // Direction multiplier: RTL = positive (move forward), LTR = negative (move backward)
  const directionMultiplier = direction === "rtl" ? 1 : -1;

  // Animation: continuous movement using requestAnimationFrame
  useEffect(() => {
    if (count === 0) return;
    if (prefersReducedMotion && autoPlayMs === null) return;

    // Base speed from autoPlayMs (slides per ms), apply direction
    const baseSpeedSlidesPerMs = autoPlayMs && !prefersReducedMotion 
      ? (1 / autoPlayMs) * directionMultiplier 
      : 0;
    let lastTime = performance.now();
    let frameId: number;

    const tick = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;

      setPosition((prev) => {
        let v = velocityRef.current;

        // Cap max momentum so it doesn't go crazy
        const maxAbsVelocity = 0.004; // slides per ms
        if (Math.abs(v) > maxAbsVelocity) {
          v = maxAbsVelocity * Math.sign(v);
          velocityRef.current = v;
        }

        // Total speed = base auto speed + momentum
        const totalSpeed = baseSpeedSlidesPerMs + v;
        let next = prev + totalSpeed * dt;

        // Wrap seamlessly
        if (next >= count) next -= count;
        if (next < 0) next += count;

        // More roulette-like friction: longer spin, smooth fade out
        if (v !== 0) {
          const frictionBase = 0.985; // closer to 1 = longer spin
          const friction = Math.pow(frictionBase, dt / 16.67);
          v *= friction;
          if (Math.abs(v) < 0.00003) v = 0;
          velocityRef.current = v;
        }

        return next;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [count, autoPlayMs, prefersReducedMotion, direction, directionMultiplier]);

  // Touch handlers with momentum
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const x = e.touches[0].clientX;
    touchStartX.current = x;
    touchLastX.current = x;
    touchStartTime.current = performance.now();

    // When user starts a swipe, slightly dampen current momentum
    velocityRef.current *= 0.4;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchLastX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (
      touchStartX.current == null ||
      touchLastX.current == null ||
      touchStartTime.current == null
    ) {
      touchStartX.current = null;
      touchLastX.current = null;
      touchStartTime.current = null;
      return;
    }

    const dx = touchLastX.current - touchStartX.current; // + right, - left
    const dt = performance.now() - touchStartTime.current;

    touchStartX.current = null;
    touchLastX.current = null;
    touchStartTime.current = null;

    if (dt < 30 || Math.abs(dx) < 10) {
      // Tiny gesture – ignore
      return;
    }

    // Convert swipe into extra velocity (slides per ms)
    // Negative dx (swipe left) → positive velocity (move forward)
    const pixelsPerSlideApprox = 100; // more responsive "roulette" feel
    const slidesMovedGuess = dx / pixelsPerSlideApprox;
    const swipeSpeedSlidesPerMs = slidesMovedGuess / dt;

    // We invert because left swipe (negative dx) should move carousel forward
    const momentum = -swipeSpeedSlidesPerMs * 1.6; // more casino-style spin

    // Add to current velocity
    velocityRef.current += momentum;
  }, []);

  const handleTouchCancel = useCallback(() => {
    touchStartX.current = null;
    touchLastX.current = null;
    touchStartTime.current = null;
  }, []);

  // Navigation helpers
  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return;
      setPosition(((index % count) + count) % count);
    },
    [count]
  );

  const next = useCallback(() => {
    setPosition((prev) => (prev + 1 >= count ? 0 : prev + 1));
  }, [count]);

  const prev = useCallback(() => {
    setPosition((prev) => (prev <= 0 ? count - 1 : prev - 1));
  }, [count]);

  // Translate entire track
  const translatePercent = -(position * slideWidthPercent);

  return {
    position,
    setPosition,
    logicalCenter,
    translatePercent,
    slideWidthPercent,
    bindTouchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    cyclicDistance,
    goTo,
    next,
    prev,
  };
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Props = { cardId: string };

export default function ProductRingCarousel({ cardId }: Props) {
  const [imgs, setImgs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const angleRef = useRef(0);        // radians
  const extraVelRef = useRef(0);     // rad/ms (inertia)
  const lastT = useRef<number | null>(null);
  const raf = useRef<number | null>(null);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const vx = useRef(0);
  const container = useRef<HTMLDivElement>(null);

  // parallax tilt vars
  const parallaxX = useRef(0);
  const parallaxY = useRef(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Try card_images first, fallback to product_images
      const { data: cardImages } = await supabase
        .from('card_images')
        .select('url, sort_index')
        .eq('card_id', cardId)
        .order('sort_index', { ascending: true });

      if (cardImages && cardImages.length > 0) {
        setImgs(cardImages.map(d => d.url).slice(0, 20));
      } else {
        // Fallback to product_images
        const { data: productImages } = await supabase
          .from('product_images')
          .select('image_url, sort_order')
          .eq('card_id', cardId)
          .order('sort_order', { ascending: true });
        
        if (productImages) {
          setImgs(productImages.map(d => d.image_url).slice(0, 20));
        }
      }
      setLoading(false);
    })();
  }, [cardId]);

  const baseOmega = useMemo(() => {
    const n = Math.max(1, imgs.length);
    return ((2 * Math.PI) / n) / 1000; // 1 image/sec in rad/ms
  }, [imgs.length]);

  useEffect(() => {
    function tick(t: number) {
      if (lastT.current == null) lastT.current = t;
      const dt = t - lastT.current!;
      lastT.current = t;
      extraVelRef.current *= 0.96; // roulette ease
      if (Math.abs(extraVelRef.current) < 0.00001) extraVelRef.current = 0;
      angleRef.current += (baseOmega + extraVelRef.current) * dt;
      if (container.current) {
        container.current.style.setProperty('--ring-angle', String(angleRef.current));
        container.current.style.setProperty('--px', parallaxX.current.toFixed(3));
        container.current.style.setProperty('--py', parallaxY.current.toFixed(3));
      }
      raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [baseOmega]);

  const onDown = (e: React.PointerEvent) => {
    dragging.current = true;
    lastX.current = e.clientX;
    vx.current = 0;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    // drag for rotation
    if (dragging.current) {
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      const delta = dx * 0.004;
      angleRef.current += delta;
      vx.current = delta / 16.7;
    }
    // parallax tilt on pointer, relative to center
    if (container.current) {
      const rect = container.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      parallaxX.current = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width / 2)));
      parallaxY.current = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)));
    }
  };

  const onUp = () => { 
    dragging.current = false; 
    extraVelRef.current += vx.current; 
  };

  if (loading || imgs.length === 0) return null;

  const N = imgs.length;
  return (
    <div className="ring-wrap">
      <div
        ref={container}
        className="ring"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') extraVelRef.current -= 0.002;
          if (e.key === 'ArrowRight') extraVelRef.current += 0.002;
        }}
        role="group"
        aria-label="Product images carousel"
      >
        {imgs.map((src, i) => (
          <figure key={i} className="panel" style={{ ['--i' as any]: i } as React.CSSProperties}>
            <img src={src} alt={`Product image ${i + 1}`} loading="lazy" />
          </figure>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .ring-wrap{
          position: relative;
          margin: 16px 0 20px;
          padding: 2px 0 50px;
          isolation: isolate;
        }
        .ring{
          --h: 280px;
          --radius: 420px;
          --ring-angle: 0;
          --px: 0; --py: 0;
          height: var(--h);
          perspective: 1400px;
          position: relative;
          overflow: visible;
          transform-style: preserve-3d;
          user-select:none; touch-action: pan-y;
        }
        .panel{
          position:absolute; top:0; left:50%;
          transform-style: preserve-3d;
          backface-visibility: hidden;
          --theta: calc(2 * 3.14159265 * var(--i) / ${N});
          transform:
            rotateY(calc(var(--theta) + var(--ring-angle)))
            translateZ(var(--radius))
            rotateY(calc(-1 * (var(--theta) + var(--ring-angle))))
            translateX(-50%)
            translateZ(0);
          transition: filter 160ms ease, box-shadow 160ms ease;
        }
        .panel img{
          height: var(--h); width: auto; display:block;
          border-radius: 14px; background:#111;
          box-shadow: 0 4px 16px rgba(0,0,0,.35);
        }
        .ring{
          transform:
            rotateX(calc(var(--py) * 4deg))
            rotateY(calc(var(--px) * -4deg));
        }
        @media (max-width: 480px){
          .ring{ --h: 240px; --radius: 360px; }
        }
      `}} />
    </div>
  );
}

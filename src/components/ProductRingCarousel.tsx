import { useEffect, useState, useRef } from 'react';

interface ProductRingCarouselProps {
  images: { id: string; url: string; alt?: string }[] | string[];
}

export default function ProductRingCarousel({ images: rawImages }: ProductRingCarouselProps) {
  // Normalize images to object format and limit to 20
  const images = (Array.isArray(rawImages) ? rawImages : [])
    .slice(0, 20)
    .map((img, idx) => 
      typeof img === 'string' 
        ? { id: `img-${idx}`, url: img, alt: `Product image ${idx + 1}` }
        : img
    )
    .filter(img => img.url);

  const [angle, setAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState<number | null>(null);
  const [deltaX, setDeltaX] = useState(0);
  const ringRef = useRef<HTMLDivElement>(null);

  const count = images.length;
  const step = count >= 2 ? 360 / count : 0;
  const radius = 300; // px

  // Auto-rotation: 1 step per second
  useEffect(() => {
    if (count < 2 || isDragging) return;

    const interval = setInterval(() => {
      setAngle(prev => prev - step);
    }, 1000);

    return () => clearInterval(interval);
  }, [count, step, isDragging]);

  // Manual swipe handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setDeltaX(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || startX === null) return;
    setDeltaX(e.clientX - startX);
  };

  const handlePointerUp = () => {
    if (startX === null) return;

    // Threshold: swipe must be > 30px to trigger navigation
    if (Math.abs(deltaX) >= 30) {
      if (deltaX > 0) {
        // Swipe right → previous image
        setAngle(prev => prev + step);
      } else {
        // Swipe left → next image
        setAngle(prev => prev - step);
      }
    }

    setIsDragging(false);
    setStartX(null);
    setDeltaX(0);
  };

  // No images
  if (count === 0) {
    return null;
  }

  // Single image: centered, no rotation
  if (count === 1) {
    const img = images[0];
    return (
      <div className="w-full h-[270px] flex items-center justify-center">
        <img
          src={img.url}
          alt={img.alt || 'Product image'}
          className="max-h-full max-w-full object-contain rounded-2xl shadow-lg"
        />
      </div>
    );
  }

  // Multiple images: 3D ring
  return (
    <div
      ref={ringRef}
      className="w-full h-[270px] relative select-none cursor-grab active:cursor-grabbing"
      style={{
        perspective: '1200px',
        overflow: 'visible',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="absolute inset-0"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateY(${angle}deg)`,
          transition: isDragging ? 'none' : 'transform 0.8s cubic-bezier(0.22, 0.61, 0.36, 1)',
        }}
      >
        {images.map((img, i) => {
          const angleForImage = i * step + angle;
          
          // Normalize angle to [-180, 180] to find front card
          const normalizedAngle = ((angleForImage % 360) + 540) % 360 - 180;
          const isFront = Math.abs(normalizedAngle) < step / 2;
          
          // Closeness factor (1 = front, 0 = back)
          const closeness = Math.max(0, 1 - Math.abs(normalizedAngle) / 180);
          
          const scale = isFront ? 1.05 : 0.92;
          const opacity = 0.5 + closeness * 0.5;
          const zIndex = Math.round(closeness * 100);

          return (
            <div
              key={img.id}
              className="absolute top-1/2 left-1/2 pointer-events-none"
              style={{
                transformStyle: 'preserve-3d',
                transform: `
                  translate(-50%, -50%)
                  rotateY(${i * step}deg)
                  translateZ(${radius}px)
                  rotateY(${-angle}deg)
                  scale(${scale})
                `,
                zIndex,
                opacity,
              }}
            >
              <img
                src={img.url}
                alt={img.alt || `Product ${i + 1}`}
                className="w-[220px] h-[220px] object-cover rounded-2xl shadow-xl"
                style={{
                  boxShadow: isFront
                    ? '0 8px 32px rgba(0,0,0,0.3), 0 0 16px rgba(16,185,129,0.2)'
                    : '0 4px 16px rgba(0,0,0,0.2)',
                }}
                draggable={false}
              />
            </div>
          );
        })}
      </div>

      {/* Dots indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50">
        {images.map((_, i) => {
          const angleForImage = i * step + angle;
          const normalizedAngle = ((angleForImage % 360) + 540) % 360 - 180;
          const isActive = Math.abs(normalizedAngle) < step / 2;

          return (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-all ${
                isActive
                  ? 'bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]'
                  : 'bg-emerald-400/40'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

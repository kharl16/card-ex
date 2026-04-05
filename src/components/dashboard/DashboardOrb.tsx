import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserPlus,
  CalendarDays,
  Gift,
  MapPin,
  BarChart3,
  BookOpen,
  Wrench,
  X,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface DashboardOrbItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<any>;
  color: string; // tailwind text color for the icon
}

const ITEMS: DashboardOrbItem[] = [
  { id: "leads", label: "Leads", path: "/dashboard/leads", icon: Users, color: "text-emerald-400" },
  { id: "prospects", label: "Prospects", path: "/prospects", icon: UserPlus, color: "text-blue-400" },
  { id: "appointments", label: "Appts", path: "/dashboard/appointments", icon: CalendarDays, color: "text-violet-400" },
  { id: "referrals", label: "Referrals", path: "/dashboard/referrals", icon: Gift, color: "text-amber-400" },
  { id: "locator", label: "Locator", path: "/locator", icon: MapPin, color: "text-rose-400" },
  { id: "analytics", label: "Analytics", path: "/analytics", icon: BarChart3, color: "text-cyan-400" },
  { id: "resources", label: "Resources", path: "/resources", icon: BookOpen, color: "text-indigo-400" },
  { id: "tools", label: "Tools", path: "/tools", icon: Wrench, color: "text-orange-400" },
];

const ORB_SIZE = 52;
const RADIUS = 120;
const ICON_SIZE = 44;
const MARGIN = 16;
const POSITION_KEY = "dashboard_orb_position";

// Fixed 8-slot symmetric angles (same pattern as ToolsOrb)
const SYMMETRIC_ANGLES = [-90, -45, 0, 45, 90, 135, 180, 225];

export function DashboardOrb() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const motionX = useMotionValue(0);
  const motionY = useMotionValue(0);
  const springConfig = { stiffness: 900, damping: 60 };
  const springX = useSpring(motionX, springConfig);
  const springY = useSpring(motionY, springConfig);
  const orbCenterX = useTransform(springX, (x) => x + ORB_SIZE / 2);
  const orbCenterY = useTransform(springY, (y) => y + ORB_SIZE / 2);

  const getBounds = useCallback(() => {
    const vv = window.visualViewport;
    return {
      width: vv?.width ?? window.innerWidth,
      height: vv?.height ?? window.innerHeight,
    };
  }, []);

  const clampPosition = useCallback(
    (pos: { x: number; y: number }) => {
      const b = getBounds();
      return {
        x: Math.max(MARGIN, Math.min(b.width - ORB_SIZE - MARGIN, pos.x)),
        y: Math.max(MARGIN, Math.min(b.height - ORB_SIZE - MARGIN, pos.y)),
      };
    },
    [getBounds]
  );

  const getDefaultPosition = useCallback(() => {
    const b = getBounds();
    return clampPosition({
      x: b.width - ORB_SIZE - 24,
      y: b.height - ORB_SIZE - 100, // above bottom nav
    });
  }, [getBounds, clampPosition]);

  // Initialize position
  useEffect(() => {
    const saved = localStorage.getItem(POSITION_KEY);
    let start = getDefaultPosition();
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const clamped = clampPosition(parsed);
        if (Number.isFinite(clamped.x) && Number.isFinite(clamped.y)) start = clamped;
      } catch {}
    }
    motionX.set(start.x);
    motionY.set(start.y);
    setInitialized(true);
  }, []);

  // Re-clamp on resize
  useEffect(() => {
    const handleResize = () => {
      if (isDragging) return;
      const clamped = clampPosition({ x: motionX.get(), y: motionY.get() });
      motionX.set(clamped.x);
      motionY.set(clamped.y);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isDragging, clampPosition, motionX, motionY]);

  const handleItemClick = (item: DashboardOrbItem) => {
    setIsOpen(false);
    navigate(item.path);
  };

  const handleOrbClick = () => {
    if (!isDragging) setIsOpen((v) => !v);
  };

  if (!initialized) return null;

  const b = getBounds();
  const currentX = springX.get();
  const currentY = springY.get();
  const currentCenterX = currentX + ORB_SIZE / 2;
  const edgeThreshold = 140;

  let startAngle: number;
  let sweep: number;

  if (currentCenterX < edgeThreshold) {
    startAngle = -90;
    sweep = 180;
  } else if (currentCenterX > b.width - edgeThreshold) {
    startAngle = 90;
    sweep = 180;
  } else {
    startAngle = -90;
    sweep = 340;
  }

  const getRadialPosition = (index: number) => {
    if (sweep === 340 && ITEMS.length === SYMMETRIC_ANGLES.length) {
      const angleRad = SYMMETRIC_ANGLES[index] * (Math.PI / 180);
      return { x: Math.cos(angleRad) * RADIUS, y: Math.sin(angleRad) * RADIUS };
    }
    const step = ITEMS.length > 1 ? sweep / (ITEMS.length - 1) : 0;
    const angleDeg = startAngle + index * step;
    const angleRad = angleDeg * (Math.PI / 180);
    return { x: Math.cos(angleRad) * RADIUS, y: Math.sin(angleRad) * RADIUS };
  };

  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const vvOffset = {
    left: vv?.offsetLeft ?? 0,
    top: vv?.offsetTop ?? 0,
    width: vv?.width ?? window.innerWidth,
    height: vv?.height ?? window.innerHeight,
  };

  const radialMenu = (
    <div
      className="pointer-events-none"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        overflow: "visible",
        left: vvOffset.left,
        top: vvOffset.top,
        width: vvOffset.width,
        height: vvOffset.height,
      }}
    >
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
            style={{ zIndex: 9998 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Center anchor */}
      <motion.div
        className="pointer-events-none"
        style={{
          position: "absolute",
          left: orbCenterX,
          top: orbCenterY,
          width: 0,
          height: 0,
          zIndex: 10000,
          overflow: "visible",
        }}
      >
        <AnimatePresence>
          {isOpen &&
            ITEMS.map((item, index) => {
              const pos = getRadialPosition(index);
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="pointer-events-auto"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                    zIndex: 10000,
                    overflow: "visible",
                    willChange: "transform",
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6, filter: "blur(6px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.6, filter: "blur(4px)" }}
                    transition={{ delay: index * 0.04, duration: 0.22 }}
                    style={{ transformOrigin: "center" }}
                  >
                    <button
                      onClick={() => handleItemClick(item)}
                      className="relative flex flex-col items-center outline-none focus:outline-none group"
                      style={{ width: ICON_SIZE, height: ICON_SIZE, overflow: "visible" }}
                    >
                      <div
                        className={cn(
                          "rounded-full flex items-center justify-center",
                          "transition-transform duration-200 ease-out",
                          "group-hover:scale-110 group-active:scale-95",
                          "bg-gradient-to-br from-card via-card/95 to-card/80 border-2 border-border/40"
                        )}
                        style={{
                          width: ICON_SIZE,
                          height: ICON_SIZE,
                          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
                        }}
                      >
                        <Icon className={cn("w-5 h-5", item.color)} />
                      </div>
                      <span
                        className="text-[11px] font-medium whitespace-nowrap bg-black/60 backdrop-blur-md px-2 py-1 rounded-full shadow-lg text-white"
                        style={{
                          position: "absolute",
                          top: ICON_SIZE + 8,
                          left: "50%",
                          transform: "translateX(-50%)",
                          zIndex: 10001,
                          pointerEvents: "none",
                        }}
                      >
                        {item.label}
                      </span>
                    </button>
                  </motion.div>
                </div>
              );
            })}
        </AnimatePresence>
      </motion.div>

      {/* Drag glow trail */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            style={{
              x: springX,
              y: springY,
              position: "absolute",
              left: -6,
              top: -6,
              width: ORB_SIZE + 12,
              height: ORB_SIZE + 12,
              borderRadius: "50%",
              background: "radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)",
              filter: "blur(6px)",
              zIndex: 10001,
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      {/* Orb button */}
      <motion.div
        drag
        dragConstraints={{
          left: MARGIN,
          right: b.width - ORB_SIZE - MARGIN,
          top: MARGIN,
          bottom: b.height - ORB_SIZE - MARGIN,
        }}
        dragMomentum={false}
        dragElastic={0.08}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => {
          setIsDragging(false);
          const pos = clampPosition({ x: motionX.get(), y: motionY.get() });
          motionX.set(pos.x);
          motionY.set(pos.y);
          localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
        }}
        onClick={handleOrbClick}
        style={{
          x: motionX,
          y: motionY,
          touchAction: "none",
          zIndex: 10002,
          position: "absolute",
          left: 0,
          top: 0,
        }}
        className="pointer-events-auto cursor-grab active:cursor-grabbing select-none"
        whileHover={{ scale: 1.08 }}
      >
        <div
          className="rounded-full flex items-center justify-center relative transition-all duration-300 ease-out"
          style={{
            width: ORB_SIZE,
            height: ORB_SIZE,
            background: "hsl(var(--card))",
            border: "2px solid hsl(var(--primary) / 0.5)",
            boxShadow: isDragging
              ? "0 0 20px hsl(var(--primary) / 0.4), inset 0 0 8px hsl(var(--primary) / 0.1)"
              : isOpen
              ? "0 0 15px hsl(var(--primary) / 0.35), inset 0 0 6px hsl(var(--primary) / 0.08)"
              : "0 0 10px hsl(var(--primary) / 0.25), inset 0 0 4px hsl(var(--primary) / 0.06)",
          }}
        >
          <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
            {isOpen ? (
              <X className="w-6 h-6 text-primary" strokeWidth={2.5} />
            ) : (
              <LayoutGrid className="w-6 h-6 text-primary" strokeWidth={2} />
            )}
          </motion.div>
        </div>

        {/* Pulse ring */}
        {!isOpen && !isDragging && (
          <div
            className="absolute inset-0 rounded-full animate-ping bg-primary/15 pointer-events-none"
            style={{ animationDuration: "2.5s" }}
          />
        )}
      </motion.div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(radialMenu, document.body) : null;
}

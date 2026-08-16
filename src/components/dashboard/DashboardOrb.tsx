import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { createPortal } from "react-dom";
import { Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";
import CardExLogo from "@/assets/Card-Ex-Big.png";

export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
}

interface DashboardOrbProps {
  /** Quick actions shown when the orb is tapped. */
  actions: QuickAction[];
  label?: string;
}

const ORB_SIZE = 56;
const MARGIN = 16;
const POSITION_KEY = "dashboard_orb_position";
const RADIUS = 124;
const ITEM_SIZE = 44;

export function DashboardOrb({ actions, label = "Quick Actions" }: DashboardOrbProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showLabel, setShowLabel] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const motionX = useMotionValue(0);
  const motionY = useMotionValue(0);
  const springConfig = { stiffness: 900, damping: 60 };
  const springX = useSpring(motionX, springConfig);
  const springY = useSpring(motionY, springConfig);

  // Derived center for radial items
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

  // Hardware/browser back button closes the radial menu first.
  useBackButtonClose(isOpen, () => setIsOpen(false));

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

  // Collapse the label after a few seconds so it stays unobtrusive
  useEffect(() => {
    const t = setTimeout(() => setShowLabel(false), 4000);
    return () => clearTimeout(t);
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

  if (!initialized) return null;

  const b = getBounds();
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const vvOffset = {
    left: vv?.offsetLeft ?? 0,
    top: vv?.offsetTop ?? 0,
    width: vv?.width ?? window.innerWidth,
    height: vv?.height ?? window.innerHeight,
  };

  const currentX = springX.get();
  const currentY = springY.get();
  const currentCenterX = currentX + ORB_SIZE / 2;
  const currentCenterY = currentY + ORB_SIZE / 2;
  const edgeThreshold = 120;

  const totalItems = actions.length;

  // Clean symmetric presets so the menu never looks messy regardless of orb position.
  // Angles are in degrees; 0° = right, -90° = top, 90° = bottom.
  const centeredAngles: Record<number, number[]> = {
    1: [-90],
    2: [-90, 90],
    3: [-90, 30, 150],
    4: [-90, 0, 90, 180],
    5: [-90, -18, 54, 126, 198],
    6: [-90, -30, 30, 90, 150, 210],
    7: [-90, -38, 13, 65, 115, 167, 218],
    8: [-90, -45, 0, 45, 90, 135, 180, 225],
  };

  // Determine sweep direction based on orb position so items stay on screen.
  let angles: number[];
  if (currentCenterX < edgeThreshold) {
    // Orb on left edge: fan out to the right (240° arc, clockwise from top-left)
    const step = totalItems > 1 ? 240 / (totalItems - 1) : 0;
    angles = Array.from({ length: totalItems }, (_, i) => -150 + i * step);
  } else if (currentCenterX > b.width - edgeThreshold) {
    // Orb on right edge: fan out to the left (240° arc)
    const step = totalItems > 1 ? 240 / (totalItems - 1) : 0;
    angles = Array.from({ length: totalItems }, (_, i) => -30 + i * step);
  } else {
    // Centered: use symmetric preset, fall back to even 360° distribution
    angles = centeredAngles[totalItems] ?? Array.from({ length: totalItems }, (_, i) => -90 + (i * 360) / Math.max(1, totalItems));
  }

  const getRadialPosition = (index: number) => {
    const angleDeg = angles[index] ?? -90;
    const angleRad = angleDeg * (Math.PI / 180);
    return {
      angleDeg,
      x: Math.cos(angleRad) * RADIUS,
      y: Math.sin(angleRad) * RADIUS,
    };
  };

  const handleOrbClick = () => {
    if (!isDragging) setIsOpen((v) => !v);
  };

  const handleActionClick = (action: QuickAction) => {
    if (action.disabled) return;
    setIsOpen(false);
    action.onSelect();
  };

  const fab = (
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
            style={{ zIndex: 9997 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Drag glow trail */}
      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
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

      {/* Radial menu anchor point */}
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
          {isOpen && (
            <>

              {actions.map((action, index) => {
                const pos = getRadialPosition(index);
                const Icon = action.icon;
                const isTop = pos.y < 0;
                const isCreateTemplate = action.id === "create-template";

                return (
                  <div
                    key={action.id}
                    className="pointer-events-auto"
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                      zIndex: 10000,
                      overflow: "visible",
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.6, filter: "blur(6px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 0.6, filter: "blur(4px)" }}
                      transition={{ delay: index * 0.05, duration: 0.25 }}
                      style={{ transformOrigin: "center" }}
                    >
                      <button
                        type="button"
                        disabled={action.disabled}
                        onClick={() => handleActionClick(action)}
                        className={cn(
                          "relative flex flex-col items-center justify-center transition-all",
                          isCreateTemplate
                            ? "bg-transparent border-0 shadow-none hover:scale-110 active:scale-95"
                            : "gap-1 rounded-2xl border border-primary/30 bg-card/95 text-foreground shadow-xl shadow-black/40 hover:scale-110 hover:border-primary/60 hover:bg-card hover:shadow-primary/20 active:scale-95",
                          action.disabled && "opacity-40 cursor-not-allowed hover:scale-100"
                        )}
                        style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
                        aria-label={action.label}
                      >
                        <Icon
                          className={cn(
                            "text-primary",
                            isCreateTemplate
                              ? "h-7 w-7 drop-shadow-[0_0_10px_hsl(var(--primary)/0.55)]"
                              : "h-5 w-5"
                          )}
                        />
                      </button>

                      {/* Floating label — above for top items, below for bottom items */}
                      <span
                        className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-black/85 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg backdrop-blur-sm"
                        style={{
                          top: isTop
                            ? `calc(50% - ${ITEM_SIZE / 2}px - 10px)`
                            : `calc(50% + ${ITEM_SIZE / 2}px + 10px)`,
                        }}
                      >
                        {action.label}
                      </span>
                    </motion.div>
                  </div>
                );
              })}
            </>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Orb FAB */}
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
        onDragStart={() => {
          setIsDragging(true);
          setIsOpen(false);
        }}
        onDragEnd={() => {
          setIsDragging(false);
          const pos = clampPosition({ x: motionX.get(), y: motionY.get() });
          motionX.set(pos.x);
          motionY.set(pos.y);
          localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
        }}
        onClick={handleOrbClick}
        role="button"
        tabIndex={0}
        aria-label={`${label} (drag to move)`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOrbClick();
          }
        }}
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
        whileTap={{ scale: 0.95 }}
        onHoverStart={() => setShowLabel(true)}
        onHoverEnd={() => setShowLabel(false)}
      >
        <div
          className={cn(
            "relative rounded-full flex items-center justify-center transition-all duration-300 ease-out",
            isOpen && "ring-2 ring-primary/60 shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
          )}
          style={{
            width: ORB_SIZE,
            height: ORB_SIZE,
            background: "hsl(var(--card))",
            border: "2px solid hsl(var(--primary) / 0.5)",
            boxShadow: isDragging
              ? "0 0 20px hsl(var(--primary) / 0.4), inset 0 0 8px hsl(var(--primary) / 0.1)"
              : "0 0 12px hsl(var(--primary) / 0.28), inset 0 0 4px hsl(var(--primary) / 0.06)",
          }}
        >
          <img
            src={CardExLogo}
            alt=""
            draggable={false}
            className="w-full h-full rounded-full object-cover pointer-events-none select-none"
          />
          {/* Action badge */}
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background"
            aria-hidden="true"
          >
            <Zap className="h-3 w-3" strokeWidth={3} />
          </span>
        </div>

        {/* Floating label */}
        <motion.span
          initial={false}
          animate={{ opacity: showLabel && !isDragging && !isOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md"
        >
          {label}
        </motion.span>

        {/* Pulse ring */}
        {!isDragging && !isOpen && (
          <div
            className="absolute inset-0 rounded-full animate-ping bg-primary/15 pointer-events-none"
            style={{ animationDuration: "2.5s" }}
          />
        )}
      </motion.div>
    </div>
  );

  return <>{typeof document !== "undefined" ? createPortal(fab, document.body) : null}</>;
}

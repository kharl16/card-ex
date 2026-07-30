import { useState, useCallback, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { createPortal } from "react-dom";
import { Zap, type LucideIcon } from "lucide-react";
import CardExLogo from "@/assets/Card-Ex-Big.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

export function DashboardOrb({ actions, label = "Quick Actions" }: DashboardOrbProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showLabel, setShowLabel] = useState(true);
  const [open, setOpen] = useState(false);

  const motionX = useMotionValue(0);
  const motionY = useMotionValue(0);
  const springConfig = { stiffness: 900, damping: 60 };
  const springX = useSpring(motionX, springConfig);
  const springY = useSpring(motionY, springConfig);

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
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => {
          setIsDragging(false);
          const pos = clampPosition({ x: motionX.get(), y: motionY.get() });
          motionX.set(pos.x);
          motionY.set(pos.y);
          localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
        }}
        onClick={() => {
          if (!isDragging) setOpen(true);
        }}
        role="button"
        tabIndex={0}
        aria-label={`${label} (drag to move)`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
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
          className="relative rounded-full flex items-center justify-center transition-all duration-300 ease-out"
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
          animate={{ opacity: showLabel && !isDragging ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md"
        >
          {label}
        </motion.span>

        {/* Pulse ring */}
        {!isDragging && (
          <div
            className="absolute inset-0 rounded-full animate-ping bg-primary/15 pointer-events-none"
            style={{ animationDuration: "2.5s" }}
          />
        )}
      </motion.div>
    </div>
  );

  return (
    <>
      {typeof document !== "undefined" ? createPortal(fab, document.body) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Quick Actions</DialogTitle>
            <DialogDescription>Create or update something right away.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={action.disabled}
                onClick={() => {
                  setOpen(false);
                  action.onSelect();
                }}
                className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-border/40 bg-card/40 px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-card/70 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <action.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">{action.label}</span>
                  {action.description && (
                    <span className="block truncate text-xs text-muted-foreground">{action.description}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

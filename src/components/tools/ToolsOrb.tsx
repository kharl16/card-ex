import { useState, useEffect, useRef, RefObject, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { useToolsOrb, ToolsOrbItem } from "@/hooks/useToolsOrb";
import { useAuth } from "@/contexts/AuthContext";
import {
  GraduationCap,
  Link as LinkIcon,
  FolderOpen,
  Building2,
  Presentation,
  X,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ToolsDrawer from "./ToolsDrawer";
import ToolsOrbCustomizer from "./ToolsOrbCustomizer";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  GraduationCap,
  Link: LinkIcon,
  FolderOpen,
  Building2,
  Presentation,
  Settings,
  Sparkles,
};

const POSITION_KEY_PREFIX = "tools_orb_position";

interface Position {
  x: number;
  y: number;
}

interface ToolsOrbProps {
  mode?: "preview" | "public";
  containerRef?: RefObject<HTMLElement>;
}

export default function ToolsOrb({ mode = "public", containerRef }: ToolsOrbProps) {
  const { settings, loading } = useToolsOrb();
  const { isAdmin, user } = useAuth();

  const isPreview = mode === "preview";
  const positionKey = `${POSITION_KEY_PREFIX}_${mode}`;

  const orbSize = 56;
  const margin = 10;

  const [isOpen, setIsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [customizerOpen, setCustomizerOpen] = useState(false);

  // ✅ Track drag state without causing position jumps
  const dragStartPos = useRef<Position>({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // ✅ Motion values = single source of truth for both orb + menu
  const xMV = useMotionValue(0);
  const yMV = useMotionValue(0);

  // ✅ Visual viewport support (fixes mobile address bar + coordinate drift)
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const vvOffset = useMemo(
    () => ({
      left: vv?.offsetLeft ?? 0,
      top: vv?.offsetTop ?? 0,
      width: vv?.width ?? (typeof window !== "undefined" ? window.innerWidth : 0),
      height: vv?.height ?? (typeof window !== "undefined" ? window.innerHeight : 0),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vv?.offsetLeft, vv?.offsetTop, vv?.width, vv?.height],
  );

  const getBounds = () => {
    if (isPreview && containerRef?.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }
    return { width: vvOffset.width, height: vvOffset.height };
  };

  const clampPosition = (pos: Position): Position => {
    const b = getBounds();
    return {
      x: Math.max(margin, Math.min(b.width - orbSize - margin, pos.x)),
      y: Math.max(margin, Math.min(b.height - orbSize - margin, pos.y)),
    };
  };

  const getDefaultPosition = (): Position => {
    const b = getBounds();
    // center-right default
    return clampPosition({
      x: b.width - orbSize - margin,
      y: b.height / 2 - orbSize / 2,
    });
  };

  // ✅ Initialize ONCE and do NOT “reset to top-left” during drag
  useEffect(() => {
    const saved = localStorage.getItem(positionKey);
    let start = getDefaultPosition();

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const clamped = clampPosition(parsed);
        if (Number.isFinite(clamped.x) && Number.isFinite(clamped.y)) start = clamped;
      } catch {
        // ignore
      }
    }

    xMV.set(start.x);
    yMV.set(start.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionKey, mode]);

  // ✅ Save with a tiny debounce (prevents jitter + heavy writes)
  useEffect(() => {
    let t: number | null = null;

    const scheduleSave = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => {
        const p = { x: xMV.get(), y: yMV.get() };
        localStorage.setItem(positionKey, JSON.stringify(p));
      }, 120);
    };

    const unsubX = xMV.on("change", scheduleSave);
    const unsubY = yMV.on("change", scheduleSave);

    return () => {
      unsubX();
      unsubY();
      if (t) window.clearTimeout(t);
    };
  }, [positionKey, xMV, yMV]);

  // ✅ Re-clamp when viewport changes (rotation, address bar, etc.)
  useEffect(() => {
    const reclamp = () => {
      // don’t fight the finger while dragging
      if (draggingRef.current) return;
      const p = clampPosition({ x: xMV.get(), y: yMV.get() });
      xMV.set(p.x);
      yMV.set(p.y);
    };

    window.addEventListener("resize", reclamp);
    const vvp = window.visualViewport;
    if (vvp) {
      vvp.addEventListener("resize", reclamp);
      vvp.addEventListener("scroll", reclamp);
    }

    return () => {
      window.removeEventListener("resize", reclamp);
      if (vvp) {
        vvp.removeEventListener("resize", reclamp);
        vvp.removeEventListener("scroll", reclamp);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleItemClick = (item: ToolsOrbItem) => {
    setIsOpen(false);
    setActiveSection(item.id);
    setDrawerOpen(true);
  };

  const handleSettingsClick = () => {
    setIsOpen(false);
    setCustomizerOpen(true);
  };

  if (loading || !settings.enabled) return null;
  if (isPreview && !user) return null;

  const enabledItems = settings.items.filter((it) => it.enabled).sort((a, b) => a.order - b.order);

  /**
   * ✅ Equidistant, non-overlapping radial layout
   * - Uses full 180° (or 240°) spread depending on available room.
   * - Radius grows if many items to prevent overlap.
   */
  const getRadialConfig = () => {
    const b = getBounds();
    const px = xMV.get();
    const py = yMV.get();

    const isOnRight = px > b.width / 2;
    const isOnBottom = py > b.height / 2;

    // Preferred: expand toward center of screen
    // Define a “sector” (startAngle, endAngle) where items will be laid out.
    // Angles are radians, 0 = right, pi/2 = down, -pi/2 = up
    let start = -Math.PI / 2; // up
    let end = Math.PI / 2; // down

    // If orb is on right side, fan leftwards (around pi)
    if (isOnRight) {
      start = Math.PI + Math.PI / 2; // 270°
      end = Math.PI - Math.PI / 2; // 90° (wrap)
      // We'll handle wrap by using a negative span below
    }

    // If orb is near top or bottom, slightly bias sector to avoid going offscreen
    // (keeps labels/buttons visible)
    // We'll keep it simple and just keep a 180° fan.

    // Radius: increase with item count so no overlap
    const total = enabledItems.length + (isAdmin ? 1 : 0);
    const itemSize = isPreview ? 44 : 56;
    const minGap = 10; // spacing between circles
    const minRadius = isPreview ? 74 : 96;

    // circumference needed for total items across a semicircle:
    // arcLength ≈ radius * pi  -> ensure arcLength >= total*(itemSize+minGap)
    const neededRadius = Math.max(minRadius, (total * (itemSize + minGap)) / Math.PI);

    return { isOnRight, isOnBottom, radius: neededRadius, total };
  };

  const getRadialOffset = (index: number, total: number, radius: number, isOnRight: boolean) => {
    // Equidistant angles over 180° (π radians)
    // Fan direction:
    // - If on right: angles centered around π (left direction)
    // - Else: angles centered around 0 (right direction)
    const span = Math.PI; // 180°
    const denom = Math.max(1, total - 1);

    const center = isOnRight ? Math.PI : 0; // left vs right
    const startAngle = center - span / 2;
    const angle = startAngle + (index / denom) * span;

    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  };

  const wrapperStyle = isPreview
    ? undefined
    : ({
        left: vvOffset.left,
        top: vvOffset.top,
        width: vvOffset.width,
        height: vvOffset.height,
      } as React.CSSProperties);

  const radial = getRadialConfig();

  return (
    <>
      <div
        className={cn("pointer-events-none", isPreview ? "absolute inset-0" : "fixed")}
        style={{ zIndex: isPreview ? 50 : 9999, ...(wrapperStyle || {}) }}
      >
        {/* Backdrop */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto",
                isPreview && "rounded-xl",
              )}
              onClick={() => setIsOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Menu anchor follows orb EXACTLY */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute pointer-events-none"
              style={{ x: xMV, y: yMV }}
            >
              <div className="absolute pointer-events-none" style={{ left: orbSize / 2, top: orbSize / 2 }}>
                {enabledItems.map((item, index) => {
                  const IconComponent = ICON_MAP[item.icon_name] || Sparkles;
                  const itemSize = isPreview ? 44 : 56;

                  const off = getRadialOffset(index, radial.total, radial.radius, radial.isOnRight);

                  return (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ opacity: 1, scale: 1, x: off.x, y: off.y }}
                      exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      transition={{ delay: index * 0.04, type: "spring", stiffness: 360, damping: 24 }}
                      onClick={() => handleItemClick(item)}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                    >
                      <div className="flex flex-col items-center gap-1 group">
                        <div
                          className={cn(
                            "rounded-full flex items-center justify-center",
                            "bg-gradient-to-br from-primary/90 to-primary shadow-lg",
                            "border-2 border-primary-foreground/20",
                            "group-hover:scale-110 transition-transform",
                            "backdrop-blur-md",
                          )}
                          style={{ width: itemSize, height: itemSize }}
                        >
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.label} className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <IconComponent
                              className={cn("text-primary-foreground", isPreview ? "w-5 h-5" : "w-6 h-6")}
                            />
                          )}
                        </div>
                        <span
                          className={cn(
                            "font-medium text-foreground bg-background/80 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap",
                            isPreview ? "text-[10px]" : "text-xs",
                          )}
                        >
                          {item.label}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}

                {isAdmin && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x: getRadialOffset(enabledItems.length, radial.total, radial.radius, radial.isOnRight).x,
                      y: getRadialOffset(enabledItems.length, radial.total, radial.radius, radial.isOnRight).y,
                    }}
                    exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    transition={{ delay: enabledItems.length * 0.04, type: "spring", stiffness: 360, damping: 24 }}
                    onClick={handleSettingsClick}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                  >
                    <div className="flex flex-col items-center gap-1 group">
                      <div
                        className={cn(
                          "rounded-full flex items-center justify-center",
                          "bg-gradient-to-br from-muted to-muted/80 shadow-lg",
                          "border-2 border-border",
                          "group-hover:scale-110 transition-transform",
                        )}
                        style={{ width: isPreview ? 44 : 56, height: isPreview ? 44 : 56 }}
                      >
                        <Settings className={cn("text-muted-foreground", isPreview ? "w-5 h-5" : "w-6 h-6")} />
                      </div>
                      <span
                        className={cn(
                          "font-medium text-foreground bg-background/80 px-2 py-0.5 rounded-full shadow-sm",
                          isPreview ? "text-[10px]" : "text-xs",
                        )}
                      >
                        Settings
                      </span>
                    </div>
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Orb */}
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0}
          onDragStart={() => {
            draggingRef.current = true;
            setIsDragging(true);
            dragStartPos.current = { x: xMV.get(), y: yMV.get() };
          }}
          onDrag={(_, info) => {
            // ✅ Smooth finger-following: throttle with rAF
            const nextRaw = {
              x: dragStartPos.current.x + info.offset.x,
              y: dragStartPos.current.y + info.offset.y,
            };
            const next = clampPosition(nextRaw);

            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
              xMV.set(next.x);
              yMV.set(next.y);
            });
          }}
          onDragEnd={() => {
            draggingRef.current = false;
            setIsDragging(false);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            const p = clampPosition({ x: xMV.get(), y: yMV.get() });
            xMV.set(p.x);
            yMV.set(p.y);
          }}
          onClick={() => !isDragging && setIsOpen((v) => !v)}
          style={{ x: xMV, y: yMV, touchAction: "none" }}
          className="absolute pointer-events-auto cursor-grab active:cursor-grabbing"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div
            className={cn(
              "rounded-full flex items-center justify-center",
              "bg-gradient-to-br from-primary via-primary/90 to-primary/70",
              "shadow-[0_0_20px_rgba(212,175,55,0.4)]",
              "border-2 border-primary-foreground/30",
              "backdrop-blur-md",
              "transition-all duration-300",
              isOpen && "rotate-45 shadow-[0_0_30px_rgba(212,175,55,0.6)]",
            )}
            style={{ width: orbSize, height: orbSize }}
          >
            {settings.orb_image_url ? (
              <img src={settings.orb_image_url} alt="Tools" className="w-8 h-8 rounded-full object-cover" />
            ) : isOpen ? (
              <X className={cn("text-primary-foreground", isPreview ? "w-5 h-5" : "w-6 h-6")} />
            ) : (
              <Sparkles className={cn("text-primary-foreground", isPreview ? "w-5 h-5" : "w-6 h-6")} />
            )}
          </div>

          <div
            className="absolute inset-0 rounded-full animate-ping bg-primary/20"
            style={{ animationDuration: "2s" }}
          />
        </motion.div>
      </div>

      <ToolsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        items={enabledItems}
      />

      {isAdmin && <ToolsOrbCustomizer open={customizerOpen} onOpenChange={setCustomizerOpen} />}
    </>
  );
}

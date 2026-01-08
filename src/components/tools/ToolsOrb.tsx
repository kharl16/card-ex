import { useState, useEffect, useRef, RefObject, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { useToolsOrb, ToolsOrbItem } from "@/hooks/useToolsOrb";
import { useAuth } from "@/contexts/AuthContext";
import { GraduationCap, Link, FolderOpen, Building2, Presentation, X, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import ToolsDrawer from "./ToolsDrawer";
import ToolsOrbCustomizer from "./ToolsOrbCustomizer";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  GraduationCap,
  Link,
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
  /** "preview" = bounded to container; "public" = fixed on viewport */
  mode?: "preview" | "public";
  /** Container ref for preview mode bounding */
  containerRef?: RefObject<HTMLElement>;
}

export default function ToolsOrb({ mode = "public", containerRef }: ToolsOrbProps) {
  const { settings, loading } = useToolsOrb();
  const { isAdmin, user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [customizerOpen, setCustomizerOpen] = useState(false);

  const [initialized, setInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // IMPORTANT: single source of truth for position (shared by orb + menu)
  const xMV = useMotionValue(0);
  const yMV = useMotionValue(0);

  const dragStartPos = useRef<Position>({ x: 0, y: 0 });

  const isPreview = mode === "preview";
  const positionKey = `${POSITION_KEY_PREFIX}_${mode}`;
  const orbSize = 56;
  const margin = 10;

  // Visual viewport (mobile safe)
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
    return clampPosition({
      x: b.width - orbSize - margin,
      y: b.height / 2 - orbSize / 2,
    });
  };

  // Initialize (and fix saved off-screen positions)
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
    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, positionKey]);

  // Save position (from motion values)
  useEffect(() => {
    if (!initialized) return;

    const save = () => {
      const p = { x: xMV.get(), y: yMV.get() };
      // Don’t save zeros on first paint
      if (p.x || p.y) localStorage.setItem(positionKey, JSON.stringify(p));
    };

    const unsubX = xMV.on("change", save);
    const unsubY = yMV.on("change", save);

    return () => {
      unsubX();
      unsubY();
    };
  }, [initialized, positionKey, xMV, yMV]);

  // Re-clamp on viewport changes (mobile bars, rotation, etc.)
  useEffect(() => {
    const reclamp = () => {
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

  const handleDragEnd = () => {
    setIsDragging(false);
    const b = getBounds();

    // Keep public mode always on RIGHT edge (your preferred placement)
    const snapRight = !isPreview;
    const cur = { x: xMV.get(), y: yMV.get() };

    const newX = snapRight ? b.width - orbSize - margin : cur.x;
    const newY = Math.max(margin, Math.min(b.height - orbSize - margin, cur.y));

    const snapped = clampPosition({ x: newX, y: newY });
    xMV.set(snapped.x);
    yMV.set(snapped.y);
  };

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

  // Radial offsets ONLY — anchored around the orb via the SAME motion values
  const getRadialOffset = (index: number, total: number) => {
    const b = getBounds();
    const radius = isPreview ? 72 : 96;

    const px = xMV.get();
    const py = yMV.get();

    const isOnRight = px > b.width / 2;
    const isOnBottom = py > b.height / 2;

    // Expand away from edges automatically
    let startAngle = -Math.PI / 2;
    if (isOnRight && isOnBottom) startAngle = Math.PI;
    else if (isOnRight) startAngle = Math.PI / 2;
    else if (isOnBottom) startAngle = -Math.PI;

    const angleSpan = Math.PI * 0.75; // 135deg
    const denom = Math.max(1, total - 1);
    const angle = startAngle + (index / denom) * angleSpan - angleSpan / 2;

    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  };

  // IMPORTANT: align wrapper to the *visual viewport* on mobile so absolute coords match what user sees
  const wrapperStyle = isPreview
    ? undefined
    : ({
        left: vvOffset.left,
        top: vvOffset.top,
        width: vvOffset.width,
        height: vvOffset.height,
      } as React.CSSProperties);

  return (
    <>
      <div
        className={cn("pointer-events-none", isPreview ? "absolute inset-0" : "fixed")}
        style={{ zIndex: isPreview ? 50 : 9999, ...(wrapperStyle || {}) }}
      >
        {/* BACKDROP */}
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

        {/* MENU ANCHOR: this follows the orb EXACTLY via same xMV/yMV */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute pointer-events-none"
              style={{
                x: xMV,
                y: yMV,
              }}
            >
              {/* Anchor at orb center */}
              <div className="absolute pointer-events-none" style={{ left: orbSize / 2, top: orbSize / 2 }}>
                {/* Items */}
                {enabledItems.map((item, index) => {
                  const total = enabledItems.length + (isAdmin ? 1 : 0);
                  const off = getRadialOffset(index, total);
                  const IconComponent = ICON_MAP[item.icon_name] || Sparkles;
                  const itemSize = isPreview ? 44 : 56;

                  return (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ opacity: 1, scale: 1, x: off.x, y: off.y }}
                      exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      transition={{ delay: index * 0.05, type: "spring", stiffness: 340, damping: 22 }}
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

                {/* Settings */}
                {isAdmin && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x: getRadialOffset(enabledItems.length, enabledItems.length + 1).x,
                      y: getRadialOffset(enabledItems.length, enabledItems.length + 1).y,
                    }}
                    exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    transition={{
                      delay: enabledItems.length * 0.05,
                      type: "spring",
                      stiffness: 340,
                      damping: 22,
                    }}
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

        {/* ORB */}
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0}
          onDragStart={() => {
            setIsDragging(true);
            dragStartPos.current = { x: xMV.get(), y: yMV.get() };
          }}
          onDrag={(_, info) => {
            const next = clampPosition({
              x: dragStartPos.current.x + info.offset.x,
              y: dragStartPos.current.y + info.offset.y,
            });
            xMV.set(next.x);
            yMV.set(next.y);
          }}
          onDragEnd={handleDragEnd}
          onClick={() => !isDragging && setIsOpen((v) => !v)}
          style={{ x: xMV, y: yMV }}
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

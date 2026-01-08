import { useState, useEffect, useRef, RefObject, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const orbRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<Position>({ x: 0, y: 0 });

  const positionKey = `${POSITION_KEY_PREFIX}_${mode}`;
  const orbSize = 56;
  const margin = 8;

  const isPreview = mode === "preview";

  // VisualViewport info (fixes mobile “items appear elsewhere” issue)
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

  // Get bounds for clamping
  const getBounds = () => {
    if (isPreview && containerRef?.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }
    // Use visualViewport dimensions for public mode
    return { width: vvOffset.width, height: vvOffset.height };
  };

  const clampPosition = (pos: Position): Position => {
    const bounds = getBounds();
    return {
      x: Math.max(margin, Math.min(bounds.width - orbSize - margin, pos.x)),
      y: Math.max(margin, Math.min(bounds.height - orbSize - margin, pos.y)),
    };
  };

  // Default position: center-right edge
  const getDefaultPosition = (): Position => {
    const bounds = getBounds();
    return clampPosition({
      x: bounds.width - orbSize - margin,
      y: bounds.height / 2 - orbSize / 2,
    });
  };

  // Initialize position
  useEffect(() => {
    const saved = localStorage.getItem(positionKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const clamped = clampPosition(parsed);
        if (!Number.isFinite(clamped.x) || !Number.isFinite(clamped.y)) {
          setPosition(getDefaultPosition());
        } else {
          setPosition(clamped);
        }
      } catch {
        setPosition(getDefaultPosition());
      }
    } else {
      setPosition(getDefaultPosition());
    }

    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, positionKey]);

  // Save position when it changes
  useEffect(() => {
    if (initialized && (position.x !== 0 || position.y !== 0)) {
      localStorage.setItem(positionKey, JSON.stringify(position));
    }
  }, [position, initialized, positionKey]);

  // Re-clamp on viewport changes (mobile address bar, rotation, etc.)
  useEffect(() => {
    const handleViewportChange = () => setPosition((prev) => clampPosition(prev));

    window.addEventListener("resize", handleViewportChange);
    const vvp = window.visualViewport;
    if (vvp) {
      vvp.addEventListener("resize", handleViewportChange);
      vvp.addEventListener("scroll", handleViewportChange);
    }

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      if (vvp) {
        vvp.removeEventListener("resize", handleViewportChange);
        vvp.removeEventListener("scroll", handleViewportChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Snap to right edge on public (optional but keeps it consistent)
  const handleDragEnd = () => {
    setIsDragging(false);
    const bounds = getBounds();

    const snapRight = !isPreview;
    const centerX = position.x + orbSize / 2;
    const screenCenter = bounds.width / 2;

    const newX = snapRight
      ? bounds.width - orbSize - margin
      : centerX < screenCenter
        ? margin
        : bounds.width - orbSize - margin;

    const newY = Math.max(margin, Math.min(bounds.height - orbSize - margin, position.y));
    setPosition({ x: newX, y: newY });
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

  const enabledItems = settings.items.filter((item) => item.enabled).sort((a, b) => a.order - b.order);

  // Radial offsets ONLY (we will position the whole menu at the orb center)
  const getRadialOffset = (index: number, total: number) => {
    const bounds = getBounds();
    const radius = isPreview ? 70 : 96;

    const isOnRight = position.x > bounds.width / 2;
    const isOnBottom = position.y > bounds.height / 2;

    // Bias expansion to stay near the orb (avoid going off-screen)
    let startAngle = -Math.PI / 2;
    if (isOnRight && isOnBottom) startAngle = Math.PI;
    else if (isOnRight) startAngle = Math.PI / 2;
    else if (isOnBottom) startAngle = -Math.PI;

    const angleSpan = Math.PI * 0.75; // 135deg
    const denom = Math.max(1, total - 1);
    const angle = startAngle + (index / denom) * angleSpan - angleSpan / 2;

    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  };

  // IMPORTANT: Wrapper is aligned to the visual viewport on mobile
  const wrapperStyle = isPreview
    ? undefined
    : ({
        left: vvOffset.left,
        top: vvOffset.top,
        width: vvOffset.width,
        height: vvOffset.height,
      } as React.CSSProperties);

  // Orb center point (relative to wrapper)
  const orbCenter = {
    x: position.x + orbSize / 2,
    y: position.y + orbSize / 2,
  };

  return (
    <>
      <div
        className={cn("pointer-events-none", isPreview ? "absolute inset-0" : "fixed")}
        style={{
          zIndex: isPreview ? 50 : 9999,
          ...(wrapperStyle || {}),
        }}
      >
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
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

              {/* MENU ANCHOR: everything pops around the orb (not elsewhere) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute pointer-events-none"
                style={{ left: orbCenter.x, top: orbCenter.y }}
              >
                {/* Menu Items (relative offsets from orb center) */}
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
                      transition={{ delay: index * 0.05, type: "spring", stiffness: 320, damping: 20 }}
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

                {/* Admin Settings Button */}
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
                      stiffness: 320,
                      damping: 20,
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
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Orb Button */}
        <motion.div
          ref={orbRef}
          drag
          dragMomentum={false}
          dragElastic={0}
          onDragStart={() => {
            setIsDragging(true);
            dragStartPos.current = { ...position };
          }}
          onDrag={(_, info) => {
            const newPos = {
              x: dragStartPos.current.x + info.offset.x,
              y: dragStartPos.current.y + info.offset.y,
            };
            setPosition(clampPosition(newPos));
          }}
          onDragEnd={handleDragEnd}
          onClick={() => !isDragging && setIsOpen(!isOpen)}
          style={{ x: position.x, y: position.y }}
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

          {/* Glow ring animation */}
          <div
            className="absolute inset-0 rounded-full animate-ping bg-primary/20"
            style={{ animationDuration: "2s" }}
          />
        </motion.div>
      </div>

      {/* Tools Drawer */}
      <ToolsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        items={enabledItems}
      />

      {/* Customizer Dialog */}
      {isAdmin && <ToolsOrbCustomizer open={customizerOpen} onOpenChange={setCustomizerOpen} />}
    </>
  );
}

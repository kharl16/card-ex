import { useState, useEffect, useRef, RefObject } from "react";
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<Position>({ x: 0, y: 0 });

  const positionKey = `${POSITION_KEY_PREFIX}_${mode}`;
  const orbSize = 56;
  const margin = 8;

  // Get bounds for clamping. Use visualViewport on mobile to avoid "off-screen" issues.
  const getBounds = () => {
    if (mode === "preview" && containerRef?.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }

    const vv = window.visualViewport;
    if (vv) return { width: vv.width, height: vv.height };

    return { width: window.innerWidth, height: window.innerHeight };
  };

  // Clamp position to bounds
  const clampPosition = (pos: Position): Position => {
    const bounds = getBounds();
    return {
      x: Math.max(margin, Math.min(bounds.width - orbSize - margin, pos.x)),
      y: Math.max(margin, Math.min(bounds.height - orbSize - margin, pos.y)),
    };
  };

  // Default position: CENTER-RIGHT EDGE (requested)
  const getDefaultPosition = (): Position => {
    const bounds = getBounds();
    return clampPosition({
      x: bounds.width - orbSize - margin,
      y: bounds.height / 2 - orbSize / 2,
    });
  };

  // Initialize position (and fix saved off-screen positions)
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

  // Re-clamp on viewport changes (mobile address bar / visual viewport)
  useEffect(() => {
    const handleViewportChange = () => {
      setPosition((prev) => clampPosition(prev));
    };

    window.addEventListener("resize", handleViewportChange);

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", handleViewportChange);
      vv.addEventListener("scroll", handleViewportChange);
    }

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      if (vv) {
        vv.removeEventListener("resize", handleViewportChange);
        vv.removeEventListener("scroll", handleViewportChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Snap to edge on drag end
  const handleDragEnd = () => {
    setIsDragging(false);
    const bounds = getBounds();

    // On actual/public card, always snap to RIGHT edge (keeps it visible + consistent)
    const snapRight = mode === "public";
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

  // Show orb for everyone in public mode, only for logged-in users in preview mode
  if (loading || !settings.enabled) return null;
  if (mode === "preview" && !user) return null;

  const enabledItems = settings.items.filter((item) => item.enabled).sort((a, b) => a.order - b.order);

  // Calculate radial positions based on orb position
  const getRadialPosition = (index: number, total: number) => {
    const bounds = getBounds();
    const radius = mode === "preview" ? 70 : 100;
    const isOnRight = position.x > bounds.width / 2;
    const isOnBottom = position.y > bounds.height / 2;

    let startAngle = -Math.PI / 2; // start upward
    if (isOnRight && isOnBottom) startAngle = Math.PI;
    else if (isOnRight) startAngle = Math.PI / 2;
    else if (isOnBottom) startAngle = -Math.PI;

    const angleSpan = Math.PI * 0.75; // 135 degrees
    const angle = startAngle + (index / (total - 1 || 1)) * angleSpan - angleSpan / 2;

    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  const isPreview = mode === "preview";

  return (
    <>
      <div
        ref={wrapperRef}
        className={cn("inset-0 pointer-events-none", isPreview ? "absolute" : "fixed")}
        style={{ zIndex: isPreview ? 50 : 9999 }}
      >
        {/* Radial Menu Items */}
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

              {/* Menu Items */}
              {enabledItems.map((item, index) => {
                const pos = getRadialPosition(index, enabledItems.length + (isAdmin ? 1 : 0));
                const IconComponent = ICON_MAP[item.icon_name] || Sparkles;
                const itemSize = isPreview ? 44 : 56;

                return (
                  <motion.button
                    key={item.id}
                    initial={{
                      opacity: 0,
                      scale: 0,
                      x: position.x + orbSize / 2,
                      y: position.y + orbSize / 2,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x: position.x + orbSize / 2 + pos.x,
                      y: position.y + orbSize / 2 + pos.y,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0,
                      x: position.x + orbSize / 2,
                      y: position.y + orbSize / 2,
                    }}
                    transition={{ delay: index * 0.05, type: "spring", stiffness: 300 }}
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
                          <IconComponent className={cn("text-primary-foreground", isPreview ? "w-5 h-5" : "w-6 h-6")} />
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
                  initial={{
                    opacity: 0,
                    scale: 0,
                    x: position.x + orbSize / 2,
                    y: position.y + orbSize / 2,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: position.x + orbSize / 2 + getRadialPosition(enabledItems.length, enabledItems.length + 1).x,
                    y: position.y + orbSize / 2 + getRadialPosition(enabledItems.length, enabledItems.length + 1).y,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0,
                    x: position.x + orbSize / 2,
                    y: position.y + orbSize / 2,
                  }}
                  transition={{ delay: enabledItems.length * 0.05, type: "spring", stiffness: 300 }}
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

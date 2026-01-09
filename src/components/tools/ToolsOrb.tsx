import { useState, useEffect, useRef, RefObject, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);

  const constraintsRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);

  const getBounds = useCallback(() => {
    if (isPreview && containerRef?.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }
    const vv = window.visualViewport;
    return {
      width: vv?.width ?? window.innerWidth,
      height: vv?.height ?? window.innerHeight,
    };
  }, [isPreview, containerRef]);

  const clampPosition = useCallback((pos: Position): Position => {
    const b = getBounds();
    return {
      x: Math.max(margin, Math.min(b.width - orbSize - margin, pos.x)),
      y: Math.max(margin, Math.min(b.height - orbSize - margin, pos.y)),
    };
  }, [getBounds]);

  const getDefaultPosition = useCallback((): Position => {
    const b = getBounds();
    return clampPosition({
      x: b.width - orbSize - margin,
      y: b.height / 2 - orbSize / 2,
    });
  }, [getBounds, clampPosition]);

  // Initialize position once
  useEffect(() => {
    const saved = localStorage.getItem(positionKey);
    let start = getDefaultPosition();

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const clamped = clampPosition(parsed);
        if (Number.isFinite(clamped.x) && Number.isFinite(clamped.y)) {
          start = clamped;
        }
      } catch {
        // ignore
      }
    }

    setPosition(start);
    setInitialized(true);
  }, [positionKey, getDefaultPosition, clampPosition]);

  // Save position on change
  useEffect(() => {
    if (!initialized) return;
    const timeout = setTimeout(() => {
      localStorage.setItem(positionKey, JSON.stringify(position));
    }, 100);
    return () => clearTimeout(timeout);
  }, [position, positionKey, initialized]);

  // Re-clamp on resize
  useEffect(() => {
    const handleResize = () => {
      if (isDragging) return;
      setPosition(prev => clampPosition(prev));
    };

    window.addEventListener("resize", handleResize);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", handleResize);
      vv.addEventListener("scroll", handleResize);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (vv) {
        vv.removeEventListener("resize", handleResize);
        vv.removeEventListener("scroll", handleResize);
      }
    };
  }, [isDragging, clampPosition]);

  const handleDragEnd = () => {
    setIsDragging(false);
    
    // Get final position from the orb element
    if (orbRef.current && constraintsRef.current) {
      const orbRect = orbRef.current.getBoundingClientRect();
      const containerRect = constraintsRef.current.getBoundingClientRect();
      
      const newPos = clampPosition({
        x: orbRect.left - containerRect.left,
        y: orbRect.top - containerRect.top,
      });
      
      setPosition(newPos);
    }
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

  const handleOrbClick = () => {
    if (!isDragging) {
      setIsOpen(v => !v);
    }
  };

  if (loading || !settings.enabled) return null;
  if (isPreview && !user) return null;
  if (!initialized) return null;

  const enabledItems = settings.items.filter(it => it.enabled).sort((a, b) => a.order - b.order);

  // Radial layout calculations - all items including Settings are evenly distributed
  const getRadialConfig = () => {
    const b = getBounds();
    const isOnRight = position.x > b.width / 2;
    const isOnBottom = position.y > b.height / 2;
    
    const total = enabledItems.length + (isAdmin ? 1 : 0);
    const itemSize = isPreview ? 44 : 56;
    const minGap = 16;
    const minRadius = isPreview ? 80 : 100;
    
    // Ensure radius is large enough for all items without overlap
    const neededRadius = Math.max(minRadius, (total * (itemSize + minGap)) / Math.PI);
    
    return { isOnRight, isOnBottom, radius: neededRadius, total };
  };

  // All items (including Settings) are placed equidistantly on a 180° arc
  const getRadialOffset = (index: number, total: number, radius: number, isOnRight: boolean) => {
    const span = Math.PI; // 180°
    const center = isOnRight ? Math.PI : 0;
    
    // For equidistant spacing: divide arc into (total + 1) parts, place items in middle sections
    // This ensures equal gaps at edges and between all items
    const angleStep = span / (total + 1);
    const startAngle = center - span / 2;
    const angle = startAngle + angleStep * (index + 1);
    
    return { 
      x: Math.cos(angle) * radius, 
      y: Math.sin(angle) * radius 
    };
  };

  const radial = getRadialConfig();

  // Visual viewport offset for public mode
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const vvOffset = {
    left: vv?.offsetLeft ?? 0,
    top: vv?.offsetTop ?? 0,
    width: vv?.width ?? window.innerWidth,
    height: vv?.height ?? window.innerHeight,
  };

  const wrapperStyle = isPreview
    ? undefined
    : {
        left: vvOffset.left,
        top: vvOffset.top,
        width: vvOffset.width,
        height: vvOffset.height,
      } as React.CSSProperties;

  return (
    <>
      <div
        ref={constraintsRef}
        className={cn("pointer-events-none", isPreview ? "absolute inset-0" : "fixed inset-0")}
        style={{ zIndex: isPreview ? 50 : 9999, ...wrapperStyle }}
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
                isPreview && "rounded-xl"
              )}
              onClick={() => setIsOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Menu items anchored to orb position */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute pointer-events-none"
              style={{ 
                left: position.x + orbSize / 2, 
                top: position.y + orbSize / 2 
              }}
            >
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
                          "backdrop-blur-md"
                        )}
                        style={{ width: itemSize, height: itemSize }}
                      >
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.label} 
                            className="w-6 h-6 rounded-full object-cover" 
                          />
                        ) : (
                          <IconComponent
                            className={cn("text-primary-foreground", isPreview ? "w-5 h-5" : "w-6 h-6")}
                          />
                        )}
                      </div>
                      <span
                        className={cn(
                          "font-medium text-foreground bg-background/80 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap",
                          isPreview ? "text-[10px]" : "text-xs"
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
                        "group-hover:scale-110 transition-transform"
                      )}
                      style={{ width: isPreview ? 44 : 56, height: isPreview ? 44 : 56 }}
                    >
                      <Settings className={cn("text-muted-foreground", isPreview ? "w-5 h-5" : "w-6 h-6")} />
                    </div>
                    <span
                      className={cn(
                        "font-medium text-foreground bg-background/80 px-2 py-0.5 rounded-full shadow-sm",
                        isPreview ? "text-[10px]" : "text-xs"
                      )}
                    >
                      Settings
                    </span>
                  </div>
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Draggable Orb */}
        <motion.div
          ref={orbRef}
          drag
          dragConstraints={constraintsRef}
          dragMomentum={false}
          dragElastic={0}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          onClick={handleOrbClick}
          initial={{ x: position.x, y: position.y }}
          animate={{ x: position.x, y: position.y }}
          style={{ touchAction: "none" }}
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
              isOpen && "rotate-45 shadow-[0_0_30px_rgba(212,175,55,0.6)]"
            )}
            style={{ width: orbSize, height: orbSize }}
          >
            {settings.orb_image_url ? (
              <img 
                src={settings.orb_image_url} 
                alt="Tools" 
                className="w-8 h-8 rounded-full object-cover" 
              />
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

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
  Plus,
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

  const orbSize = isPreview ? 48 : 56;
  const margin = 16;

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
  }, [getBounds, orbSize]);

  const getDefaultPosition = useCallback((): Position => {
    const b = getBounds();
    return clampPosition({
      x: b.width - orbSize - margin,
      y: b.height / 2 - orbSize / 2,
    });
  }, [getBounds, clampPosition, orbSize]);

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
  const allItems = [...enabledItems, ...(isAdmin ? [{ id: "settings", label: "Settings", icon_name: "Settings" }] : [])] as (ToolsOrbItem | { id: string; label: string; icon_name: string })[];
  const totalItems = allItems.length;

  // Radial layout configuration
  const getRadialConfig = () => {
    const b = getBounds();
    const isOnRight = position.x > b.width / 2;
    const isMobile = b.width < 480;
    
    // Responsive radius
    const baseRadius = isMobile ? 100 : (isPreview ? 110 : 130);
    const itemSize = isPreview ? 48 : 52;
    
    return { isOnRight, radius: baseRadius, itemSize };
  };

  // Calculate position for each item on a perfect semi-circle arc
  const getRadialPosition = (index: number, total: number, radius: number, isOnRight: boolean) => {
    // Arc spans 180 degrees (π radians)
    // When on right side: arc opens to the left (from -90° to +90° relative to left direction)
    // When on left side: arc opens to the right (from -90° to +90° relative to right direction)
    
    const startAngle = isOnRight ? (Math.PI / 2) : -(Math.PI / 2); // 90° or -90°
    const endAngle = isOnRight ? -(Math.PI / 2) : (Math.PI / 2);   // -90° or 90°
    
    // Distribute items evenly across the arc
    const angleStep = total > 1 ? (endAngle - startAngle) / (total - 1) : 0;
    const angle = startAngle + (angleStep * index);
    
    return { 
      x: Math.cos(angle) * radius, 
      y: Math.sin(angle) * radius 
    };
  };

  const radialConfig = getRadialConfig();

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

  // Center point of the orb
  const orbCenterX = position.x + orbSize / 2;
  const orbCenterY = position.y + orbSize / 2;

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
              transition={{ duration: 0.2 }}
              className={cn(
                "absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto",
                isPreview && "rounded-xl"
              )}
              onClick={() => setIsOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Radial Menu Items - Positioned relative to orb center */}
        <AnimatePresence>
          {isOpen && (
            <div
              className="absolute pointer-events-none"
              style={{ 
                left: orbCenterX, 
                top: orbCenterY,
                zIndex: 10
              }}
            >
              {allItems.map((item, index) => {
                const isSettingsItem = item.id === "settings";
                const IconComponent = ICON_MAP[item.icon_name] || Sparkles;
                const pos = getRadialPosition(index, totalItems, radialConfig.radius, radialConfig.isOnRight);
                const itemSize = radialConfig.itemSize;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ 
                      opacity: 0, 
                      scale: 0, 
                      x: 0, 
                      y: 0,
                      rotate: -180,
                      filter: "blur(8px)"
                    }}
                    animate={{ 
                      opacity: 1, 
                      scale: [0, 1.15, 0.95, 1],
                      x: pos.x, 
                      y: pos.y,
                      rotate: 0,
                      filter: "blur(0px)"
                    }}
                    exit={{ 
                      opacity: 0, 
                      scale: 0, 
                      x: 0, 
                      y: 0,
                      rotate: 90,
                      filter: "blur(4px)",
                      transition: { 
                        duration: 0.2, 
                        delay: (totalItems - index - 1) * 0.03 
                      }
                    }}
                    transition={{ 
                      delay: index * 0.06,
                      duration: 0.5,
                      scale: {
                        times: [0, 0.5, 0.75, 1],
                        type: "spring",
                        stiffness: 300,
                        damping: 15
                      },
                      rotate: { type: "spring", stiffness: 200, damping: 12 },
                      x: { type: "spring", stiffness: 350, damping: 22 },
                      y: { type: "spring", stiffness: 350, damping: 22 },
                      opacity: { duration: 0.2 },
                      filter: { duration: 0.3 }
                    }}
                    className="absolute pointer-events-auto"
                    style={{
                      // Center the item on its calculated position
                      transform: `translate(-50%, -50%)`,
                      left: 0,
                      top: 0,
                    }}
                  >
                    <button
                      onClick={() => isSettingsItem ? handleSettingsClick() : handleItemClick(item as ToolsOrbItem)}
                      className="flex flex-col items-center gap-2 group outline-none focus:outline-none"
                    >
                      {/* Icon Button */}
                      <div
                        className={cn(
                          "rounded-full flex items-center justify-center",
                          "transition-all duration-200 ease-out",
                          "group-hover:scale-110 group-active:scale-95",
                          isSettingsItem
                            ? "bg-gradient-to-br from-zinc-600 to-zinc-700 shadow-lg shadow-zinc-900/30 border-2 border-zinc-500/30"
                            : "bg-gradient-to-br from-primary via-primary/95 to-primary/80 shadow-lg shadow-primary/40 border-2 border-primary-foreground/20"
                        )}
                        style={{ 
                          width: itemSize, 
                          height: itemSize,
                          boxShadow: isSettingsItem 
                            ? '0 4px 20px rgba(0,0,0,0.3)' 
                            : '0 4px 20px rgba(212, 175, 55, 0.4), 0 0 30px rgba(212, 175, 55, 0.2)'
                        }}
                      >
                        {'image_url' in item && item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.label} 
                            className={cn("rounded-full object-cover", isPreview ? "w-5 h-5" : "w-6 h-6")}
                          />
                        ) : (
                          <IconComponent
                            className={cn(
                              isSettingsItem ? "text-zinc-200" : "text-primary-foreground",
                              isPreview ? "w-5 h-5" : "w-6 h-6"
                            )}
                          />
                        )}
                      </div>
                      
                      {/* Label - Always below icon, never overlapping */}
                      <span
                        className={cn(
                          "font-medium whitespace-nowrap",
                          "bg-black/70 backdrop-blur-md",
                          "px-3 py-1 rounded-full",
                          "shadow-lg",
                          isPreview ? "text-[10px]" : "text-xs",
                          "text-white"
                        )}
                        style={{ zIndex: 100 }}
                      >
                        {item.label}
                      </span>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>

        {/* Draggable Orb - The center button */}
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
          style={{ touchAction: "none", zIndex: 20 }}
          className="absolute pointer-events-auto cursor-grab active:cursor-grabbing"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          <div
            className={cn(
              "rounded-full flex items-center justify-center relative",
              "bg-gradient-to-br from-primary via-primary/90 to-primary/70",
              "border-2 border-primary-foreground/30",
              "transition-all duration-300 ease-out"
            )}
            style={{ 
              width: orbSize, 
              height: orbSize,
              boxShadow: isOpen 
                ? '0 0 40px rgba(212, 175, 55, 0.6), 0 0 60px rgba(212, 175, 55, 0.3)'
                : '0 0 25px rgba(212, 175, 55, 0.4), 0 0 40px rgba(212, 175, 55, 0.2)'
            }}
          >
            {settings.orb_image_url ? (
              <img 
                src={settings.orb_image_url} 
                alt="Tools" 
                className={cn("rounded-full object-cover", isPreview ? "w-7 h-7" : "w-8 h-8")}
              />
            ) : (
              <motion.div
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <Plus className={cn("text-primary-foreground", isPreview ? "w-6 h-6" : "w-7 h-7")} strokeWidth={2.5} />
              </motion.div>
            )}
          </div>

          {/* Pulsing ring effect */}
          {!isOpen && (
            <div
              className="absolute inset-0 rounded-full animate-ping bg-primary/20 pointer-events-none"
              style={{ animationDuration: "2.5s" }}
            />
          )}
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
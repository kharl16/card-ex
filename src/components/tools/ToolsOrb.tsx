import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useToolsOrb, ToolsOrbItem } from "@/hooks/useToolsOrb";
import { useAuth } from "@/contexts/AuthContext";
import {
  GraduationCap,
  Link,
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
  Link,
  FolderOpen,
  Building2,
  Presentation,
  Settings,
  Sparkles,
};

const POSITION_KEY = "tools_orb_position";

interface Position {
  x: number;
  y: number;
}

export default function ToolsOrb() {
  const { settings, loading } = useToolsOrb();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const orbRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<Position>({ x: 0, y: 0 });

  // Load saved position
  useEffect(() => {
    const saved = localStorage.getItem(POSITION_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPosition(parsed);
      } catch {
        // Use default
      }
    } else {
      // Default: bottom-right corner
      setPosition({
        x: window.innerWidth - 80,
        y: window.innerHeight - 120,
      });
    }
  }, []);

  // Save position when it changes
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    }
  }, [position]);

  // Snap to edge on drag end
  const handleDragEnd = () => {
    setIsDragging(false);
    const orbWidth = 64;
    const margin = 16;
    const centerX = position.x + orbWidth / 2;
    const screenCenter = window.innerWidth / 2;

    // Snap to nearest horizontal edge
    const newX = centerX < screenCenter ? margin : window.innerWidth - orbWidth - margin;
    
    // Keep within vertical bounds
    const newY = Math.max(margin, Math.min(window.innerHeight - orbWidth - margin, position.y));

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

  if (loading || !settings.enabled || !user) return null;

  const enabledItems = settings.items
    .filter((item) => item.enabled)
    .sort((a, b) => a.order - b.order);

  // Calculate radial positions based on orb position
  const getRadialPosition = (index: number, total: number) => {
    const orbRect = orbRef.current?.getBoundingClientRect();
    if (!orbRect) return { x: 0, y: 0 };

    const radius = 100;
    const isOnRight = position.x > window.innerWidth / 2;
    const isOnBottom = position.y > window.innerHeight / 2;

    // Adjust start angle based on position
    let startAngle = -Math.PI / 2; // Start from top
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

  return (
    <>
      <div
        ref={containerRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9999 }}
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
                className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto"
                onClick={() => setIsOpen(false)}
              />

              {/* Menu Items */}
              {enabledItems.map((item, index) => {
                const pos = getRadialPosition(index, enabledItems.length + (isAdmin ? 1 : 0));
                const IconComponent = ICON_MAP[item.icon_name] || Sparkles;

                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, scale: 0, x: position.x + 32, y: position.y + 32 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x: position.x + 32 + pos.x,
                      y: position.y + 32 + pos.y,
                    }}
                    exit={{ opacity: 0, scale: 0, x: position.x + 32, y: position.y + 32 }}
                    transition={{ delay: index * 0.05, type: "spring", stiffness: 300 }}
                    onClick={() => handleItemClick(item)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                  >
                    <div className="flex flex-col items-center gap-1 group">
                      <div
                        className={cn(
                          "w-14 h-14 rounded-full flex items-center justify-center",
                          "bg-gradient-to-br from-primary/90 to-primary shadow-lg",
                          "border-2 border-primary-foreground/20",
                          "group-hover:scale-110 transition-transform",
                          "backdrop-blur-md"
                        )}
                      >
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.label} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <IconComponent className="w-6 h-6 text-primary-foreground" />
                        )}
                      </div>
                      <span className="text-xs font-medium text-foreground bg-background/80 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                        {item.label}
                      </span>
                    </div>
                  </motion.button>
                );
              })}

              {/* Admin Settings Button */}
              {isAdmin && (
                <motion.button
                  initial={{ opacity: 0, scale: 0, x: position.x + 32, y: position.y + 32 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: position.x + 32 + getRadialPosition(enabledItems.length, enabledItems.length + 1).x,
                    y: position.y + 32 + getRadialPosition(enabledItems.length, enabledItems.length + 1).y,
                  }}
                  exit={{ opacity: 0, scale: 0, x: position.x + 32, y: position.y + 32 }}
                  transition={{ delay: enabledItems.length * 0.05, type: "spring", stiffness: 300 }}
                  onClick={handleSettingsClick}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                >
                  <div className="flex flex-col items-center gap-1 group">
                    <div
                      className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center",
                        "bg-gradient-to-br from-muted to-muted/80 shadow-lg",
                        "border-2 border-border",
                        "group-hover:scale-110 transition-transform"
                      )}
                    >
                      <Settings className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-medium text-foreground bg-background/80 px-2 py-0.5 rounded-full shadow-sm">
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
            setPosition({
              x: dragStartPos.current.x + info.offset.x,
              y: dragStartPos.current.y + info.offset.y,
            });
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
              "w-16 h-16 rounded-full flex items-center justify-center",
              "bg-gradient-to-br from-primary via-primary/90 to-primary/70",
              "shadow-[0_0_30px_rgba(212,175,55,0.4)]",
              "border-2 border-primary-foreground/30",
              "backdrop-blur-md",
              "transition-all duration-300",
              isOpen && "rotate-45 shadow-[0_0_40px_rgba(212,175,55,0.6)]"
            )}
          >
            {settings.orb_image_url ? (
              <img
                src={settings.orb_image_url}
                alt="Tools"
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : isOpen ? (
              <X className="w-7 h-7 text-primary-foreground" />
            ) : (
              <Sparkles className="w-7 h-7 text-primary-foreground" />
            )}
          </div>

          {/* Glow ring animation */}
          <div className="absolute inset-0 rounded-full animate-ping bg-primary/20" style={{ animationDuration: "2s" }} />
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
      {isAdmin && (
        <ToolsOrbCustomizer
          open={customizerOpen}
          onOpenChange={setCustomizerOpen}
        />
      )}
    </>
  );
}

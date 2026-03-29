import { useState, useEffect, useRef, RefObject, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useMergedToolsOrb, ToolsOrbItem } from "@/hooks/useToolsOrb";
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
  Lock,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ToolsDrawer from "./ToolsDrawer";
import ToolsOrbCustomizer from "./ToolsOrbCustomizer";
import ToolsAuthDialog from "./ToolsAuthDialog";
import { useToolsAuth } from "@/hooks/useToolsAuth";
import { toast } from "sonner";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  GraduationCap,
  Link: LinkIcon,
  FolderOpen,
  Building2,
  Presentation,
  Settings,
  Sparkles,
  Lock,
  Unlock,
};

const POSITION_KEY_PREFIX = "tools_orb_position";

interface Position {
  x: number;
  y: number;
}

interface ToolsOrbProps {
  mode?: "preview" | "public";
  containerRef?: RefObject<HTMLElement>;
  /** When set, only the card owner (matching user_id) can see the orb */
  cardOwnerId?: string;
}

export default function ToolsOrb({ mode = "public", containerRef, cardOwnerId }: ToolsOrbProps) {
  const { mergedSettings: settings, loading, hasPaidCard, refetchGlobal } = useMergedToolsOrb();
  const { isAdmin, user } = useAuth();
  const toolsAuth = useToolsAuth();
  const navigate = useNavigate();

  const isPreview = mode === "preview";
  const positionKey = `${POSITION_KEY_PREFIX}_${mode}`;

  const orbSize = 48; // Consistent size for both modes
  const margin = 16;

  const [isOpen, setIsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const routeItems = useMemo(() => new Set(["prospects"]), []);

  // Motion values for smooth dragging - the orb position
  const motionX = useMotionValue(0);
  const motionY = useMotionValue(0);

  // Springs for ultra-smooth following
  const springConfig = { stiffness: 900, damping: 60 };
  const springX = useSpring(motionX, springConfig);
  const springY = useSpring(motionY, springConfig);

  // Derived motion values for orb center (for radial items)
  const orbCenterX = useTransform(springX, (x) => x + orbSize / 2);
  const orbCenterY = useTransform(springY, (y) => y + orbSize / 2);

  const constraintsRef = useRef<HTMLDivElement>(null);

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
      x: b.width / 2 - orbSize / 2,
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

    // Set motion values immediately (no animation on mount)
    motionX.set(start.x);
    motionY.set(start.y);
    setInitialized(true);
  }, [positionKey, getDefaultPosition, clampPosition, motionX, motionY]);

  // Save position on change (debounced)
  useEffect(() => {
    if (!initialized) return;
    
    const unsubX = motionX.on("change", () => {
      // Only save when not dragging to avoid excessive writes
    });
    
    return () => {
      unsubX();
    };
  }, [initialized, motionX]);

  // Re-clamp on resize
  useEffect(() => {
    const handleResize = () => {
      if (isDragging) return;
      const currentPos = { x: motionX.get(), y: motionY.get() };
      const clamped = clampPosition(currentPos);
      motionX.set(clamped.x);
      motionY.set(clamped.y);
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
  }, [isDragging, clampPosition, motionX, motionY]);

  const handleDragEnd = () => {
    setIsDragging(false);
    
    // Get current motion value position and clamp
    const currentPos = { x: motionX.get(), y: motionY.get() };
    const clamped = clampPosition(currentPos);
    
    // Snap to clamped position
    motionX.set(clamped.x);
    motionY.set(clamped.y);
    
    // Persist to localStorage
    localStorage.setItem(positionKey, JSON.stringify(clamped));
  };

  const handleItemClick = (item: ToolsOrbItem) => {
    setIsOpen(false);

    if (routeItems.has(item.id)) {
      setDrawerOpen(false);
      setActiveSection(null);
      navigate(item.route);
      return;
    }

    setActiveSection(item.id);
    setDrawerOpen(true);
  };

  const handleSettingsClick = () => {
    setIsOpen(false);
    setCustomizerOpen(true);
  };

  const handleLockToggle = () => {
    setIsOpen(false);
    if (toolsAuth.isSetup) {
      // Already set up — lock the session
      toolsAuth.lock();
      toast.success("Tools locked");
    } else {
      // Not set up — open setup dialog
      setAuthDialogOpen(true);
    }
  };

  const handleOrbClick = () => {
    if (!isDragging) {
      // If auth is not set up or already unlocked, open directly
      if (!toolsAuth.isSetup || toolsAuth.isUnlocked) {
        setIsOpen(v => !v);
      } else {
        // Need to authenticate first
        setAuthDialogOpen(true);
      }
    }
  };

  // When auth succeeds, open the orb
  const handleAuthSuccess = () => {
    setAuthDialogOpen(false);
    setIsOpen(true);
  };

  if (loading || !settings.enabled) return null;
  if (isPreview && !user) return null;
  // On public cards, only show orb to the card's owner (must be logged in)
  if (!isPreview && cardOwnerId && (!user || user.id !== cardOwnerId)) return null;
  if (!initialized) return null;

  const enabledItems = settings.items.filter(it => it.enabled).sort((a, b) => a.order - b.order);
  const lockItem = { 
    id: "lock", 
    label: toolsAuth.isSetup ? "Lock" : "Set Lock", 
    icon_name: toolsAuth.isSetup ? "Lock" : "Unlock" 
  };
  const settingsItem = { id: "settings", label: isAdmin ? "Settings" : "Customize", icon_name: "Settings" };
  const showCustomize = isAdmin || (!isAdmin && hasPaidCard);

  // Symmetrical centered layout anchors:
  // top: Videos, upper-right: IAM Links, far-right: Settings, lower-right: Files,
  // bottom: Branches, lower-left: Presentations, far-left: Set Lock, upper-left: Prospect List
  const buildOrderedItems = () => {
    const utilityItems = [lockItem, ...(showCustomize ? [settingsItem] : [])];
    const byId = new Map(
      [...enabledItems, ...utilityItems].map((item) => [item.id, item] as const)
    );

    const preferredOrder = [
      "trainings",
      "links",
      "settings",
      "files",
      "directory",
      "disc_test",
      "presentations",
      "lock",
      "prospects",
    ];

    const orderedItems = preferredOrder
      .map((id) => byId.get(id))
      .filter((item): item is ToolsOrbItem | { id: string; label: string; icon_name: string } => Boolean(item));

    const remainingItems = [...enabledItems]
      .filter((item) => !preferredOrder.includes(item.id));

    if (!orderedItems.some((item) => item.id === "lock")) {
      orderedItems.push(lockItem);
    }

    return [...orderedItems, ...remainingItems];
  };
  const allItems = buildOrderedItems();
  const totalItems = allItems.length;

  // Radial geometry constants - consistent sizing for seamless look across all views
  const b = getBounds();
  const radius = 120; // Increased radius for better spacing with more items
  const iconSize = 44; // Slightly smaller to prevent overlap

  // Get current position for edge detection (use spring values for real-time)
  const currentX = springX.get();
  const currentY = springY.get();
  const currentCenterX = currentX + orbSize / 2;
  const currentCenterY = currentY + orbSize / 2;
  const edgeThreshold = 140;
  
  // Determine sweep direction based on orb position
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

  const centeredSymmetricAngles = [-90, -50, 0, 40, 80, 120, 160, 200, 240];

  // Calculate radial position for each item
  const getRadialPosition = (index: number) => {
    if (sweep === 340 && totalItems === centeredSymmetricAngles.length) {
      const angleRad = centeredSymmetricAngles[index] * (Math.PI / 180);
      return {
        x: Math.cos(angleRad) * radius,
        y: Math.sin(angleRad) * radius,
      };
    }

    const step = totalItems > 1 ? sweep / (totalItems - 1) : 0;
    const angleDeg = startAngle + index * step;
    const angleRad = angleDeg * (Math.PI / 180);
    const x = Math.cos(angleRad) * radius;
    const y = Math.sin(angleRad) * radius;
    return { x, y };
  };

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

  // Radial menu content
  const radialMenu = (
    <div
      className="pointer-events-none"
      style={{
        position: isPreview ? "absolute" : "fixed",
        inset: 0,
        zIndex: 9999,
        overflow: "visible",
        ...wrapperStyle,
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
            className={cn(
              "absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto",
              isPreview && "rounded-xl"
            )}
            style={{ zIndex: 9998 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Center anchor point - positioned using motion values for real-time following */}
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
        {/* Radial Menu Items */}
        <AnimatePresence>
          {isOpen && allItems.map((item, index) => {
            const isSettingsItem = item.id === "settings";
            const isLockItem = item.id === "lock";
            const isUtilityItem = isSettingsItem || isLockItem;
            const IconComponent = ICON_MAP[item.icon_name] || Sparkles;
            const imageUrl = "image_url" in item && typeof item.image_url === "string"
              ? item.image_url
              : undefined;
            const pos = getRadialPosition(index);

            return (
              // OUTER WRAPPER: owns the radial positioning transform (NOT animated)
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
                {/* INNER ANIMATED ELEMENT: only handles opacity/scale/blur animations */}
                <motion.div
                  initial={{ 
                    opacity: 0, 
                    scale: 0.6, 
                    filter: "blur(6px)"
                  }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    filter: "blur(0px)"
                  }}
                  exit={{ 
                    opacity: 0, 
                    scale: 0.6, 
                    filter: "blur(4px)",
                  }}
                  transition={{ 
                    delay: index * 0.05,
                    duration: 0.25,
                  }}
                  style={{ transformOrigin: "center" }}
                >
                  {/* Button with relative positioning for label anchor */}
                  <button
                    onClick={() => {
                      const isLockItem = item.id === "lock";
                      if (isSettingsItem) handleSettingsClick();
                      else if (isLockItem) handleLockToggle();
                      else handleItemClick(item as ToolsOrbItem);
                    }}
                    className="relative flex flex-col items-center outline-none focus:outline-none group"
                    style={{ 
                      width: iconSize, 
                      height: iconSize, 
                      overflow: "visible" 
                    }}
                  >
                    {/* Icon Circle */}
                    <div
                      className={cn(
                        "rounded-full flex items-center justify-center",
                        "transition-transform duration-200 ease-out",
                        "group-hover:scale-110 group-active:scale-95",
                        isUtilityItem
                          ? "bg-gradient-to-br from-zinc-600 to-zinc-700 border-2 border-zinc-500/30"
                          : "bg-gradient-to-br from-primary via-primary/95 to-primary/80 border-2 border-primary-foreground/20"
                      )}
                      style={{ 
                        width: iconSize, 
                        height: iconSize,
                        boxShadow: isUtilityItem 
                          ? '0 4px 20px rgba(0,0,0,0.3)' 
                          : '0 4px 20px rgba(212, 175, 55, 0.4), 0 0 30px rgba(212, 175, 55, 0.2)'
                      }}
                    >
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={item.label} 
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <IconComponent
                          className={cn(
                            "w-6 h-6",
                            isUtilityItem ? "text-zinc-200" : "text-primary-foreground"
                          )}
                        />
                      )}
                    </div>
                    
                    {/* Label - ABSOLUTE positioned below icon, never overlapping */}
                    <span
                      className={cn(
                        "text-[11px] font-medium whitespace-nowrap",
                        "bg-black/60 backdrop-blur-md",
                        "px-2 py-1 rounded-full",
                        "shadow-lg text-white"
                      )}
                      style={{ 
                        position: "absolute",
                        top: iconSize + 8,
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

      {/* Glow trail elements - appear while dragging */}
      <AnimatePresence>
        {isDragging && (
          <>
            {/* Trail layer 1 - largest, most delayed */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.3, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15 }}
              style={{
                x: springX,
                y: springY,
                position: "absolute",
                left: -8,
                top: -8,
                width: orbSize + 16,
                height: orbSize + 16,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(212, 175, 55, 0.4) 0%, rgba(212, 175, 55, 0) 70%)",
                filter: "blur(8px)",
                zIndex: 10001,
                pointerEvents: "none",
              }}
            />
            {/* Trail layer 2 - medium */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 0.5, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.1 }}
              style={{
                x: springX,
                y: springY,
                position: "absolute",
                left: -4,
                top: -4,
                width: orbSize + 8,
                height: orbSize + 8,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(212, 175, 55, 0.5) 0%, rgba(212, 175, 55, 0) 60%)",
                filter: "blur(4px)",
                zIndex: 10001,
                pointerEvents: "none",
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Center Button (+ / X) - positioned using motion values for real-time dragging */}
      <motion.div
        drag
        dragConstraints={{
          left: margin,
          right: b.width - orbSize - margin,
          top: margin,
          bottom: b.height - orbSize - margin,
        }}
        dragMomentum={false}
        dragElastic={0.08}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => {
          setIsDragging(false);
          const pos = clampPosition({ x: motionX.get(), y: motionY.get() });
          motionX.set(pos.x);
          motionY.set(pos.y);
          localStorage.setItem(positionKey, JSON.stringify(pos));
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
          className={cn(
            "rounded-full flex items-center justify-center relative",
            "transition-all duration-300 ease-out"
          )}
          style={{ 
            width: orbSize, 
            height: orbSize,
            background: '#050505',
            border: '2px solid rgba(212, 175, 55, 0.6)',
            boxShadow: isDragging
              ? '0 0 20px rgba(212, 175, 55, 0.5), inset 0 0 8px rgba(212, 175, 55, 0.15)'
              : isOpen 
                ? '0 0 15px rgba(212, 175, 55, 0.4), inset 0 0 6px rgba(212, 175, 55, 0.1)'
                : '0 0 10px rgba(212, 175, 55, 0.3), inset 0 0 4px rgba(212, 175, 55, 0.08)'
          }}
        >
          {settings.orb_image_url ? (
            <img 
              src={settings.orb_image_url} 
              alt="Tools" 
              draggable={false}
              className={cn("rounded-full object-cover pointer-events-none select-none", isPreview ? "w-9 h-9" : "w-10 h-10")}
            />
          ) : (
            <motion.div
              animate={{ rotate: isOpen ? 45 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {isOpen ? (
                <X className={cn("text-primary-foreground", isPreview ? "w-5 h-5" : "w-6 h-6")} strokeWidth={2.5} />
              ) : (
                <Plus className={cn("text-primary-foreground", isPreview ? "w-5 h-5" : "w-6 h-6")} strokeWidth={2.5} />
              )}
            </motion.div>
          )}
        </div>

        {/* Pulsing ring effect */}
        {!isOpen && !isDragging && (
          <div
            className="absolute inset-0 rounded-full animate-ping bg-primary/20 pointer-events-none"
            style={{ animationDuration: "2.5s" }}
          />
        )}
      </motion.div>
    </div>
  );

  // For public mode, use a portal to ensure no clipping from parent containers
  const menuContent = isPreview ? (
    <div ref={constraintsRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 50 }}>
      {radialMenu}
    </div>
  ) : (
    <>
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }} />
      {typeof document !== "undefined" && createPortal(radialMenu, document.body)}
    </>
  );

  return (
    <>
      {menuContent}

      <ToolsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        items={enabledItems}
      />

      <ToolsOrbCustomizer
        open={customizerOpen}
        onOpenChange={(open) => {
          setCustomizerOpen(open);
          if (!open) refetchGlobal();
        }}
      />

      <ToolsAuthDialog
        open={authDialogOpen}
        onOpenChange={(v) => {
          setAuthDialogOpen(v);
          if (!v && toolsAuth.isUnlocked) {
            handleAuthSuccess();
          }
        }}
        isSetup={toolsAuth.isSetup}
        hasBiometric={toolsAuth.hasBiometric}
        hasPin={toolsAuth.hasPin}
        biometricAvailable={toolsAuth.biometricAvailable}
        onRegisterBiometric={toolsAuth.registerBiometric}
        onAuthenticateBiometric={toolsAuth.authenticateBiometric}
        onSetupPin={async (pin) => {
          const success = await toolsAuth.setupPin(pin);
          if (success) toolsAuth.unlock();
          return success;
        }}
        onVerifyPin={toolsAuth.verifyPin}
      />
    </>
  );
}

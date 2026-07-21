import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, X, FileSpreadsheet } from "lucide-react";
import { ToolsOrbItem } from "@/hooks/useToolsOrb";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import TrainingsSection from "./sections/TrainingsSection";
import LinksSection from "./sections/LinksSection";
import FilesSection from "./sections/FilesSection";
import DirectorySection from "./sections/DirectorySection";
import PresentationsSection from "./sections/PresentationsSection";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";

import BulkImportExportDialog from "./admin/BulkImportExportDialog";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  Link,
  FolderOpen,
  Building2,
  Presentation,
  Sparkles,
  UserSearch,
  Brain,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  GraduationCap,
  Link,
  FolderOpen,
  Building2,
  Presentation,
  Sparkles,
  UserSearch,
  Brain,
};

const ROUTE_ITEMS = new Set(["prospects"]);

interface ToolsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSection: string | null;
  onSectionChange: (section: string | null) => void;
  items: ToolsOrbItem[];
  /** Auto-open a sub-tool inside the Links section (deep-link). */
  initialTool?: "affirmations" | "books" | "mindset" | "disc" | "love-languages" | null;
}

export default function ToolsDrawer({
  open,
  onOpenChange,
  activeSection,
  onSectionChange,
  items,
  initialTool,
}: ToolsDrawerProps) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobileLive = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileDrawerContentRef = useRef<HTMLDivElement | null>(null);
  // Lock the layout (Drawer vs Sheet) when open to prevent orientation changes
  // from unmounting the active container and losing state (e.g. video playback).
  const [lockedMobile, setLockedMobile] = useState<boolean | null>(null);
  const isMobile = lockedMobile ?? isMobileLive;
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const resetDrawerViewport = useCallback(() => {
    if (typeof window === "undefined") return;

    // Match the dashboard /locator behavior: pin horizontally to the layout
    // viewport, not the visual viewport. Android Chrome can return a stale or
    // negative visualViewport.offsetLeft after leaving Google Maps and pressing
    // the phone back button 2–3 times; applying that offset is what crops the
    // Branch drawer's left edge.
    const viewportLeft = 0;
    const viewportWidth = window.innerWidth;

    const normalizeTransformX = (node: HTMLElement) => {
      node.style.setProperty("translate", "0 0");

      const transform = node.style.transform || window.getComputedStyle(node).transform;
      if (!transform || transform === "none") return;

      try {
        const matrix = new DOMMatrix(transform);
        if (Math.abs(matrix.m41) > 0.5) {
          matrix.m41 = 0;
          node.style.transform = matrix.toString();
        }
      } catch {
        if (/translate(?:3d|X)?\(\s*-/.test(transform)) {
          node.style.transform = "translate3d(0px, 0px, 0px)";
        }
      }
    };

    const resetNow = () => {
      document.documentElement.scrollLeft = 0;
      document.body.scrollLeft = 0;

      const nodes = new Set<HTMLElement>();
      if (scrollContainerRef.current) nodes.add(scrollContainerRef.current);
      if (mobileDrawerContentRef.current) nodes.add(mobileDrawerContentRef.current);
      document
        .querySelectorAll<HTMLElement>(
          [
            "[data-tools-drawer-content]",
            "[data-tools-drawer-root]",
            "[data-tools-drawer-scroll]",
            "[data-testid='tools-drawer-scroll']",
            "[data-vaul-drawer-wrapper]",
            "#root",
          ].join(", "),
        )
        .forEach((node) => nodes.add(node));

      // Also clear scrollLeft on every nested element inside the drawer. The
      // cropped Branch screen was caused by a nested mobile scroll layer keeping
      // a horizontal scroll offset after returning from Google Maps, while the
      // top-level drawer itself was already back at x=0.
      mobileDrawerContentRef.current
        ?.querySelectorAll<HTMLElement>("*")
        .forEach((node) => {
          if (node.scrollLeft !== 0) node.scrollLeft = 0;
        });

      nodes.forEach((node) => {
        node.scrollLeft = 0;
        node.style.setProperty("box-sizing", "border-box");
        node.style.setProperty("max-width", "100%");
        node.style.setProperty("overflow-x", "clip");
        node.style.setProperty("touch-action", "pan-y");

        if (node.dataset.toolsDrawerContent === "true") {
          // Android Chrome can restore visualViewport slightly offset after
          // repeatedly opening Google Maps and using the phone back button.
          // Ignore that horizontal offset and keep the drawer pinned at x=0.
          node.style.setProperty("left", `${viewportLeft}px`, "important");
          node.style.setProperty("right", "auto", "important");
          node.style.setProperty("width", `${viewportWidth}px`, "important");
          node.style.setProperty("max-width", `${viewportWidth}px`, "important");
          normalizeTransformX(node);
        } else {
          normalizeTransformX(node);
        }
      });
    };

    resetNow();
    requestAnimationFrame(() => {
      resetNow();
      requestAnimationFrame(resetNow);
    });
    window.setTimeout(resetNow, 80);
    window.setTimeout(resetNow, 250);
  }, []);

  // Hardware/browser back button closes the drawer instead of leaving the page.
  useBackButtonClose(open, () => onOpenChange(false));

  useEffect(() => {
    if (open) {
      setLockedMobile(isMobileLive);
    } else {
      setLockedMobile(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      onSectionChange(null);
    }
  }, [open]);

  // Reset horizontal scroll/viewport position whenever the user returns to
  // this drawer — especially Android Chrome returning from Google Maps via
  // the phone back button repeatedly. This targets the Vaul drawer content,
  // the inner scroll area, and browser visualViewport drift.
  useEffect(() => {
    if (!open) return;

    resetDrawerViewport();

    const onVisibility = () => {
      if (document.visibilityState === "visible") resetDrawerViewport();
    };
    const onPageShow = () => resetDrawerViewport();
    const onFocus = () => resetDrawerViewport();
    const onPopState = () => resetDrawerViewport();
    const onResize = () => resetDrawerViewport();
    const onExternalMapOpen = () => resetDrawerViewport();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.addEventListener("cardex:external-map-open", onExternalMapOpen);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onResize);
    vv?.addEventListener("scroll", onResize);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("cardex:external-map-open", onExternalMapOpen);
      vv?.removeEventListener("resize", onResize);
      vv?.removeEventListener("scroll", onResize);
    };
  }, [open, activeSection, location.pathname, location.key, resetDrawerViewport]);

  const handleBack = () => {
    // Close the drawer entirely so the user returns to the Card View
    // instead of the intermediate Tools Hub tile listing.
    setSearchQuery("");
    onSectionChange(null);
    onOpenChange(false);
  };

  const renderContent = () => {
    if (!activeSection) {
      return (
        <div className="p-4 space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">Tools Hub</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Access all your resources in one place
            </p>
          </div>

          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => setBulkDialogOpen(true)}
              className="w-full gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Bulk Import/Export
            </Button>
          )}

          <div className="grid grid-cols-2 gap-4">
            {items.map((item) => {
              const IconComponent = ICON_MAP[item.icon_name] || Sparkles;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (ROUTE_ITEMS.has(item.id)) {
                      onOpenChange(false);
                      navigate(item.route);
                    } else {
                      onSectionChange(item.id);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center gap-3 p-6 rounded-2xl",
                    "bg-gradient-to-br from-card to-card/80",
                    "border border-border/50 shadow-lg",
                    "hover:shadow-xl hover:scale-105 hover:border-primary/50",
                    "transition-all duration-300",
                    "min-h-[140px]"
                  )}
                >
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center",
                      "bg-gradient-to-br from-primary/20 to-primary/10",
                      "border border-primary/30"
                    )}
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.label} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <IconComponent className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <span className="text-lg font-semibold text-foreground text-center">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div
        data-tools-drawer-root
        className="flex flex-col h-full w-full max-w-full overflow-x-hidden"
        style={{
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      >
        <div className="sticky top-0 z-10 bg-background border-b p-4 space-y-3 w-full max-w-full overflow-x-hidden">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-12 w-12 rounded-full shrink-0"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h2 className="text-xl font-bold text-foreground">
              {items.find((i) => i.id === activeSection)?.label || "Section"}
            </h2>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base rounded-full bg-muted/50"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div
          ref={(el) => {
            scrollContainerRef.current = el;
            // Defensive: some mobile browsers preserve a stray scrollLeft
            // after the user opens Maps / a nested Dialog and taps back.
            // Force horizontal reset on mount and whenever the section changes.
            if (el && el.scrollLeft !== 0) el.scrollLeft = 0;
          }}
          data-testid="tools-drawer-scroll"
          className="flex-1 overflow-y-auto [overflow-x:clip] [scrollbar-gutter:stable]"
          style={{ transform: "none" }}
        >
          <div className="p-4 w-full max-w-full [overflow-x:clip]">
            {activeSection === "trainings" && <TrainingsSection searchQuery={searchQuery} />}
            {activeSection === "links" && <LinksSection searchQuery={searchQuery} showDiscTest initialTool={initialTool ?? null} deepLinkActive={!!initialTool} />}
            {activeSection === "files" && <FilesSection searchQuery={searchQuery} />}
            {activeSection === "directory" && <DirectorySection searchQuery={searchQuery} onClearSearch={() => setSearchQuery("")} />}
            {activeSection === "presentations" && <PresentationsSection searchQuery={searchQuery} />}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
          <DrawerContent
            ref={(el) => {
              mobileDrawerContentRef.current = el;
              if (el) resetDrawerViewport();
            }}
            data-tools-drawer-content="true"
            className="h-[90dvh] max-h-[90dvh] w-[100dvw] max-w-[100dvw] left-0 right-auto overflow-x-hidden overscroll-x-none touch-pan-y transform-none"
            style={{
              left: 0,
              right: "auto",
              width: "100dvw",
              maxWidth: "100dvw",
              paddingLeft: "env(safe-area-inset-left, 0px)",
              paddingRight: "env(safe-area-inset-right, 0px)",
            }}
          >
            <div data-tools-drawer-root className="h-full w-full max-w-full overflow-hidden overscroll-x-none touch-pan-y flex flex-col" style={{ transform: "none" }}>
              {!activeSection && (
                <DrawerHeader className="border-b">
                  <DrawerTitle className="sr-only">Tools Hub</DrawerTitle>
                </DrawerHeader>
              )}
              <div data-tools-drawer-scroll="outer" className="flex-1 overflow-y-auto [overflow-x:clip] overscroll-x-none touch-pan-y w-full max-w-full">
                {renderContent()}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="right" className="w-[480px] sm:max-w-[480px] p-0 overflow-x-hidden">
            <SheetHeader className="sr-only">
              <SheetTitle>Tools Hub</SheetTitle>
            </SheetHeader>
            <div className="h-full overflow-hidden flex flex-col">{renderContent()}</div>
          </SheetContent>
        </Sheet>
      )}

      <BulkImportExportDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        onImported={() => {}}
      />
    </>
  );
}

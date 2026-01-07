import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, X } from "lucide-react";
import { ToolsOrbItem } from "@/hooks/useToolsOrb";
import { useIsMobile } from "@/hooks/use-mobile";
import TrainingsSection from "./sections/TrainingsSection";
import LinksSection from "./sections/LinksSection";
import FilesSection from "./sections/FilesSection";
import DirectorySection from "./sections/DirectorySection";
import PresentationsSection from "./sections/PresentationsSection";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  Link,
  FolderOpen,
  Building2,
  Presentation,
  Sparkles,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  GraduationCap,
  Link,
  FolderOpen,
  Building2,
  Presentation,
  Sparkles,
};

interface ToolsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSection: string | null;
  onSectionChange: (section: string | null) => void;
  items: ToolsOrbItem[];
}

export default function ToolsDrawer({
  open,
  onOpenChange,
  activeSection,
  onSectionChange,
  items,
}: ToolsDrawerProps) {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");

  // Reset search when closing or changing sections
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      onSectionChange(null);
    }
  }, [open]);

  const handleBack = () => {
    setSearchQuery("");
    onSectionChange(null);
  };

  const renderContent = () => {
    if (!activeSection) {
      // Show main menu
      return (
        <div className="p-4 space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">Tools Hub</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Access all your resources in one place
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {items.map((item) => {
              const IconComponent = ICON_MAP[item.icon_name] || Sparkles;
              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
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

    // Show specific section
    return (
      <div className="flex flex-col h-full">
        {/* Section Header */}
        <div className="sticky top-0 z-10 bg-background border-b p-4 space-y-3">
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

          {/* Search */}
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

        {/* Section Content */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {activeSection === "trainings" && <TrainingsSection searchQuery={searchQuery} />}
            {activeSection === "links" && <LinksSection searchQuery={searchQuery} />}
            {activeSection === "files" && <FilesSection searchQuery={searchQuery} />}
            {activeSection === "directory" && <DirectorySection searchQuery={searchQuery} />}
            {activeSection === "presentations" && <PresentationsSection searchQuery={searchQuery} />}
          </div>
        </ScrollArea>
      </div>
    );
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[90vh] max-h-[90vh]">
          <div className="h-full overflow-hidden flex flex-col">
            {!activeSection && (
              <DrawerHeader className="border-b">
                <DrawerTitle className="sr-only">Tools Hub</DrawerTitle>
              </DrawerHeader>
            )}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {renderContent()}
              </ScrollArea>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Tools Hub</SheetTitle>
        </SheetHeader>
        <div className="h-full overflow-hidden flex flex-col">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
}

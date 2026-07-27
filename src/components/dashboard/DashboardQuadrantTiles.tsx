import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, PlayCircle, BookOpen, MoreHorizontal, Wrench, Users, CalendarDays, BarChart3, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DashboardQuadrantTilesProps {
  onOpenStats?: () => void;
}

interface Tile {
  id: string;
  label: string;
  icon: typeof MapPin;
  path?: string;
  action?: "more";
  color: string;
  iconBg: string;
  iconColor: string;
  ringColor: string;
}

const tiles: Tile[] = [
  {
    id: "locator",
    label: "Locator",
    icon: MapPin,
    path: "/locator",
    color: "from-emerald-500/20 to-emerald-500/5",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    ringColor: "shadow-emerald-500/30",
  },
  {
    id: "videos",
    label: "Videos",
    icon: PlayCircle,
    path: "/dashboard/videos",
    color: "from-rose-500/20 to-rose-500/5",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-400",
    ringColor: "shadow-rose-500/30",
  },
  {
    id: "resources",
    label: "Resources",
    icon: BookOpen,
    path: "/resources",
    color: "from-amber-500/20 to-amber-500/5",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    ringColor: "shadow-amber-500/30",
  },
  {
    id: "more",
    label: "More",
    icon: MoreHorizontal,
    action: "more",
    color: "from-primary/20 to-primary/5",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
    ringColor: "shadow-primary/30",
  },
];

interface MoreItem {
  icon: typeof MapPin;
  label: string;
  path?: string;
  action?: "stats";
}

const moreItems: MoreItem[] = [
  { icon: Wrench, label: "Tools", path: "/tools" },
  { icon: Users, label: "Leads", path: "/dashboard/leads" },
  { icon: CalendarDays, label: "Appointments", path: "/dashboard/appointments" },
  { icon: BarChart3, label: "Stats", action: "stats" },
  { icon: LayoutGrid, label: "Gallery", path: "/gallery" },
];

export function DashboardQuadrantTiles({ onOpenStats }: DashboardQuadrantTilesProps) {
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleTileClick = (tile: Tile) => {
    if (tile.action === "more") {
      setMoreOpen(true);
      return;
    }
    if (tile.path) {
      navigate(tile.path);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        const isMore = tile.action === "more";

        const tileContent = (
          <button
            type="button"
            onClick={() => handleTileClick(tile)}
            className={cn(
              "group relative flex flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-border/40 bg-card/40 px-3 py-5 transition-all",
              "hover:border-primary/40 hover:bg-card/60 active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            )}
          >
            {/* subtle gradient wash */}
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100",
                tile.color
              )}
              aria-hidden
            />

            {/* icon ring */}
            <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10 shadow-[0_0_16px_-4px_hsl(var(--primary)/0.35)] transition-transform group-hover:scale-105">
              <Icon className="h-6 w-6 text-primary" />
            </div>

            <span className="relative z-10 text-sm font-semibold text-foreground">
              {tile.label}
            </span>
          </button>
        );

        if (isMore) {
          return (
            <Popover key={tile.id} open={moreOpen} onOpenChange={setMoreOpen}>
              <PopoverTrigger asChild>{tileContent}</PopoverTrigger>
              <PopoverContent side="bottom" align="center" className="w-52 p-2">
                <div className="space-y-1">
                  {moreItems.map((item) => (
                    <button
                      key={item.label + (item.action || item.path)}
                      type="button"
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                      onClick={() => {
                        setMoreOpen(false);
                        if (item.action === "stats") {
                          onOpenStats?.();
                        } else if (item.path) {
                          navigate(item.path);
                        }
                      }}
                    >
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          );
        }

        return (
          <div key={tile.id}>
            {tileContent}
          </div>
        );
      })}
    </div>
  );
}

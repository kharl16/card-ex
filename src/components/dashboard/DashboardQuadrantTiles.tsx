import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, PlayCircle, BookOpen, MoreHorizontal, Wrench, Users, CalendarDays, BarChart3, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { TileAuraBackground } from "./TileAuraBackground";

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
  auraColor: string;
  iconBg: string;
  iconColor: string;
  hoverBorder: string;
  focusRing: string;
}


const tiles: Tile[] = [
  {
    id: "locator",
    label: "Locator",
    icon: MapPin,
    path: "/locator",
    color: "from-emerald-500/20 to-emerald-500/5",
    auraColor: "150 80% 45%",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    hoverBorder: "hover:border-emerald-400/50",
    focusRing: "focus-visible:ring-emerald-400/50",
  },
  {
    id: "videos",
    label: "Videos",
    icon: PlayCircle,
    path: "/dashboard/videos",
    color: "from-rose-500/20 to-rose-500/5",
    auraColor: "340 75% 55%",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-400",
    hoverBorder: "hover:border-rose-400/50",
    focusRing: "focus-visible:ring-rose-400/50",
  },
  {
    id: "resources",
    label: "Resources",
    icon: BookOpen,
    path: "/resources",
    color: "from-amber-500/20 to-amber-500/5",
    auraColor: "38 92% 50%",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    hoverBorder: "hover:border-amber-400/50",
    focusRing: "focus-visible:ring-amber-400/50",
  },
  {
    id: "more",
    label: "More",
    icon: MoreHorizontal,
    action: "more",
    color: "from-primary/20 to-primary/5",
    auraColor: "45 72% 53%",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
    hoverBorder: "hover:border-primary/50",
    focusRing: "focus-visible:ring-primary/50",
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
    <div className="grid grid-cols-2 gap-2">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        const isMore = tile.action === "more";

        const tileContent = (
          <button
            type="button"
            onClick={() => handleTileClick(tile)}
            className={cn(
              "group relative flex aspect-[5/4] w-full min-w-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-border/40 bg-card/40 px-2 transition-all duration-200",
              "hover:bg-card/60 active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              tile.hoverBorder,
              tile.focusRing
            )}
          >
            {/* permanent base gradient wash */}
            <div
              className={cn(
                "absolute inset-0 z-0 bg-gradient-to-br opacity-30",
                tile.color
              )}
              aria-hidden
            />

            {/* subtle moving smoke/aura */}
            <TileAuraBackground color={tile.auraColor} />

            {/* hover gradient intensifier */}
            <div
              className={cn(
                "absolute inset-0 z-0 bg-gradient-to-br opacity-0 transition-opacity duration-200 group-hover:opacity-100",
                tile.color
              )}
              aria-hidden
            />


            {/* colorful icon ring */}
            <div
              className={cn(
                "relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/10 transition-all duration-200 group-hover:scale-110 group-focus-visible:scale-110 sm:h-20 sm:w-20",
                tile.iconBg,
                tile.iconColor,
                "shadow-[0_0_24px_-3px_currentColor]",
                "group-hover:shadow-[0_0_40px_-2px_currentColor] group-focus-visible:shadow-[0_0_40px_-2px_currentColor]"
              )}
            >
              <Icon className="h-9 w-9 transition-transform duration-200 group-hover:scale-110 group-focus-visible:scale-110 sm:h-11 sm:w-11" />
            </div>

            <span className="relative z-10 w-full truncate text-center text-[13px] font-semibold leading-tight text-foreground sm:text-sm">
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

        return <div key={tile.id} className="min-w-0">{tileContent}</div>;
      })}
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { MapPin, PlayCircle, BookOpen, LayoutGrid, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TileAuraBackground } from "./TileAuraBackground";
import { useDashboardTileStats } from "@/hooks/useDashboardTileStats";

interface DashboardQuadrantTilesProps {
  /** Kept for compatibility — Statistics now lives inside Workspace. */
  onOpenStats?: () => void;
}

interface TileTheme {
  color: string;
  auraColor: string;
  iconBg: string;
  iconColor: string;
  hoverBorder: string;
  focusRing: string;
}

const themes: Record<string, TileTheme> = {
  locator: {
    color: "from-emerald-500/20 to-emerald-500/5",
    auraColor: "150 80% 45%",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    hoverBorder: "hover:border-emerald-400/50",
    focusRing: "focus-visible:ring-emerald-400/50",
  },
  videos: {
    color: "from-rose-500/20 to-rose-500/5",
    auraColor: "340 75% 55%",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-400",
    hoverBorder: "hover:border-rose-400/50",
    focusRing: "focus-visible:ring-rose-400/50",
  },
  resources: {
    color: "from-amber-500/20 to-amber-500/5",
    auraColor: "38 92% 50%",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    hoverBorder: "hover:border-amber-400/50",
    focusRing: "focus-visible:ring-amber-400/50",
  },
  workspace: {
    color: "from-blue-500/20 to-blue-500/5",
    auraColor: "210 80% 55%",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
    hoverBorder: "hover:border-blue-400/50",
    focusRing: "focus-visible:ring-blue-400/50",
  },
};

export function DashboardQuadrantTiles(_props: DashboardQuadrantTilesProps) {
  const navigate = useNavigate();
  const stats = useDashboardTileStats();

  const tiles = [
    {
      id: "locator",
      label: "Locator",
      icon: MapPin,
      path: "/locator",
      primary: stats.loading ? "—" : `${stats.branches} Branches`,
      secondary: stats.nearestBranch ? `Nearest: ${stats.nearestBranch}` : "Find a branch near you",
      badge: null as string | null,
    },
    {
      id: "videos",
      label: "Videos",
      icon: PlayCircle,
      path: "/dashboard/videos",
      primary: stats.loading ? "—" : `${stats.videos} Videos`,
      secondary: stats.newVideos > 0 ? `${stats.newVideos} new this week` : "Trainings & replays",
      badge: stats.newVideos > 0 ? `${stats.newVideos} new` : null,
    },
    {
      id: "resources",
      label: "Resources",
      icon: BookOpen,
      path: "/resources",
      primary: stats.loading ? "—" : `${stats.resources} Resources`,
      secondary: stats.latestResource ? `Latest: ${stats.latestResource}` : "Files, links & ambassadors",
      badge: null,
    },
    {
      id: "workspace",
      label: "Workspace",
      icon: LayoutGrid,
      path: "/dashboard/workspace",
      primary: stats.loading ? "—" : `${stats.leads} Leads · ${stats.appointments} Appts`,
      secondary: stats.loading ? "Your business tools" : `${stats.gallery} gallery items`,
      badge: stats.appointments > 0 ? `${stats.appointments}` : null,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {tiles.map((tile) => {
        const theme = themes[tile.id];
        const Icon = tile.icon;

        return (
          <button
            key={tile.id}
            type="button"
            onClick={() => navigate(tile.path)}
            style={{ "--aura-color": theme.auraColor } as React.CSSProperties}
            className={cn(
              "group relative flex min-h-[132px] w-full min-w-0 flex-col justify-between gap-3 overflow-hidden rounded-3xl border border-border/40 bg-card/40 p-4 text-left backdrop-blur-xl transition-all duration-300",
              "tile-pulsating-border shadow-lg shadow-black/20",
              "hover:-translate-y-0.5 hover:bg-card/60 hover:shadow-xl active:scale-[0.99]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              theme.hoverBorder,
              theme.focusRing
            )}
          >
            <div className={cn("absolute inset-0 z-0 bg-gradient-to-br opacity-30", theme.color)} aria-hidden />
            <TileAuraBackground color={theme.auraColor} />
            <div
              className={cn(
                "absolute inset-0 z-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                theme.color
              )}
              aria-hidden
            />

            <div className="relative z-10 flex items-start gap-3">
              <div
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 transition-transform duration-300 group-hover:scale-110",
                  theme.iconBg,
                  theme.iconColor,
                  "shadow-[0_0_24px_-6px_currentColor]"
                )}
              >
                <Icon className="h-7 w-7" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg">
                    {tile.label}
                  </h3>
                  {tile.badge && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        theme.iconBg,
                        theme.iconColor
                      )}
                    >
                      {tile.badge}
                    </span>
                  )}
                </div>
                <p className={cn("truncate text-sm font-semibold", theme.iconColor)}>{tile.primary}</p>
              </div>

              <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>

            <p className="relative z-10 truncate text-xs text-muted-foreground">{tile.secondary}</p>
          </button>
        );
      })}
    </div>
  );
}

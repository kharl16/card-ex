import { useRef } from "react";
import { Download, ExternalLink, Play, Heart, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TopRightActions } from "@/components/ui/top-right-actions";
import { cn } from "@/lib/utils";
import type { FileResource, EventType } from "@/types/resources";

interface FilePreviewDialogProps {
  file: FileResource | null;
  files: FileResource[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onLogEvent: (eventType: EventType) => void;
  onNavigate: (file: FileResource) => void;
}

export function FilePreviewDialog({
  file,
  files,
  open,
  onOpenChange,
  isFavorite,
  onToggleFavorite,
  onLogEvent,
  onNavigate,
}: FilePreviewDialogProps) {
  if (!file) return null;

  const currentIndex = files.findIndex((f) => f.id === file.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;

  const goPrev = () => { if (hasPrev) onNavigate(files[currentIndex - 1]); };
  const goNext = () => { if (hasNext) onNavigate(files[currentIndex + 1]); };

  // Swipe / drag gesture (works for touch + mouse on mobile, tablet, desktop)
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const SWIPE_THRESHOLD = 50;
  const onPointerDown = (e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    dragStart.current = null;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] p-0 gap-0 overflow-hidden bg-background border-border/30 shadow-2xl shadow-black/20 rounded-2xl">
        {/* Image area */}
        <div
          className="relative bg-black/95 flex items-center justify-center min-h-[40vh] max-h-[55vh] touch-pan-y cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { dragStart.current = null; }}
        >
          {file.images ? (
            <img
              src={file.images}
              alt={file.file_name}
              className="w-full h-full object-contain max-h-[55vh] select-none"
              draggable={false}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground/20">
              <Download className="h-16 w-16" />
            </div>
          )}

          {/* Nav arrows */}
          {hasPrev && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md border border-white/10"
              onClick={goPrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          {hasNext && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md border border-white/10"
              onClick={goNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}

          {/* Counter pill */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white/80 text-[10px] font-medium px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
            {currentIndex + 1} / {files.length}
          </div>

          {/* Top-right actions (reserves space for Dialog's built-in X) */}
          <TopRightActions reserveCloseSlot>
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-9 w-9 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md border border-white/10",
                isFavorite && "text-red-500"
              )}
              onClick={onToggleFavorite}
            >
              <Heart className={cn("h-4 w-4", isFavorite && "fill-current drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]")} />
            </Button>
          </TopRightActions>
        </div>


        {/* Details */}
        <div className="p-5 space-y-4">
          <div>
            <h2 className="font-bold text-base leading-snug line-clamp-2">
              {file.file_name}
            </h2>
            {file.folder_name && (
              <Badge variant="secondary" className="mt-1.5 text-[10px] font-medium">
                {file.folder_name}
              </Badge>
            )}
          </div>

          {file.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {file.description}
            </p>
          )}

          {(file.price_dp || file.price_srp) && (
            <div className="flex items-center gap-2">
              {file.price_dp && (
                <Badge className="font-mono text-xs px-2.5 py-1 bg-primary/90 border-0 shadow-md shadow-primary/20">
                  DP: {file.price_dp}
                </Badge>
              )}
              {file.price_srp && (
                <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1">
                  SRP: {file.price_srp}
                </Badge>
              )}
            </div>
          )}

          {(() => {
            const f = file as typeof file & { custom_fields?: Array<{ label: string; value: string }> };
            const rows: Array<[string, string | number]> = [];
            const push = (label: string, v: unknown) => {
              if (v === null || v === undefined) return;
              const s = String(v).trim();
              if (s) rows.push([label, s]);
            };
            push("Unilevel Points", f.unilevel_points);
            push("Package Points (SMC)", f.package_points_smc);
            push("RQV", f.rqv);
            push("Infinity", f.infinity);
            push("Check Match", f.check_match);
            push("Give Me 5", f.give_me_5);
            push("Just 4 You", f.just_4_you);
            push("Wholesale Commission", f.wholesale_package_commission);
            (f.custom_fields ?? []).forEach((c) => push(c.label, c.value));
            if (rows.length === 0) return null;
            return (
              <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:[&>*:nth-child(odd)]:border-r divide-border/50 sm:[&>*:nth-child(n+3)]:border-t">
                  {rows.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 px-3 py-2 border-border/50">
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                        {label}
                      </span>
                      <span className="text-xs font-semibold text-foreground font-mono text-right">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {file.drive_link_share && (
              <Button asChild size="sm" className="flex-1 min-w-[100px] gap-2 rounded-xl shadow-md shadow-primary/10">
                <a href={file.drive_link_share} target="_blank" rel="noopener noreferrer" onClick={() => onLogEvent("view")}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </a>
              </Button>
            )}
            {file.drive_link_download && (
              <Button asChild size="sm" variant="secondary" className="flex-1 min-w-[100px] gap-2 rounded-xl">
                <a href={file.drive_link_download} target="_blank" rel="noopener noreferrer" onClick={() => onLogEvent("download")}>
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </Button>
            )}
            {file.view_video_url && (
              <Button asChild size="sm" variant="outline" className="flex-1 min-w-[90px] gap-2 rounded-xl border-border/50">
                <a href={file.view_video_url} target="_blank" rel="noopener noreferrer" onClick={() => onLogEvent("watch")}>
                  <Play className="h-3.5 w-3.5" />
                  Watch
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

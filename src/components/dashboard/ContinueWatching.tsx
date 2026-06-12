import { Play, X, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  buildResumeUrl,
  formatRelativeTime,
  markCompleted,
  removeProgress,
  useProgressList,
  type VideoProgress,
} from "@/lib/videoProgress";
import { cn } from "@/lib/utils";

interface ContinueWatchingProps {
  showCompleted?: boolean;
  emptyHidden?: boolean;
}

export default function ContinueWatching({
  showCompleted = false,
  emptyHidden = true,
}: ContinueWatchingProps) {
  const all = useProgressList();
  const items = all.filter((v) => {
    if (v.completed) return showCompleted;
    return (v.currentTime || 0) > 3 || v.percent > 0;
  });

  if (items.length === 0) {
    if (emptyHidden) return null;
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Continue Watching</h2>
        <p className="text-xs text-muted-foreground">
          Videos you start will show up here so you can pick up where you left off.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-2" aria-label="Continue watching">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-primary" />
          Continue Watching
        </h2>
        <span className="text-[11px] text-muted-foreground">{items.length}</span>
      </div>

      <div className="-mx-4 px-4 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {items.map((v) => (
          <ResumeCard key={v.id} v={v} />
        ))}
      </div>
    </section>
  );
}

function ResumeCard({ v }: { v: VideoProgress }) {
  const url = v.videoUrl ? buildResumeUrl(v.videoUrl, v.currentTime) : null;

  return (
    <div
      className={cn(
        "snap-start shrink-0 w-56 rounded-2xl overflow-hidden relative",
        "bg-card border border-border/50 shadow-md",
      )}
    >
      <button
        type="button"
        className="absolute top-1.5 right-1.5 z-10 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
        onClick={() => removeProgress(v.id)}
        aria-label="Remove from continue watching"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="relative aspect-video bg-black">
        {v.thumbnail ? (
          <img
            src={v.thumbnail}
            alt={v.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Play className="w-10 h-10 text-primary/50" />
          </div>
        )}
        {v.completed && (
          <div className="absolute top-1.5 left-1.5 rounded-full bg-emerald-500/90 text-white px-1.5 py-0.5 text-[10px] font-semibold flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Watched
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0">
          <Progress value={v.percent} className="h-1 rounded-none bg-white/20" />
        </div>
      </div>

      <div className="p-2.5 space-y-2">
        <h4 className="font-semibold text-foreground line-clamp-2 text-xs min-h-[32px]">
          {v.title}
        </h4>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{v.percent}% watched</span>
          <span>{formatRelativeTime(v.lastPlayedAt)}</span>
        </div>
        <div className="flex gap-1.5">
          <Button
            asChild
            size="sm"
            className="flex-1 h-8 text-xs gap-1"
            disabled={!url}
          >
            <a href={url || "#"} target="_blank" rel="noopener noreferrer">
              <Play className="h-3 w-3" />
              {v.completed ? "Rewatch" : "Resume"}
            </a>
          </Button>
          {!v.completed && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={() => markCompleted(v.id)}
              aria-label="Mark as watched"
              title="Mark as watched"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

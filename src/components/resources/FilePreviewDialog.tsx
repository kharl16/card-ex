import { useState } from "react";
import { X, Download, ExternalLink, Play, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

  const goPrev = () => {
    if (hasPrev) onNavigate(files[currentIndex - 1]);
  };
  const goNext = () => {
    if (hasNext) onNavigate(files[currentIndex + 1]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] p-0 gap-0 overflow-hidden bg-background border-border/50">
        {/* Image area */}
        <div className="relative bg-black flex items-center justify-center min-h-[40vh] max-h-[55vh]">
          {file.images ? (
            <img
              src={file.images}
              alt={file.file_name}
              className="w-full h-full object-contain max-h-[55vh]"
            />
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground/30">
              <Download className="h-16 w-16" />
            </div>
          )}

          {/* Nav arrows */}
          {hasPrev && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={goPrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          {hasNext && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={goNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}

          {/* Counter */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur">
            {currentIndex + 1} / {files.length}
          </div>
        </div>

        {/* Details */}
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg leading-snug line-clamp-2">
                {file.file_name}
              </h2>
              {file.folder_name && (
                <Badge variant="secondary" className="mt-1.5 text-xs">
                  {file.folder_name}
                </Badge>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className={cn("flex-shrink-0", isFavorite && "text-red-500")}
              onClick={onToggleFavorite}
            >
              <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
            </Button>
          </div>

          {file.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {file.description}
            </p>
          )}

          {(file.price_dp || file.price_srp) && (
            <div className="flex items-center gap-3">
              {file.price_dp && (
                <Badge variant="default" className="font-mono text-sm px-3 py-1">
                  DP: {file.price_dp}
                </Badge>
              )}
              {file.price_srp && (
                <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                  SRP: {file.price_srp}
                </Badge>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {file.drive_link_share && (
              <Button asChild className="flex-1 min-w-[120px] gap-2">
                <a
                  href={file.drive_link_share}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onLogEvent("view")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open
                </a>
              </Button>
            )}
            {file.drive_link_download && (
              <Button asChild variant="secondary" className="flex-1 min-w-[120px] gap-2">
                <a
                  href={file.drive_link_download}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onLogEvent("download")}
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </Button>
            )}
            {file.view_video_url && (
              <Button asChild variant="outline" className="flex-1 min-w-[100px] gap-2">
                <a
                  href={file.view_video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onLogEvent("watch")}
                >
                  <Play className="h-4 w-4" />
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

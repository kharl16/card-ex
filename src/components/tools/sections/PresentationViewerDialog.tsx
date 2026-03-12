import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toEmbedUrl, detectPresentationSource } from "@/lib/presentationUtils";

interface PresentationViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  url: string;
}

export default function PresentationViewerDialog({
  open,
  onOpenChange,
  title,
  url,
}: PresentationViewerDialogProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const embedUrl = toEmbedUrl(url);
  const source = detectPresentationSource(url);
  const isGoogleSource = source === "Google Slides" || source === "Google Drive";

  useEffect(() => {
    setLoadError(false);
  }, [open, url]);

  const openOriginal = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  if (!embedUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[90vh] p-0 gap-0 overflow-hidden bg-black border-none">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-background/95 backdrop-blur border-b border-border/30">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">{title}</h3>
            <span className="text-xs text-muted-foreground shrink-0">({source})</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={openOriginal}
              title="Open original"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Iframe with fallback */}
        <div className="flex-1 w-full h-full relative">
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full border-0"
            style={{ minHeight: "calc(90vh - 48px)" }}
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            onLoad={() => setLoadError(false)}
            onError={() => setLoadError(true)}
          />

          {isGoogleSource && !loadError && (
            <div className="absolute bottom-3 right-3">
              <Button onClick={openOriginal} size="sm" variant="secondary" className="gap-2 shadow-sm">
                <ExternalLink className="w-4 h-4" />
                Open original (large files)
              </Button>
            </div>
          )}

          {loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/95">
              <p className="text-muted-foreground text-sm text-center max-w-xs">
                Inline preview failed. This usually happens with large files. Open the original file to continue.
              </p>
              <Button onClick={openOriginal} className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Open original
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

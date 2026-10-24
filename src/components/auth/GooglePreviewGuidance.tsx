import { ExternalLink } from "lucide-react";

/** Embedded-preview sign-in guidance with a direct-click fallback when scripted tabs are blocked. */
export function GooglePreviewGuidance({ message, fallbackUrl }: { message: string; fallbackUrl?: string }) {
  if (!message) return null;
  return (
    <div role="status" className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
      <p>{message}</p>
      {fallbackUrl && (
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 font-semibold text-primary hover:bg-primary/20"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Open sign-in tab
        </a>
      )}
    </div>
  );
}

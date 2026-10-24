import { ExternalLink } from "lucide-react";
import type { GoogleGuidance } from "@/lib/googlePreview";

/**
 * Embedded-preview sign-in guidance. Renders the steps as a numbered list so the
 * "click Continue with Google again in the new tab" instruction reads as an order of
 * operations, plus a direct-click fallback when scripted tabs are blocked.
 */
export function GooglePreviewGuidance({ guidance, fallbackUrl }: { guidance: GoogleGuidance | null; fallbackUrl?: string }) {
  if (!guidance) return null;
  return (
    <div role="status" className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
      <p className="font-semibold text-foreground">{guidance.heading}</p>
      <ol className="space-y-2">
        {guidance.steps.map((step, index) => (
          <li key={step} className="flex items-start gap-2.5">
            <span
              aria-hidden="true"
              className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-[11px] font-semibold text-primary"
            >
              {index + 1}
            </span>
            {/* Step 2 is always the action itself — keep it the loudest line. */}
            <span className={index === 1 ? "font-semibold text-foreground" : undefined}>{step}</span>
          </li>
        ))}
      </ol>
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

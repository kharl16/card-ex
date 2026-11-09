import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  url: string | null;
  url2?: string | null;
  caption: string | null;
  srp?: string | null;
  extractedText: string | null;
  categoryLabel?: string;
}

/** The source photo(s), listed price and every word read from the photo, for verifying an answer. */
export function PhotoSourcePanel({ url, url2, caption, srp, extractedText, categoryLabel }: Props) {
  const images = [
    ...(url ? [{ url, label: "Front" }] : []),
    ...(url2 ? [{ url: url2, label: "Back" }] : []),
  ];
  return (
    <section aria-label="Source photo and text read from it" className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold break-words">{caption || "Untitled photo"}</h3>
        {categoryLabel && <Badge variant="secondary">{categoryLabel}</Badge>}
        {srp && <Badge variant="outline">Listed price: {srp}</Badge>}
      </div>
      {images.length > 0 ? (
        <div className={`grid gap-2 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {images.map((img) => (
            <a
              key={img.label}
              href={img.url}
              target="_blank"
              rel="noreferrer"
              className="group block space-y-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <img
                src={img.url}
                alt={`${caption ?? "Library photo"} — ${img.label.toLowerCase()}`}
                className="max-h-80 w-full rounded-xl border border-border bg-muted/30 object-contain"
                loading="lazy"
              />
              <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
                {images.length > 1 ? img.label : "Photo"} · Open full size
                <ExternalLink className="h-3 w-3" />
              </span>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">The source photo was not kept for this answer.</p>
      )}
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Text read from the photo</p>
        <div
          className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-muted/20 p-3 text-sm leading-relaxed"
          tabIndex={0}
          aria-label="Original text read from the photo"
        >
          {extractedText || <span className="text-muted-foreground">No readable text was found on this photo.</span>}
        </div>
      </div>
    </section>
  );
}

import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCodeDisplay from "@/components/qr/QRCodeDisplay";
import cardExLogo from "@/assets/Card-Ex-Logo-sparkle.webp";
import calendarArt from "@/assets/tiles/calendar-photoreal.webp";

interface QRActionRowProps {
  url: string;
  qrSettings?: any;
  accent: string;
  showDownload?: boolean;
  downloadFileName?: string;
  onBookAppointment?: () => void;
  onCreateCard?: () => void;
}

/** Tile width at which the saved QR frame is shown at its full designed size. */
const FULL_FRAME_TILE = 200;

/**
 * Scale the QR frame (padding, border, corner radius) with the tile so the code
 * fills the same share of its tile on phones as it does on laptops.
 */
export function scaleQrFrame(cell: number, qrSettings?: any) {
  const scale = Math.min(1, Math.max(0.35, cell / FULL_FRAME_TILE));
  const framed = !!qrSettings?.frameEnabled;
  const padding = Math.max(4, Math.round((qrSettings?.framePadding || 16) * scale));
  const width = Math.max(2, Math.round((qrSettings?.frameWidth || 4) * scale));
  const radius = Math.max(6, Math.round((qrSettings?.frameBorderRadius || 12) * scale));
  const inset = Math.max(6, Math.round(12 * scale));
  const frame = framed ? 2 * (padding + width) : 0;
  return {
    settings: framed
      ? { ...qrSettings, framePadding: padding, frameWidth: width, frameBorderRadius: radius }
      : qrSettings,
    qrSize: Math.max(56, cell - inset - frame),
  };
}

/** Three equal square tiles in one row: Book Appointment · QR · Create Card-Ex. */
export default function QRActionRow({
  url, qrSettings, accent, showDownload, downloadFileName, onBookAppointment, onCreateCard,
}: QRActionRowProps) {
  const cellRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(0);

  useEffect(() => {
    const el = cellRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCell(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { settings: tileQrSettings, qrSize } = useMemo(
    () => scaleQrFrame(cell, qrSettings),
    [cell, qrSettings],
  );

  const tileStyle: React.CSSProperties = {
    border: `1px solid ${accent}66`,
    background: "linear-gradient(160deg, hsl(var(--card) / 0.9), hsl(var(--background) / 0.95))",
    boxShadow: `inset 0 1px 0 ${accent}26, 0 8px 24px -10px ${accent}55`,
  };

  const ActionTile = ({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) => (
    <div className="flex flex-col items-center gap-2 min-w-0">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="glass-shimmer relative aspect-square w-full rounded-2xl flex items-center justify-center overflow-hidden transition-transform duration-200 hover:brightness-110 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={tileStyle}
      >
        {children}
      </button>
      <span className="text-[11px] sm:text-xs font-semibold text-center leading-tight tracking-wide uppercase text-foreground/85">
        {label}
      </span>
    </div>
  );

  const cols = 1 + (onBookAppointment ? 1 : 0) + (onCreateCard ? 1 : 0);
  // Keep tiles the size of a 3-column cell even when one action is missing.
  return (
    <div className="px-4 sm:px-6 py-2">
      <div
        className="grid gap-2 sm:gap-3 items-start mx-auto"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          maxWidth: cols === 3 ? undefined : `${(cols * 100) / 3}%`,
        }}
      >
        {onBookAppointment && (
          <ActionTile onClick={onBookAppointment} label="Book Appointment">
            <img
              src={calendarArt}
              alt=""
              width={512}
              height={471}
              loading="lazy"
              draggable={false}
              className="w-[72%] h-[72%] object-contain"
              style={{ filter: `drop-shadow(0 6px 10px hsl(var(--background) / 0.7)) drop-shadow(0 0 10px ${accent}40)` }}
            />
          </ActionTile>
        )}

        <div ref={cellRef} className="flex flex-col items-center gap-2 min-w-0">
          <div className="aspect-square w-full rounded-2xl flex items-center justify-center overflow-hidden" style={tileStyle}>
            {cell > 0 && (
              <QRCodeDisplay url={url} settings={tileQrSettings} size={qrSize} showDownload={false} />
            )}
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-center leading-tight tracking-wide uppercase text-foreground/85">
            Scan Card
          </span>
        </div>

        {onCreateCard && (
          <ActionTile onClick={onCreateCard} label="Create Your Own Card-Ex">
            <img
              src={cardExLogo}
              alt=""
              width={477}
              height={512}
              loading="lazy"
              draggable={false}
              className="w-[74%] h-[74%] object-contain"
              style={{ filter: `drop-shadow(0 0 10px ${accent}55)` }}
            />
          </ActionTile>
        )}
      </div>

      {showDownload && (
        <div className="mt-3 flex justify-center [&>div>*:first-child]:hidden">
          <QRCodeDisplay url={url} settings={qrSettings} size={512} showDownload downloadFileName={downloadFileName} />
        </div>
      )}
    </div>
  );
}

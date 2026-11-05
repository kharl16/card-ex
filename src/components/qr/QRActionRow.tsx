import React, { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import QRCodeDisplay from "@/components/qr/QRCodeDisplay";
import cardExLogo from "@/assets/Card-Ex-Logo.png";

interface QRActionRowProps {
  url: string;
  qrSettings?: any;
  accent: string;
  showDownload?: boolean;
  downloadFileName?: string;
  onBookAppointment?: () => void;
  onCreateCard?: () => void;
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

  const frame = qrSettings?.frameEnabled
    ? 2 * ((qrSettings?.framePadding ?? 16) + (qrSettings?.frameWidth ?? 2))
    : 0;
  const qrSize = Math.max(64, cell - 12 - frame);

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
        className="glass-shimmer relative aspect-square w-full rounded-2xl flex items-center justify-center transition-transform duration-200 hover:brightness-110 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
    <div className="px-6 py-2">
      <div
        className="grid gap-3 items-start mx-auto"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          maxWidth: cols === 3 ? undefined : `${(cols * 100) / 3}%`,
        }}
      >
        {onBookAppointment && (
          <ActionTile onClick={onBookAppointment} label="Book Appointment">
            <CalendarDays className="w-1/2 h-1/2" strokeWidth={1.4} style={{ color: accent, filter: `drop-shadow(0 0 8px ${accent}66)` }} />
          </ActionTile>
        )}

        <div ref={cellRef} className="flex flex-col items-center gap-2 min-w-0">
          <div className="aspect-square w-full rounded-2xl flex items-center justify-center overflow-hidden" style={tileStyle}>
            {cell > 0 && (
              <QRCodeDisplay url={url} settings={qrSettings} size={qrSize} showDownload={false} />
            )}
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-center leading-tight tracking-wide uppercase text-foreground/85">
            Scan Card
          </span>
        </div>

        {onCreateCard && (
          <ActionTile onClick={onCreateCard} label="Create Your Own Card-Ex">
            <img src={cardExLogo} alt="" className="w-3/5 h-3/5 object-contain" style={{ filter: `drop-shadow(0 0 8px ${accent}55)` }} />
          </ActionTile>
        )}
      </div>

      {showDownload && (
        <div className="mt-3 flex justify-center">
          <QRCodeDisplay url={url} settings={qrSettings} size={1} showDownload downloadFileName={downloadFileName} className="hidden" />
        </div>
      )}
    </div>
  );
}

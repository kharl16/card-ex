interface RiderHeaderProps {
  coverUrl?: string | null;
  avatarUrl?: string | null;
  companyLogoUrl?: string | null;
  name?: string;
  title?: string;
  primaryColor?: string;
}

// Helper: adjust a hex color lighter/darker
function adjustHexColor(hex: string, amount: number): string {
  if (!hex || !hex.startsWith("#") || (hex.length !== 7 && hex.length !== 4)) {
    return hex;
  }

  let normalized = hex;
  if (hex.length === 4) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    normalized = `#${r}${r}${g}${g}${b}${b}`;
  }

  const r = Math.min(255, Math.max(0, parseInt(normalized.slice(1, 3), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(normalized.slice(3, 5), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(normalized.slice(5, 7), 16) + amount));

  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default function RiderHeader({ coverUrl, avatarUrl, companyLogoUrl, name, title, primaryColor = "#D4AF37" }: RiderHeaderProps) {
  const basePrimary = primaryColor;
  const lighterPrimary = adjustHexColor(basePrimary, 30);
  const darkerPrimary = adjustHexColor(basePrimary, -40);

  return (
    <div className="relative -mx-6 -mt-6 mb-4">
      {/* Cover image */}
      <div 
        className="h-40 sm:h-48 md:h-56 w-full overflow-hidden"
        style={{
          backgroundImage: !coverUrl && primaryColor
            ? `linear-gradient(to bottom right, ${primaryColor}33, ${primaryColor}0D)`
            : undefined,
          backgroundColor: !coverUrl && !primaryColor ? "hsl(var(--primary) / 0.2)" : undefined,
        }}
      >
        {coverUrl && (
          <>
            <img 
              src={coverUrl} 
              alt="Cover" 
              className="h-[120%] w-full object-cover transition-all duration-300 hover:scale-105"
              style={{
                transform: 'translateY(-10%)',
                animation: 'parallax-float 8s ease-in-out infinite alternate',
              }}
            />
            {/* Subtle bottom gradient overlay for contrast */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent" />
          </>
        )}
      </div>

      {/* Avatar + company logo group - positioned to overlap cover bottom */}
      <div className="absolute left-4 sm:left-6 bottom-0 translate-y-1/2 flex items-end gap-3 sm:gap-4 z-50">
        {/* Avatar container with gradient ring */}
        <div
          className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 group/avatar flex-shrink-0"
          style={{
            background: `conic-gradient(from 180deg at 50% 50%, ${lighterPrimary} 0deg, ${basePrimary} 120deg, ${darkerPrimary} 240deg, ${lighterPrimary} 360deg)`,
            boxShadow: "0 18px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,0,0,0.5)",
          }}
        >
          {/* Hover glow effect */}
          <div 
            className="absolute inset-0 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 blur-xl -z-10"
            style={{
              background: `radial-gradient(circle, ${basePrimary}80 0%, transparent 70%)`,
              transform: 'scale(1.5)',
            }}
          />
          {/* Inner dark plate */}
          <div className="absolute inset-[3px] rounded-full bg-black flex items-center justify-center">
            {/* Inner black edge + photo */}
            <div className="h-[92%] w-[92%] rounded-full overflow-hidden border border-black/80 bg-black flex items-center justify-center">
              {avatarUrl && (
                <img src={avatarUrl} alt={name || "Rider"} className="h-full w-full object-contain" />
              )}
            </div>
          </div>
        </div>

        {/* Company logo (optional) */}
        {companyLogoUrl && (
          <div className="h-14 w-24 sm:h-16 sm:w-28 rounded-lg bg-black/90 p-2 shadow-2xl ring-2 ring-black/20 hover:scale-105 transition-transform duration-300 flex items-center justify-center flex-shrink-0">
            <img src={companyLogoUrl} alt="Company logo" className="max-h-full max-w-full object-contain" />
          </div>
        )}
      </div>

      {/* Spacer to avoid overlap with content below - accounts for avatar overlap */}
      <div className="h-12 sm:h-14" />

      {/* Name/title positioned below avatar area */}
      {(name || title) && (
        <div className="px-6 pt-2 pb-2">
          {name && <h1 className="text-xl sm:text-2xl font-bold leading-tight transition-colors duration-500">{name}</h1>}
          {title && <p className="text-sm sm:text-base opacity-80 mt-0.5 transition-colors duration-500">{title}</p>}
        </div>
      )}
    </div>
  );
}

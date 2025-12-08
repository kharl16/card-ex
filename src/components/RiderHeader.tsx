import React from "react";

interface RiderHeaderProps {
  coverUrl?: string | null;
  avatarUrl?: string | null;
  companyLogoUrl?: string | null;
  name?: string;
  title?: string;
  primaryColor?: string;
  avatarDisplayMode?: "contain" | "cover";
  logoDisplayMode?: "contain" | "cover";
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

export default function RiderHeader({
  coverUrl,
  avatarUrl,
  companyLogoUrl,
  name,
  title,
  primaryColor = "#D4AF37",
  avatarDisplayMode = "contain",
  logoDisplayMode = "contain",
}: RiderHeaderProps) {
  const basePrimary = primaryColor;
  const lighterPrimary = adjustHexColor(basePrimary, 30);
  const darkerPrimary = adjustHexColor(basePrimary, -40);

  return (
    // Higher z-index so header (and avatar/logo) sit above other content
    <div className="relative -mx-6 -mt-2 sm:-mt-3 mb-4 overflow-visible z-30">
      {/* Cover image is now the positioning parent for avatar/logo */}
      <div
        className="relative h-48 sm:h-56 w-full overflow-hidden"
        style={{
          backgroundImage:
            !coverUrl && primaryColor
              ? `linear-gradient(to bottom right, ${primaryColor}33, ${primaryColor}0D)`
              : undefined,
          backgroundColor: !coverUrl && !primaryColor ? "hsl(var(--primary) / 0.2)" : undefined,
        }}
      >
        {coverUrl && (
          <img
            src={coverUrl}
            alt="Cover"
            className="h-full w-full object-cover object-center"
          />
        )}

        {/* Gradient overlay for better contrast */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 via-black/30 to-transparent pointer-events-none" />

        {/* Avatar & Logo row – vertical center touching base of cover, no horizontal change */}
        <div className="absolute inset-x-0 bottom-0 translate-y-1/2 flex items-end justify-between px-8 sm:px-10 z-40 pointer-events-none">
          {/* Avatar */}
          <div
            className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full shadow-lg transition-all duration-300 hover:scale-105 group/avatar pointer-events-auto"
            style={{
              background: `conic-gradient(from 180deg at 50% 50%, ${lighterPrimary} 0deg, ${basePrimary} 120deg, ${darkerPrimary} 240deg, ${lighterPrimary} 360deg)`,
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            }}
          >
            <div
              className="absolute inset-0 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 blur-xl -z-10"
              style={{
                background: `radial-gradient(circle, ${basePrimary}80 0%, transparent 70%)`,
                transform: "scale(1.5)",
              }}
            />
            <div className="absolute inset-[3px] rounded-full bg-black flex items-center justify-center">
              <div className="h-[92%] w-[92%] rounded-full overflow-hidden bg-black flex items-center justify-center">
                {avatarUrl && (
                  <img
                    src={avatarUrl}
                    alt={name || "Profile"}
                    className={`h-full w-full ${
                      avatarDisplayMode === "contain" ? "object-contain" : "object-cover"
                    }`}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Company logo – square */}
          {companyLogoUrl && (
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-black/90 border border-white/10 overflow-hidden shadow-lg flex items-center justify-center p-2 hover:scale-105 transition-transform duration-300 pointer-events-auto">
              <img
                src={companyLogoUrl}
                alt="Company logo"
                className={`h-full w-full ${
                  logoDisplayMode === "contain" ? "object-contain" : "object-cover"
                }`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Spacer so content doesn't overlap avatar/logo */}
      <div className="h-20 sm:h-24" />

      {/* Name/title positioned below avatar area */}
      {(name || title) && (
        <div className="pl-8 sm:pl-10 pr-6 pt-2 pb-2">
          <div className="flex flex-col space-y-1 leading-relaxed">
            {name && <h1 className="text-xl sm:text-2xl font-bold">{name}</h1>}
            {title && <p className="text-sm sm:text-base text-muted-foreground">{title}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

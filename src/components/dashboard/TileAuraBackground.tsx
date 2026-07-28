interface TileAuraBackgroundProps {
  /** HSL color values, e.g. "150 80% 45%", used with `hsl(var(--aura-color) / ...)` */
  color: string;
}

export function TileAuraBackground({ color }: TileAuraBackgroundProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ "--aura-color": color } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className="tile-aura-blob tile-aura-a" />
      <div className="tile-aura-blob tile-aura-b" />
      <div className="tile-aura-blob tile-aura-c" />
    </div>
  );
}

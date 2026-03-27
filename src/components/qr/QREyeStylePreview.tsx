interface QREyeStylePreviewProps {
  eyeStyle: "square" | "extra-rounded" | "dot";
  isSelected: boolean;
  onClick: () => void;
  label: string;
}

export function QREyeStylePreview({ eyeStyle, isSelected, onClick, label }: QREyeStylePreviewProps) {
  const renderEyeStyle = () => {
    const baseClass = "w-full h-full";

    switch (eyeStyle) {
      case "square":
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            <rect x="2" y="2" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="4" />
            <rect x="12" y="12" width="16" height="16" fill="currentColor" />
          </svg>
        );
      case "extra-rounded":
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            <rect x="2" y="2" width="36" height="36" rx="10" fill="none" stroke="currentColor" strokeWidth="4" />
            <rect x="12" y="12" width="16" height="16" rx="6" fill="currentColor" />
          </svg>
        );
      case "dot":
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="4" />
            <circle cx="20" cy="20" r="8" fill="currentColor" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all duration-200 hover:border-primary/50 ${
        isSelected ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/50"
      }`}
    >
      <div className="w-10 h-10 text-foreground mb-1">{renderEyeStyle()}</div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

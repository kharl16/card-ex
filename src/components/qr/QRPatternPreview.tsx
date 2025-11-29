interface QRPatternPreviewProps {
  pattern: string;
  isSelected: boolean;
  onClick: () => void;
  label: string;
}

export function QRPatternPreview({ pattern, isSelected, onClick, label }: QRPatternPreviewProps) {
  const renderPattern = () => {
    const baseClass = "w-full h-full";
    
    switch (pattern) {
      case 'squares':
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            <rect x="2" y="2" width="8" height="8" fill="currentColor" />
            <rect x="12" y="2" width="8" height="8" fill="currentColor" />
            <rect x="22" y="2" width="8" height="8" fill="currentColor" />
            <rect x="2" y="12" width="8" height="8" fill="currentColor" />
            <rect x="22" y="12" width="8" height="8" fill="currentColor" />
            <rect x="32" y="12" width="6" height="8" fill="currentColor" />
            <rect x="2" y="22" width="8" height="8" fill="currentColor" />
            <rect x="12" y="22" width="8" height="8" fill="currentColor" />
            <rect x="32" y="22" width="6" height="8" fill="currentColor" />
            <rect x="12" y="32" width="8" height="6" fill="currentColor" />
            <rect x="22" y="32" width="8" height="6" fill="currentColor" />
          </svg>
        );
      case 'classy':
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            <path d="M2 6 L6 2 L10 2 L10 6 L10 10 L6 10 L2 10 Z" fill="currentColor" />
            <path d="M12 6 L16 2 L20 2 L20 6 L20 10 L16 10 L12 10 Z" fill="currentColor" />
            <path d="M22 6 L26 2 L30 2 L30 6 L30 10 L26 10 L22 10 Z" fill="currentColor" />
            <path d="M2 16 L6 12 L10 12 L10 16 L10 20 L6 20 L2 20 Z" fill="currentColor" />
            <path d="M22 16 L26 12 L30 12 L30 16 L30 20 L26 20 L22 20 Z" fill="currentColor" />
            <path d="M2 26 L6 22 L10 22 L10 26 L10 30 L6 30 L2 30 Z" fill="currentColor" />
            <path d="M12 26 L16 22 L20 22 L20 26 L20 30 L16 30 L12 30 Z" fill="currentColor" />
            <path d="M22 36 L26 32 L30 32 L30 36 L30 40 L26 40 L22 40 Z" fill="currentColor" />
          </svg>
        );
      case 'rounded':
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            <rect x="2" y="2" width="8" height="8" rx="2" fill="currentColor" />
            <rect x="12" y="2" width="8" height="8" rx="2" fill="currentColor" />
            <rect x="22" y="2" width="8" height="8" rx="2" fill="currentColor" />
            <rect x="2" y="12" width="8" height="8" rx="2" fill="currentColor" />
            <rect x="22" y="12" width="8" height="8" rx="2" fill="currentColor" />
            <rect x="32" y="12" width="6" height="8" rx="2" fill="currentColor" />
            <rect x="2" y="22" width="8" height="8" rx="2" fill="currentColor" />
            <rect x="12" y="22" width="8" height="8" rx="2" fill="currentColor" />
            <rect x="32" y="22" width="6" height="8" rx="2" fill="currentColor" />
            <rect x="12" y="32" width="8" height="6" rx="2" fill="currentColor" />
            <rect x="22" y="32" width="8" height="6" rx="2" fill="currentColor" />
          </svg>
        );
      case 'classy-rounded':
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            <rect x="2" y="2" width="8" height="8" rx="4" ry="1" fill="currentColor" />
            <rect x="12" y="2" width="8" height="8" rx="4" ry="1" fill="currentColor" />
            <rect x="22" y="2" width="8" height="8" rx="4" ry="1" fill="currentColor" />
            <rect x="2" y="12" width="8" height="8" rx="4" ry="1" fill="currentColor" />
            <rect x="22" y="12" width="8" height="8" rx="4" ry="1" fill="currentColor" />
            <rect x="2" y="22" width="8" height="8" rx="4" ry="1" fill="currentColor" />
            <rect x="12" y="22" width="8" height="8" rx="4" ry="1" fill="currentColor" />
            <rect x="22" y="32" width="8" height="6" rx="4" ry="1" fill="currentColor" />
          </svg>
        );
      case 'extra-rounded':
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            <rect x="2" y="2" width="8" height="8" rx="4" fill="currentColor" />
            <rect x="12" y="2" width="8" height="8" rx="4" fill="currentColor" />
            <rect x="22" y="2" width="8" height="8" rx="4" fill="currentColor" />
            <rect x="2" y="12" width="8" height="8" rx="4" fill="currentColor" />
            <rect x="22" y="12" width="8" height="8" rx="4" fill="currentColor" />
            <rect x="32" y="12" width="6" height="8" rx="3" fill="currentColor" />
            <rect x="2" y="22" width="8" height="8" rx="4" fill="currentColor" />
            <rect x="12" y="22" width="8" height="8" rx="4" fill="currentColor" />
            <rect x="32" y="22" width="6" height="8" rx="3" fill="currentColor" />
            <rect x="12" y="32" width="8" height="6" rx="3" fill="currentColor" />
            <rect x="22" y="32" width="8" height="6" rx="3" fill="currentColor" />
          </svg>
        );
      case 'dots':
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            <circle cx="6" cy="6" r="4" fill="currentColor" />
            <circle cx="16" cy="6" r="4" fill="currentColor" />
            <circle cx="26" cy="6" r="4" fill="currentColor" />
            <circle cx="6" cy="16" r="4" fill="currentColor" />
            <circle cx="26" cy="16" r="4" fill="currentColor" />
            <circle cx="36" cy="16" r="3" fill="currentColor" />
            <circle cx="6" cy="26" r="4" fill="currentColor" />
            <circle cx="16" cy="26" r="4" fill="currentColor" />
            <circle cx="36" cy="26" r="3" fill="currentColor" />
            <circle cx="16" cy="36" r="3" fill="currentColor" />
            <circle cx="26" cy="36" r="3" fill="currentColor" />
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
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-background hover:bg-muted/50'
      }`}
    >
      <div className="w-10 h-10 text-foreground mb-1">
        {renderPattern()}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

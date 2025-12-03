interface QREyeStylePreviewProps {
  eyeStyle: string;
  isSelected: boolean;
  onClick: () => void;
  label: string;
}

export function QREyeStylePreview({ eyeStyle, isSelected, onClick, label }: QREyeStylePreviewProps) {
  const renderEyeStyle = () => {
    const baseClass = "w-full h-full";
    
    switch (eyeStyle) {
      case 'square':
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            {/* Outer square */}
            <rect x="2" y="2" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="4" />
            {/* Inner square */}
            <rect x="12" y="12" width="16" height="16" fill="currentColor" />
          </svg>
        );
      case 'extra-rounded':
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            {/* Outer rounded square */}
            <rect x="2" y="2" width="36" height="36" rx="10" fill="none" stroke="currentColor" strokeWidth="4" />
            {/* Inner rounded square */}
            <rect x="12" y="12" width="16" height="16" rx="6" fill="currentColor" />
          </svg>
        );
      case 'leaf':
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            {/* Outer leaf shape - organic leaf with pointed tip and rounded base */}
            <path 
              d="M20 2 C8 8 4 18 4 26 C4 34 10 38 20 38 C30 38 36 34 36 26 C36 18 32 8 20 2 Z" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3"
            />
            {/* Inner leaf */}
            <path 
              d="M20 10 C14 14 12 19 12 24 C12 29 15 31 20 31 C25 31 28 29 28 24 C28 19 26 14 20 10 Z" 
              fill="currentColor"
            />
            {/* Leaf vein */}
            <path 
              d="M20 6 L20 34" 
              stroke="currentColor" 
              strokeWidth="1.5"
              strokeOpacity="0.4"
            />
          </svg>
        );
      case 'diamond':
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            {/* Outer diamond */}
            <path 
              d="M20 2 L38 20 L20 38 L2 20 Z" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3"
            />
            {/* Inner diamond */}
            <path 
              d="M20 12 L28 20 L20 28 L12 20 Z" 
              fill="currentColor"
            />
          </svg>
        );
      case 'dot':
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            {/* Outer circle */}
            <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="4" />
            {/* Inner circle */}
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
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-background hover:bg-muted/50'
      }`}
    >
      <div className="w-10 h-10 text-foreground mb-1">
        {renderEyeStyle()}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

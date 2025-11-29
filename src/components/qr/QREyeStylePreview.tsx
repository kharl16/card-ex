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
            {/* Outer leaf shape */}
            <path 
              d="M4 4 L36 4 Q38 4 38 6 L38 34 Q38 38 34 38 L6 38 Q4 38 4 36 L4 6 Q4 4 4 4 Z" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Inner leaf */}
            <path 
              d="M14 12 L28 12 Q30 12 30 14 L30 26 Q30 30 26 30 L14 30 Q12 30 12 28 L12 14 Q12 12 14 12 Z" 
              fill="currentColor"
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

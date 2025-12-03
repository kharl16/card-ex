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
      case 'dot':
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            {/* Outer circle */}
            <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="4" />
            {/* Inner circle */}
            <circle cx="20" cy="20" r="8" fill="currentColor" />
          </svg>
        );
      case 'leaf':
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            {/* Outer leaf shape - organic teardrop pointing up */}
            <path 
              d="M20 3 C10 10 6 18 6 26 C6 34 12 37 20 37 C28 37 34 34 34 26 C34 18 30 10 20 3 Z" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3"
            />
            {/* Inner leaf */}
            <path 
              d="M20 12 C15 16 13 20 13 25 C13 29 16 31 20 31 C24 31 27 29 27 25 C27 20 25 16 20 12 Z" 
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
      case 'star':
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            {/* Outer star */}
            <path 
              d="M20 2 L24 14 L38 14 L27 22 L31 36 L20 28 L9 36 L13 22 L2 14 L16 14 Z" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            />
            {/* Inner star */}
            <path 
              d="M20 10 L22 16 L28 16 L23 20 L25 26 L20 22 L15 26 L17 20 L12 16 L18 16 Z" 
              fill="currentColor"
            />
          </svg>
        );
      case 'heart':
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            {/* Outer heart */}
            <path 
              d="M20 36 C12 28 4 22 4 14 C4 8 8 4 14 4 C17 4 19 5 20 8 C21 5 23 4 26 4 C32 4 36 8 36 14 C36 22 28 28 20 36 Z" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5"
            />
            {/* Inner heart */}
            <path 
              d="M20 28 C16 24 12 21 12 17 C12 14 14 12 17 12 C18 12 19 12.5 20 14 C21 12.5 22 12 23 12 C26 12 28 14 28 17 C28 21 24 24 20 28 Z" 
              fill="currentColor"
            />
          </svg>
        );
      case 'shield':
        return (
          <svg viewBox="0 0 40 40" className={baseClass}>
            {/* Outer shield */}
            <path 
              d="M20 2 L36 8 L36 22 C36 30 28 36 20 38 C12 36 4 30 4 22 L4 8 L20 2 Z" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5"
            />
            {/* Inner shield */}
            <path 
              d="M20 10 L28 13 L28 20 C28 25 24 28 20 30 C16 28 12 25 12 20 L12 13 L20 10 Z" 
              fill="currentColor"
            />
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

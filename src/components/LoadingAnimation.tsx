import CardExLogo from "@/assets/Card-Ex-Logo.png";

const LoadingAnimation = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-24 w-24 animate-pulse">
          <img 
            src={CardExLogo} 
            alt="Loading..." 
            className="h-full w-full object-contain animate-scale-in" 
          />
        </div>
        <div className="flex gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
};

export default LoadingAnimation;

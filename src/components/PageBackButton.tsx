import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageBackButtonProps {
  /** Where to go when there is no earlier in-app page (e.g. opened from a link). */
  to?: string;
  label?: string;
  /** Pin to the top-left corner for centered, header-less pages. */
  floating?: boolean;
  className?: string;
}

/** Returns true when the browser has an earlier page from this app to go back to. */
export function hasInAppHistory(): boolean {
  if (typeof window === "undefined") return false;
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === "number" && idx > 0;
}

/** Standard 44px back arrow: returns to the previous page, or to `to` when opened directly. */
export function PageBackButton({ to = "/dashboard", label = "Go back", floating = false, className }: PageBackButtonProps) {
  const navigate = useNavigate();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={label}
      title={label}
      data-page-back
      onClick={() => (hasInAppHistory() ? navigate(-1) : navigate(to, { replace: true }))}
      className={cn(
        "h-11 w-11 shrink-0 rounded-full border-primary/40 bg-background/70 backdrop-blur",
        floating && "fixed left-3 top-3 z-40",
        className,
      )}
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
}

export default PageBackButton;

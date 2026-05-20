import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, type LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  count?: number;
}

export function SectionHeader({ icon: Icon, title, subtitle, viewAllHref, count }: Props) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-bold leading-tight flex items-center gap-2">
            <span className="truncate">{title}</span>
            {typeof count === "number" && (
              <span className="text-sm font-normal text-muted-foreground">({count})</span>
            )}
          </h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {viewAllHref && (
        <Link to={viewAllHref} className="flex-shrink-0">
          <Button variant="ghost" size="sm" className="gap-1 text-sm font-medium">
            View all <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      )}
    </div>
  );
}

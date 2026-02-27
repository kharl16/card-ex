import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleCardSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  /** Hide the section entirely when there's no content */
  hide?: boolean;
}

export default function CollapsibleCardSection({
  title,
  children,
  defaultOpen = false,
  className,
  hide = false,
}: CollapsibleCardSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (hide) return null;

  return (
    <div className={cn("px-4", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-300",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GlobalOrderControls({ index, total, disabled, onMove }: {
  index: number;
  total: number;
  disabled?: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  return <>
    <Button size="sm" variant="outline" className="h-11 min-w-11" disabled={disabled || index === 0}
      aria-label="Move earlier" title="Move earlier" onClick={() => onMove(-1)}>
      <ArrowUp className="h-4 w-4" />
    </Button>
    <span className="inline-flex h-11 items-center text-sm font-semibold tabular-nums text-muted-foreground" aria-label={`Position ${index + 1} of ${total}`}>
      {index + 1}/{total}
    </span>
    <Button size="sm" variant="outline" className="h-11 min-w-11" disabled={disabled || index === total - 1}
      aria-label="Move later" title="Move later" onClick={() => onMove(1)}>
      <ArrowDown className="h-4 w-4" />
    </Button>
  </>;
}
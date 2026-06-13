import { Building2 } from "lucide-react";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Compact "Editing content for: <Company>" switcher chip.
 * Drop into any super-admin manager page. Reads/writes the active company
 * id via ActiveCompanyContext (localStorage-backed).
 */
export function CompanySwitcher({ className }: { className?: string }) {
  const { companies, activeCompanyId, setActiveCompanyId, loading } = useActiveCompany();

  if (loading || companies.length === 0) return null;

  return (
    <div
      className={
        "inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/60 backdrop-blur px-3 py-1.5 shadow-sm " +
        (className ?? "")
      }
    >
      <Building2 className="h-4 w-4 text-primary" />
      <span className="text-xs text-muted-foreground hidden sm:inline">Company:</span>
      <Select value={activeCompanyId ?? undefined} onValueChange={setActiveCompanyId}>
        <SelectTrigger className="h-7 border-0 bg-transparent px-1 text-sm font-semibold focus:ring-0 focus:ring-offset-0">
          <SelectValue placeholder="Select company" />
        </SelectTrigger>
        <SelectContent>
          {companies.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
              {c.is_default ? " (default)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

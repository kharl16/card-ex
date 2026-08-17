import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, CheckCircle2, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBibleWisdom, analyzeCoverage, SLOT_LABELS, type WisdomSlot } from "@/hooks/useBibleWisdom";

export default function AdminBibleWisdom() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { entries, referenceDate, loading, reload } = useBibleWisdom();
  const [query, setQuery] = useState("");
  const [refDate, setRefDate] = useState(referenceDate);
  const [saving, setSaving] = useState(false);

  const report = useMemo(() => analyzeCoverage(entries), [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries.slice(0, 100);
    return entries
      .filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.reference.toLowerCase().includes(q) ||
          e.theme.toLowerCase().includes(q) ||
          String(e.day_number) === q
      )
      .slice(0, 100);
  }, [entries, query]);

  const saveReferenceDate = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "bible_wisdom_reference_date", value: refDate });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved", description: "Reference date updated." });
    void reload();
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-16">
      <header className="sticky top-0 z-40 border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center gap-2 px-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={() => navigate("/admin")}
            aria-label="Back to admin"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="truncate text-lg font-bold tracking-tight">Bible Wisdom Library</h1>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-10 gap-2"
            onClick={() => void reload()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </header>

      <main className="container mx-auto space-y-5 px-4 py-5">
        {/* Coverage */}
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/40 bg-card/40 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Entries</p>
            <p className="text-2xl font-bold">
              {report.total}
              <span className="text-sm font-normal text-muted-foreground"> / {report.expected}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-card/40 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Days covered</p>
            <p className="text-2xl font-bold">
              {report.completedDays}
              <span className="text-sm font-normal text-muted-foreground"> / 365</span>
            </p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-card/40 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Duplicate slots</p>
            <p className="text-2xl font-bold">{report.duplicates.length}</p>
          </div>
        </section>

        {/* Reference date */}
        <section className="rounded-2xl border border-border/40 bg-card/40 p-4">
          <h2 className="text-sm font-semibold">Schedule reference date</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Day 1 of the 365-day loop. Today resolves to day{" "}
            <strong>{new Date().toDateString()}</strong> based on this date.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Input
              type="date"
              className="h-11 w-48"
              value={refDate}
              onChange={(e) => setRefDate(e.target.value)}
            />
            <Button className="h-11" onClick={() => void saveReferenceDate()} disabled={saving}>
              Save
            </Button>
          </div>
        </section>

        {/* Validation */}
        <section className="rounded-2xl border border-border/40 bg-card/40 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {report.missing.length === 0 && report.duplicates.length === 0 ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            )}
            Validation
          </h2>
          <div className="mt-2 space-y-2 text-sm">
            <p className="text-muted-foreground">
              Missing entries: <strong className="text-foreground">{report.missing.length}</strong>
            </p>
            {report.missing.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {report.missing.slice(0, 24).map((m) => (
                  <Badge key={`${m.day}-${m.slot}`} variant="outline" className="text-[11px]">
                    Day {m.day} · {SLOT_LABELS[m.slot as WisdomSlot]}
                  </Badge>
                ))}
                {report.missing.length > 24 && (
                  <span className="text-xs text-muted-foreground">
                    +{report.missing.length - 24} more
                  </span>
                )}
              </div>
            )}
            {report.duplicates.length > 0 && (
              <p className="text-amber-400">
                Duplicate day/slot combinations: {report.duplicates.map((d) => d.key).join(", ")}
              </p>
            )}
            {report.repeatedReferences.length > 0 && (
              <p className="text-muted-foreground">
                Repeated scripture references:{" "}
                {report.repeatedReferences
                  .slice(0, 8)
                  .map(([ref, n]) => `${ref} (${n})`)
                  .join(", ")}
              </p>
            )}
          </div>
        </section>

        {/* Browse */}
        <section className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 pl-9"
              placeholder="Search by day number, title, reference, or theme…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {loading && <p className="text-sm text-muted-foreground">Loading library…</p>}
          <div className="space-y-2">
            {filtered.map((e) => (
              <div
                key={e.id}
                className="rounded-2xl border border-border/40 bg-card/40 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[11px]">
                    Day {e.day_number}
                  </Badge>
                  <Badge variant="secondary" className="text-[11px]">
                    {SLOT_LABELS[e.time_slot as WisdomSlot] ?? e.time_slot}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{e.reference}</span>
                </div>
                <p className="mt-1 font-semibold">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.business_principle}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

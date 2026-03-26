import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Search, Plus, List, Columns3, CalendarClock, Sparkles,
  BarChart3, Loader2
} from "lucide-react";
import { useProspects, PIPELINE_STATUSES } from "@/hooks/useProspects";
import ProspectDashboard from "@/components/prospects/ProspectDashboard";
import ProspectCard from "@/components/prospects/ProspectCard";
import ProspectDetail from "@/components/prospects/ProspectDetail";
import ProspectPipeline from "@/components/prospects/ProspectPipeline";
import FollowUpCenter from "@/components/prospects/FollowUpCenter";
import ProspectAnalytics from "@/components/prospects/ProspectAnalytics";
import AddProspectDialog from "@/components/prospects/AddProspectDialog";
import SignOutButton from "@/components/auth/SignOutButton";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
import type { Prospect } from "@/hooks/useProspects";

export default function ProspectListPage() {
  const navigate = useNavigate();
  const {
    prospects, loading, stats, addProspect, updateProspect, deleteProspect, archiveProspect
  } = useProspects();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [view, setView] = useState<"list" | "pipeline" | "followups" | "analytics">("list");

  const filteredProspects = useMemo(() => {
    let list = [...prospects];
    if (statusFilter !== "all") {
      list = list.filter((p) => p.pipeline_status === statusFilter);
    }
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        p.full_name.toLowerCase().includes(q) ||
        (p.phone || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.company || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [prospects, statusFilter, searchTerm]);

  const hasProspects = prospects.length > 0;

  const handleStatusChange = async (prospectId: string, newStatus: string) => {
    const updates: Partial<Prospect> = { pipeline_status: newStatus };
    if (newStatus === "converted") updates.converted_at = new Date().toISOString();
    if (newStatus === "contacted") updates.last_contacted_at = new Date().toISOString();
    await updateProspect(prospectId, updates);
  };

  // If a prospect is selected, show detail view
  if (selectedProspect) {
    // Get latest version from state
    const latest = prospects.find((p) => p.id === selectedProspect.id) || selectedProspect;
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-4 max-w-lg">
          <ProspectDetail
            prospect={latest}
            onBack={() => setSelectedProspect(null)}
            onUpdate={async (id, u) => {
              const ok = await updateProspect(id, u);
              return ok;
            }}
            onDelete={async (id) => {
              const ok = await deleteProspect(id);
              if (ok) setSelectedProspect(null);
              return ok;
            }}
            onArchive={async (id) => {
              const ok = await archiveProspect(id);
              if (ok) setSelectedProspect(null);
              return ok;
            }}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 max-w-lg">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center overflow-hidden">
                <img src={CardExLogo} alt="Card-Ex" className="h-full w-full object-contain" />
              </div>
              <span className="text-lg font-bold">Prospect List</span>
            </div>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-lg space-y-4">
        {/* Dashboard Stats */}
        <ProspectDashboard stats={stats} />

        {/* Search + Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-12 text-base"
              placeholder="Search prospects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => setAddOpen(true)} className="h-12 gap-2 shrink-0">
            <Plus className="h-5 w-5" />
            <span>Add</span>
          </Button>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold">
                  {hasProspects ? "Open any prospect to use the AI tools" : "Add a prospect to unlock the AI tools"}
                </p>
                <p className="text-xs text-muted-foreground">
                  AI Summary, Suggested Reply, Next Best Action, and Script Templates appear inside each prospect's detail screen.
                </p>
              </div>
              {!hasProspects && (
                <Button onClick={() => setAddOpen(true)} size="sm" className="shrink-0 gap-2">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* View Toggle */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          {[
            { key: "list", icon: List, label: "List" },
            { key: "pipeline", icon: Columns3, label: "Pipeline" },
            { key: "followups", icon: CalendarClock, label: "Follow-Ups" },
            { key: "analytics", icon: BarChart3, label: "Analytics" },
          ].map((v) => (
            <Button
              key={v.key}
              variant={view === v.key ? "default" : "ghost"}
              size="sm"
              className="flex-1 gap-1.5 h-9 text-xs"
              onClick={() => setView(v.key as any)}
            >
              <v.icon className="h-3.5 w-3.5" />
              {v.label}
            </Button>
          ))}
        </div>

        {/* Views */}
        {view === "list" && (
          <div className="space-y-4">
            {/* Status filter tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                className="shrink-0 h-8 text-xs"
                onClick={() => setStatusFilter("all")}
              >
                All ({prospects.length})
              </Button>
              {PIPELINE_STATUSES.slice(0, 5).map((s) => {
                const count = prospects.filter((p) => p.pipeline_status === s.value).length;
                return (
                  <Button
                    key={s.value}
                    variant={statusFilter === s.value ? "default" : "outline"}
                    size="sm"
                    className="shrink-0 h-8 text-xs gap-1.5"
                    onClick={() => setStatusFilter(s.value)}
                  >
                    <div className={`h-2 w-2 rounded-full ${s.color}`} />
                    {s.label} ({count})
                  </Button>
                );
              })}
            </div>

            {/* Prospect cards */}
            {filteredProspects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm mb-4">
                  {prospects.length === 0 ? "No prospects yet. Add your first one!" : "No matches found."}
                </p>
                {prospects.length === 0 && (
                  <Button onClick={() => setAddOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Prospect
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProspects.map((p) => (
                  <ProspectCard
                    key={p.id}
                    prospect={p}
                    onOpen={setSelectedProspect}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {view === "pipeline" && (
          <ProspectPipeline
            prospects={prospects}
            onOpenProspect={setSelectedProspect}
            onStatusChange={handleStatusChange}
          />
        )}

        {view === "followups" && (
          <FollowUpCenter
            prospects={prospects}
            onOpenProspect={setSelectedProspect}
          />
        )}

        {view === "analytics" && (
          <ProspectAnalytics prospects={prospects} />
        )}
      </main>

      <AddProspectDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={addProspect}
      />
    </div>
  );
}

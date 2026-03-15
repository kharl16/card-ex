import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Users, Search, Plus, Download, Mail, Phone, MessageSquare,
  Calendar, Tag, Loader2, StickyNote, MoreHorizontal, Trash2, Eye
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  notes: string | null;
  status: string;
  card_id: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-500" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-500" },
  { value: "qualified", label: "Qualified", color: "bg-emerald-500" },
  { value: "converted", label: "Converted", color: "bg-primary" },
  { value: "lost", label: "Lost", color: "bg-muted-foreground" },
];

const SOURCE_LABELS: Record<string, string> = {
  appointment: "📅 Appointment",
  contact_form: "📝 Contact Form",
  qr_scan: "📱 QR Scan",
  product_inquiry: "🛒 Product Inquiry",
  manual: "✏️ Manual",
  ai_chat: "🤖 AI Chat",
};

export default function LeadManager() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Detail/edit dialog
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);

  // Add lead dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", notes: "" });
  const [addingSaving, setAddingSaving] = useState(false);

  useEffect(() => {
    if (user?.id) loadLeads();
  }, [user?.id]);

  const loadLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("owner_user_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Failed to load leads");
    } else {
      setLeads((data as Lead[]) || []);
    }
    setLoading(false);
  };

  const filteredLeads = useMemo(() => {
    let list = [...leads];
    if (statusFilter !== "all") list = list.filter((l) => l.status === statusFilter);
    if (sourceFilter !== "all") list = list.filter((l) => l.source === sourceFilter);
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter((l) =>
        l.name.toLowerCase().includes(q) ||
        (l.email || "").toLowerCase().includes(q) ||
        (l.phone || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [leads, statusFilter, sourceFilter, searchTerm]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    converted: leads.filter((l) => l.status === "converted").length,
  }), [leads]);

  const handleUpdateLead = async () => {
    if (!selectedLead) return;
    setSaving(true);
    const { error } = await supabase
      .from("leads")
      .update({ notes: editNotes, status: editStatus })
      .eq("id", selectedLead.id);

    if (error) {
      toast.error("Failed to update lead");
    } else {
      toast.success("Lead updated");
      setLeads((prev) =>
        prev.map((l) => l.id === selectedLead.id ? { ...l, notes: editNotes, status: editStatus } : l)
      );
      setSelectedLead(null);
    }
    setSaving(false);
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete lead");
    } else {
      setLeads((prev) => prev.filter((l) => l.id !== id));
      toast.success("Lead deleted");
    }
  };

  const handleAddLead = async () => {
    if (!newLead.name.trim()) { toast.error("Name is required"); return; }
    setAddingSaving(true);
    const { data, error } = await supabase
      .from("leads")
      .insert({
        owner_user_id: user!.id,
        name: newLead.name.trim(),
        email: newLead.email.trim() || null,
        phone: newLead.phone.trim() || null,
        notes: newLead.notes.trim() || null,
        source: "manual",
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add lead");
    } else {
      setLeads((prev) => [data as Lead, ...prev]);
      setAddDialogOpen(false);
      setNewLead({ name: "", email: "", phone: "", notes: "" });
      toast.success("Lead added");
    }
    setAddingSaving(false);
  };

  const handleExportCSV = () => {
    if (filteredLeads.length === 0) { toast.error("No leads to export"); return; }
    const headers = ["Name", "Email", "Phone", "Source", "Status", "Notes", "Created"];
    const rows = filteredLeads.map((l) => [
      l.name,
      l.email || "",
      l.phone || "",
      l.source,
      l.status,
      (l.notes || "").replace(/"/g, '""'),
      format(new Date(l.created_at), "yyyy-MM-dd HH:mm"),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLeads.length} leads`);
  };

  const openLeadDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setEditNotes(lead.notes || "");
    setEditStatus(lead.status);
  };

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <div className={`h-2 w-2 rounded-full ${opt?.color || "bg-muted"}`} />
        {opt?.label || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Leads", value: stats.total, icon: Users },
          { label: "New", value: stats.new, icon: Plus },
          { label: "Contacted", value: stats.contacted, icon: MessageSquare },
          { label: "Converted", value: stats.converted, icon: Tag },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 py-4 px-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-1 gap-2 items-center w-full sm:w-auto">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
                <Download className="h-4 w-4" /> Export
              </Button>
              <Button size="sm" onClick={() => setAddDialogOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Lead
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads list */}
      {filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">
              {leads.length === 0 ? "No leads yet" : "No leads match your filters"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {leads.length === 0
                ? "Leads are automatically captured from appointments, contact forms, and QR scans."
                : "Try adjusting your search or filters."}
            </p>
            {leads.length === 0 && (
              <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Add Your First Lead
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredLeads.map((lead) => (
            <Card
              key={lead.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openLeadDetail(lead)}
            >
              <CardContent className="flex items-center gap-4 py-4 px-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {lead.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{lead.name}</p>
                    {getStatusBadge(lead.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {lead.email && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" /> {lead.email}
                      </span>
                    )}
                    {lead.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {lead.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {SOURCE_LABELS[lead.source] || lead.source}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {format(new Date(lead.created_at), "MMM d, yyyy")}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openLeadDetail(lead); }}>
                      <Eye className="h-4 w-4 mr-2" /> View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Lead Details
            </DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {selectedLead.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-lg">{selectedLead.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {SOURCE_LABELS[selectedLead.source] || selectedLead.source} · {format(new Date(selectedLead.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>

              {selectedLead.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline">{selectedLead.email}</a>
                </div>
              )}
              {selectedLead.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${selectedLead.phone}`} className="text-primary hover:underline">{selectedLead.phone}</a>
                </div>
              )}

              {selectedLead.metadata && Object.keys(selectedLead.metadata).length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                  {selectedLead.metadata.meeting_purpose && (
                    <p><strong>Purpose:</strong> {selectedLead.metadata.meeting_purpose}</p>
                  )}
                  {selectedLead.metadata.appointment_date && (
                    <p><strong>Appointment:</strong> {selectedLead.metadata.appointment_date} at {selectedLead.metadata.appointment_time}</p>
                  )}
                  {selectedLead.metadata.message && (
                    <p><strong>Message:</strong> {selectedLead.metadata.message}</p>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1.5 block">Status</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-1">
                  <StickyNote className="h-3.5 w-3.5" /> Notes
                </label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add notes about this lead..."
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLead(null)}>Cancel</Button>
            <Button onClick={handleUpdateLead} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lead Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add Lead
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name *</label>
              <Input
                value={newLead.name}
                onChange={(e) => setNewLead((p) => ({ ...p, name: e.target.value }))}
                placeholder="Lead name"
                maxLength={100}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <Input
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phone</label>
              <Input
                type="tel"
                value={newLead.phone}
                onChange={(e) => setNewLead((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+63 XXX XXX XXXX"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes</label>
              <Textarea
                value={newLead.notes}
                onChange={(e) => setNewLead((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Any notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLead} disabled={addingSaving || !newLead.name.trim()} className="gap-2">
              {addingSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

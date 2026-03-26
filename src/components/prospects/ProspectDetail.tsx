import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowLeft, Phone, Mail, MessageSquare, MapPin, Briefcase, Building2,
  Calendar, StickyNote, Clock, Plus, Trash2, Archive, Loader2, Send
} from "lucide-react";
import {
  PIPELINE_STATUSES, INTEREST_LEVELS, SOURCE_TYPES, PRIORITY_LEVELS,
  type Prospect, type ProspectActivity, type ProspectFollowup,
  useProspectActivities, useProspectFollowups
} from "@/hooks/useProspects";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface ProspectDetailProps {
  prospect: Prospect;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onArchive: (id: string) => Promise<boolean>;
}

const ACTIVITY_TYPES = [
  { value: "note", label: "📝 Note" },
  { value: "call", label: "📞 Call" },
  { value: "message", label: "💬 Message" },
  { value: "follow_up", label: "🔄 Follow-Up" },
  { value: "presentation", label: "📊 Presentation" },
  { value: "meeting", label: "🤝 Meeting" },
];

export default function ProspectDetail({ prospect, onBack, onUpdate, onDelete, onArchive }: ProspectDetailProps) {
  const { activities, addActivity } = useProspectActivities(prospect.id);
  const { followups, addFollowup, updateFollowup } = useProspectFollowups(prospect.id);

  const [activityDialog, setActivityDialog] = useState(false);
  const [followupDialog, setFollowupDialog] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);
  const [activityForm, setActivityForm] = useState({ type: "note", title: "", note: "" });
  const [followupForm, setFollowupForm] = useState({ scheduled_at: "", type: "follow_up", note: "" });
  const [saving, setSaving] = useState(false);

  const status = PIPELINE_STATUSES.find((s) => s.value === prospect.pipeline_status);
  const heat = INTEREST_LEVELS.find((l) => l.value === prospect.interest_level);

  const handleStatusChange = async (newStatus: string) => {
    const updates: Partial<Prospect> = { pipeline_status: newStatus };
    if (newStatus === "converted") {
      updates.converted_at = new Date().toISOString();
    }
    if (newStatus === "contacted") {
      updates.last_contacted_at = new Date().toISOString();
    }
    await onUpdate(prospect.id, updates);
    await addActivity({
      activity_type: "status_change",
      activity_title: `Status → ${PIPELINE_STATUSES.find(s => s.value === newStatus)?.label}`,
    });
    setStatusDialog(false);
  };

  const handleAddActivity = async () => {
    if (!activityForm.note.trim() && !activityForm.title.trim()) return;
    setSaving(true);
    await addActivity({
      activity_type: activityForm.type,
      activity_title: activityForm.title.trim() || null,
      activity_note: activityForm.note.trim() || null,
    });
    if (activityForm.type === "call" || activityForm.type === "message") {
      await onUpdate(prospect.id, { last_contacted_at: new Date().toISOString() });
    }
    setActivityForm({ type: "note", title: "", note: "" });
    setActivityDialog(false);
    setSaving(false);
  };

  const handleAddFollowup = async () => {
    if (!followupForm.scheduled_at) return;
    setSaving(true);
    await addFollowup({
      prospect_id: prospect.id,
      scheduled_at: new Date(followupForm.scheduled_at).toISOString(),
      followup_type: followupForm.type,
      note: followupForm.note.trim() || null,
    });
    setFollowupForm({ scheduled_at: "", type: "follow_up", note: "" });
    setFollowupDialog(false);
    setSaving(false);
  };

  const markFollowupDone = async (fu: ProspectFollowup) => {
    await updateFollowup(fu.id, { status: "done", completed_at: new Date().toISOString() });
    toast.success("Follow-up marked done!");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{prospect.full_name}</h2>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() => setStatusDialog(true)}
            >
              <div className={`h-2 w-2 rounded-full ${status?.color}`} />
              {status?.label}
            </Badge>
            <span className="text-sm">{heat?.emoji} {heat?.label}</span>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <Card>
        <CardContent className="py-4 space-y-3">
          {prospect.phone && (
            <a href={`tel:${prospect.phone}`} className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
              <Phone className="h-4 w-4 text-emerald-500" /> {prospect.phone}
            </a>
          )}
          {prospect.email && (
            <a href={`mailto:${prospect.email}`} className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
              <Mail className="h-4 w-4 text-blue-500" /> {prospect.email}
            </a>
          )}
          {prospect.messenger_link && (
            <a href={prospect.messenger_link} target="_blank" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
              <MessageSquare className="h-4 w-4 text-blue-600" /> Messenger
            </a>
          )}
          {prospect.location && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {prospect.location}
            </div>
          )}
          {prospect.occupation && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Briefcase className="h-4 w-4" /> {prospect.occupation}
            </div>
          )}
          {prospect.company && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" /> {prospect.company}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {prospect.notes && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <StickyNote className="h-4 w-4" /> Notes
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{prospect.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-12 gap-2" onClick={() => setActivityDialog(true)}>
          <Plus className="h-4 w-4" /> Log Activity
        </Button>
        <Button variant="outline" className="h-12 gap-2" onClick={() => setFollowupDialog(true)}>
          <Calendar className="h-4 w-4" /> Schedule Follow-Up
        </Button>
        <Button variant="outline" className="h-12 gap-2" onClick={() => setStatusDialog(true)}>
          <Send className="h-4 w-4" /> Change Status
        </Button>
        <Button
          variant="outline"
          className="h-12 gap-2 text-destructive hover:text-destructive"
          onClick={async () => {
            if (confirm("Delete this prospect?")) await onDelete(prospect.id);
            onBack();
          }}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      {/* Follow-Ups */}
      {followups.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Follow-Ups
            </h3>
            <div className="space-y-2">
              {followups.map((fu) => (
                <div key={fu.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {format(new Date(fu.scheduled_at), "MMM d, h:mm a")}
                    </p>
                    {fu.note && <p className="text-xs text-muted-foreground truncate">{fu.note}</p>}
                  </div>
                  {fu.status === "pending" ? (
                    <Button size="sm" variant="secondary" onClick={() => markFollowupDone(fu)} className="h-8">
                      Done
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="text-xs">✅ Done</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Timeline */}
      <Card>
        <CardContent className="py-4">
          <h3 className="text-sm font-semibold mb-3">Activity Timeline</h3>
          {activities.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No activities yet</p>
          ) : (
            <div className="space-y-3">
              {activities.map((act) => (
                <div key={act.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    {act.activity_title && (
                      <p className="text-sm font-medium">{act.activity_title}</p>
                    )}
                    {act.activity_note && (
                      <p className="text-xs text-muted-foreground">{act.activity_note}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(act.activity_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Change Dialog */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Change Status</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {PIPELINE_STATUSES.map((s) => (
              <Button
                key={s.value}
                variant={s.value === prospect.pipeline_status ? "default" : "outline"}
                className="w-full h-12 justify-start gap-3"
                onClick={() => handleStatusChange(s.value)}
              >
                <div className={`h-3 w-3 rounded-full ${s.color}`} />
                {s.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog open={activityDialog} onOpenChange={setActivityDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={activityForm.type} onValueChange={(v) => setActivityForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1.5 h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                placeholder="Brief title..."
                value={activityForm.title}
                onChange={(e) => setActivityForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1.5 h-12"
              />
            </div>
            <div>
              <Label>Note</Label>
              <Textarea
                placeholder="Details..."
                value={activityForm.note}
                onChange={(e) => setActivityForm((f) => ({ ...f, note: e.target.value }))}
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddActivity} disabled={saving} className="h-12 gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Follow-Up Dialog */}
      <Dialog open={followupDialog} onOpenChange={setFollowupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Schedule Follow-Up</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>When *</Label>
              <Input
                type="datetime-local"
                value={followupForm.scheduled_at}
                onChange={(e) => setFollowupForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                className="mt-1.5 h-12"
              />
            </div>
            <div>
              <Label>Note</Label>
              <Textarea
                placeholder="What to follow up on..."
                value={followupForm.note}
                onChange={(e) => setFollowupForm((f) => ({ ...f, note: e.target.value }))}
                className="mt-1.5"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddFollowup} disabled={saving || !followupForm.scheduled_at} className="h-12 gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

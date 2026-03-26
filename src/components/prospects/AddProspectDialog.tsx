import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { SOURCE_TYPES, INTEREST_LEVELS, type Prospect } from "@/hooks/useProspects";

interface AddProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (prospect: Partial<Prospect>) => Promise<Prospect | null>;
}

export default function AddProspectDialog({ open, onOpenChange, onAdd }: AddProspectDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    messenger_link: "",
    source_type: "manual",
    interest_level: "warm",
    notes: "",
    next_follow_up_at: "",
  });

  const handleSubmit = async () => {
    if (!form.full_name.trim()) return;
    setSaving(true);
    const result = await onAdd({
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      messenger_link: form.messenger_link.trim() || null,
      source_type: form.source_type,
      interest_level: form.interest_level,
      notes: form.notes.trim() || null,
      next_follow_up_at: form.next_follow_up_at || null,
    });
    if (result) {
      setForm({ full_name: "", phone: "", email: "", messenger_link: "", source_type: "manual", interest_level: "warm", notes: "", next_follow_up_at: "" });
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Prospect
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input
              placeholder="Full name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className="mt-1.5 h-12 text-base"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input
                placeholder="+63..."
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="mt-1.5 h-12 text-base"
                type="tel"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                placeholder="email@..."
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1.5 h-12 text-base"
                type="email"
              />
            </div>
          </div>

          <div>
            <Label>Messenger / Social Link</Label>
            <Input
              placeholder="m.me/username or link"
              value={form.messenger_link}
              onChange={(e) => setForm((f) => ({ ...f, messenger_link: e.target.value }))}
              className="mt-1.5 h-12 text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Source</Label>
              <Select value={form.source_type} onValueChange={(v) => setForm((f) => ({ ...f, source_type: v }))}>
                <SelectTrigger className="mt-1.5 h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Interest Level</Label>
              <Select value={form.interest_level} onValueChange={(v) => setForm((f) => ({ ...f, interest_level: v }))}>
                <SelectTrigger className="mt-1.5 h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTEREST_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.emoji} {l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Next Follow-Up</Label>
            <Input
              type="datetime-local"
              value={form.next_follow_up_at}
              onChange={(e) => setForm((f) => ({ ...f, next_follow_up_at: e.target.value }))}
              className="mt-1.5 h-12 text-base"
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Quick notes..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="mt-1.5"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-12">Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.full_name.trim()} className="h-12 gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Add Prospect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

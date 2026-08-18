import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2, AlertTriangle, ChevronDown } from "lucide-react";
import {
  SOURCE_TYPES, INTEREST_LEVELS, INTEREST_TYPES, RELATIONSHIP_STRENGTHS,
  findDuplicates, type Prospect,
} from "@/hooks/useProspects";

interface AddProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (prospect: Partial<Prospect>) => Promise<Prospect | null>;
  existing?: Prospect[];
}

const EMPTY = {
  full_name: "",
  nickname: "",
  phone: "",
  email: "",
  messenger_link: "",
  facebook_url: "",
  other_social_url: "",
  city: "",
  occupation: "",
  company: "",
  birthday: "",
  sponsor_name: "",
  source_type: "manual",
  interest_level: "warm",
  interest_type: "undecided",
  relationship_strength: "known",
  notes: "",
  next_follow_up_at: "",
};

export default function AddProspectDialog({ open, onOpenChange, onAdd, existing = [] }: AddProspectDialogProps) {
  const [saving, setSaving] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const duplicates = useMemo(
    () => (form.full_name || form.phone || form.email
      ? findDuplicates(existing, { full_name: form.full_name, phone: form.phone, email: form.email })
      : []),
    [existing, form.full_name, form.phone, form.email]
  );

  const handleSubmit = async () => {
    if (!form.full_name.trim()) return;
    setSaving(true);
    const result = await onAdd({
      full_name: form.full_name.trim(),
      nickname: form.nickname.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      messenger_link: form.messenger_link.trim() || null,
      facebook_url: form.facebook_url.trim() || null,
      other_social_url: form.other_social_url.trim() || null,
      city: form.city.trim() || null,
      occupation: form.occupation.trim() || null,
      company: form.company.trim() || null,
      birthday: form.birthday || null,
      sponsor_name: form.sponsor_name.trim() || null,
      source_type: form.source_type,
      interest_level: form.interest_level,
      interest_type: form.interest_type,
      relationship_strength: form.relationship_strength,
      notes: form.notes.trim() || null,
      next_follow_up_at: form.next_follow_up_at || null,
    });
    if (result) {
      setForm(EMPTY);
      setShowMore(false);
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

          {duplicates.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3">
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold">Possible duplicate</p>
                <p className="text-muted-foreground">
                  Already on your list: {duplicates.slice(0, 3).map((d) => d.full_name).join(", ")}
                </p>
              </div>
            </div>
          )}

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Interested In</Label>
              <Select value={form.interest_type} onValueChange={(v) => setForm((f) => ({ ...f, interest_type: v }))}>
                <SelectTrigger className="mt-1.5 h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTEREST_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Relationship</Label>
              <Select value={form.relationship_strength} onValueChange={(v) => setForm((f) => ({ ...f, relationship_strength: v }))}>
                <SelectTrigger className="mt-1.5 h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_STRENGTHS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
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

          <Button
            type="button"
            variant="ghost"
            className="w-full h-11 gap-2 text-sm"
            onClick={() => setShowMore((s) => !s)}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? "rotate-180" : ""}`} />
            {showMore ? "Hide extra details" : "More details (optional)"}
          </Button>

          {showMore && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nickname</Label>
                  <Input value={form.nickname} onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))} className="mt-1.5 h-12 text-base" />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="mt-1.5 h-12 text-base" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Occupation</Label>
                  <Input value={form.occupation} onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))} className="mt-1.5 h-12 text-base" />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} className="mt-1.5 h-12 text-base" />
                </div>
              </div>
              <div>
                <Label>Facebook URL</Label>
                <Input value={form.facebook_url} onChange={(e) => setForm((f) => ({ ...f, facebook_url: e.target.value }))} className="mt-1.5 h-12 text-base" />
              </div>
              <div>
                <Label>Other Social Link</Label>
                <Input value={form.other_social_url} onChange={(e) => setForm((f) => ({ ...f, other_social_url: e.target.value }))} className="mt-1.5 h-12 text-base" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Birthday</Label>
                  <Input type="date" value={form.birthday} onChange={(e) => setForm((f) => ({ ...f, birthday: e.target.value }))} className="mt-1.5 h-12 text-base" />
                </div>
                <div>
                  <Label>Referred By</Label>
                  <Input value={form.sponsor_name} onChange={(e) => setForm((f) => ({ ...f, sponsor_name: e.target.value }))} className="mt-1.5 h-12 text-base" />
                </div>
              </div>
            </div>
          )}

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

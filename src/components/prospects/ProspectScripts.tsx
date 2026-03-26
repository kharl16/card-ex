import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Plus, FileText, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Script {
  id: string;
  owner_user_id: string;
  title: string;
  category: string;
  content: string;
  is_default: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: "first_contact", label: "First Contact", color: "bg-blue-500" },
  { value: "follow_up", label: "Follow-Up", color: "bg-orange-500" },
  { value: "value_message", label: "Value Message", color: "bg-emerald-500" },
  { value: "appointment", label: "Appointment Setting", color: "bg-purple-500" },
  { value: "reconnect", label: "Reconnect", color: "bg-slate-500" },
];

const DEFAULT_SCRIPTS: Omit<Script, "id" | "owner_user_id" | "created_at">[] = [
  {
    title: "Warm First Contact",
    category: "first_contact",
    content: "Hi {name}! I came across your profile and I think you'd be great for something I'm working on. Would love to chat if you have a moment! 😊",
    is_default: true,
  },
  {
    title: "Friendly Follow-Up",
    category: "follow_up",
    content: "Hey {name}, just wanted to follow up on what we talked about. Have you had a chance to look into it? No pressure — just checking in!",
    is_default: true,
  },
  {
    title: "Share Value",
    category: "value_message",
    content: "Hi {name}! Thought you might find this interesting — a lot of people I work with have been seeing great results lately. Happy to share more if you're curious!",
    is_default: true,
  },
  {
    title: "Set Appointment",
    category: "appointment",
    content: "Hey {name}! I'd love to share a quick presentation with you. Would tomorrow at {time} work, or would another day be better?",
    is_default: true,
  },
  {
    title: "Re-engage",
    category: "reconnect",
    content: "Hey {name}! It's been a while — hope you're doing well! I was thinking of you because we have some exciting updates. Would love to reconnect when you have a moment.",
    is_default: true,
  },
];

interface ProspectScriptsProps {
  prospectName: string;
}

export default function ProspectScripts({ prospectName }: ProspectScriptsProps) {
  const { user } = useAuth();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", category: "first_contact", content: "" });
  const [filterCategory, setFilterCategory] = useState("all");

  const fetchScripts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("prospect_scripts")
        .select("*")
        .or(`owner_user_id.eq.${user.id},is_default.eq.true`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Seed default scripts
        const inserts = DEFAULT_SCRIPTS.map((s) => ({
          ...s,
          owner_user_id: user.id,
        }));
        const { data: seeded, error: seedErr } = await supabase
          .from("prospect_scripts")
          .insert(inserts as any)
          .select();

        if (!seedErr && seeded) {
          setScripts(seeded as unknown as Script[]);
        }
      } else {
        setScripts(data as unknown as Script[]);
      }
    } catch (err) {
      console.error("Error fetching scripts:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  const handleSave = async () => {
    if (!user || !form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("prospect_scripts")
        .insert({
          owner_user_id: user.id,
          title: form.title.trim(),
          category: form.category,
          content: form.content.trim(),
          is_default: false,
        } as any)
        .select()
        .single();

      if (error) throw error;
      setScripts((prev) => [data as unknown as Script, ...prev]);
      setForm({ title: "", category: "first_contact", content: "" });
      setDialogOpen(false);
      toast.success("Script saved!");
    } catch (err) {
      console.error("Error saving script:", err);
      toast.error("Failed to save script");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("prospect_scripts").delete().eq("id", id);
      if (error) throw error;
      setScripts((prev) => prev.filter((s) => s.id !== id));
      toast.success("Script deleted");
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const copyScript = (content: string) => {
    const personalized = content.replace(/\{name\}/g, prospectName.split(" ")[0]);
    navigator.clipboard.writeText(personalized);
    toast.success("Script copied with name inserted!");
  };

  const filtered = filterCategory === "all" ? scripts : scripts.filter((s) => s.category === filterCategory);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" /> Script Templates
          </h3>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3 w-3" /> New
          </Button>
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar">
          <Badge
            variant={filterCategory === "all" ? "default" : "outline"}
            className="cursor-pointer shrink-0 text-xs"
            onClick={() => setFilterCategory("all")}
          >
            All
          </Badge>
          {CATEGORIES.map((c) => (
            <Badge
              key={c.value}
              variant={filterCategory === c.value ? "default" : "outline"}
              className="cursor-pointer shrink-0 text-xs gap-1"
              onClick={() => setFilterCategory(c.value)}
            >
              <div className={`h-1.5 w-1.5 rounded-full ${c.color}`} />
              {c.label}
            </Badge>
          ))}
        </div>

        {/* Script list */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filtered.map((script) => {
            const cat = CATEGORIES.find((c) => c.value === script.category);
            return (
              <div
                key={script.id}
                className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{script.title}</span>
                    {cat && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {cat.label}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyScript(script.content)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    {!script.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => handleDelete(script.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {script.content.replace(/\{name\}/g, prospectName.split(" ")[0])}
                </p>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No scripts in this category</p>
          )}
        </div>
      </CardContent>

      {/* New Script Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Script Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                placeholder="e.g. Quick Follow-Up"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1.5 h-12"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="mt-1.5 h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message (use {"{name}"} as placeholder)</Label>
              <Textarea
                placeholder="Hi {name}, ..."
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                className="mt-1.5"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()} className="h-12 gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Script
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

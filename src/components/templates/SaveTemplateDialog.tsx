import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Save, Globe, Users, Lock } from "lucide-react";
import { useTemplates, TemplateVisibility } from "@/hooks/useTemplates";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: Record<string, any>;
  productImages?: Array<{
    image_url: string;
    alt_text?: string | null;
    description?: string | null;
    sort_order?: number | null;
  }>;
  onSaved?: () => void;
}
export function SaveTemplateDialog({
  open,
  onOpenChange,
  card,
  productImages,
  onSaved
}: SaveTemplateDialogProps) {
  const {
    isAdmin
  } = useAuth();
  const {
    saveAsGlobalTemplate,
    savePersonalTemplate,
    hasPersonalTemplate,
    userTemplate
  } = useTemplates();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState<TemplateVisibility>(isAdmin ? 'global' : 'private');
  const [cardLinks, setCardLinks] = useState<Array<{
    kind: string;
    label: string;
    value: string;
    icon?: string | null;
    sort_index?: number | null;
  }>>([]);

  // Pre-fill name from card when dialog opens
  useEffect(() => {
    if (open && card.full_name) {
      setName(`${card.full_name} Template`);
    }
  }, [open, card.full_name]);

  // Fetch card links when dialog opens
  useEffect(() => {
    if (open && card.id) {
      fetchCardLinks();
    }
  }, [open, card.id]);
  const fetchCardLinks = async () => {
    if (!card.id) return;
    const {
      data,
      error
    } = await supabase.from("card_links").select("kind, label, value, icon, sort_index").eq("card_id", card.id).order("sort_index");
    if (!error && data) {
      setCardLinks(data);
    }
  };
  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let success = false;
      if (visibility === 'global' || visibility === 'team') {
        success = await saveAsGlobalTemplate(card, name.trim(), description.trim(), undefined, productImages, cardLinks, visibility);
      } else {
        success = await savePersonalTemplate(card, name.trim(), description.trim(), productImages, cardLinks, visibility);
      }
      if (success) {
        setName("");
        setDescription("");
        setVisibility(isAdmin ? 'global' : 'private');
        setCardLinks([]);
        onOpenChange(false);
        onSaved?.();
      }
    } finally {
      setSaving(false);
    }
  };
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName("");
      setDescription("");
      setVisibility(isAdmin ? 'global' : 'private');
      setCardLinks([]);
    }
    onOpenChange(newOpen);
  };
  return <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            {hasPersonalTemplate && !isAdmin ? "You already have a personal template. This will overwrite it." : "Save this card as a reusable template with all content included."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input id="template-name" value={name} onChange={e => setName(e.target.value)} placeholder="My Business Card Template" maxLength={100} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Description (optional)</Label>
            <Textarea id="template-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="A professional template with gold accents..." maxLength={500} rows={3} />
          </div>

          

          <div className="space-y-2">
            <Label>Template Visibility</Label>
            <RadioGroup value={visibility} onValueChange={v => setVisibility(v as TemplateVisibility)} className="space-y-2">
              {isAdmin && <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50">
                  <RadioGroupItem value="global" id="visibility-global" />
                  <Label htmlFor="visibility-global" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      
                    </div>
                    <p className="text-xs text-muted-foreground">Available to all users</p>
                  </Label>
                </div>}
              <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50">
                <RadioGroupItem value="team" id="visibility-team" />
                <Label htmlFor="visibility-team" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">My Team</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Available to users you referred</p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50">
                <RadioGroupItem value="private" id="visibility-private" />
                <Label htmlFor="visibility-private" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Private</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Only you can use this template</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {hasPersonalTemplate && userTemplate && visibility === 'private' && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium text-amber-600 dark:text-amber-400">
                Overwriting existing template
              </p>
              <p className="text-muted-foreground">
                Your current template "{userTemplate.name}" will be replaced.
              </p>
            </div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {hasPersonalTemplate && visibility === 'private' ? "Overwrite Template" : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
}
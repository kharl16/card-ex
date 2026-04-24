import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Loader2, Lock, Users } from "lucide-react";
import {
  CardTemplate,
  TemplateVisibility,
  useTemplates,
} from "@/hooks/useTemplates";

interface EditTemplateDialogProps {
  template: CardTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, hides the "Global" visibility option (non-admin owners). */
  restrictGlobalOption?: boolean;
  onSaved?: () => void;
}

export function EditTemplateDialog({
  template,
  open,
  onOpenChange,
  restrictGlobalOption = false,
  onSaved,
}: EditTemplateDialogProps) {
  const { updateTemplate } = useTemplates();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<TemplateVisibility>("private");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setVisibility(
        (template.visibility as TemplateVisibility) ||
          (template.is_global ? "global" : "private"),
      );
    }
  }, [template]);

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    const success = await updateTemplate(template.id, {
      name: name.trim(),
      description: description.trim(),
      visibility,
    });
    setSaving(false);
    if (success) {
      onOpenChange(false);
      onSaved?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>
            Update the template name, description, and visibility.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tmpl-edit-name">Name</Label>
            <Input
              id="tmpl-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tmpl-edit-description">Description</Label>
            <Textarea
              id="tmpl-edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tmpl-edit-visibility">Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as TemplateVisibility)}
            >
              <SelectTrigger id="tmpl-edit-visibility">
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                {!restrictGlobalOption && (
                  <SelectItem value="global">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>Global</span>
                      <span className="text-xs text-muted-foreground">
                        - Visible to all users
                      </span>
                    </div>
                  </SelectItem>
                )}
                <SelectItem value="team">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Team</span>
                    <span className="text-xs text-muted-foreground">
                      - Visible to your referrals
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span>Private</span>
                    <span className="text-xs text-muted-foreground">
                      - Only you
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

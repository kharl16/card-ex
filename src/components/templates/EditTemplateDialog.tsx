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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditTemplateDialogProps {
  template: CardTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, hides the "Global" visibility option (non-admin owners). */
  restrictGlobalOption?: boolean;
  onSaved?: () => void;
}

const NAME_MIN = 3;
const NAME_MAX = 100;

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
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setVisibility(
        (template.visibility as TemplateVisibility) ||
          (template.is_global ? "global" : "private"),
      );
      setNameError(null);
    }
  }, [template]);

  const validateName = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length < NAME_MIN) return `Name must be at least ${NAME_MIN} characters`;
    if (trimmed.length > NAME_MAX) return `Name must be ${NAME_MAX} characters or less`;
    return null;
  };

  const handleSave = async () => {
    if (!template) return;
    const trimmedName = name.trim();
    const localError = validateName(trimmedName);
    if (localError) {
      setNameError(localError);
      return;
    }

    setSaving(true);
    try {
      // Server-side uniqueness check (per owner, case-insensitive)
      if (trimmedName.toLowerCase() !== template.name.toLowerCase()) {
        const { data: existing, error: checkErr } = await supabase
          .from("card_templates")
          .select("id")
          .eq("owner_id", template.owner_id)
          .ilike("name", trimmedName)
          .neq("id", template.id)
          .maybeSingle();
        if (checkErr) throw checkErr;
        if (existing) {
          setNameError("You already have a template with this name");
          setSaving(false);
          return;
        }
      }

      const success = await updateTemplate(template.id, {
        name: trimmedName,
        description: description.trim(),
        visibility,
      });
      if (success) {
        onOpenChange(false);
        onSaved?.();
      }
    } catch (err: any) {
      if (err?.code === "23505") {
        setNameError("A template with this name already exists");
      } else {
        toast.error("Failed to save changes");
      }
    } finally {
      setSaving(false);
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
              onChange={(e) => {
                setName(e.target.value);
                setNameError(validateName(e.target.value));
              }}
              maxLength={NAME_MAX}
              aria-invalid={!!nameError}
            />
            <div className="flex items-center justify-between text-xs">
              {nameError ? (
                <span className="text-destructive">{nameError}</span>
              ) : (
                <span className="text-muted-foreground">
                  {NAME_MIN}–{NAME_MAX} characters
                </span>
              )}
              <span className="text-muted-foreground">{name.trim().length}/{NAME_MAX}</span>
            </div>
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
          <Button
            onClick={handleSave}
            disabled={!name.trim() || saving || !!nameError}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

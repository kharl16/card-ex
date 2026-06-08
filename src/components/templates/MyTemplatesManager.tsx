import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Pencil, Trash2, Users, Lock, Palette, Eye } from "lucide-react";
import { TemplatePreviewDialog } from "./TemplatePreviewDialog";
import { useTemplates, CardTemplate, TemplateVisibility } from "@/hooks/useTemplates";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface MyTemplatesManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MyTemplatesManager({ open, onOpenChange }: MyTemplatesManagerProps) {
  const { user } = useAuth();
  const { templates, loading, updateTemplate, deleteTemplate } = useTemplates();
  const [editingTemplate, setEditingTemplate] = useState<CardTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<CardTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CardTemplate | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVisibility, setEditVisibility] = useState<TemplateVisibility>("private");
  const [saving, setSaving] = useState(false);

  const myTemplates = useMemo(
    () => templates.filter((t) => t.owner_id === user?.id),
    [templates, user?.id]
  );

  const handleEdit = (template: CardTemplate) => {
    setEditingTemplate(template);
    setEditName(template.name);
    setEditDescription(template.description || "");
    setEditVisibility(template.visibility || "private");
  };

  const handleSaveEdit = async () => {
    if (!editingTemplate || !editName.trim()) return;
    setSaving(true);
    const success = await updateTemplate(editingTemplate.id, {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      visibility: editVisibility === "global" ? "team" : editVisibility,
    });
    if (success) setEditingTemplate(null);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    setSaving(true);
    const success = await deleteTemplate(deletingTemplate.id);
    if (success) setDeletingTemplate(null);
    setSaving(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              My Templates
            </DialogTitle>
            <DialogDescription>
              Templates you saved from your cards. Use them when creating a new card.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : myTemplates.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Palette className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 font-semibold">No templates yet</h3>
                <p className="text-sm text-muted-foreground">
                  Open one of your cards in the editor and tap "Save as Template" to create one.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myTemplates.map((template) => {
                  const visibility = (template.visibility || "private") as TemplateVisibility;
                  const config =
                    visibility === "team"
                      ? { label: "Team", icon: <Users className="h-3 w-3" />, variant: "secondary" as const }
                      : { label: "Private", icon: <Lock className="h-3 w-3" />, variant: "outline" as const };
                  return (
                    <Card key={template.id} className="overflow-hidden">
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                              <Palette className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="truncate text-base">{template.name}</CardTitle>
                                <Badge variant={config.variant} className="flex items-center gap-1 text-xs">
                                  {config.icon}
                                  {config.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Created {format(new Date(template.created_at), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingTemplate(template)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {template.description && (
                        <CardContent className="py-2 pt-0">
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>Update the template name, description, and visibility.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="my-edit-name">Name</Label>
              <Input
                id="my-edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="my-edit-description">Description</Label>
              <Textarea
                id="my-edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="my-edit-visibility">Visibility</Label>
              <Select value={editVisibility} onValueChange={(v) => setEditVisibility(v as TemplateVisibility)}>
                <SelectTrigger id="my-edit-visibility">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Team</span>
                      <span className="text-xs text-muted-foreground">- Visible to your referrals</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span>Private</span>
                      <span className="text-xs text-muted-foreground">- Only you</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editName.trim() || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

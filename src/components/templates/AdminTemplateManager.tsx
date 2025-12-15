import { useState, useEffect } from "react";
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
import { Loader2, Pencil, Trash2, Globe, Users, Lock, Palette } from "lucide-react";
import { useTemplates, CardTemplate, TemplateVisibility } from "@/hooks/useTemplates";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

const visibilityConfig: Record<TemplateVisibility, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" }> = {
  global: { label: "Global", icon: <Globe className="h-3 w-3" />, variant: "default" },
  team: { label: "Team", icon: <Users className="h-3 w-3" />, variant: "secondary" },
  private: { label: "Private", icon: <Lock className="h-3 w-3" />, variant: "outline" },
};

interface AdminTemplateManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminTemplateManager({ open, onOpenChange }: AdminTemplateManagerProps) {
  const { isAdmin } = useAuth();
  const { getAllTemplatesForAdmin, updateTemplate, deleteTemplate } = useTemplates();
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<CardTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<CardTemplate | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVisibility, setEditVisibility] = useState<TemplateVisibility>("private");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && isAdmin) {
      loadAllTemplates();
    }
  }, [open, isAdmin]);

  const loadAllTemplates = async () => {
    setLoading(true);
    const data = await getAllTemplatesForAdmin();
    setTemplates(data);
    setLoading(false);
  };

  const handleEdit = (template: CardTemplate) => {
    setEditingTemplate(template);
    setEditName(template.name);
    setEditDescription(template.description || "");
    setEditVisibility(template.visibility || (template.is_global ? "global" : "private"));
  };

  const handleSaveEdit = async () => {
    if (!editingTemplate || !editName.trim()) return;

    setSaving(true);
    const success = await updateTemplate(editingTemplate.id, {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      visibility: editVisibility,
    });

    if (success) {
      setEditingTemplate(null);
      await loadAllTemplates();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;

    setSaving(true);
    const success = await deleteTemplate(deletingTemplate.id);
    if (success) {
      setDeletingTemplate(null);
      await loadAllTemplates();
    }
    setSaving(false);
  };

  if (!isAdmin) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Manage Templates
            </DialogTitle>
            <DialogDescription>
              View and manage all card templates. Global templates are available to all users.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : templates.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Palette className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 font-semibold">No templates yet</h3>
                <p className="text-sm text-muted-foreground">
                  Save a card as a template to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <Card key={template.id} className="overflow-hidden">
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                            <Palette className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">{template.name}</CardTitle>
                              {(() => {
                                const visibility = (template.visibility || (template.is_global ? "global" : "private")) as TemplateVisibility;
                                const config = visibilityConfig[visibility];
                                return (
                                  <Badge variant={config.variant} className="text-xs flex items-center gap-1">
                                    {config.icon}
                                    {config.label}
                                  </Badge>
                                );
                              })()}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Created {format(new Date(template.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(template)}
                          >
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
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>Update the template name, description, and visibility.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-visibility">Visibility</Label>
              <Select value={editVisibility} onValueChange={(v) => setEditVisibility(v as TemplateVisibility)}>
                <SelectTrigger id="edit-visibility">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>Global</span>
                      <span className="text-xs text-muted-foreground">- Visible to all users</span>
                    </div>
                  </SelectItem>
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTemplate?.name}"? This action cannot be
              undone.
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

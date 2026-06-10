import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Save, Globe, Users, Lock, AlertCircle, Copy, Check } from "lucide-react";
import { useTemplates, TemplateVisibility } from "@/hooks/useTemplates";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatErrorDetails, type FriendlyTemplateError } from "@/lib/templateErrors";
import { toast } from "sonner";

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: Record<string, any>;
  onSaved?: () => void;
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
  card,
  onSaved
}: SaveTemplateDialogProps) {
  const { isAdmin } = useAuth();
  const {
    saveAsGlobalTemplate,
    savePersonalTemplate,
  } = useTemplates();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState<TemplateVisibility>(isAdmin ? 'global' : 'private');
  const [saveError, setSaveError] = useState<FriendlyTemplateError | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
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
    const { data, error } = await supabase
      .from("card_links")
      .select("kind, label, value, icon, sort_index")
      .eq("card_id", card.id)
      .order("sort_index");
    if (!error && data) {
      setCardLinks(data);
    }
  };

  const clearError = () => {
    if (saveError) {
      setSaveError(null);
      setShowDetails(false);
      setCopied(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setSaveError(null);
    setShowDetails(false);
    setCopied(false);
    try {
      const result =
        visibility === 'global' || visibility === 'team'
          ? await saveAsGlobalTemplate(card, name.trim(), description.trim(), undefined, cardLinks, visibility)
          : await savePersonalTemplate(card, name.trim(), description.trim(), cardLinks, visibility);

      if (!result.success) {
        setSaveError((result as { success: false; error: FriendlyTemplateError }).error);
      } else {
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

  const handleCopyDetails = async () => {
    if (!saveError) return;
    try {
      await navigator.clipboard.writeText(formatErrorDetails(saveError));
      setCopied(true);
      toast.success("Error details copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName("");
      setDescription("");
      setVisibility(isAdmin ? 'global' : 'private');
      setCardLinks([]);
      setSaveError(null);
      setShowDetails(false);
      setCopied(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            Save this card as a reusable template with all content included.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {saveError && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{saveError.title}</AlertTitle>
              <AlertDescription className="space-y-3">
                <p className="text-sm">{saveError.message}</p>
                {saveError.nextSteps.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-1">What to try next:</p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {saveError.nextSteps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDetails((v) => !v)}
                  >
                    {showDetails ? "Hide" : "Show"} technical details
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyDetails}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 mr-1" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" /> Copy details
                      </>
                    )}
                  </Button>
                </div>
                {showDetails && (
                  <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-background/40 p-2 text-xs whitespace-pre-wrap break-all">
                    {formatErrorDetails(saveError) || "(no additional details)"}
                  </pre>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => { setName(e.target.value); clearError(); }}
              placeholder="My Business Card Template"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Description (optional)</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => { setDescription(e.target.value); clearError(); }}
              placeholder="A professional template with gold accents..."
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Template Visibility</Label>
            <RadioGroup
              value={visibility}
              onValueChange={(v) => { setVisibility(v as TemplateVisibility); clearError(); }}
              className="space-y-2"
            >
              {isAdmin && (
                <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50">
                  <RadioGroupItem value="global" id="visibility-global" />
                  <Label htmlFor="visibility-global" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      <span className="font-medium">Global</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Available to all users</p>
                  </Label>
                </div>
              )}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saveError ? "Try Again" : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

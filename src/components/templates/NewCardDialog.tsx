import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Layers } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { TemplateSelectionModal } from "./TemplateSelectionModal";
import type { CardTemplate } from "@/hooks/useTemplates";
import { createCardFromOnboarding } from "@/lib/createCardFromOnboarding";

interface NewCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileName?: string;
}

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  phone: z.string().trim().min(7, "Mobile number is required").max(30),
  email: z.string().trim().email("Valid email is required").max(255),
  facebookUrl: z
    .string()
    .trim()
    .min(1, "Facebook link is required")
    .url("Must be a valid URL")
    .refine((v) => /facebook\.com|fb\.com|fb\.me/i.test(v), "Must be a Facebook link"),
  isIamMember: z.boolean(),
  iamId: z.string().trim().optional(),
}).refine(
  (d) => !d.isIamMember || /^\d{8}$/.test(d.iamId ?? ""),
  { message: "IAM ID must be exactly 8 digits", path: ["iamId"] }
);

export function NewCardDialog({ open, onOpenChange, profileName }: NewCardDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [iamId, setIamId] = useState("");
  const [isIamMember, setIsIamMember] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Prefill on open
  useEffect(() => {
    if (!open || !user) return;
    setEmail((cur) => cur || user.email || "");
    if (profileName && !firstName && !lastName) {
      const parts = profileName.trim().split(/\s+/);
      setFirstName(parts[0] ?? "");
      setLastName(parts.slice(1).join(" ") ?? "");
    }
  }, [open, user, profileName]);

  const iamIdMissing = isIamMember && !/^\d{8}$/.test(iamId);
  const templateMissing = !selectedTemplate;
  const formValid = schema.safeParse({ firstName, lastName, phone, email, facebookUrl, isIamMember, iamId }).success;
  const submitDisabled = submitting || iamIdMissing || templateMissing || !formValid;

  const resetForm = () => {
    setSelectedTemplate(null);
    setErrors({});
    // Keep names/email prefilled for convenience; clear sensitive/per-card fields
    setPhone("");
    setFacebookUrl("");
    setIamId("");
    setIsIamMember(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm();
    onOpenChange(newOpen);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!selectedTemplate) {
      setErrors({ template: "Please choose a starting template" });
      toast.error("Please choose a starting template");
      return;
    }

    const parsed = schema.safeParse({ firstName, lastName, phone, email, facebookUrl, isIamMember, iamId });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.errors) {
        const key = String(issue.path[0] ?? "form");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error(parsed.error.errors[0]?.message ?? "Please check the form");
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      const { cardId } = await createCardFromOnboarding({
        user,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
        email: parsed.data.email,
        facebookUrl: parsed.data.facebookUrl,
        isIamMember: parsed.data.isIamMember,
        iamId: parsed.data.iamId,
        selectedTemplate,
        updateProfile: false,
      });
      toast.success("Card created!");
      handleOpenChange(false);
      navigate(`/cards/${cardId}/edit`);
    } catch (error: any) {
      console.error("Error creating card:", error);
      if (error.message?.includes("Card limit reached")) {
        toast.error("Card limit reached! Non-admin users can only have 2 cards.");
      } else {
        toast.error(error.message ?? "Failed to create card");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Create New Card
          </DialogTitle>
          <DialogDescription>
            Fill in the required details and choose a starting template.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Template picker (required) */}
          <div className={`rounded-lg border p-3 bg-background/40 ${errors.template ? "border-destructive" : "border-border/50"}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Layers className="h-4 w-4 text-primary" />
                  Starting template <span className="text-destructive">*</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {selectedTemplate ? selectedTemplate.name : "Required — choose a template to continue"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedTemplate && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
                    Clear
                  </Button>
                )}
                <Button
                  type="button"
                  variant={selectedTemplate ? "secondary" : "default"}
                  size="sm"
                  onClick={() => setTemplateModalOpen(true)}
                >
                  {selectedTemplate ? "Change" : "Choose"}
                </Button>
              </div>
            </div>
            {selectedTemplate ? (
              <Badge variant="secondary" className="mt-2 text-xs">
                Your info below will replace the template's details
              </Badge>
            ) : errors.template ? (
              <p className="text-xs text-destructive mt-2">{errors.template}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nc-first">First Name <span className="text-destructive">*</span></Label>
              <Input id="nc-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required aria-invalid={!!errors.firstName} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc-last">Last Name <span className="text-destructive">*</span></Label>
              <Input id="nc-last" value={lastName} onChange={(e) => setLastName(e.target.value)} required aria-invalid={!!errors.lastName} />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nc-phone">Mobile Number <span className="text-destructive">*</span></Label>
            <Input
              id="nc-phone"
              type="tel"
              placeholder="09XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              aria-invalid={!!errors.phone}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nc-email">Email Address <span className="text-destructive">*</span></Label>
            <Input
              id="nc-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nc-fb">Facebook Link <span className="text-destructive">*</span></Label>
            <Input
              id="nc-fb"
              type="url"
              placeholder="https://facebook.com/your.profile"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              required
              aria-invalid={!!errors.facebookUrl}
            />
            {errors.facebookUrl && <p className="text-xs text-destructive">{errors.facebookUrl}</p>}
          </div>

          <div className="space-y-2 rounded-lg border border-border/50 p-3 bg-background/40">
            <Label className="text-sm">IAM Worldwide Member? <span className="text-destructive">*</span></Label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={isIamMember} onCheckedChange={(c) => setIsIamMember(c === true)} />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={!isIamMember}
                  onCheckedChange={(c) => { if (c === true) { setIsIamMember(false); setIamId(""); } }}
                />
                <span className="text-sm">No</span>
              </label>
            </div>

            {isIamMember && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="nc-iam">IAM ID Number (last 8 digits) <span className="text-destructive">*</span></Label>
                <Input
                  id="nc-iam"
                  inputMode="numeric"
                  pattern="\d{8}"
                  maxLength={8}
                  placeholder="12345678"
                  value={iamId}
                  onChange={(e) => setIamId(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  required
                  aria-invalid={iamIdMissing || !!errors.iamId}
                />
                {iamIdMissing && (
                  <p className="text-xs text-destructive">
                    IAM ID is required (must be exactly 8 digits) when "Yes" is selected.
                  </p>
                )}
              </div>
            )}
          </div>

          <Button type="submit" className="w-full h-12" disabled={submitDisabled}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating your card...
              </>
            ) : (
              "Create Card"
            )}
          </Button>
        </form>

        <TemplateSelectionModal
          open={templateModalOpen}
          onOpenChange={setTemplateModalOpen}
          onSelectTemplate={(t) => {
            setSelectedTemplate(t);
            toast.success(`Template "${t.name}" selected`);
          }}
          onBuildFromScratch={() => setSelectedTemplate(null)}
        />
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTemplates, type CardTemplate } from "@/hooks/useTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, Layers } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
import { TemplateSelectionModal } from "@/components/templates/TemplateSelectionModal";
import { Badge } from "@/components/ui/badge";
import { createCardFromOnboarding } from "@/lib/createCardFromOnboarding";

export const onboardingFormSchema = z.object({
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

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
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

  const iamIdMissing = isIamMember && !/^\d{8}$/.test(iamId);
  const templateMissing = !selectedTemplate;
  const formValid = onboardingFormSchema.safeParse({ firstName, lastName, phone, email, facebookUrl, isIamMember, iamId }).success;
  const submitDisabled = submitting || iamIdMissing || templateMissing || !formValid;

  // Prefill & redirect-if-already-onboarded
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    (async () => {
      setEmail(user.email ?? "");
      const meta = (user.user_metadata ?? {}) as Record<string, any>;
      const fullName: string = meta.full_name ?? "";
      if (fullName) {
        const parts = fullName.trim().split(/\s+/);
        setFirstName(parts[0] ?? "");
        setLastName(parts.slice(1).join(" ") ?? "");
      }

      const { data: existing } = await supabase
        .from("cards")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (existing) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setChecking(false);
    })();
  }, [user, authLoading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!selectedTemplate) {
      setErrors({ template: "Please choose a starting template" });
      toast.error("Please choose a starting template");
      return;
    }

    const parsed = onboardingFormSchema.safeParse({ firstName, lastName, phone, email, facebookUrl, isIamMember, iamId });
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
      await createCardFromOnboarding({
        user,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
        email: parsed.data.email,
        facebookUrl: parsed.data.facebookUrl,
        isIamMember: parsed.data.isIamMember,
        iamId: parsed.data.iamId,
        selectedTemplate,
        updateProfile: true,
      });
      toast.success("Card created! Preview it on your dashboard.");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      console.error("Onboarding failed:", err);
      toast.error(err.message ?? "Failed to create your card");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden bg-transparent">
            <img src={CardExLogo} alt="Card-Ex Logo" className="h-full w-full object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Set up your Card-Ex
          </CardTitle>
          <CardDescription>
            Tell us a few things. We'll instantly create your digital business card.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                <Label htmlFor="first">First Name <span className="text-destructive">*</span></Label>
                <Input id="first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required aria-invalid={!!errors.firstName} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last">Last Name <span className="text-destructive">*</span></Label>
                <Input id="last" value={lastName} onChange={(e) => setLastName(e.target.value)} required aria-invalid={!!errors.lastName} />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Number <span className="text-destructive">*</span></Label>
              <Input
                id="phone"
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
              <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fb">Facebook Link <span className="text-destructive">*</span></Label>
              <Input
                id="fb"
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
              <Label className="text-sm">IAM Worldwide Member?</Label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={isIamMember}
                    onCheckedChange={(c) => setIsIamMember(c === true)}
                  />
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

              {isIamMember === true && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="iam">IAM ID Number (last 8 digits)</Label>
                  <Input
                    id="iam"
                    inputMode="numeric"
                    pattern="\d{8}"
                    maxLength={8}
                    placeholder="12345678"
                    value={iamId}
                    onChange={(e) => setIamId(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    required
                    aria-invalid={iamIdMissing || !!errors.iamId}
                  />
                  {iamIdMissing ? (
                    <p className="text-xs text-destructive">
                      IAM ID is required (must be exactly 8 digits) when "Yes" is selected.
                    </p>
                  ) : errors.iamId ? (
                    <p className="text-xs text-destructive">{errors.iamId}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      We'll attach this to your product carousel automatically.
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
        </CardContent>
      </Card>

      <TemplateSelectionModal
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        onSelectTemplate={(t) => {
          setSelectedTemplate(t);
          toast.success(`Template "${t.name}" selected`);
        }}
        onBuildFromScratch={() => {
          setSelectedTemplate(null);
        }}
      />
    </div>
  );
}

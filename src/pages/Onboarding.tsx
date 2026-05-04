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
import { buildCardInsertFromSnapshot, buildCardLinksInsertFromSnapshot, type CardSnapshot } from "@/lib/cardSnapshot";
import { Badge } from "@/components/ui/badge";

const DEFAULT_THEME = {
  name: "Black&Gold",
  text: "#F8F8F8",
  primary: "#D4AF37",
  accent: "#FACC15",
  background: "#0B0B0C",
  buttonColor: "#D4AF37",
  baseMode: "dark",
};

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
  const submitDisabled = submitting || iamIdMissing;

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
      const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
      const slug = `${user.id.slice(0, 8)}-${Date.now()}`;

      const productImages = [
        {
          id: crypto.randomUUID(),
          url: "/cardex/placeholders/product-gold-2.svg",
          caption: "Product 1",
          link: parsed.data.isIamMember && parsed.data.iamId
            ? `https://iamworldwide.com/?ref=${parsed.data.iamId}`
            : `https://iamworldwide.com/`,
        },
      ];

      let insertData: Record<string, any>;

      if (selectedTemplate) {
        // Apply template, then override with user-entered fields
        const snapshot = selectedTemplate.layout_data as CardSnapshot;
        insertData = buildCardInsertFromSnapshot(snapshot, user.id, slug, {
          full_name: fullName,
          owner_name: fullName,
          is_published: false,
        });
        insertData.theme = { ...DEFAULT_THEME, ...(snapshot.theme || {}) };

        // Override ALL identity/contact fields with user-entered data
        insertData.full_name = fullName;
        insertData.owner_name = fullName;
        insertData.first_name = parsed.data.firstName;
        insertData.last_name = parsed.data.lastName;
        insertData.middle_name = null;
        insertData.prefix = null;
        insertData.suffix = null;
        insertData.phone = parsed.data.phone;
        insertData.email = parsed.data.email;

        // Replace any facebook entry in social_links with the user's URL
        const existingSocial = Array.isArray(insertData.social_links) ? insertData.social_links : [];
        const filteredSocial = existingSocial.filter(
          (s: any) => (s?.kind || "").toLowerCase() !== "facebook"
        );
        insertData.social_links = [
          ...filteredSocial,
          { kind: "facebook", label: "Facebook", url: parsed.data.facebookUrl, value: parsed.data.facebookUrl },
        ];

        // Keep template product images if it has any; otherwise seed with IAM placeholder
        if (!snapshot.product_images || snapshot.product_images.length === 0) {
          insertData.product_images = productImages;
        }
      } else {
        insertData = {
          user_id: user.id,
          slug,
          full_name: fullName,
          first_name: parsed.data.firstName,
          last_name: parsed.data.lastName,
          owner_name: fullName,
          phone: parsed.data.phone,
          email: parsed.data.email,
          theme: DEFAULT_THEME,
          carousel_enabled: true,
          card_type: "publishable",
          is_published: false,
          is_paid: false,
          product_images: productImages,
        };
      }

      const { data: card, error: cardErr } = await supabase
        .from("cards")
        .insert(insertData as any)
        .select()
        .single();

      if (cardErr) throw cardErr;

      // If template had card_links, copy them with user's contact data substituted in
      let facebookHandled = false;
      if (selectedTemplate) {
        const snapshot = selectedTemplate.layout_data as CardSnapshot;
        if (snapshot.card_links && snapshot.card_links.length > 0) {
          const linkInserts = buildCardLinksInsertFromSnapshot(snapshot, card.id).map((link) => {
            const k = (link.kind || "").toLowerCase();
            if (k === "phone" || k === "sms" || k === "whatsapp" || k === "viber" || k === "telegram") {
              return { ...link, value: parsed.data.phone };
            }
            if (k === "email") {
              return { ...link, value: parsed.data.email };
            }
            if (k === "facebook" || k === "messenger") {
              facebookHandled = true;
              return { ...link, value: parsed.data.facebookUrl };
            }
            return link;
          });
          await supabase.from("card_links").insert(linkInserts);
        }
      }

      // Ensure Facebook link exists if not already in template
      if (!facebookHandled) {
        const { error: linkErr } = await supabase.from("card_links").insert({
          card_id: card.id,
          kind: "facebook",
          label: "Facebook",
          value: parsed.data.facebookUrl,
          icon: "facebook",
          sort_index: 999,
        } as any);
        if (linkErr) console.warn("Facebook link insert failed:", linkErr);
      }

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: parsed.data.phone,
          iam_id: parsed.data.isIamMember ? parsed.data.iamId : null,
          facebook_url: parsed.data.facebookUrl,
          onboarding_completed_at: new Date().toISOString(),
        } as any)
        .eq("id", user.id);
      if (profileErr) console.warn("Profile update failed:", profileErr);

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
            {/* Template picker */}
            <div className="rounded-lg border border-border/50 p-3 bg-background/40">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Layers className="h-4 w-4 text-primary" />
                    Starting template
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {selectedTemplate
                      ? selectedTemplate.name
                      : "Default Black & Gold (no template)"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedTemplate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTemplate(null)}
                    >
                      Clear
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setTemplateModalOpen(true)}
                  >
                    {selectedTemplate ? "Change" : "Choose"}
                  </Button>
                </div>
              </div>
              {selectedTemplate && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  Your info below will replace the template's details
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first">First Name</Label>
                <Input id="first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required aria-invalid={!!errors.firstName} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last">Last Name</Label>
                <Input id="last" value={lastName} onChange={(e) => setLastName(e.target.value)} required aria-invalid={!!errors.lastName} />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Number</Label>
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
              <Label htmlFor="email">Email Address</Label>
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
              <Label htmlFor="fb">Facebook Link</Label>
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

              {isIamMember && (
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

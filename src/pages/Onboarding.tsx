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
  phone: z.string().trim().min(7, "Enter a valid mobile number").max(30),
  email: z.string().trim().email("Invalid email").max(255),
  facebookUrl: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .refine((v) => /facebook\.com|fb\.com|fb\.me/i.test(v), "Must be a Facebook link"),
  iamId: z.string().trim().regex(/^\d{8}$/, "IAM ID must be exactly 8 digits"),
});

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

    const parsed = schema.safeParse({ firstName, lastName, phone, email, facebookUrl, iamId });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Please check the form");
      return;
    }

    setSubmitting(true);
    try {
      const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
      const slug = `${user.id.slice(0, 8)}-${Date.now()}`;

      const productImages = [
        {
          id: crypto.randomUUID(),
          url: "/cardex/placeholders/product-gold-2.svg",
          caption: "Product 1",
          link: `https://iamworldwide.com/?ref=${parsed.data.iamId}`,
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
        insertData.first_name = parsed.data.firstName;
        insertData.last_name = parsed.data.lastName;
        insertData.phone = parsed.data.phone;
        insertData.email = parsed.data.email;
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

      // If template had card_links, copy them; otherwise insert just Facebook
      if (selectedTemplate) {
        const snapshot = selectedTemplate.layout_data as CardSnapshot;
        if (snapshot.card_links && snapshot.card_links.length > 0) {
          const linkInserts = buildCardLinksInsertFromSnapshot(snapshot, card.id);
          await supabase.from("card_links").insert(linkInserts);
        }
      }

      // Always ensure Facebook link exists
      const { error: linkErr } = await supabase.from("card_links").insert({
        card_id: card.id,
        kind: "facebook",
        label: "Facebook",
        value: parsed.data.facebookUrl,
        icon: "facebook",
        sort_index: 999,
      } as any);
      if (linkErr) console.warn("Facebook link insert failed:", linkErr);

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: parsed.data.phone,
          iam_id: parsed.data.iamId,
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
                <Input id="first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last">Last Name</Label>
                <Input id="last" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
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
              />
            </div>

            <div className="space-y-2">
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
              />
              <p className="text-xs text-muted-foreground">
                We'll attach this to your product carousel automatically.
              </p>
            </div>

            <Button type="submit" className="w-full h-12" disabled={submitting}>
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

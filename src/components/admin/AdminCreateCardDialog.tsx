import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TemplateSelectionModal } from "@/components/templates/TemplateSelectionModal";
import { CardTemplate } from "@/hooks/useTemplates";
import {
  buildCardInsertFromSnapshot,
  buildCardLinksInsertFromSnapshot,
  type CardSnapshot,
} from "@/lib/cardSnapshot";

interface AdminCreateCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUserName: string;
  onSuccess?: () => void;
}

const DEFAULT_THEME = {
  name: "Black&Gold",
  text: "#F8F8F8",
  primary: "#D4AF37",
  accent: "#FACC15",
  background: "#0B0B0C",
  buttonColor: "#D4AF37",
  baseMode: "dark",
};

const schema = z
  .object({
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
  })
  .refine((d) => !d.isIamMember || /^\d{8}$/.test(d.iamId ?? ""), {
    message: "IAM ID must be exactly 8 digits",
    path: ["iamId"],
  });

export function AdminCreateCardDialog({
  open,
  onOpenChange,
  targetUserId,
  targetUserName,
  onSuccess,
}: AdminCreateCardDialogProps) {
  const navigate = useNavigate();
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

  // Prefill from profile when opening
  useEffect(() => {
    if (!open || !targetUserId) return;
    setErrors({});
    setSelectedTemplate(null);

    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, facebook_url, iam_id")
        .eq("id", targetUserId)
        .maybeSingle();

      const fullName = (profile?.full_name || targetUserName || "").trim();
      const parts = fullName.split(/\s+/);
      setFirstName(parts[0] ?? "");
      setLastName(parts.slice(1).join(" ") ?? "");
      setPhone(profile?.phone || "");
      setFacebookUrl(profile?.facebook_url || "");
      if (profile?.iam_id) {
        setIsIamMember(true);
        setIamId(String(profile.iam_id));
      } else {
        setIsIamMember(false);
        setIamId("");
      }

      // Fetch email via dedicated, safer edge function (never blocks the form)
      let resolvedEmail = "";
      try {
        const { data: result } = await supabase.functions.invoke("admin-get-user-email", {
          body: { user_id: targetUserId },
        });
        if (result?.email) resolvedEmail = String(result.email);
      } catch (err) {
        console.warn("admin-get-user-email failed, falling back:", err);
      }

      // Fallback 1: legacy bulk endpoint
      if (!resolvedEmail) {
        try {
          const { data: result } = await supabase.functions.invoke("admin-list-users", {
            body: { user_ids: [targetUserId] },
          });
          const e = result?.users?.[targetUserId];
          if (e) resolvedEmail = String(e);
        } catch (err) {
          console.warn("admin-list-users fallback failed:", err);
        }
      }

      setEmail(resolvedEmail);
    })();
  }, [open, targetUserId, targetUserName]);

  const iamIdMissing = isIamMember && !/^\d{8}$/.test(iamId);
  const submitDisabled = submitting || iamIdMissing;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) return;

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
      const slug = `${targetUserId.slice(0, 8)}-${Date.now()}`;

      const productImages = [
        {
          id: crypto.randomUUID(),
          url: "/cardex/placeholders/product-gold-2.svg",
          caption: "Product 1",
          link:
            parsed.data.isIamMember && parsed.data.iamId
              ? `https://iamworldwide.com/?ref=${parsed.data.iamId}`
              : `https://iamworldwide.com/`,
        },
      ];

      const iamId8 = parsed.data.isIamMember && parsed.data.iamId ? parsed.data.iamId : null;
      const substituteIamId = (url: string | undefined | null): string | undefined | null => {
        if (!url || !iamId8) return url;
        return url
          .replace(/(idno=)\d{6,}/gi, `$1${iamId8}`)
          .replace(/(\?|&)(ref|referrer|referral|iamid|iam_id)=\d{6,}/gi, `$1$2=${iamId8}`);
      };
      const substituteInItems = <T extends { link?: string | null; url?: string | null }>(
        items: T[] | undefined | null,
      ): T[] | undefined | null => {
        if (!Array.isArray(items)) return items;
        return items.map((it) => ({ ...it, link: substituteIamId((it as any).link) ?? (it as any).link })) as T[];
      };
      const substituteInCarouselSettings = (cs: any): any => {
        if (!cs || typeof cs !== "object") return cs;
        const next = { ...cs };
        const section = next.products;
        if (section && typeof section === "object" && section.cta) {
          next.products = {
            ...section,
            cta: { ...section.cta, href: substituteIamId(section.cta.href) ?? section.cta.href },
          };
        }
        return next;
      };

      let insertData: Record<string, any>;

      if (selectedTemplate) {
        const snapshot = selectedTemplate.layout_data as CardSnapshot;
        insertData = buildCardInsertFromSnapshot(snapshot, targetUserId, slug, {
          full_name: fullName,
          owner_name: fullName,
          is_published: false,
        });
        insertData.theme = { ...DEFAULT_THEME, ...(snapshot.theme || {}) };

        insertData.carousel_settings = substituteInCarouselSettings(insertData.carousel_settings);
        insertData.product_images = substituteInItems(insertData.product_images);

        insertData.full_name = fullName;
        insertData.owner_name = fullName;
        insertData.first_name = parsed.data.firstName;
        insertData.last_name = parsed.data.lastName;
        insertData.middle_name = null;
        insertData.prefix = null;
        insertData.suffix = null;
        insertData.phone = parsed.data.phone;
        insertData.email = parsed.data.email;

        const existingSocial = Array.isArray(insertData.social_links) ? insertData.social_links : [];
        const filteredSocial = existingSocial.filter((s: any) => (s?.kind || "").toLowerCase() !== "facebook");
        insertData.social_links = [
          ...filteredSocial,
          { kind: "facebook", label: "Facebook", url: parsed.data.facebookUrl, value: parsed.data.facebookUrl },
        ];

        if (!snapshot.product_images || snapshot.product_images.length === 0) {
          insertData.product_images = productImages;
        }
      } else {
        insertData = {
          user_id: targetUserId,
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
            if (k === "url" || k === "custom") {
              return { ...link, value: substituteIamId(link.value) ?? link.value };
            }
            return link;
          });
          await supabase.from("card_links").insert(linkInserts);
        }
      }

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
        } as any)
        .eq("id", targetUserId);
      if (profileErr) console.warn("Profile update failed:", profileErr);

      toast.success(`Card created for ${fullName}`);
      onOpenChange(false);
      onSuccess?.();
      navigate(`/cards/${card.id}/edit`);
    } catch (err: any) {
      console.error("Admin create card failed:", err);
      toast.error(err.message ?? "Failed to create card");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Set up Card-Ex for {targetUserName}
          </DialogTitle>
          <DialogDescription>
            Tell us a few things. We'll instantly create their digital business card.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          {/* Template picker */}
          <div className="rounded-lg border border-border/50 p-3 bg-background/40">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Layers className="h-4 w-4 text-primary" />
                  Starting template
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {selectedTemplate ? selectedTemplate.name : "Default Black & Gold (no template)"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedTemplate && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
                    Clear
                  </Button>
                )}
                <Button type="button" variant="secondary" size="sm" onClick={() => setTemplateModalOpen(true)}>
                  {selectedTemplate ? "Change" : "Choose"}
                </Button>
              </div>
            </div>
            {selectedTemplate && (
              <Badge variant="secondary" className="mt-2 text-xs">
                Info below will replace the template's details
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="admin-first">First Name</Label>
              <Input
                id="admin-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-last">Last Name</Label>
              <Input
                id="admin-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-phone">Mobile Number</Label>
            <Input
              id="admin-phone"
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
            <Label htmlFor="admin-email">Email Address</Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-fb">Facebook Link</Label>
            <Input
              id="admin-fb"
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
                <Checkbox checked={isIamMember} onCheckedChange={(c) => setIsIamMember(c === true)} />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={!isIamMember}
                  onCheckedChange={(c) => {
                    if (c === true) {
                      setIsIamMember(false);
                      setIamId("");
                    }
                  }}
                />
                <span className="text-sm">No</span>
              </label>
            </div>

            {isIamMember && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="admin-iam">IAM ID Number (last 8 digits)</Label>
                <Input
                  id="admin-iam"
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
                    We'll attach this to the product carousel automatically.
                  </p>
                )}
              </div>
            )}
          </div>

          <Button type="submit" className="w-full h-12" disabled={submitDisabled}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating card...
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
          onBuildFromScratch={() => {
            setSelectedTemplate(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye, Mail, Phone, Globe } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { z } from "zod";
import ImageUpload from "@/components/ImageUpload";

type CardData = Tables<"cards">;

// Validation schema for card data
const cardSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(100, "Full name must be 100 characters or less"),
  title: z.string().trim().max(100, "Title must be 100 characters or less").optional().or(z.literal("")),
  company: z.string().trim().max(100, "Company must be 100 characters or less").optional().or(z.literal("")),
  bio: z.string().trim().max(500, "Bio must be 500 characters or less").optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email format").max(255, "Email must be 255 characters or less").optional().or(z.literal("")),
  phone: z.string().trim().max(30, "Phone must be 30 characters or less").optional().or(z.literal("")),
  website: z.string().trim().max(255, "Website must be 255 characters or less")
    .refine((val) => !val || val.startsWith("http://") || val.startsWith("https://"), {
      message: "Website must start with http:// or https://"
    })
    .refine((val) => !val || !/^(javascript|data|vbscript):/i.test(val), {
      message: "Invalid URL scheme"
    })
    .optional().or(z.literal("")),
  location: z.string().trim().max(200, "Location must be 200 characters or less").optional().or(z.literal("")),
});

export default function CardEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState<CardData | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCard();
  }, [id]);

  const loadCard = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      toast.error("Card not found");
      navigate("/dashboard");
    } else {
      setCard(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!card) return;

    // Validate data before saving
    try {
      const validationData = {
        full_name: card.full_name,
        title: card.title || "",
        company: card.company || "",
        bio: card.bio || "",
        email: card.email || "",
        phone: card.phone || "",
        website: card.website || "",
        location: card.location || "",
      };

      cardSchema.parse(validationData);
      setValidationErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setValidationErrors(errors);
        toast.error("Please fix validation errors before saving");
        return;
      }
    }

    setSaving(true);
    const { error } = await supabase
      .from("cards")
      .update({
        full_name: card.full_name,
        title: card.title,
        company: card.company,
        bio: card.bio,
        email: card.email,
        phone: card.phone,
        website: card.website,
        location: card.location,
        avatar_url: card.avatar_url,
        cover_url: card.cover_url,
        logo_url: card.logo_url,
        is_published: card.is_published,
      })
      .eq("id", card.id);

    if (error) {
      toast.error(error.message || "Failed to save card");
    } else {
      toast.success("Card saved!");
    }
    setSaving(false);
  };

  const togglePublish = async () => {
    if (!card) return;

    const newStatus = !card.is_published;
    const { error } = await supabase
      .from("cards")
      .update({ is_published: newStatus })
      .eq("id", card.id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      setCard({ ...card, is_published: newStatus });
      toast.success(newStatus ? "Card published!" : "Card unpublished");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!card) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(`/c/${card.slug}`, "_blank")}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button onClick={togglePublish} variant={card.is_published ? "secondary" : "default"}>
              {card.is_published ? "Unpublish" : "Publish"}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Images Section */}
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ImageUpload
                value={card.avatar_url}
                onChange={(url) => setCard({ ...card, avatar_url: url })}
                label="Avatar"
                aspectRatio="aspect-square"
                maxSize={5}
              />
              <ImageUpload
                value={card.cover_url}
                onChange={(url) => setCard({ ...card, cover_url: url })}
                label="Cover Photo"
                aspectRatio="aspect-[3/1]"
                maxSize={5}
              />
              <ImageUpload
                value={card.logo_url}
                onChange={(url) => setCard({ ...card, logo_url: url })}
                label="Company Logo"
                aspectRatio="aspect-square"
                maxSize={2}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={card.full_name}
                  onChange={(e) => setCard({ ...card, full_name: e.target.value })}
                  className={validationErrors.full_name ? "border-destructive" : ""}
                />
                {validationErrors.full_name && (
                  <p className="text-sm text-destructive">{validationErrors.full_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={card.title || ""}
                  onChange={(e) => setCard({ ...card, title: e.target.value })}
                  placeholder="e.g. CEO, Designer"
                  maxLength={100}
                  className={validationErrors.title ? "border-destructive" : ""}
                />
                {validationErrors.title && (
                  <p className="text-sm text-destructive">{validationErrors.title}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={card.company || ""}
                  onChange={(e) => setCard({ ...card, company: e.target.value })}
                  maxLength={100}
                  className={validationErrors.company ? "border-destructive" : ""}
                />
                {validationErrors.company && (
                  <p className="text-sm text-destructive">{validationErrors.company}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={card.bio || ""}
                  onChange={(e) => setCard({ ...card, bio: e.target.value })}
                  rows={4}
                  maxLength={500}
                  className={validationErrors.bio ? "border-destructive" : ""}
                />
                {validationErrors.bio && (
                  <p className="text-sm text-destructive">{validationErrors.bio}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={card.email || ""}
                  onChange={(e) => setCard({ ...card, email: e.target.value })}
                  maxLength={255}
                  className={validationErrors.email ? "border-destructive" : ""}
                />
                {validationErrors.email && (
                  <p className="text-sm text-destructive">{validationErrors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={card.phone || ""}
                  onChange={(e) => setCard({ ...card, phone: e.target.value })}
                  maxLength={30}
                  className={validationErrors.phone ? "border-destructive" : ""}
                />
                {validationErrors.phone && (
                  <p className="text-sm text-destructive">{validationErrors.phone}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={card.website || ""}
                  onChange={(e) => setCard({ ...card, website: e.target.value })}
                  placeholder="https://"
                  maxLength={255}
                  className={validationErrors.website ? "border-destructive" : ""}
                />
                {validationErrors.website && (
                  <p className="text-sm text-destructive">{validationErrors.website}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={card.location || ""}
                  onChange={(e) => setCard({ ...card, location: e.target.value })}
                  placeholder="City, Country"
                  maxLength={200}
                  className={validationErrors.location ? "border-destructive" : ""}
                />
                {validationErrors.location && (
                  <p className="text-sm text-destructive">{validationErrors.location}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="lg:sticky lg:top-8 lg:h-fit">
          <Card className="overflow-hidden border-border/50">
            <CardHeader className="bg-gradient-to-br from-muted/50 to-muted/20">
              <CardTitle className="text-center text-sm font-medium">Card Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
                {/* Cover */}
                <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5">
                  {card.cover_url && (
                    <img src={card.cover_url} alt="Cover" className="h-full w-full object-cover" />
                  )}
                  {card.logo_url && (
                    <div className="absolute right-3 top-3 h-12 w-12 rounded-lg border-2 border-background bg-background p-1">
                      <img src={card.logo_url} alt="Logo" className="h-full w-full object-contain" />
                    </div>
                  )}
                </div>
                
                {/* Avatar */}
                <div className="relative -mt-12 px-4">
                  <div className="mx-auto h-24 w-24 rounded-full border-4 border-background bg-muted overflow-hidden">
                    {card.avatar_url && (
                      <img src={card.avatar_url} alt={card.full_name} className="h-full w-full object-cover" />
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="px-4 py-3 text-center">
                  <h3 className="text-lg font-bold">{card.full_name}</h3>
                  {card.title && <p className="text-sm text-foreground/70">{card.title}</p>}
                  {card.company && <p className="text-xs text-muted-foreground">{card.company}</p>}
                  {card.bio && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{card.bio}</p>}
                </div>

                {/* Contact Buttons Preview */}
                <div className="space-y-2 px-4 pb-4">
                  {card.email && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500">
                        <Mail className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 truncate">
                        <p className="text-xs font-medium truncate">{card.email}</p>
                      </div>
                    </div>
                  )}
                  {card.phone && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500">
                        <Phone className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium">{card.phone}</p>
                      </div>
                    </div>
                  )}
                  {card.website && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500">
                        <Globe className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 truncate">
                        <p className="text-xs font-medium truncate">{card.website}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

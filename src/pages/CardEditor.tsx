import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

export default function CardEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState<CardData | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

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
        is_published: card.is_published,
      })
      .eq("id", card.id);

    if (error) {
      toast.error("Failed to save card");
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
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={card.full_name}
                  onChange={(e) => setCard({ ...card, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={card.title || ""}
                  onChange={(e) => setCard({ ...card, title: e.target.value })}
                  placeholder="e.g. CEO, Designer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={card.company || ""}
                  onChange={(e) => setCard({ ...card, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={card.bio || ""}
                  onChange={(e) => setCard({ ...card, bio: e.target.value })}
                  rows={4}
                />
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={card.phone || ""}
                  onChange={(e) => setCard({ ...card, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={card.website || ""}
                  onChange={(e) => setCard({ ...card, website: e.target.value })}
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={card.location || ""}
                  onChange={(e) => setCard({ ...card, location: e.target.value })}
                  placeholder="City, Country"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-8 lg:h-fit">
          <Card className="overflow-hidden border-primary/20">
            <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardTitle className="text-center">Live Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 rounded-2xl border border-border/50 bg-card/50 p-6 text-center">
                <div className="mx-auto h-24 w-24 rounded-full bg-primary/10" />
                <div>
                  <h2 className="text-2xl font-bold">{card.full_name}</h2>
                  {card.title && <p className="text-muted-foreground">{card.title}</p>}
                  {card.company && (
                    <p className="text-sm text-muted-foreground">{card.company}</p>
                  )}
                </div>
                {card.bio && (
                  <p className="text-sm text-muted-foreground">{card.bio}</p>
                )}
                <div className="space-y-2 pt-4">
                  {card.email && (
                    <p className="text-sm text-muted-foreground">{card.email}</p>
                  )}
                  {card.phone && (
                    <p className="text-sm text-muted-foreground">{card.phone}</p>
                  )}
                  {card.location && (
                    <p className="text-sm text-muted-foreground">{card.location}</p>
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

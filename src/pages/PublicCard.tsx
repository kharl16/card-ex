import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Phone, MapPin, Globe, Download } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

export default function PublicCard() {
  const { slug } = useParams();
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCard();
  }, [slug]);

  const loadCard = async () => {
    if (!slug) return;

    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (!error && data) {
      setCard(data);
      // Track view through Edge Function (with rate limiting)
      supabase.functions.invoke('track-card-event', {
        body: { card_id: data.id, kind: 'view' }
      }).catch(err => console.error('Failed to track view:', err));
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold">404</h1>
          <p className="text-muted-foreground">Card not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-md">
        <Card className="overflow-hidden border-border/50 shadow-lg">
          {/* Header with cover image placeholder */}
          <div className="relative h-40 bg-gradient-to-br from-primary/20 to-primary/5">
            {card.cover_url && (
              <img src={card.cover_url} alt="Cover" className="h-full w-full object-cover" />
            )}
          </div>

          {/* Avatar */}
          <div className="relative -mt-16 px-6">
            <div className="mx-auto h-32 w-32 rounded-full border-4 border-background bg-muted">
              {card.avatar_url && (
                <img src={card.avatar_url} alt={card.full_name} className="h-full w-full rounded-full object-cover" />
              )}
            </div>
          </div>

          {/* Profile Info */}
          <div className="px-6 py-4 text-center">
            <h1 className="text-2xl font-bold">{card.full_name}</h1>
            {card.title && <p className="text-lg text-foreground/80">{card.title}</p>}
            {card.company && <p className="text-sm text-muted-foreground">{card.company}</p>}
            {card.bio && <p className="mt-3 text-sm text-muted-foreground">{card.bio}</p>}
          </div>

          {/* Contact Buttons with Green Circles */}
          <div className="space-y-3 px-6 pb-6">
            {card.email && (
              <button
                onClick={() => window.open(`mailto:${card.email}`)}
                className="flex w-full items-center gap-3 text-left transition-opacity hover:opacity-80"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{card.email}</p>
                  <p className="text-xs text-muted-foreground">Personal</p>
                </div>
              </button>
            )}

            {card.phone && (
              <button
                onClick={() => window.open(`tel:${card.phone}`)}
                className="flex w-full items-center gap-3 text-left transition-opacity hover:opacity-80"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{card.phone}</p>
                  <p className="text-xs text-muted-foreground">Mobile</p>
                </div>
              </button>
            )}

            {card.website && (
              <button
                onClick={() => window.open(card.website!, "_blank")}
                className="flex w-full items-center gap-3 text-left transition-opacity hover:opacity-80"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Visit Website</p>
                  <p className="text-xs text-muted-foreground">{card.website}</p>
                </div>
              </button>
            )}

            {card.location && (
              <div className="flex w-full items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{card.location}</p>
                  <p className="text-xs text-muted-foreground">Location</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Save Contact Button */}
        <div className="mt-6">
          <Button className="w-full gap-2 bg-green-500 hover:bg-green-600">
            <Download className="h-4 w-4" />
            Save Contact
          </Button>
        </div>
      </div>
    </div>
  );
}

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
      // Track view
      await supabase.from("card_events").insert({
        card_id: data.id,
        kind: "view",
      });
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <Card className="overflow-hidden border-primary/20 shadow-gold">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-8">
            <div className="mx-auto mb-6 h-32 w-32 rounded-full bg-primary/20" />
            <div className="text-center">
              <h1 className="mb-2 text-3xl font-bold">{card.full_name}</h1>
              {card.title && <p className="text-lg text-muted-foreground">{card.title}</p>}
              {card.company && (
                <p className="text-sm text-muted-foreground">{card.company}</p>
              )}
            </div>
          </div>

          <div className="space-y-6 p-8">
            {card.bio && (
              <p className="text-center text-muted-foreground">{card.bio}</p>
            )}

            <div className="space-y-3">
              {card.email && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => window.open(`mailto:${card.email}`)}
                >
                  <Mail className="h-5 w-5 text-primary" />
                  <span className="flex-1 text-left">{card.email}</span>
                </Button>
              )}

              {card.phone && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => window.open(`tel:${card.phone}`)}
                >
                  <Phone className="h-5 w-5 text-primary" />
                  <span className="flex-1 text-left">{card.phone}</span>
                </Button>
              )}

              {card.website && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => window.open(card.website!, "_blank")}
                >
                  <Globe className="h-5 w-5 text-primary" />
                  <span className="flex-1 text-left">{card.website}</span>
                </Button>
              )}

              {card.location && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  disabled
                >
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="flex-1 text-left">{card.location}</span>
                </Button>
              )}
            </div>

            <div className="pt-4">
              <Button className="w-full gap-2">
                <Download className="h-4 w-4" />
                Save Contact
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

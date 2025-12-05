import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SignOutButton from "@/components/auth/SignOutButton";
import AdminButton from "@/components/AdminButton";
import { Plus, CreditCard, TrendingUp, Share2, Palette } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
import LoadingAnimation from "@/components/LoadingAnimation";
import ShareCardDialog from "@/components/ShareCardDialog";
import DeploymentStatus from "@/components/DeploymentStatus";
import { NewCardDialog } from "@/components/templates/NewCardDialog";
import { AdminTemplateManager } from "@/components/templates/AdminTemplateManager";
import { useAuth } from "@/contexts/AuthContext";

type CardData = Tables<"cards">;

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [newCardDialogOpen, setNewCardDialogOpen] = useState(false);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);

  useEffect(() => {
    loadProfile();
    loadCards();
  }, []);

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data);
    }
  };

  const loadCards = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load cards");
      } else {
        setCards(data || []);
      }
    }
    setLoading(false);
  };

  const openShareDialog = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCardId(cardId);
    setShareDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden bg-transparent transition-transform duration-300 hover:rotate-12">
              <img src={CardExLogo} alt="Card-Ex Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl font-bold">Card-Ex</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button onClick={() => setTemplateManagerOpen(true)} variant="outline" size="sm" className="gap-2">
                <Palette className="h-4 w-4" />
                Templates
              </Button>
            )}
            <AdminButton />
            <Button onClick={() => navigate("/gallery")} variant="outline" size="sm">
              Gallery
            </Button>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <DeploymentStatus />
        </div>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Your Cards</h1>
            <p className="text-muted-foreground">Manage your digital business cards</p>
          </div>
          <Button onClick={() => setNewCardDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Card
          </Button>
        </div>

        {loading ? (
          <LoadingAnimation />
        ) : cards.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No cards yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Create your first digital business card
              </p>
              <Button onClick={() => setNewCardDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Card
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <Card
                key={card.id}
                className="cursor-pointer transition-all hover:shadow-gold"
                onClick={() => navigate(`/cards/${card.id}/edit`)}
              >
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between">
                    <CardTitle className="text-lg">{card.full_name}</CardTitle>
                    <div
                      className={`h-2 w-2 rounded-full ${
                        card.is_published ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  </div>
                  <CardDescription>
                    {card.title || "No title"} • {card.company || "No company"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        <span>{card.views_count || 0} views</span>
                      </div>
                      <span>/{card.slug}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => openShareDialog(card.id, e)}
                      className="h-8 w-8"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {selectedCardId && (
        <ShareCardDialog
          cardId={selectedCardId}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
        />
      )}

      <NewCardDialog
        open={newCardDialogOpen}
        onOpenChange={setNewCardDialogOpen}
        profileName={profile?.full_name}
      />

      <AdminTemplateManager
        open={templateManagerOpen}
        onOpenChange={setTemplateManagerOpen}
      />
    </div>
  );
}

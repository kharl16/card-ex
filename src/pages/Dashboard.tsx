import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SignOutButton from "@/components/auth/SignOutButton";
import AdminButton from "@/components/AdminButton";
import { CreditCard, Palette } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
import LoadingAnimation from "@/components/LoadingAnimation";
import eagleImg from "@/assets/disc/eagle.jpg";
import roosterImg from "@/assets/disc/rooster.jpg";
import carabaoImg from "@/assets/disc/carabao.jpg";
import tarsierImg from "@/assets/disc/tarsier.jpg";

const discAnimalImages: Record<string, string> = {
  D: eagleImg, I: roosterImg, S: carabaoImg, C: tarsierImg,
};
const discLabels: Record<string, string> = {
  D: "Dominant (Eagle)", I: "Influential (Rooster)", S: "Steady (Carabao)", C: "Conscientious (Tarsier)",
};
import { discResults } from "@/data/discResults";
import ShareCardDialog from "@/components/ShareCardDialog";
import { NewCardDialog } from "@/components/templates/NewCardDialog";
import { AdminTemplateManager } from "@/components/templates/AdminTemplateManager";
import { DuplicateCardDialog } from "@/components/DuplicateCardDialog";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DashboardCardTile } from "@/components/dashboard/DashboardCardTile";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardOrb } from "@/components/dashboard/DashboardOrb";

type CardData = Tables<"cards">;
type FilterMode = "all" | "published" | "draft";
type SortMode = "newest" | "oldest" | "nameAsc" | "nameDesc";

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCardForDuplicate, setSelectedCardForDuplicate] = useState<CardData | null>(null);
  const [newCardDialogOpen, setNewCardDialogOpen] = useState(false);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTargetCard, setRenameTargetCard] = useState<CardData | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  const searchTerm = "";
  const filterMode: FilterMode = "all";
  const sortMode: SortMode = "newest";

  useEffect(() => {
    loadProfile();
    loadCards();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
    }
  };

  const loadCards = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
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

  const openDuplicateDialog = (card: CardData, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCardForDuplicate(card);
  };

  const handleDeleteCard = async (card: CardData, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Delete "${card.full_name || "Untitled Card"}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const { error } = await supabase.from("cards").delete().eq("id", card.id);
      if (error) { toast.error("Failed to delete card"); return; }
      toast.success("Card deleted");
      setCards((prev) => prev.filter((c) => c.id !== card.id));
    } catch { toast.error("Failed to delete card"); }
  };

  const openRenameDialog = (card: CardData, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameTargetCard(card);
    setRenameValue(card.full_name || "Untitled Card");
    setRenameDialogOpen(true);
  };

  const handleRenameSave = async () => {
    if (!renameTargetCard) return;
    const trimmedName = renameValue.trim();
    if (!trimmedName) { toast.error("Card name cannot be empty."); return; }
    if (trimmedName === (renameTargetCard.full_name || "Untitled Card")) { setRenameDialogOpen(false); return; }
    try {
      setRenameSaving(true);
      const { error } = await supabase.from("cards").update({ full_name: trimmedName }).eq("id", renameTargetCard.id);
      if (error) { toast.error("Failed to save changes"); return; }
      toast.success("Card name updated");
      setCards((prev) => prev.map((c) => (c.id === renameTargetCard.id ? { ...c, full_name: trimmedName } : c)));
      setRenameDialogOpen(false);
      setRenameTargetCard(null);
    } catch { toast.error("Failed to save changes"); }
    finally { setRenameSaving(false); }
  };

  const handleRenameDialogOpenChange = (open: boolean) => {
    setRenameDialogOpen(open);
    if (!open) { setRenameTargetCard(null); setRenameValue(""); setRenameSaving(false); }
  };

  const handleQuickShare = () => {
    if (cards.length > 0) {
      setSelectedCardId(cards[0].id);
      setShareDialogOpen(true);
    }
  };

  const filteredAndSortedCards = useMemo(() => {
    const list = [...cards];
    list.sort((a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime());
    return list;
  }, [cards]);

  const discType = useMemo(() => {
    for (const card of cards) {
      const dr = card.disc_result as any;
      if (dr?.type && discAnimalImages[dr.type]) return dr.type as string;
    }
    return null;
  }, [cards]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden max-w-[100vw] pb-20 sm:pb-0">
      {/* Header - minimal */}
      <header className="sticky top-0 z-40 border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <img src={CardExLogo} alt="Card-Ex" className="h-8 w-8 object-contain" />
            <span className="text-lg font-bold tracking-tight">Card-Ex</span>
          </div>
          <div className="flex items-center gap-1">
            {discType && (() => {
              const result = discResults.find(r => r.type === discType);
              return result ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <img
                      src={discAnimalImages[discType]}
                      alt={discLabels[discType]}
                      className="h-7 w-7 rounded-full object-cover border-2 border-primary/50 cursor-pointer hover:scale-110 transition-transform"
                    />
                  </PopoverTrigger>
                  <PopoverContent side="bottom" align="end" className="w-72 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={discAnimalImages[discType]} alt={result.animalName} className="h-12 w-12 rounded-full object-cover border-2 border-primary/30" />
                      <div>
                        <p className="font-semibold text-sm">{result.englishTitle}</p>
                        <p className="text-xs text-muted-foreground">{result.animalName} {result.emoji}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{result.englishDescription}</p>
                    <div className="mb-2">
                      <p className="text-xs font-medium mb-1">Strengths</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {result.strengths.english.slice(0, 3).map((s, i) => (
                          <li key={i} className="flex items-start gap-1"><span className="text-primary">•</span>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1">Growth Tips</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {result.growthTips.english.slice(0, 3).map((t, i) => (
                          <li key={i} className="flex items-start gap-1"><span className="text-accent-foreground">•</span>{t}</li>
                        ))}
                      </ul>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : null;
            })()}
            {isAdmin && (
              <Button onClick={() => setTemplateManagerOpen(true)} variant="ghost" size="icon" className="h-8 w-8">
                <Palette className="h-3.5 w-3.5" />
              </Button>
            )}
            <AdminButton />
            <NotificationBell />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 overflow-hidden">
        {/* Welcome + Quick Actions */}
        <div className="space-y-5">
          <WelcomeBanner profile={profile} cards={cards} />
          <QuickActions
            onNewCard={() => setNewCardDialogOpen(true)}
            onQuickShare={handleQuickShare}
            hasCards={cards.length > 0}
          />
        </div>

        {/* Cards section */}
        {loading ? (
          <LoadingAnimation />
        ) : cards.length === 0 ? (
          <Card className="border-dashed border-border/40 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <CreditCard className="h-8 w-8 text-primary/60" />
              </div>
              <h3 className="mb-2 text-lg font-bold">No cards yet</h3>
              <p className="mb-6 max-w-xs text-center text-sm text-muted-foreground">
                Create your first digital business card and start networking smarter.
              </p>
              <Button onClick={() => setNewCardDialogOpen(true)} className="h-12 gap-2 rounded-xl px-8 text-base font-semibold">
                Create Your First Card
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Card list — stacked on mobile for readability, grid on desktop */}
            {filteredAndSortedCards.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No cards match your search.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredAndSortedCards.map((card) => (
                  <DashboardCardTile
                    key={card.id}
                    card={card}
                    onShare={openShareDialog}
                    onDuplicate={openDuplicateDialog}
                    onDelete={handleDeleteCard}
                    onRename={openRenameDialog}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity */}
        {!loading && cards.length > 0 && (
          <div className="space-y-6">
            <ActivityFeed />
          </div>
        )}
      </main>

      {/* Dashboard floating orb for quick links */}
      <DashboardOrb />

      {/* Mobile bottom navigation */}
      <MobileBottomNav />

      {/* Dialogs */}
      {selectedCardId && (
        <ShareCardDialog
          cardId={selectedCardId}
          allCardIds={selectedCardId === cards[0]?.id && cards.length > 1 ? cards.map(c => c.id) : undefined}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
        />
      )}
      <NewCardDialog open={newCardDialogOpen} onOpenChange={setNewCardDialogOpen} profileName={profile?.full_name} />
      <AdminTemplateManager open={templateManagerOpen} onOpenChange={setTemplateManagerOpen} />
      {selectedCardForDuplicate && (
        <DuplicateCardDialog
          card={selectedCardForDuplicate}
          open={!!selectedCardForDuplicate}
          onOpenChange={(open) => !open && setSelectedCardForDuplicate(null)}
          onDuplicated={loadCards}
        />
      )}
      <Dialog open={renameDialogOpen} onOpenChange={handleRenameDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Card</DialogTitle>
            <DialogDescription>Change the display name. This does not affect the card URL.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Enter new card name" autoFocus className="h-11 text-base" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleRenameDialogOpenChange(false)} disabled={renameSaving} className="h-11">Cancel</Button>
            <Button onClick={handleRenameSave} disabled={renameSaving} className="h-11">{renameSaving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

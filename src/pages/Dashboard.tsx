import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Plus, CreditCard, Palette, Search } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
import LoadingAnimation from "@/components/LoadingAnimation";
import ShareCardDialog from "@/components/ShareCardDialog";
import { NewCardDialog } from "@/components/templates/NewCardDialog";
import { AdminTemplateManager } from "@/components/templates/AdminTemplateManager";
import { DuplicateCardDialog } from "@/components/DuplicateCardDialog";
import { ReferralPanel } from "@/components/referral/ReferralPanel";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardCardTile } from "@/components/dashboard/DashboardCardTile";

type CardData = Tables<"cards">;
type FilterMode = "all" | "published" | "unpublished";
type SortMode = "newest" | "oldest" | "nameAsc" | "nameDesc" | "viewsDesc" | "viewsAsc";

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

  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

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

  const filteredAndSortedCards = useMemo(() => {
    let list = [...cards];
    list = list.filter((card) => {
      if (filterMode === "published") return !!card.is_published;
      if (filterMode === "unpublished") return !card.is_published;
      return true;
    });
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter((card) => {
        const name = (card.full_name || "").toLowerCase();
        const title = (card.title || "").toLowerCase();
        const company = (card.company || "").toLowerCase();
        return name.includes(q) || title.includes(q) || company.includes(q);
      });
    }
    list.sort((a, b) => {
      switch (sortMode) {
        case "oldest": return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
        case "nameAsc": return (a.full_name || "").localeCompare(b.full_name || "");
        case "nameDesc": return (b.full_name || "").localeCompare(a.full_name || "");
        case "viewsDesc": return (b.views_count || 0) - (a.views_count || 0);
        case "viewsAsc": return (a.views_count || 0) - (b.views_count || 0);
        default: return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
      }
    });
    return list;
  }, [cards, filterMode, searchTerm, sortMode]);

  const hasCards = cards.length > 0;
  const visibleCards = filteredAndSortedCards;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-border/30 bg-card/30 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden transition-transform duration-300 hover:rotate-12">
              <img src={CardExLogo} alt="Card-Ex Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-lg font-bold">Card-Ex</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isAdmin && (
              <Button onClick={() => setTemplateManagerOpen(true)} variant="ghost" size="sm" className="gap-1.5 text-xs">
                <Palette className="h-3.5 w-3.5" />
                Templates
              </Button>
            )}
            <AdminButton />
            <NotificationBell />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Welcome Banner */}
        <WelcomeBanner profile={profile} cards={cards} />

        {/* Quick Actions */}
        <div className="mt-4">
          <QuickActions onNewCard={() => setNewCardDialogOpen(true)} />
        </div>

        {/* Main content grid: cards + sidebar */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Left: Cards section */}
          <div>
            {/* Search + filter bar */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Filter:</span>
                {(
                  [
                    ["all", "All"],
                    ["published", "Published"],
                    ["unpublished", "Draft"],
                  ] as [FilterMode, string][]
                ).map(([mode, label]) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={filterMode === mode ? "default" : "ghost"}
                    className={`h-7 text-xs ${filterMode !== mode ? "text-muted-foreground" : ""}`}
                    onClick={() => setFilterMode(mode)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-56">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-8 pl-8 text-xs"
                    placeholder="Search cards..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="nameAsc">A–Z</option>
                  <option value="nameDesc">Z–A</option>
                  <option value="viewsDesc">Most views</option>
                  <option value="viewsAsc">Least views</option>
                </select>
              </div>
            </div>

            {/* Cards grid */}
            {loading ? (
              <LoadingAnimation />
            ) : visibleCards.length === 0 ? (
              <Card className="border-dashed border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CreditCard className="mb-4 h-12 w-12 text-muted-foreground/40" />
                  <h3 className="mb-2 text-lg font-semibold">
                    {hasCards ? "No cards match your filters" : "No cards yet"}
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {hasCards ? "Try adjusting your search or filters." : "Create your first digital business card."}
                  </p>
                  {!hasCards && (
                    <Button onClick={() => setNewCardDialogOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Card
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleCards.map((card) => (
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

          {/* Right sidebar */}
          <div className="space-y-4">
            <ActivityFeed />
            {profile && <ReferralPanel userPlanCode={null} />}
          </div>
        </div>
      </main>

      {/* Dialogs */}
      {selectedCardId && (
        <ShareCardDialog cardId={selectedCardId} open={shareDialogOpen} onOpenChange={setShareDialogOpen} />
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
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Enter new card name" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleRenameDialogOpenChange(false)} disabled={renameSaving}>Cancel</Button>
            <Button onClick={handleRenameSave} disabled={renameSaving}>{renameSaving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

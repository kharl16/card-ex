import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Plus, CreditCard, TrendingUp, Share2, Palette, Copy, Trash2, Pencil, Search, DollarSign } from "lucide-react";
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

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTargetCard, setRenameTargetCard] = useState<CardData | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  // Search, filters, sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  useEffect(() => {
    loadProfile();
    loadCards();
  }, []);

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
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

    const confirmed = window.confirm(`Delete the card "${card.full_name || "Untitled Card"}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("cards").delete().eq("id", card.id);

      if (error) {
        console.error("Error deleting card:", error);
        toast.error("Failed to delete card");
        return;
      }

      toast.success("Card deleted");
      setCards((prev) => prev.filter((c) => c.id !== card.id));
    } catch (err) {
      console.error("Error deleting card:", err);
      toast.error("Failed to delete card");
    }
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
    if (!trimmedName) {
      toast.error("Card name cannot be empty.");
      return;
    }

    const currentName = renameTargetCard.full_name || "Untitled Card";

    // If nothing changed, just close
    if (trimmedName === currentName) {
      setRenameDialogOpen(false);
      return;
    }

    try {
      setRenameSaving(true);

      // Safe payload: only update the name
      const { error } = await supabase
        .from("cards")
        .update({
          full_name: trimmedName,
        })
        .eq("id", renameTargetCard.id);

      if (error) {
        console.error("Error updating card:", error);
        toast.error("Failed to save changes");
        return;
      }

      toast.success("Card name updated");

      // Optimistic update
      setCards((prev) => prev.map((c) => (c.id === renameTargetCard.id ? { ...c, full_name: trimmedName } : c)));

      setRenameDialogOpen(false);
      setRenameTargetCard(null);
    } catch (err) {
      console.error("Error updating card:", err);
      toast.error("Failed to save changes");
    } finally {
      setRenameSaving(false);
    }
  };

  const handleRenameDialogOpenChange = (open: boolean) => {
    setRenameDialogOpen(open);
    if (!open) {
      setRenameTargetCard(null);
      setRenameValue("");
      setRenameSaving(false);
    }
  };

  // Filtering + search + sort
  const filteredAndSortedCards = useMemo(() => {
    let list = [...cards];

    // Filter
    list = list.filter((card) => {
      switch (filterMode) {
        case "published":
          return !!card.is_published;
        case "unpublished":
          return !card.is_published;
        case "all":
        default:
          return true;
      }
    });

    // Search
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter((card) => {
        const name = (card.full_name || "").toLowerCase();
        const title = (card.title || "").toLowerCase();
        const company = (card.company || "").toLowerCase();
        return name.includes(q) || title.includes(q) || company.includes(q);
      });
    }

    // Sort
    list.sort((a, b) => {
      switch (sortMode) {
        case "oldest":
          return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
        case "nameAsc":
          return (a.full_name || "").localeCompare(b.full_name || "");
        case "nameDesc":
          return (b.full_name || "").localeCompare(a.full_name || "");
        case "viewsDesc":
          return (b.views_count || 0) - (a.views_count || 0);
        case "viewsAsc":
          return (a.views_count || 0) - (b.views_count || 0);
        case "newest":
        default:
          return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
      }
    });

    return list;
  }, [cards, filterMode, searchTerm, sortMode]);

  const hasCards = cards.length > 0;
  const visibleCards = filteredAndSortedCards;

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
        {/* Top bar: title + search + sort + new card */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Your Cards</h1>
            <p className="text-muted-foreground">Manage your digital business cards</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Search className="h-4 w-4" />
              </span>
              <Input
                className="pl-8"
                placeholder="Search by name, title, or company"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="nameAsc">Name A–Z</option>
              <option value="nameDesc">Name Z–A</option>
              <option value="viewsDesc">Most views</option>
              <option value="viewsAsc">Least views</option>
            </select>
            <Button onClick={() => setNewCardDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Card
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filter:</span>
          {(
            [
              ["all", "All"],
              ["published", "Published"],
              ["unpublished", "Unpublished"],
            ] as [FilterMode, string][]
          ).map(([mode, label]) => (
            <Button
              key={mode}
              size="sm"
              variant={filterMode === mode ? "default" : "outline"}
              onClick={() => setFilterMode(mode)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Cards list */}
        {loading ? (
          <LoadingAnimation />
        ) : visibleCards.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleCards.map((card) => (
              <Card
                key={card.id}
                className="cursor-pointer transition-all hover:shadow-gold"
                onClick={() => navigate(`/cards/${card.id}/edit`)}
              >
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{card.full_name || "Untitled Card"}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Rename card"
                        onClick={(e) => openRenameDialog(card, e)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {!card.is_paid && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <DollarSign className="h-3 w-3" />
                          Unpaid
                        </Badge>
                      )}
                      <div
                        className={`h-2 w-2 rounded-full ${card.is_published ? "bg-primary" : "bg-muted"}`}
                        title={card.is_published ? "Published" : "Unpublished"}
                      />
                    </div>
                  </div>
                  <CardDescription>
                    {card.title || "No title"} • {card.company || "No company"}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        <span>{card.views_count || 0} views</span>
                      </div>
                      <span className="truncate text-xs text-muted-foreground/80">/{card.slug}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => openDuplicateDialog(card, e)}
                        className="h-8 w-8"
                        title="Duplicate card"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => openShareDialog(card.id, e)}
                        className="h-8 w-8"
                        title="Share card"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDeleteCard(card, e)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Delete card"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Referral Panel */}
        {profile && (
          <div className="mt-8">
            <ReferralPanel userPlanCode={null} />
          </div>
        )}
      </main>

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

      {/* Rename Card Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={handleRenameDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Card</DialogTitle>
            <DialogDescription>
              Change the display name of this card. This does not affect the card URL/slug.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter new card name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleRenameDialogOpenChange(false)} disabled={renameSaving}>
              Cancel
            </Button>
            <Button onClick={handleRenameSave} disabled={renameSaving}>
              {renameSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

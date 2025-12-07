import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import SignOutButton from "@/components/auth/SignOutButton";
import AdminButton from "@/components/AdminButton";
import {
  Plus,
  CreditCard,
  TrendingUp,
  Share2,
  Palette,
  Copy,
  Trash2,
  Pencil,
  Search,
  Star,
  StarOff,
} from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
import LoadingAnimation from "@/components/LoadingAnimation";
import ShareCardDialog from "@/components/ShareCardDialog";
import { NewCardDialog } from "@/components/templates/NewCardDialog";
import { AdminTemplateManager } from "@/components/templates/AdminTemplateManager";
import { DuplicateCardDialog } from "@/components/DuplicateCardDialog";
import { useAuth } from "@/contexts/AuthContext";

type BaseCardData = Tables<"cards">;

// Extend with optional fields that may exist or be added in Supabase
type CardData = BaseCardData & {
  is_favorite?: boolean | null;
  card_role?: string | null; // e.g. "template", "transferable"
  folder?: string | null; // folder / collection name
};

type FilterMode = "all" | "published" | "unpublished" | "favorites" | "templates" | "transfer";
type SortMode = "newest" | "oldest" | "nameAsc" | "nameDesc" | "viewsDesc" | "viewsAsc";

// Local UI representation of card_role
type CardRoleUI = "standard" | "template" | "transferable";

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

  // Rename dialog state (now also edits folder + card type)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTargetCard, setRenameTargetCard] = useState<CardData | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameFolder, setRenameFolder] = useState("");
  const [renameRole, setRenameRole] = useState<CardRoleUI>("standard");
  const [renameSaving, setRenameSaving] = useState(false);

  // Search, filters, sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  // Bulk selection
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

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
        setCards((data || []) as CardData[]);
      }
    }
    setSelectedCardIds([]);
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

  const handleDeleteCard = async (card: CardData, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

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
      setSelectedCardIds((prev) => prev.filter((id) => id !== card.id));
    } catch (err) {
      console.error("Error deleting card:", err);
      toast.error("Failed to delete card");
    }
  };

  const mapCardRoleToUI = (role?: string | null): CardRoleUI => {
    if (!role) return "standard";
    const value = role.toLowerCase();
    if (value === "template") return "template";
    if (value === "transferable") return "transferable";
    return "standard";
  };

  const mapUIRoleToCardRole = (role: CardRoleUI): string | null => {
    if (role === "standard") return null;
    if (role === "template") return "template";
    if (role === "transferable") return "transferable";
    return null;
  };

  const openRenameDialog = (card: CardData, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameTargetCard(card);
    setRenameValue(card.full_name || "Untitled Card");
    setRenameFolder(card.folder || "");
    setRenameRole(mapCardRoleToUI(card.card_role));
    setRenameDialogOpen(true);
  };

  const handleRenameSave = async () => {
    if (!renameTargetCard) return;

    const trimmedName = renameValue.trim();
    const trimmedFolder = renameFolder.trim();
    const newRole = mapUIRoleToCardRole(renameRole);

    if (!trimmedName) {
      toast.error("Card name cannot be empty.");
      return;
    }

    const currentName = renameTargetCard.full_name || "Untitled Card";
    const currentFolder = renameTargetCard.folder || "";
    const currentRole = renameTargetCard.card_role || null;

    const nothingChanged = trimmedName === currentName && trimmedFolder === currentFolder && newRole === currentRole;

    if (nothingChanged) {
      setRenameDialogOpen(false);
      return;
    }

    try {
      setRenameSaving(true);

      const updatePayload: Partial<CardData> = {
        full_name: trimmedName,
        folder: trimmedFolder || null,
        card_role: newRole,
      };

      const { error } = await supabase.from("cards").update(updatePayload).eq("id", renameTargetCard.id);

      if (error) {
        console.error("Error updating card:", error);
        toast.error("Failed to save changes");
        return;
      }

      toast.success("Card details updated");

      // Optimistic update
      setCards((prev) =>
        prev.map((c) =>
          c.id === renameTargetCard.id
            ? {
                ...c,
                full_name: trimmedName,
                folder: trimmedFolder || null,
                card_role: newRole,
              }
            : c,
        ),
      );

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
      setRenameFolder("");
      setRenameRole("standard");
      setRenameSaving(false);
    }
  };

  const toggleFavorite = async (card: CardData, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = !!card.is_favorite;
    const next = !current;

    try {
      // Optimistic update
      setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, is_favorite: next } : c)));

      const { error } = await supabase.from("cards").update({ is_favorite: next }).eq("id", card.id);

      if (error) {
        console.error("Error updating favorite:", error);
        toast.error("Failed to update favorite");
        // revert optimistic
        setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, is_favorite: current } : c)));
        return;
      }

      toast.success(next ? "Card added to favorites" : "Card removed from favorites");
    } catch (err) {
      console.error("Error updating favorite:", err);
      toast.error("Failed to update favorite");
      // revert optimistic
      setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, is_favorite: current } : c)));
    }
  };

  const toggleCardSelection = (cardId: string, checked: boolean | string) => {
    const value = checked === true;
    setSelectedCardIds((prev) => (value ? [...prev, cardId] : prev.filter((id) => id !== cardId)));
  };

  const toggleSelectAllVisible = (checked: boolean | string, visibleCards: CardData[]) => {
    const value = checked === true;
    if (value) {
      const ids = visibleCards.map((c) => c.id as string);
      setSelectedCardIds(ids);
    } else {
      setSelectedCardIds([]);
    }
  };

  const handleBulkPublish = async (publish: boolean) => {
    if (selectedCardIds.length === 0) return;

    try {
      setBulkProcessing(true);

      const { error } = await supabase.from("cards").update({ is_published: publish }).in("id", selectedCardIds);

      if (error) {
        console.error("Error updating publish state:", error);
        toast.error("Failed to update selected cards");
        return;
      }

      toast.success(publish ? "Selected cards published" : "Selected cards unpublished");

      setCards((prev) =>
        prev.map((c) => (selectedCardIds.includes(c.id as string) ? { ...c, is_published: publish } : c)),
      );
    } catch (err) {
      console.error("Error in bulk publish:", err);
      toast.error("Failed to update selected cards");
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCardIds.length === 0) return;

    const confirmed = window.confirm(`Delete ${selectedCardIds.length} selected card(s)? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setBulkProcessing(true);

      const { error } = await supabase.from("cards").delete().in("id", selectedCardIds);

      if (error) {
        console.error("Error bulk deleting:", error);
        toast.error("Failed to delete selected cards");
        return;
      }

      toast.success("Selected cards deleted");
      setCards((prev) => prev.filter((c) => !selectedCardIds.includes(c.id as string)));
      setSelectedCardIds([]);
    } catch (err) {
      console.error("Error bulk deleting:", err);
      toast.error("Failed to delete selected cards");
    } finally {
      setBulkProcessing(false);
    }
  };

  // Filtering + search + sort pipeline
  const filteredAndSortedCards = useMemo(() => {
    let list = [...cards];

    // Filter by mode
    list = list.filter((card) => {
      switch (filterMode) {
        case "published":
          return !!card.is_published;
        case "unpublished":
          return !card.is_published;
        case "favorites":
          return !!card.is_favorite;
        case "templates":
          return (card.card_role || "").toLowerCase() === "template";
        case "transfer":
          return (card.card_role || "").toLowerCase() === "transferable";
        case "all":
        default:
          return true;
      }
    });

    // Search filter
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (normalizedSearch) {
      list = list.filter((card) => {
        const name = (card.full_name || "").toLowerCase();
        const title = (card.title || "").toLowerCase();
        const company = (card.company || "").toLowerCase();
        const folder = (card.folder || "").toLowerCase();
        return (
          name.includes(normalizedSearch) ||
          title.includes(normalizedSearch) ||
          company.includes(normalizedSearch) ||
          folder.includes(normalizedSearch)
        );
      });
    }

    // Sorting
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
  const allVisibleSelected =
    visibleCards.length > 0 && visibleCards.every((card) => selectedCardIds.includes(card.id as string));

  // Collect folder list for hints (can be used for future dropdowns)
  const folderSuggestions = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => {
      if (c.folder) set.add(c.folder);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cards]);

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
        {/* Top bar: title + search + sort */}
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
                placeholder="Search by name, title, company, or folder"
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
              ["favorites", "Favorites"],
              ["templates", "Templates"],
              ["transfer", "Transfer"],
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

        {/* Bulk actions bar */}
        {selectedCardIds.length > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allVisibleSelected}
                onCheckedChange={(checked) => toggleSelectAllVisible(checked, visibleCards)}
              />
              <span>
                {selectedCardIds.length} card
                {selectedCardIds.length > 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handleBulkPublish(true)} disabled={bulkProcessing}>
                Publish selected
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkPublish(false)} disabled={bulkProcessing}>
                Unpublish selected
              </Button>
              <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={bulkProcessing}>
                Delete selected
              </Button>
            </div>
          </div>
        )}

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
            {visibleCards.map((card) => {
              const selected = selectedCardIds.includes(card.id as string);
              const isFavorite = !!card.is_favorite;
              const role = mapCardRoleToUI(card.card_role);

              return (
                <Card
                  key={card.id}
                  className="relative cursor-pointer overflow-hidden transition-all hover:shadow-gold"
                  onClick={() => navigate(`/cards/${card.id}/edit`)}
                >
                  {/* Top cover preview */}
                  {card.cover_url && (
                    <div className="h-20 w-full overflow-hidden">
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${card.cover_url})` }}
                      />
                    </div>
                  )}

                  {/* Selection checkbox */}
                  <div className="absolute left-2 top-2 z-10 rounded-md bg-background/80 p-1">
                    <Checkbox
                      checked={selected}
                      onCheckedChange={(checked) => toggleCardSelection(card.id as string, checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Favorite star */}
                  <button
                    className="absolute right-2 top-2 z-10 rounded-full bg-background/80 p-1 text-yellow-400 hover:text-yellow-300"
                    onClick={(e) => toggleFavorite(card, e)}
                    title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    {isFavorite ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
                  </button>

                  <CardHeader>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{card.full_name || "Untitled Card"}</CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            title="Rename / edit card details"
                            onClick={(e) => openRenameDialog(card, e)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1 text-xs">
                          {card.folder && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                              {card.folder}
                            </span>
                          )}
                          {role === "template" && (
                            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-500">Template</span>
                          )}
                          {role === "transferable" && (
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-500">Transfer</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                          onClick={(e) => openShareDialog(card.id as string, e)}
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
              );
            })}
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

      {/* Rename / Edit Card Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={handleRenameDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Card Details</DialogTitle>
            <DialogDescription>
              Update the display name, folder/collection, and card type. The URL/slug stays the same.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Card name</label>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Enter card name"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Folder / Collection <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <Input
                value={renameFolder}
                onChange={(e) => setRenameFolder(e.target.value)}
                placeholder="e.g. Personal, Team Templates, Clients"
              />
              {folderSuggestions.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                  <span className="mr-1">Suggestions:</span>
                  {folderSuggestions.map((f) => (
                    <button
                      key={f}
                      type="button"
                      className="rounded-full border px-2 py-0.5 hover:bg-muted"
                      onClick={() => setRenameFolder(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Card type</label>
              <div className="flex flex-wrap gap-2 text-sm">
                <Button
                  type="button"
                  size="sm"
                  variant={renameRole === "standard" ? "default" : "outline"}
                  onClick={() => setRenameRole("standard")}
                >
                  Standard
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={renameRole === "template" ? "default" : "outline"}
                  onClick={() => setRenameRole("template")}
                >
                  Template
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={renameRole === "transferable" ? "default" : "outline"}
                  onClick={() => setRenameRole("transferable")}
                >
                  Transfer
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                • <b>Standard</b> – normal personal card. <br />• <b>Template</b> – design used as a starting point for
                others. <br />• <b>Transfer</b> – cards meant to be duplicated and acquired by other users.
              </p>
            </div>
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

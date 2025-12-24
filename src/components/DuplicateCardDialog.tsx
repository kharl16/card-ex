import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { buildCardSnapshot, buildCardInsertFromSnapshot, buildCardLinksInsertFromSnapshot } from "@/lib/cardSnapshot";

type CardData = Tables<"cards"> & { owner_name?: string | null };

interface DuplicateCardDialogProps {
  card: CardData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDuplicated?: () => void;

  /**
   * When provided, duplicate the card to this specific user (admin flow).
   * When not provided, duplicate to the currently logged-in user.
   */
  targetUserId?: string;
  targetUserName?: string | null;
}

export function DuplicateCardDialog({
  card,
  open,
  onOpenChange,
  onDuplicated,
  targetUserId,
  targetUserName,
}: DuplicateCardDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [duplicating, setDuplicating] = useState(false);

  const handleDuplicate = async () => {
    // Decide who will own the new card
    const effectiveUserId = targetUserId ?? user?.id;
    if (!effectiveUserId) return;

    setDuplicating(true);
    try {
      // Load profile for the target owner (not always the logged-in user)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", effectiveUserId)
        .single();

      if (profileError) {
        console.warn("Failed to load profile for duplicate:", profileError);
      }

      const ownerName =
        profile?.full_name || targetUserName || card.owner_name || card.full_name || "New Card Owner";

      // Load full source card row to ensure we have ALL JSON fields (incl. product_images)
      const { data: sourceCard, error: sourceCardError } = await supabase
        .from("cards")
        .select("*")
        .eq("id", card.id)
        .single();

      if (sourceCardError || !sourceCard) throw sourceCardError;

      // Fetch card_links from source card
      const { data: cardLinks } = await supabase
        .from("card_links")
        .select("kind, label, value, icon, sort_index")
        .eq("card_id", card.id)
        .order("sort_index");

      // Build unified snapshot from source card (JSON columns are the source-of-truth)
      const snapshot = buildCardSnapshot(sourceCard as Record<string, any>, cardLinks || []);

      // Generate new unique slug
      const slug = `${effectiveUserId.slice(0, 8)}-${Date.now()}`;

      // Build insert data using unified snapshot builder
      const insertData = buildCardInsertFromSnapshot(snapshot, effectiveUserId, slug, {
        full_name: `${card.full_name || "Untitled Card"} (Copy)`,
        owner_name: ownerName,
        is_published: false,
      });

      // Insert duplicated card with full snapshot data
      const { data: newCard, error: cardError } = await supabase
        .from("cards")
        .insert(insertData as any)
        .select()
        .single();

      if (cardError) throw cardError;

      // Copy card links using unified builder
      if (snapshot.card_links.length > 0) {
        const cardLinkInserts = buildCardLinksInsertFromSnapshot(snapshot, newCard.id);
        await supabase.from("card_links").insert(cardLinkInserts);
      }

      // Copy card images (gallery)
      const { data: cardImages } = await supabase
        .from("card_images")
        .select("*")
        .eq("card_id", card.id)
        .order("sort_index");

      if (cardImages && cardImages.length > 0) {
        const cardImageInserts = cardImages.map((img) => ({
          card_id: newCard.id,
          url: img.url,
          sort_index: img.sort_index,
        }));

        await supabase.from("card_images").insert(cardImageInserts);
      }

      toast.success("Card duplicated successfully!");
      onOpenChange(false);
      onDuplicated?.();

      navigate(`/cards/${newCard.id}/edit`);
    } catch (error) {
      console.error("Error duplicating card:", error);
      toast.error("Failed to duplicate card");
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Duplicate Card</AlertDialogTitle>
          <AlertDialogDescription>
            This will create a copy of &quot;{card.full_name}&quot; with all its design, content, images, and carousel.
            The new card will belong to {targetUserName || "the selected user"} and will start unpublished with a new
            unique URL.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={duplicating}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDuplicate} disabled={duplicating}>
            {duplicating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Duplicating...
              </>
            ) : (
              "Duplicate"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

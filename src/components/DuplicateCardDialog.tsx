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

      // Generate new unique slug
      const slug = `${effectiveUserId.slice(0, 8)}-${Date.now()}`;

      // Get product images from source card's JSONB column
      const rawProductImages = (card as any).product_images;
      const productImagesArray = Array.isArray(rawProductImages)
        ? rawProductImages.map((img: any, index: number) => ({
            image_url: img.image_url,
            alt_text: img.alt_text || null,
            description: img.description || null,
            sort_order: img.sort_order ?? index,
          }))
        : [];

      // Insert duplicated card with product_images in the JSONB column
      const { data: newCard, error: cardError } = await supabase
        .from("cards")
        .insert({
          user_id: effectiveUserId,
          owner_name: ownerName,
          full_name: `${card.full_name || "Untitled Card"} (Copy)`,
          first_name: card.first_name,
          middle_name: card.middle_name,
          last_name: card.last_name,
          prefix: card.prefix,
          suffix: card.suffix,
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
          theme: card.theme,
          carousel_enabled: card.carousel_enabled,
          custom_slug: null,
          slug,
          is_published: false,
          views_count: 0,
          unique_views: 0,
          social_links: card.social_links,
          product_images: productImagesArray,
        })
        .select()
        .single();

      if (cardError) throw cardError;

      // NOTE: Product images are now copied via the JSONB column above
      // No need to query/insert into product_images table

      // Copy card links (social media, additional contacts)
      const { data: cardLinks } = await supabase
        .from("card_links")
        .select("*")
        .eq("card_id", card.id)
        .order("sort_index");

      if (cardLinks && cardLinks.length > 0) {
        const cardLinkInserts = cardLinks.map((link) => ({
          card_id: newCard.id,
          kind: link.kind,
          label: link.label,
          value: link.value,
          icon: link.icon,
          sort_index: link.sort_index,
        }));

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

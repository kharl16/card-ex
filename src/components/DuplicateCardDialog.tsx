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

type CardData = Tables<"cards">;

interface DuplicateCardDialogProps {
  card: CardData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDuplicated?: () => void;
  /** Optional: target user ID for admin cross-user duplication */
  targetUserId?: string;
  /** Optional: target user name for display purposes */
  targetUserName?: string;
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

  // Determine if this is a cross-user duplication (admin flow)
  const isCrossUserDuplication = targetUserId && targetUserId !== card.user_id;
  const newOwnerId = targetUserId || user?.id;

  const handleDuplicate = async () => {
    if (!user || !newOwnerId) return;

    setDuplicating(true);
    try {
      // Generate new unique slug for the target user
      const slug = `${newOwnerId.slice(0, 8)}-${Date.now()}`;

      // Prepare card insert data
      // For cross-user duplication: copy design only, clear personal info
      // For same-user duplication: copy everything
      const cardInsertData: any = {
        user_id: newOwnerId,
        slug,
        is_published: false, // New card starts unpublished
        views_count: 0,
        unique_views: 0,
        custom_slug: null, // Don't copy custom slug
        // Design elements - always copy
        theme: card.theme,
        carousel_enabled: card.carousel_enabled,
        cover_url: card.cover_url,
        logo_url: card.logo_url,
      };

      if (isCrossUserDuplication) {
        // Cross-user duplication (admin flow): Clear personal data
        cardInsertData.full_name = targetUserName || "New Card";
        cardInsertData.first_name = null;
        cardInsertData.middle_name = null;
        cardInsertData.last_name = null;
        cardInsertData.prefix = null;
        cardInsertData.suffix = null;
        cardInsertData.title = null;
        cardInsertData.company = null;
        cardInsertData.bio = null;
        cardInsertData.email = null;
        cardInsertData.phone = null;
        cardInsertData.website = null;
        cardInsertData.location = null;
        cardInsertData.avatar_url = null;
      } else {
        // Same-user duplication: Copy personal data with "(Copy)" suffix
        cardInsertData.full_name = `${card.full_name} (Copy)`;
        cardInsertData.first_name = card.first_name;
        cardInsertData.middle_name = card.middle_name;
        cardInsertData.last_name = card.last_name;
        cardInsertData.prefix = card.prefix;
        cardInsertData.suffix = card.suffix;
        cardInsertData.title = card.title;
        cardInsertData.company = card.company;
        cardInsertData.bio = card.bio;
        cardInsertData.email = card.email;
        cardInsertData.phone = card.phone;
        cardInsertData.website = card.website;
        cardInsertData.location = card.location;
        cardInsertData.avatar_url = card.avatar_url;
      }

      const { data: newCard, error: cardError } = await supabase
        .from("cards")
        .insert(cardInsertData)
        .select()
        .single();

      if (cardError) throw cardError;

      // Copy product images (carousel) - always copy these as design elements
      const { data: productImages } = await supabase
        .from("product_images")
        .select("*")
        .eq("card_id", card.id)
        .order("sort_order");

      if (productImages && productImages.length > 0) {
        const productImageInserts = productImages.map((img, index) => ({
          card_id: newCard.id,
          owner: newOwnerId,
          image_url: img.image_url,
          alt_text: img.alt_text,
          description: img.description,
          sort_order: index,
        }));

        await supabase.from("product_images").insert(productImageInserts);
      }

      // Copy card images (gallery) - always copy these as design elements
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

      // Only copy card_links for same-user duplication
      // For cross-user duplication, links contain personal social media URLs and should NOT be copied
      if (!isCrossUserDuplication) {
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
      }

      if (isCrossUserDuplication) {
        toast.success(`Card design duplicated for ${targetUserName}!`);
      } else {
        toast.success("Card duplicated successfully!");
      }

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
          <AlertDialogTitle>
            {isCrossUserDuplication
              ? `Duplicate Design for ${targetUserName}`
              : "Duplicate Card"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isCrossUserDuplication ? (
              <>
                This will create a new card for <strong>{targetUserName}</strong> using
                the design from "{card.full_name}". The new card will include:
                <ul className="mt-2 list-inside list-disc text-left">
                  <li>Theme and styling settings</li>
                  <li>Cover image and company logo</li>
                  <li>Carousel/product images</li>
                  <li>Gallery images</li>
                </ul>
                <p className="mt-2 text-sm">
                  Personal information (name, email, phone, social links, etc.) will{" "}
                  <strong>not</strong> be copied. A fresh QR code and share URL will be
                  generated.
                </p>
              </>
            ) : (
              <>
                This will create a copy of "{card.full_name}" with all its design,
                content, and images. The new card will be unpublished and have a new
                unique URL.
              </>
            )}
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
            ) : isCrossUserDuplication ? (
              "Duplicate Design"
            ) : (
              "Duplicate"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

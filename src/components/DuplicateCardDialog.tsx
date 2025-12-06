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
}

export function DuplicateCardDialog({
  card,
  open,
  onOpenChange,
  onDuplicated,
}: DuplicateCardDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [duplicating, setDuplicating] = useState(false);

  const handleDuplicate = async () => {
    if (!user) return;

    setDuplicating(true);
    try {
      // Generate new unique slug
      const slug = `${user.id.slice(0, 8)}-${Date.now()}`;

      // Copy all card fields except id, slug, share_url, public_url, qr_code_url, vcard_url
      const { data: newCard, error: cardError } = await supabase
        .from("cards")
        .insert({
          user_id: user.id,
          full_name: `${card.full_name} (Copy)`,
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
          custom_slug: null, // Don't copy custom slug
          slug,
          is_published: false, // New card starts unpublished
          views_count: 0,
          unique_views: 0,
        })
        .select()
        .single();

      if (cardError) throw cardError;

      // Copy product images
      const { data: productImages } = await supabase
        .from("product_images")
        .select("*")
        .eq("card_id", card.id)
        .order("sort_order");

      if (productImages && productImages.length > 0) {
        const productImageInserts = productImages.map((img, index) => ({
          card_id: newCard.id,
          owner: user.id,
          image_url: img.image_url,
          alt_text: img.alt_text,
          description: img.description,
          sort_order: index,
        }));

        await supabase.from("product_images").insert(productImageInserts);
      }

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
            This will create a copy of "{card.full_name}" with all its design,
            content, and images. The new card will be unpublished and have a new
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

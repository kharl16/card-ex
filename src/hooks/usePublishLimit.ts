import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to enforce the single published card limit for non-admin members.
 * 
 * Rules:
 * - Non-admin members can only have 1 published card at a time
 * - Admins have no limit on published cards
 */
export function usePublishLimit() {
  const { user, isAdmin } = useAuth();
  const [checking, setChecking] = useState(false);

  /**
   * Check if the current user can publish a card
   * @param cardId - The ID of the card being published (excluded from count)
   */
  const canPublish = useCallback(async (cardId?: string): Promise<{
    allowed: boolean;
    publishedCount: number;
    existingPublishedCardId?: string;
    message?: string;
  }> => {
    if (!user) {
      return {
        allowed: false,
        publishedCount: 0,
        message: "You must be logged in to publish a card.",
      };
    }

    // Admins have no limit
    if (isAdmin) {
      return {
        allowed: true,
        publishedCount: 0,
      };
    }

    setChecking(true);
    try {
      // Count user's published cards (excluding the one being published)
      let query = supabase
        .from("cards")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_published", true);

      if (cardId) {
        query = query.neq("id", cardId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error checking publish limit:", error);
        return {
          allowed: false,
          publishedCount: 0,
          message: "Failed to check publish limit.",
        };
      }

      const publishedCount = data?.length || 0;
      const existingPublishedCardId = data?.[0]?.id;

      if (publishedCount >= 1) {
        return {
          allowed: false,
          publishedCount,
          existingPublishedCardId,
          message: "You can only publish one card. Edit your existing card or unpublish it first.",
        };
      }

      return {
        allowed: true,
        publishedCount,
      };
    } finally {
      setChecking(false);
    }
  }, [user, isAdmin]);

  return {
    canPublish,
    checking,
    isAdmin,
  };
}

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ADMIN_EMAIL = "kharl16@gmail.com";
const MAX_CARDS_FOR_MEMBERS = 2;

interface CardLimitInfo {
  canCreateCard: boolean;
  currentCount: number;
  maxCards: number;
  isAdmin: boolean;
  publishedCount?: number;
  templateCount?: number;
  message?: string;
}

/**
 * Card limit logic for Card-Ex / Tagex.app.
 * 
 * Rules:
 * - Non-admin users can have max 2 cards: 1 published + 1 template
 * - Admin users have no limits
 */
export function useCardLimits() {
  const { user, isAdmin, session } = useAuth();
  const [checking, setChecking] = useState(false);

  /**
   * Check if the current user can create a new card
   */
  const checkCardLimit = useCallback(async (): Promise<CardLimitInfo> => {
    if (!user) {
      return {
        canCreateCard: false,
        currentCount: 0,
        maxCards: 0,
        isAdmin: false,
        message: "You must be logged in to create cards.",
      };
    }

    // Admin has no limits
    if (isAdmin) {
      return {
        canCreateCard: true,
        currentCount: 0,
        maxCards: Infinity,
        isAdmin: true,
      };
    }

    setChecking(true);
    try {
      // Get user's cards with their status
      const { data: cards, error } = await supabase
        .from("cards")
        .select("id, is_published, is_template")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error checking card count:", error);
        return {
          canCreateCard: false,
          currentCount: 0,
          maxCards: MAX_CARDS_FOR_MEMBERS,
          isAdmin: false,
          message: "Failed to check card limit.",
        };
      }

      const currentCount = cards?.length || 0;
      const publishedCount = cards?.filter(c => c.is_published && !c.is_template).length || 0;
      const templateCount = cards?.filter(c => c.is_template).length || 0;
      const canCreate = currentCount < MAX_CARDS_FOR_MEMBERS;

      return {
        canCreateCard: canCreate,
        currentCount,
        maxCards: MAX_CARDS_FOR_MEMBERS,
        isAdmin: false,
        publishedCount,
        templateCount,
        message: canCreate
          ? undefined
          : "You can only have one published card and one template card per account.",
      };
    } finally {
      setChecking(false);
    }
  }, [user, isAdmin]);

  /**
   * Check if a specific user can have a new card created for them
   * (Used by admin when creating cards for members)
   */
  const checkCardLimitForUser = useCallback(async (userId: string, userEmail?: string): Promise<CardLimitInfo> => {
    // Check if target user is admin by email
    if (userEmail === ADMIN_EMAIL) {
      return {
        canCreateCard: true,
        currentCount: 0,
        maxCards: Infinity,
        isAdmin: true,
      };
    }

    setChecking(true);
    try {
      // Count target user's current cards
      const { count, error } = await supabase
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (error) {
        console.error("Error checking card count for user:", error);
        return {
          canCreateCard: false,
          currentCount: 0,
          maxCards: MAX_CARDS_FOR_MEMBERS,
          isAdmin: false,
          message: "Failed to check card limit for this user.",
        };
      }

      const currentCount = count || 0;
      const canCreate = currentCount < MAX_CARDS_FOR_MEMBERS;

      return {
        canCreateCard: canCreate,
        currentCount,
        maxCards: MAX_CARDS_FOR_MEMBERS,
        isAdmin: false,
        message: canCreate
          ? undefined
          : `This user already has ${MAX_CARDS_FOR_MEMBERS} cards. They need to delete one first.`,
      };
    } finally {
      setChecking(false);
    }
  }, []);

  return {
    checkCardLimit,
    checkCardLimitForUser,
    checking,
    maxCardsForMembers: MAX_CARDS_FOR_MEMBERS,
  };
}

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
  message?: string;
}

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
      // Count user's current cards
      const { count, error } = await supabase
        .from("cards")
        .select("*", { count: "exact", head: true })
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

      const currentCount = count || 0;
      const canCreate = currentCount < MAX_CARDS_FOR_MEMBERS;

      return {
        canCreateCard: canCreate,
        currentCount,
        maxCards: MAX_CARDS_FOR_MEMBERS,
        isAdmin: false,
        message: canCreate
          ? undefined
          : `You can only have ${MAX_CARDS_FOR_MEMBERS} cards (1 publishable + 1 transferable). Please delete an existing card first.`,
      };
    } finally {
      setChecking(false);
    }
  }, [user, isAdmin]);

  /**
   * Check if a specific user can have a new card created for them
   * (Used by admin when creating cards for members)
   */
  const checkCardLimitForUser = useCallback(
    async (userId: string, userEmail?: string): Promise<CardLimitInfo> => {
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
    },
    []
  );

  return {
    checkCardLimit,
    checkCardLimitForUser,
    checking,
    maxCardsForMembers: MAX_CARDS_FOR_MEMBERS,
  };
}

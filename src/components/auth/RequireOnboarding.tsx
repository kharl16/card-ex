import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Redirects authenticated, email-verified, non-admin users with no card
 * to /onboarding so they can set up their Card-Ex self-service.
 */
export default function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setChecking(false);
      return;
    }
    if (isAdmin) {
      setChecking(false);
      return;
    }

    (async () => {
      const { data: card } = await supabase
        .from("cards")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!card) {
        navigate("/onboarding", { replace: true });
        return;
      }
      setChecking(false);
    })();
  }, [user, isAdmin, loading, navigate]);

  if (loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

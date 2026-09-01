import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { Lock, ShieldX, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import RequireAuth from "./RequireAuth";
import CardExLogo from "@/assets/Card-Ex-Logo.png";

/**
 * Gate for Tools Vault routes.
 *
 * - Signed-out visitors get a clean "Tools Vault is Private" screen (never a redirect
 *   to onboarding/setup), with a Sign In action.
 * - Signed-in users who target a card they do not own get "Access Denied".
 * - Owners and Card-Ex admins fall through to the standard RequireAuth checks.
 *
 * This is a UX layer only — Supabase RLS independently denies vault rows to anon
 * users and to authenticated non-owners.
 */
export default function RequireVaultAccess({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, isAdmin, loading } = useAuth();
  const params = useParams();
  const [searchParams] = useSearchParams();

  // A vault route may reference a specific card via route param or query string.
  const targetCardId =
    (params as Record<string, string | undefined>).cardId ??
    searchParams.get("card") ??
    searchParams.get("cardId") ??
    null;

  const [ownershipChecked, setOwnershipChecked] = useState(!targetCardId);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let active = true;
    if (!targetCardId || !session?.user) {
      setOwnershipChecked(!targetCardId);
      return;
    }
    setOwnershipChecked(false);
    supabase
      .from("cards")
      .select("id")
      .eq("id", targetCardId)
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setIsOwner(!!data);
        setOwnershipChecked(true);
      });
    return () => {
      active = false;
    };
  }, [targetCardId, session?.user?.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto mb-1 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl">
              <img src={CardExLogo} alt="Card-Ex" className="h-full w-full object-contain" />
            </div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Tools Vault is Private</CardTitle>
            <CardDescription className="text-base">
              Please sign in to Card-Ex with the account that owns this card.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full gap-2"
              onClick={() =>
                navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`)
              }
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (targetCardId && !isAdmin) {
    if (!ownershipChecked) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      );
    }
    if (!isOwner) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <ShieldX className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-bold">Access Denied</CardTitle>
              <CardDescription className="text-base">
                This Tools Vault belongs to another Card-Ex member.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
                Back to my dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <RequireAuth>{children}</RequireAuth>;
}

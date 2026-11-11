import { useNavigate } from "react-router-dom";
import { LogOut, PauseCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CardExLogo from "@/assets/Card-Ex-Logo-sparkle.webp";

interface FreeAccessLockScreenProps {
  cardId: string | null;
  endedAt: string | null;
}

/** Full-page notice shown everywhere (except plan activation) once the free week ends unpaid. */
export function FreeAccessLockScreen({ cardId, endedAt }: FreeAccessLockScreenProps) {
  const navigate = useNavigate();
  const endedLabel = endedAt
    ? new Date(endedAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center overflow-x-hidden p-4">
      <Card className="glass-shimmer w-full max-w-md rounded-2xl border-primary/40 bg-card/60 backdrop-blur">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl">
            <img src={CardExLogo} alt="Card-Ex" className="h-full w-full object-contain" />
          </div>
          <PauseCircle className="mx-auto h-10 w-10 text-primary" aria-hidden />
          <CardTitle className="text-2xl font-bold">Your 7-day free access has ended</CardTitle>
          <CardDescription className="text-base">
            {endedLabel ? `Your free week ended on ${endedLabel}. ` : ""}
            Your card, photos and contact details are all saved. Activate your plan to turn everything back on.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="h-12 w-full rounded-full text-base font-semibold"
            onClick={() => navigate(cardId ? `/billing/${cardId}` : "/auth")}
            disabled={!cardId}
          >
            Activate Plan
          </Button>
          <Button variant="ghost" className="h-12 w-full gap-2 text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

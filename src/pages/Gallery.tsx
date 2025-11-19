import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import GalleryManager from "@/components/GalleryManager";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
import SignOutButton from "@/components/auth/SignOutButton";
import LoadingAnimation from "@/components/LoadingAnimation";

export default function Gallery() {
  const navigate = useNavigate();
  const [cardId, setCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCard();
  }, []);

  const loadCard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: card } = await supabase
      .from('cards')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!card) {
      navigate("/dashboard");
      return;
    }

    setCardId(card.id);
    setLoading(false);
  };

  if (loading) {
    return <LoadingAnimation />;
  }

  if (!cardId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No card found</p>
          <Button onClick={() => navigate("/dashboard")} className="mt-4">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden bg-transparent">
                <img src={CardExLogo} alt="Card-Ex Logo" className="h-full w-full object-contain" />
              </div>
              <span className="text-xl font-bold">Gallery Manager</span>
            </div>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <GalleryManager cardId={cardId} />
      </main>
    </div>
  );
}

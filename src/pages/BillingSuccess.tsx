import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, Copy, Share2, ExternalLink, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useReferralProfile } from "@/hooks/useReferral";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface CardData {
  id: string;
  full_name: string;
  slug: string;
  plan_id: string;
  is_published: boolean;
}

interface PlanData {
  name: string;
  referral_eligible: boolean;
  profit: number;
}

export default function BillingSuccess() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: referralProfile, refetch: refetchReferral } = useReferralProfile();

  const [card, setCard] = useState<CardData | null>(null);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (cardId) {
      loadCardAndPlan();
      refetchReferral();
    }
  }, [cardId]);

  const loadCardAndPlan = async () => {
    if (!cardId) return;

    const { data: cardData, error: cardError } = await supabase
      .from("cards")
      .select("id, full_name, slug, plan_id, is_published")
      .eq("id", cardId)
      .single();

    if (cardError) {
      toast.error("Card not found");
      navigate("/dashboard");
      return;
    }

    setCard(cardData);

    if (cardData.plan_id) {
      const { data: planData } = await supabase
        .from("card_plans")
        .select("name, referral_eligible, profit")
        .eq("id", cardData.plan_id)
        .single();

      setPlan(planData);
    }

    setLoading(false);
  };

  const handlePublish = async () => {
    if (!cardId) return;

    setPublishing(true);
    const { error } = await supabase
      .from("cards")
      .update({
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .eq("id", cardId);

    if (error) {
      toast.error("Failed to publish card");
      setPublishing(false);
      return;
    }

    toast.success("Card published successfully!");
    navigate(`/c/${card?.slug}`);
  };

  const referralLink = referralProfile?.referral_code
    ? `https://tagex.app/signup?ref=${referralProfile.referral_code}`
    : null;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied!`);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const shareReferralLink = async () => {
    if (!referralLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Card-Ex",
          text: "Create your digital business card with Card-Ex!",
          url: referralLink,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      copyToClipboard(referralLink, "Referral link");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-lg w-full"
      >
        <Card className="text-center">
          <CardHeader className="pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mx-auto mb-4"
            >
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
            </motion.div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
            <CardDescription>
              Your <strong>{plan?.name}</strong> plan is now active
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Card Info */}
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Card</p>
              <p className="font-semibold text-lg">{card?.full_name}</p>
            </div>

            {/* Referral Section */}
            {plan?.referral_eligible && referralProfile?.has_referral_access && referralLink && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="border border-green-500/30 bg-green-500/10 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <Sparkles className="h-5 w-5" />
                  <span className="font-semibold">Referral Program Unlocked!</span>
                </div>
                <p className="text-sm text-green-600/80">
                  Earn ₱{plan.profit.toLocaleString()} for every person who signs up using your link
                </p>

                <div>
                  <label className="text-xs text-muted-foreground">Your Referral Link</label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={referralLink}
                      readOnly
                      className="text-sm bg-background"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(referralLink, "Referral link")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" onClick={shareReferralLink}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {!card?.is_published ? (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePublish}
                  disabled={publishing}
                >
                  {publishing ? "Publishing..." : "Publish Card Now"}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => navigate(`/c/${card?.slug}`)}
                >
                  View Your Card
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

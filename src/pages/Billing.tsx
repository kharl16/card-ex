import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, AlertCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCardPlans, CardPlan } from "@/hooks/useCardPlans";
import { useSubmitPayment, PaymentMethod } from "@/hooks/usePayments";
import { PlanSelector } from "@/components/billing/PlanSelector";
import { PaymentMethodSelector, UserPaymentMethod } from "@/components/billing/PaymentMethodSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface CardData {
  id: string;
  full_name: string;
  plan_id: string | null;
  is_paid: boolean;
}

export default function Billing() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: plans, isLoading: plansLoading } = useCardPlans();
  const submitPayment = useSubmitPayment();

  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<UserPaymentMethod | null>(null);
  const [providerReference, setProviderReference] = useState("");

  useEffect(() => {
    if (cardId) {
      loadCard();
    }
  }, [cardId]);

  useEffect(() => {
    // Pre-select the card's existing plan or default to Essential
    if (plans && !selectedPlanId) {
      if (card?.plan_id) {
        setSelectedPlanId(card.plan_id);
      } else {
        const essentialPlan = plans.find(p => p.code === "ESSENTIAL");
        if (essentialPlan) {
          setSelectedPlanId(essentialPlan.id);
        }
      }
    }
  }, [plans, card, selectedPlanId]);

  const loadCard = async () => {
    if (!cardId) return;

    const { data, error } = await supabase
      .from("cards")
      .select("id, full_name, plan_id, is_paid")
      .eq("id", cardId)
      .single();

    if (error) {
      toast.error("Card not found");
      navigate("/dashboard");
      return;
    }

    if (data.is_paid) {
      toast.info("This card is already paid");
      navigate(`/cards/${cardId}/edit`);
      return;
    }

    setCard(data);
    setLoading(false);
  };

  const selectedPlan = plans?.find(p => p.id === selectedPlanId);

  const handleSubmitPayment = async () => {
    if (!cardId || !selectedPlanId || !paymentMethod || !user?.id) {
      toast.error("Please complete all required fields");
      return;
    }

    if (paymentMethod !== "CASH" && !providerReference.trim()) {
      toast.error("Please enter the payment reference number");
      return;
    }

    await submitPayment.mutateAsync({
      cardId,
      planId: selectedPlanId,
      amount: selectedPlan?.retail_price || 0,
      paymentMethod,
      providerReference: providerReference.trim() || undefined,
    });

    navigate(`/billing/${cardId}/success`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading || plansLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Complete Your Payment</h1>
            <p className="text-muted-foreground">
              Pay for your Card-Ex plan and unlock all features
            </p>
          </div>
        </div>

        {/* Referral Banner */}
        {selectedPlan?.referral_eligible && (
          <Alert className="mb-6 border-green-500 bg-green-500/10">
            <Sparkles className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-600">Unlock Referral Rewards!</AlertTitle>
            <AlertDescription className="text-green-600/80">
              Pay for your Card-Ex plan and start earning ₱{selectedPlan.profit.toLocaleString()} for every referral!
            </AlertDescription>
          </Alert>
        )}

        {!selectedPlan?.referral_eligible && selectedPlan?.code === "PERSONAL" && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Card-Ex Personal does not include referral income. Upgrade to Essential or higher to earn commissions.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plan Selection */}
            <Card>
              <CardHeader>
                <CardTitle>1. Choose Your Plan</CardTitle>
                <CardDescription>
                  Select the Card-Ex plan that fits your needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {plans && (
                  <PlanSelector
                    plans={plans}
                    selectedPlanId={selectedPlanId}
                    onSelectPlan={setSelectedPlanId}
                  />
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>2. Select Payment Method</CardTitle>
                <CardDescription>
                  Choose how you want to pay
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentMethodSelector
                  selectedMethod={paymentMethod}
                  onSelectMethod={setPaymentMethod}
                  providerReference={providerReference}
                  onProviderReferenceChange={setProviderReference}
                />
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Card</p>
                  <p className="font-medium">{card?.full_name}</p>
                </div>

                <Separator />

                {selectedPlan && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Plan</p>
                      <p className="font-medium">{selectedPlan.name}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm">{selectedPlan.description}</p>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatPrice(selectedPlan.retail_price)}
                      </span>
                    </div>

                    {selectedPlan.referral_eligible && (
                      <div className="bg-green-500/10 rounded-lg p-3 text-center">
                        <p className="text-sm text-green-600 font-medium">
                          Earn ₱{selectedPlan.profit.toLocaleString()} per referral!
                        </p>
                      </div>
                    )}
                  </>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmitPayment}
                  disabled={!selectedPlanId || !paymentMethod || submitPayment.isPending}
                >
                  {submitPayment.isPending ? "Processing..." : "Complete Payment"}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By completing payment, you agree to our Terms of Service
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

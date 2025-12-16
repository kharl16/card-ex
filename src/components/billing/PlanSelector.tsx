import cardExLogo from "@/assets/cardex-logo.png";
import { Check, Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardPlan } from "@/hooks/useCardPlans";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PlanSelectorProps {
  plans: CardPlan[];
  selectedPlanId: string | null;
  onSelectPlan: (planId: string) => void;
}

export function PlanSelector({ plans, selectedPlanId, onSelectPlan }: PlanSelectorProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getPlanIcon = (code: string) => {
    switch (code) {
      case "ELITE_PRO_SAURON":
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case "ELITE_FRODO":
        return <Sparkles className="h-5 w-5 text-purple-500" />;
      // 🔥 Card-Ex Ultimate -> use logo
      case "ULTIMATE": // ⬅️ change this to your actual code if different
        return <img src={cardExLogo} alt="Card-Ex Ultimate" className="h-6 w-6 rounded-md object-contain" />;
      default:
        return null;
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => {
        const isSelected = selectedPlanId === plan.id;
        const isPopular = plan.code === "ESSENTIAL";

        // Premium = Elite plans + Ultimate
        const isPremium = plan.code.includes("ELITE") || plan.code === "ULTIMATE";

        return (
          <Card
            key={plan.id}
            className={cn(
              "relative cursor-pointer transition-all hover:shadow-lg",
              isSelected && "ring-2 ring-primary border-primary",
              isPremium && "border-yellow-500/50",
            )}
            onClick={() => onSelectPlan(plan.id)}
          >
            {isPopular && <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">Most Popular</Badge>}
            {isPremium && <Badge className="absolute -top-2 right-2 bg-yellow-500 text-black">Premium</Badge>}

            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {getPlanIcon(plan.code)}
                  {plan.name}
                </CardTitle>
                {isSelected && (
                  <div className="rounded-full bg-primary p-1">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <CardDescription className="text-sm">{plan.description}</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">{formatPrice(plan.retail_price)}</div>

                <div className="flex flex-wrap gap-1">
                  {plan.has_reseller_access && (
                    <Badge variant="outline" className="text-xs">
                      Reseller Access
                    </Badge>
                  )}
                  {plan.referral_eligible && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                      Earn ₱{plan.profit} per referral
                    </Badge>
                  )}
                  {!plan.referral_eligible && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      No referral income
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

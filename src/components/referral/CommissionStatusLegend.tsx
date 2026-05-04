import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, Wallet, Info } from "lucide-react";

export function CommissionStatusLegend() {
  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-4 w-4 text-primary" />
          How your commissions work
        </CardTitle>
        <CardDescription>
          Each referral moves through three stages before payout.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card/50 p-3">
          <Badge variant="outline" className="mb-2 gap-1 text-yellow-600 border-yellow-600">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
          <p className="text-xs text-muted-foreground">
            The referred user paid for their card. Commission is held during a <strong>7-day cooldown</strong>.
          </p>
        </div>
        <div className="rounded-lg border bg-card/50 p-3">
          <Badge className="mb-2 gap-1 bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="h-3 w-3" /> Qualified
          </Badge>
          <p className="text-xs text-muted-foreground">
            Cooldown cleared. You'll get an email and your commission joins the next payout batch (≥ ₱1,000 minimum).
          </p>
        </div>
        <div className="rounded-lg border bg-card/50 p-3">
          <Badge className="mb-2 gap-1 bg-blue-500 hover:bg-blue-600">
            <Wallet className="h-3 w-3" /> Paid Out
          </Badge>
          <p className="text-xs text-muted-foreground">
            Sent via your saved payout method (GCash / Maya / Bank). Fill in your payout details below to receive funds.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

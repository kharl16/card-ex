import { useState } from "react";
import { Copy, Share2, Users, TrendingUp, AlertCircle } from "lucide-react";
import { useReferralProfile, useMyReferrals } from "@/hooks/useReferral";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface ReferralPanelProps {
  userPlanCode?: string | null;
}

export function ReferralPanel({ userPlanCode }: ReferralPanelProps) {
  const { data: referralProfile, isLoading: profileLoading } = useReferralProfile();
  const { data: referrals, isLoading: referralsLoading } = useMyReferrals();
  const [copying, setCopying] = useState(false);

  // Check if user is on Personal plan (no referral access)
  const isPersonalPlan = userPlanCode === "PERSONAL";

  if (isPersonalPlan) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-5 w-5" />
            Referral Program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Upgrade to <strong>Card-Ex Essential</strong> or higher to unlock Referral income.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!referralProfile?.has_referral_access) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-5 w-5" />
            Referral Program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Pay for your Card-Ex plan to unlock your referral code and start earning!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const referralLink = `https://tagex.app/signup?ref=${referralProfile.referral_code}`;

  const copyToClipboard = async (text: string, label: string) => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (err) {
      toast.error("Failed to copy");
    } finally {
      setCopying(false);
    }
  };

  const shareReferralLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Card-Ex",
          text: "Create your digital business card with Card-Ex!",
          url: referralLink,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      copyToClipboard(referralLink, "Referral link");
    }
  };

  const totalEarnings = referrals?.reduce((sum, ref) => {
    if (ref.status === "qualified" || ref.status === "paid_out") {
      return sum + (ref.plan?.profit || 0);
    }
    return sum;
  }, 0) || 0;

  const pendingReferrals = referrals?.filter(r => r.status === "pending").length || 0;
  const qualifiedReferrals = referrals?.filter(r => r.status === "qualified" || r.status === "paid_out").length || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "qualified":
        return <Badge className="bg-green-500">Qualified</Badge>;
      case "paid_out":
        return <Badge className="bg-blue-500">Paid Out</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (profileLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Referral Program
        </CardTitle>
        <CardDescription>
          Share your referral link and earn commissions when people sign up!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-primary">{qualifiedReferrals}</div>
            <div className="text-xs text-muted-foreground">Qualified</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{pendingReferrals}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-green-600">₱{totalEarnings.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Earnings</div>
          </div>
        </div>

        {/* Referral Code & Link */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Your Referral Code</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={referralProfile.referral_code || ""}
                readOnly
                className="font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(referralProfile.referral_code || "", "Referral code")}
                disabled={copying}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Your Referral Link</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={referralLink}
                readOnly
                className="text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(referralLink, "Referral link")}
                disabled={copying}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                onClick={shareReferralLink}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Referrals Table */}
        {referrals && referrals.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Your Referrals
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((ref) => (
                    <TableRow key={ref.id}>
                      <TableCell className="font-medium">
                        {ref.referred_profile?.full_name || "User"}
                      </TableCell>
                      <TableCell>{ref.plan?.name || "-"}</TableCell>
                      <TableCell>₱{ref.plan?.profit?.toLocaleString() || 0}</TableCell>
                      <TableCell>{getStatusBadge(ref.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

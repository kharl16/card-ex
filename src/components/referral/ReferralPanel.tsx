import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Share2, Users, TrendingUp, AlertCircle, UserCheck, Clock, CheckCircle2, Wallet, DollarSign, Eye, Edit } from "lucide-react";
import { useReferralProfile, useMyReferrals, useMyReferrer } from "@/hooks/useReferral";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
interface ReferralPanelProps {
  userPlanCode?: string | null;
}

export function ReferralPanel({ userPlanCode }: ReferralPanelProps) {
  const navigate = useNavigate();
  const { data: referralProfile, isLoading: profileLoading } = useReferralProfile();
  const { data: referrals, isLoading: referralsLoading } = useMyReferrals();
  const { data: myReferrer } = useMyReferrer();
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

  // Calculate earnings breakdown
  const pendingReferrals = referrals?.filter(r => r.status === "pending") || [];
  const qualifiedReferrals = referrals?.filter(r => r.status === "qualified") || [];
  const paidOutReferrals = referrals?.filter(r => r.status === "paid_out") || [];
  const cancelledReferrals = referrals?.filter(r => r.status === "cancelled") || [];

  const pendingCommission = pendingReferrals.reduce((sum, ref) => sum + (ref.plan?.profit || 0), 0);
  const qualifiedCommission = qualifiedReferrals.reduce((sum, ref) => sum + (ref.plan?.profit || 0), 0);
  const paidOutCommission = paidOutReferrals.reduce((sum, ref) => sum + (ref.plan?.profit || 0), 0);
  const totalEarnings = qualifiedCommission + paidOutCommission;
  const totalReferrals = referrals?.length || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
      case "qualified":
        return <Badge className="bg-green-500 hover:bg-green-600">Qualified</Badge>;
      case "paid_out":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Paid Out</Badge>;
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
        {/* Referred By Indicator */}
        {myReferrer && (
          <Alert className="border-primary/30 bg-primary/5">
            <UserCheck className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              You were referred by <strong className="text-primary">{myReferrer.full_name || "a Card-Ex user"}</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Commission Dashboard */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Commission Dashboard
          </h4>
          
          {/* Main Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3.5 w-3.5 text-yellow-600" />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
              <div className="text-xl font-bold text-yellow-600">{pendingReferrals.length}</div>
              <div className="text-xs text-muted-foreground">₱{pendingCommission.toLocaleString()}</div>
            </div>
            
            <div className="p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs text-muted-foreground">Qualified</span>
              </div>
              <div className="text-xl font-bold text-green-600">{qualifiedReferrals.length}</div>
              <div className="text-xs text-muted-foreground">₱{qualifiedCommission.toLocaleString()}</div>
            </div>
            
            <div className="p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs text-muted-foreground">Paid Out</span>
              </div>
              <div className="text-xl font-bold text-blue-600">{paidOutReferrals.length}</div>
              <div className="text-xs text-muted-foreground">₱{paidOutCommission.toLocaleString()}</div>
            </div>
            
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">Total Earned</span>
              </div>
              <div className="text-xl font-bold text-primary">₱{totalEarnings.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{qualifiedReferrals.length + paidOutReferrals.length} referrals</div>
            </div>
          </div>

          {/* Progress visualization when there are referrals */}
          {totalReferrals > 0 && (
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Conversion Progress</span>
                <span>{qualifiedReferrals.length + paidOutReferrals.length}/{totalReferrals} qualified</span>
              </div>
              <Progress 
                value={totalReferrals > 0 ? ((qualifiedReferrals.length + paidOutReferrals.length) / totalReferrals) * 100 : 0} 
                className="h-2"
              />
            </div>
          )}
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
        {referrals && referrals.length > 0 ? (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Your Referrals ({referrals.length})
            </h4>
            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((ref) => (
                    <TableRow key={ref.id}>
                      <TableCell className="font-medium">
                        {ref.referred_profile?.full_name || "Unknown User"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ref.plan?.name || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₱{ref.plan?.profit?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell>{getStatusBadge(ref.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {ref.referred_card ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => window.open(`/c/${ref.referred_card?.slug}`, '_blank')}
                                title="View Card"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => navigate(`/editor/${ref.referred_card?.id}`)}
                                title="Edit Card"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">No card yet</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 bg-muted/30 rounded-lg">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No referrals yet</p>
            <p className="text-xs text-muted-foreground mt-1">Share your link to start earning commissions!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

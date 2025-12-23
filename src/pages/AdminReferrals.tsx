import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SignOutButton from "@/components/auth/SignOutButton";
import {
  ArrowLeft,
  Search,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  Wallet,
  TrendingUp,
  Percent,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
import LoadingAnimation from "@/components/LoadingAnimation";
import { format } from "date-fns";

interface ReferralWithDetails {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referred_card_id: string | null;
  payment_id: string | null;
  plan_id: string | null;
  status: string;
  created_at: string;
  referrer_name: string | null;
  referred_name: string | null;
  plan_name: string | null;
  plan_profit: number | null;
}

interface ReferrerStats {
  referrer_user_id: string;
  referrer_name: string;
  total_referrals: number;
  pending: number;
  qualified: number;
  paid_out: number;
  total_commission: number;
  pending_commission: number;
  qualified_commission: number;
  paid_commission: number;
  conversion_rate: number;
}

export default function AdminReferrals() {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [referrals, setReferrals] = useState<ReferralWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [plans, setPlans] = useState<{ id: string; name: string }[]>([]);
  const [planFilter, setPlanFilter] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/dashboard");
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      loadReferrals();
      loadPlans();
    }
  }, [user, isAdmin]);

  const loadPlans = async () => {
    const { data } = await supabase
      .from("card_plans")
      .select("id, name")
      .eq("is_active", true)
      .order("retail_price");
    if (data) setPlans(data);
  };

  const loadReferrals = async () => {
    setLoading(true);
    try {
      // Get all referrals with plan info
      const { data: referralsData, error } = await supabase
        .from("referrals")
        .select(`
          *,
          plan:card_plans(name, profit)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get unique user IDs
      const userIds = new Set<string>();
      referralsData?.forEach(r => {
        userIds.add(r.referrer_user_id);
        userIds.add(r.referred_user_id);
      });

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Combine data
      const combined: ReferralWithDetails[] = (referralsData || []).map(r => ({
        ...r,
        referrer_name: profileMap.get(r.referrer_user_id) || "Unknown",
        referred_name: profileMap.get(r.referred_user_id) || "Unknown",
        plan_name: r.plan?.name || null,
        plan_profit: r.plan?.profit || null,
      }));

      setReferrals(combined);
    } catch (err) {
      console.error("Error loading referrals:", err);
      toast.error("Failed to load referrals");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("referrals")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Status updated to ${newStatus}`);
      loadReferrals();
    }
  };

  // Filter referrals
  const filteredReferrals = referrals.filter(r => {
    const matchesSearch = 
      r.referrer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referred_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesPlan = planFilter === "all" || r.plan_id === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Calculate totals
  const totals = {
    pending: filteredReferrals.filter(r => r.status === "pending").length,
    qualified: filteredReferrals.filter(r => r.status === "qualified").length,
    paid_out: filteredReferrals.filter(r => r.status === "paid_out").length,
    pendingAmount: filteredReferrals
      .filter(r => r.status === "pending")
      .reduce((sum, r) => sum + (r.plan_profit || 0), 0),
    qualifiedAmount: filteredReferrals
      .filter(r => r.status === "qualified")
      .reduce((sum, r) => sum + (r.plan_profit || 0), 0),
    paidAmount: filteredReferrals
      .filter(r => r.status === "paid_out")
      .reduce((sum, r) => sum + (r.plan_profit || 0), 0),
  };

  // Calculate per-referrer stats for analytics
  const referrerStats = useMemo<ReferrerStats[]>(() => {
    const statsMap = new Map<string, ReferrerStats>();

    referrals.forEach(r => {
      if (!statsMap.has(r.referrer_user_id)) {
        statsMap.set(r.referrer_user_id, {
          referrer_user_id: r.referrer_user_id,
          referrer_name: r.referrer_name || "Unknown",
          total_referrals: 0,
          pending: 0,
          qualified: 0,
          paid_out: 0,
          total_commission: 0,
          pending_commission: 0,
          qualified_commission: 0,
          paid_commission: 0,
          conversion_rate: 0,
        });
      }

      const stat = statsMap.get(r.referrer_user_id)!;
      stat.total_referrals++;
      stat.total_commission += r.plan_profit || 0;

      switch (r.status) {
        case "pending":
          stat.pending++;
          stat.pending_commission += r.plan_profit || 0;
          break;
        case "qualified":
          stat.qualified++;
          stat.qualified_commission += r.plan_profit || 0;
          break;
        case "paid_out":
          stat.paid_out++;
          stat.paid_commission += r.plan_profit || 0;
          break;
      }
    });

    // Calculate conversion rates (qualified + paid_out / total)
    statsMap.forEach(stat => {
      stat.conversion_rate = stat.total_referrals > 0
        ? ((stat.qualified + stat.paid_out) / stat.total_referrals) * 100
        : 0;
    });

    return Array.from(statsMap.values()).sort((a, b) => b.total_commission - a.total_commission);
  }, [referrals]);

  // Overall analytics
  const overallAnalytics = useMemo(() => {
    const totalReferrals = referrals.length;
    const converted = referrals.filter(r => r.status === "qualified" || r.status === "paid_out").length;
    const conversionRate = totalReferrals > 0 ? (converted / totalReferrals) * 100 : 0;
    const totalCommission = referrals.reduce((sum, r) => sum + (r.plan_profit || 0), 0);
    const paidCommission = referrals.filter(r => r.status === "paid_out").reduce((sum, r) => sum + (r.plan_profit || 0), 0);
    const uniqueReferrers = new Set(referrals.map(r => r.referrer_user_id)).size;

    return {
      totalReferrals,
      converted,
      conversionRate,
      totalCommission,
      paidCommission,
      uniqueReferrers,
      avgPerReferrer: uniqueReferrers > 0 ? totalCommission / uniqueReferrers : 0,
    };
  }, [referrals]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">Pending</Badge>;
      case "qualified":
        return <Badge variant="secondary" className="bg-green-500/20 text-green-400">Qualified</Badge>;
      case "paid_out":
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">Paid Out</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading || loading) {
    return <LoadingAnimation />;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/cards")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={CardExLogo} alt="Card-Ex" className="h-8 w-auto" />
            <h1 className="text-xl font-semibold text-foreground">Admin Referrals</h1>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="referrals" className="gap-2">
              <Users className="h-4 w-4" />
              All Referrals
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card/50 border-primary/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Referrals</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{overallAnalytics.totalReferrals}</div>
                  <p className="text-xs text-muted-foreground">{overallAnalytics.uniqueReferrers} unique referrers</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-green-500/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
                  <Percent className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">{overallAnalytics.conversionRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">{overallAnalytics.converted} converted</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-yellow-500/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Commission</CardTitle>
                  <DollarSign className="h-4 w-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-400">₱{overallAnalytics.totalCommission.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">₱{overallAnalytics.avgPerReferrer.toLocaleString()} avg/referrer</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-blue-500/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Paid Out</CardTitle>
                  <Wallet className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">₱{overallAnalytics.paidCommission.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{totals.paid_out} payouts completed</p>
                </CardContent>
              </Card>
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card/50 border-yellow-500/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-400">{totals.pending}</div>
                  <p className="text-xs text-muted-foreground">₱{totals.pendingAmount.toLocaleString()} potential</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-green-500/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Qualified</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">{totals.qualified}</div>
                  <p className="text-xs text-muted-foreground">₱{totals.qualifiedAmount.toLocaleString()} to pay</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-blue-500/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Paid Out</CardTitle>
                  <Wallet className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">{totals.paid_out}</div>
                  <p className="text-xs text-muted-foreground">₱{totals.paidAmount.toLocaleString()} total paid</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* All Referrals Tab */}
          <TabsContent value="referrals" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="paid_out">Paid Out</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Filter by plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plans</SelectItem>
                      {plans.map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Referrals Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Referrals ({filteredReferrals.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Referrer</TableHead>
                        <TableHead>Referred User</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReferrals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No referrals found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredReferrals.map((referral) => (
                          <TableRow key={referral.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(referral.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="font-medium">{referral.referrer_name}</TableCell>
                            <TableCell>{referral.referred_name}</TableCell>
                            <TableCell>
                              {referral.plan_name ? (
                                <Badge variant="outline">{referral.plan_name}</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {referral.plan_profit ? (
                                <span className="font-semibold text-primary">
                                  ₱{referral.plan_profit.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(referral.status)}</TableCell>
                            <TableCell>
                              <Select
                                value={referral.status}
                                onValueChange={(value) => updateStatus(referral.id, value)}
                              >
                                <SelectTrigger className="w-[120px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="qualified">Qualified</SelectItem>
                                  <SelectItem value="paid_out">Paid Out</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Referrers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Referrer</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Pending</TableHead>
                        <TableHead className="text-center">Qualified</TableHead>
                        <TableHead className="text-center">Paid</TableHead>
                        <TableHead className="text-center">Conversion</TableHead>
                        <TableHead className="text-right">Total Commission</TableHead>
                        <TableHead className="text-right">Paid Out</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrerStats.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No referrers found
                          </TableCell>
                        </TableRow>
                      ) : (
                        referrerStats.map((stat, index) => (
                          <TableRow key={stat.referrer_user_id}>
                            <TableCell className="font-medium">
                              {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                            </TableCell>
                            <TableCell className="font-medium">{stat.referrer_name}</TableCell>
                            <TableCell className="text-center">{stat.total_referrals}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                                {stat.pending}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                                {stat.qualified}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                                {stat.paid_out}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={stat.conversion_rate >= 50 ? "text-green-400" : stat.conversion_rate >= 25 ? "text-yellow-400" : "text-muted-foreground"}>
                                {stat.conversion_rate.toFixed(0)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-primary">
                              ₱{stat.total_commission.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-blue-400">
                              ₱{stat.paid_commission.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

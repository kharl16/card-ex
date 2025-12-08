import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, MousePointer, QrCode, Download } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsData {
  day: string;
  views: number;
  unique_views: number;
  qr_scans: number;
  cta_clicks: number;
  vcard_downloads: number;
}

export default function Analytics() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    if (!id) {
      console.error("Analytics page loaded without card id in route params");
      toast.error("Missing card ID for analytics");
      setLoading(false);
      return;
    }

    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const startDate = format(startOfDay(subDays(new Date(), dateRange)), "yyyy-MM-dd");
        const endDate = format(endOfDay(new Date()), "yyyy-MM-dd");

        console.log("[Analytics] Loading for card_id =", id, "range", {
          startDate,
          endDate,
        });

        const { data: analyticsData, error } = await supabase
          .from("analytics_daily")
          .select("*")
          .eq("card_id", id)
          .gte("day", startDate)
          .lte("day", endDate)
          .order("day", { ascending: true });

        if (error) {
          console.error("[Analytics] Supabase error:", error);
          toast.error("Failed to load analytics");
          setData([]);
          return;
        }

        console.log("[Analytics] Raw analytics rows:", analyticsData);

        if (analyticsData && analyticsData.length > 0) {
          setData(
            analyticsData.map((item: any) => ({
              day: format(new Date(item.day), "MMM dd"),
              views: item.views || 0,
              unique_views: item.unique_views || 0,
              qr_scans: item.qr_scans || 0,
              cta_clicks: item.cta_clicks || 0,
              vcard_downloads: item.vcard_downloads || 0,
            })),
          );
        } else {
          setData([]);
        }
      } catch (err) {
        console.error("[Analytics] Unexpected error:", err);
        toast.error("Failed to load analytics");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [id, dateRange]);

  const totalStats = data.reduce(
    (acc, curr) => ({
      views: acc.views + curr.views,
      unique_views: acc.unique_views + curr.unique_views,
      qr_scans: acc.qr_scans + curr.qr_scans,
      cta_clicks: acc.cta_clicks + curr.cta_clicks,
      vcard_downloads: acc.vcard_downloads + curr.vcard_downloads,
    }),
    { views: 0, unique_views: 0, qr_scans: 0, cta_clicks: 0, vcard_downloads: 0 },
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-lg font-semibold">Analytics</h1>
          <div className="flex gap-2">
            <Button variant={dateRange === 7 ? "default" : "outline"} size="sm" onClick={() => setDateRange(7)}>
              7 Days
            </Button>
            <Button variant={dateRange === 30 ? "default" : "outline"} size="sm" onClick={() => setDateRange(30)}>
              30 Days
            </Button>
            <Button variant={dateRange === 90 ? "default" : "outline"} size="sm" onClick={() => setDateRange(90)}>
              90 Days
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.views}</div>
              <p className="text-xs text-muted-foreground">{totalStats.unique_views} unique visitors</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">QR Scans</CardTitle>
              <QrCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.qr_scans}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CTA Clicks</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.cta_clicks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">vCard Downloads</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.vcard_downloads}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Views Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" name="Total Views" />
                  <Line type="monotone" dataKey="unique_views" stroke="hsl(var(--secondary))" name="Unique Views" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="qr_scans" fill="hsl(var(--primary))" name="QR Scans" />
                  <Bar dataKey="cta_clicks" fill="hsl(var(--accent))" name="CTA Clicks" />
                  <Bar dataKey="vcard_downloads" fill="hsl(var(--secondary))" name="vCard Downloads" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

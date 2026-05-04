import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface BatchRow {
  id: string;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
  status: string;
  total_amount: number | null;
  total_referrals: number | null;
  total_recipients: number | null;
  notes: string | null;
}

export function PayoutBatchHistory() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_referral_payout_batches");
    if (error) {
      toast.error(error.message || "Failed to load payout history");
    } else {
      setBatches((data ?? []) as BatchRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Payout Batch History
          </CardTitle>
          <CardDescription>All exported referral commission batches.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {batches.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No payout batches yet. Use "Generate batch" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead className="text-right">Referrals</TableHead>
                  <TableHead className="text-right">Total ₱</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="text-sm">
                      {format(new Date(b.created_at), "yyyy-MM-dd HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm">{b.created_by_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{b.total_recipients ?? 0}</TableCell>
                    <TableCell className="text-right">{b.total_referrals ?? 0}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ₱{Number(b.total_amount ?? 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Wallet } from "lucide-react";
import { toast } from "sonner";

interface PayoutRow {
  batch_id: string;
  referrer_user_id: string;
  referrer_name: string | null;
  payout_method: string | null;
  payout_account_name: string | null;
  payout_account_number: string | null;
  referral_count: number;
  total_amount: number;
  referral_ids: string[];
}

export function PayoutExportPanel() {
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [minAmount, setMinAmount] = useState(1000);

  const handleExport = async () => {
    if (!confirm(`Generate a payout batch for all qualified referrals with totals ≥ ₱${minAmount}? This will mark them as paid_out.`)) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_referral_payout_batch", {
        p_min_amount: minAmount,
      });
      if (error) throw error;
      const result = (data ?? []) as PayoutRow[];
      setRows(result);
      if (result.length === 0) {
        toast.info("No referrers reached the minimum payout threshold yet.");
        return;
      }
      downloadCsv(result);
      toast.success(`Batch created — ${result.length} payout(s), CSV downloaded.`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create payout batch");
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = (data: PayoutRow[]) => {
    const headers = [
      "referrer_name",
      "payout_method",
      "account_name",
      "account_number",
      "referral_count",
      "total_amount_php",
      "batch_id",
    ];
    const csv = [
      headers.join(","),
      ...data.map((r) =>
        [
          r.referrer_name ?? "",
          r.payout_method ?? "",
          r.payout_account_name ?? "",
          r.payout_account_number ?? "",
          r.referral_count,
          Number(r.total_amount).toFixed(2),
          r.batch_id,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `referral-payouts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Payout Export
        </CardTitle>
        <CardDescription>
          Auto-qualifies referrals after a 7-day cooldown, then exports a CSV of payable commissions
          (default minimum ₱1,000 per referrer) and marks them as paid out.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 max-w-xs">
            <Label htmlFor="min-amount">Minimum payout (₱)</Label>
            <Input
              id="min-amount"
              type="number"
              min={0}
              value={minAmount}
              onChange={(e) => setMinAmount(Number(e.target.value) || 0)}
            />
          </div>
          <Button onClick={handleExport} disabled={loading} className="gap-2">
            <Download className="h-4 w-4" />
            {loading ? "Processing..." : "Generate batch & download CSV"}
          </Button>
        </div>

        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Referrals</TableHead>
                  <TableHead className="text-right">Total ₱</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.referrer_user_id}>
                    <TableCell>{r.referrer_name ?? r.referrer_user_id.slice(0, 8)}</TableCell>
                    <TableCell>{r.payout_method ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-xs">
                      {r.payout_account_name ?? "—"}
                      <br />
                      <span className="text-muted-foreground">{r.payout_account_number ?? ""}</span>
                    </TableCell>
                    <TableCell className="text-right">{r.referral_count}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ₱{Number(r.total_amount).toLocaleString()}
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

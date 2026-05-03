import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

export function PayoutDetailsCard() {
  const { user } = useAuth();
  const [method, setMethod] = useState<string>("GCash");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    supabase
      .from("profiles")
      .select("payout_method, payout_account_name, payout_account_number")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setMethod(data.payout_method || "GCash");
          setAccountName(data.payout_account_name || "");
          setAccountNumber(data.payout_account_number || "");
        }
        setLoading(false);
      });
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    if (!accountName.trim() || !accountNumber.trim()) {
      toast.error("Please fill in both account name and number.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        payout_method: method,
        payout_account_name: accountName.trim(),
        payout_account_number: accountNumber.trim(),
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Payout details saved.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Payout Details
        </CardTitle>
        <CardDescription>
          Where should we send your referral commissions? Required to receive payouts (min ₱1,000, paid 7 days after each referred card is paid).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="payout-method">Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger id="payout-method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GCash">GCash</SelectItem>
              <SelectItem value="Maya">Maya</SelectItem>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="account-name">Account Name</Label>
          <Input
            id="account-name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            disabled={loading}
            placeholder="Juan Dela Cruz"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="account-number">Account Number</Label>
          <Input
            id="account-number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            disabled={loading}
            placeholder="09171234567"
          />
        </div>
        <Button onClick={handleSave} disabled={saving || loading} className="w-full sm:w-auto">
          {saving ? "Saving..." : "Save payout details"}
        </Button>
      </CardContent>
    </Card>
  );
}

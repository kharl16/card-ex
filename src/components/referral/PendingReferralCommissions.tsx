import { useMemo } from "react";
import { Clock, TrendingUp } from "lucide-react";
import { useMyReferrals } from "@/hooks/useReferral";

interface PendingReferralCommissionsProps {
  className?: string;
}

export function PendingReferralCommissions({ className = "" }: PendingReferralCommissionsProps) {
  const { data: referrals = [], isLoading } = useMyReferrals();

  const stats = useMemo(() => {
    const pending = referrals.filter((r) => r.status === "pending" || r.status === "qualified");
    const pendingCount = pending.length;
    const pendingAmount = pending.reduce((sum, r) => sum + (r.plan?.profit || 0), 0);
    return { pendingCount, pendingAmount };
  }, [referrals]);

  if (isLoading || stats.pendingCount === 0) return null;

  const amount = `₱${stats.pendingAmount.toLocaleString()}`;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-orange-400/40 bg-gradient-to-br from-orange-500/20 via-orange-400/10 to-amber-600/20 p-5 shadow-[0_8px_30px_-10px_rgba(234,140,40,0.5)] backdrop-blur-md ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-orange-200/10 to-transparent transition-transform duration-1000 hover:translate-x-full" />
      <div className="relative flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-400/20 ring-1 ring-orange-400/40">
          <Clock className="h-7 w-7 text-orange-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-200/80">
            Pending Referral Commissions
          </p>
          <p className="mt-0.5 truncate text-3xl font-extrabold tracking-tight text-orange-50">
            {amount}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-orange-100/70">
            <TrendingUp className="h-3.5 w-3.5" />
            {stats.pendingCount} referral{stats.pendingCount === 1 ? "" : "s"} awaiting payout
          </p>
        </div>
      </div>
    </div>
  );
}

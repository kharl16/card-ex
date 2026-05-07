import { useEffect, useState } from "react";
import { Trophy, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReferralEarningsBadgeProps {
  cardId?: string | null;
  userId?: string | null;
  variant?: "card" | "dashboard";
  className?: string;
}

interface Stats {
  paid_out_count: number;
  paid_out_amount: number;
}

export function ReferralEarningsBadge({
  cardId,
  userId,
  variant = "card",
  className = "",
}: ReferralEarningsBadgeProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        let res;
        if (cardId) {
          res = await (supabase.rpc as any)("get_card_referral_stats", { p_card_id: cardId });
        } else if (userId) {
          res = await (supabase.rpc as any)("get_user_referral_stats", { p_user_id: userId });
        } else {
          return;
        }
        const row = Array.isArray(res?.data) ? res.data[0] : res?.data;
        if (!cancelled && row) {
          setStats({
            paid_out_count: Number(row.paid_out_count) || 0,
            paid_out_amount: Number(row.paid_out_amount) || 0,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [cardId, userId]);

  if (loading || !stats || stats.paid_out_count === 0) return null;

  const amount = `₱${stats.paid_out_amount.toLocaleString()}`;
  const count = stats.paid_out_count;

  if (variant === "dashboard") {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-yellow-600/20 p-5 shadow-[0_8px_30px_-10px_rgba(212,175,55,0.5)] backdrop-blur-md ${className}`}
      >
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-200/10 to-transparent transition-transform duration-1000 hover:translate-x-full" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 ring-1 ring-amber-400/40">
            <Trophy className="h-7 w-7 text-amber-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">
              Total Referral Commission Earned
            </p>
            <p className="mt-0.5 truncate text-3xl font-extrabold tracking-tight text-amber-50">
              {amount}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-amber-100/70">
              <Users className="h-3.5 w-3.5" />
              {count} successful referral{count === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Public card variant — gold, eye-catching, prominent
  return (
    <div className={`px-6 py-3 ${className}`}>
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/50 bg-gradient-to-br from-amber-500/25 via-yellow-500/15 to-amber-600/25 p-4 shadow-[0_10px_40px_-10px_rgba(212,175,55,0.6)] backdrop-blur-md">
        <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-100/15 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-400/25 ring-1 ring-amber-300/50">
            <Trophy className="h-6 w-6 text-amber-200" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/90">
              Referral Earnings
            </p>
            <p className="text-2xl font-extrabold leading-tight tracking-tight text-amber-50">
              {amount}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-amber-100/80">
              <Users className="h-3 w-3" />
              {count} referral{count === 1 ? "" : "s"} paid out
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

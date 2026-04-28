import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ShieldAlert, Loader2, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

const FAILURE_EVENTS = [
  "otp_fingerprint_mismatch",
  "otp_invalid_attempt",
  "otp_replay_attempt",
  "first_device_otp_failed",
] as const;

type FailureEvent = typeof FAILURE_EVENTS[number];

interface AuditRow {
  id: string;
  user_id: string;
  event_type: string;
  device_label: string | null;
  device_fingerprint_hash: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  metadata: any;
  created_at: string;
}

interface ProfileLite {
  id: string;
  full_name: string | null;
}

const eventLabel = (t: string) =>
  ({
    otp_fingerprint_mismatch: "Fingerprint mismatch",
    otp_invalid_attempt: "Invalid OTP",
    otp_replay_attempt: "Replay attempt",
    first_device_otp_failed: "First-device OTP failed",
  } as Record<string, string>)[t] || t;

const eventVariant = (t: string): "destructive" | "secondary" | "default" =>
  t === "otp_replay_attempt" || t === "otp_fingerprint_mismatch" ? "destructive" : "secondary";

export default function AdminOtpAudit() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState("");
  const [eventFilter, setEventFilter] = useState<"all" | FailureEvent>("all");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Admin access required");
      navigate("/dashboard");
    }
  }, [authLoading, isAdmin, navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const events = eventFilter === "all" ? [...FAILURE_EVENTS] : [eventFilter];
      const startIso = new Date(`${startDate}T00:00:00`).toISOString();
      const endIso = new Date(`${endDate}T23:59:59.999`).toISOString();

      const { data, error } = await supabase
        .from("auth_audit_log")
        .select("*")
        .in("event_type", events)
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      const list = (data as AuditRow[]) ?? [];
      setRows(list);

      // Hydrate profile names
      const ids = Array.from(new Set(list.map((r) => r.user_id)));
      if (ids.length) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids);
        const map: Record<string, ProfileLite> = {};
        (ps ?? []).forEach((p: any) => (map[p.id] = p));
        setProfiles(map);
      } else {
        setProfiles({});
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, eventFilter, startDate, endDate]);

  const filtered = useMemo(() => {
    const q = userFilter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = profiles[r.user_id]?.full_name?.toLowerCase() ?? "";
      return r.user_id.toLowerCase().includes(q) || name.includes(q);
    });
  }, [rows, userFilter, profiles]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of filtered) c[r.event_type] = (c[r.event_type] ?? 0) + 1;
    return c;
  }, [filtered]);

  const exportCsv = () => {
    const header = ["created_at", "event_type", "user_id", "user_name", "device_label", "fp_hash", "ip_hash", "user_agent", "metadata"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      const cells = [
        r.created_at,
        r.event_type,
        r.user_id,
        profiles[r.user_id]?.full_name ?? "",
        r.device_label ?? "",
        r.device_fingerprint_hash ?? "",
        r.ip_hash ?? "",
        r.user_agent ?? "",
        JSON.stringify(r.metadata ?? {}),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `otp-audit-${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-destructive" /> OTP Failure Audit
            </h1>
            <p className="text-sm text-muted-foreground">
              Fingerprint mismatches, invalid OTPs, and replay attempts on device approval.
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={load} disabled={loading} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>Narrow by event type, user, and date range.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-xs text-muted-foreground">Event</label>
              <Select value={eventFilter} onValueChange={(v) => setEventFilter(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All failure events</SelectItem>
                  {FAILURE_EVENTS.map((e) => (
                    <SelectItem key={e} value={e}>{eventLabel(e)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">User (name or ID)</label>
              <Input value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="Search user…" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FAILURE_EVENTS.map((e) => (
            <Card key={e}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{eventLabel(e)}</p>
                <p className="text-2xl font-bold">{counts[e] ?? 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Events ({filtered.length}{rows.length === 500 ? " — capped at 500" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No failures in the selected range.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3">When</th>
                      <th className="py-2 pr-3">Event</th>
                      <th className="py-2 pr-3">User</th>
                      <th className="py-2 pr-3">Device</th>
                      <th className="py-2 pr-3">FP / IP</th>
                      <th className="py-2 pr-3">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id} className="border-b border-border/50 align-top">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <div>{format(new Date(r.created_at), "MMM d, HH:mm:ss")}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant={eventVariant(r.event_type)}>{eventLabel(r.event_type)}</Badge>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="font-medium">{profiles[r.user_id]?.full_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground font-mono">{r.user_id.slice(0, 8)}…</div>
                        </td>
                        <td className="py-2 pr-3 max-w-[220px]">
                          <div className="truncate">{r.device_label ?? "Unknown"}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.user_agent ?? ""}</div>
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs">
                          <div className="truncate max-w-[140px]">{r.device_fingerprint_hash?.slice(0, 16) ?? "—"}…</div>
                          <div className="truncate max-w-[140px] text-muted-foreground">{r.ip_hash?.slice(0, 16) ?? "—"}</div>
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          <pre className="whitespace-pre-wrap break-all max-w-[280px] text-muted-foreground">
                            {JSON.stringify(r.metadata ?? {}, null, 0)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

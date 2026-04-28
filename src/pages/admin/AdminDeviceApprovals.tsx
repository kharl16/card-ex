import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShieldCheck, Loader2, RefreshCw, Check, X, Smartphone, Laptop, Tablet, Monitor } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

interface PendingRequest {
  id: string;
  user_id: string;
  device_fingerprint_hash: string;
  device_label: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  metadata: any;
  full_name: string | null;
  email: string | null;
  enrolled_device_count: number;
}

function detectDeviceType(ua: string | null): { label: string; Icon: any } {
  const s = (ua ?? "").toLowerCase();
  if (/ipad|tablet/.test(s)) return { label: "Tablet", Icon: Tablet };
  if (/iphone|android.*mobile|mobile/.test(s)) return { label: "Mobile", Icon: Smartphone };
  if (/macintosh|windows nt|linux/.test(s)) return { label: "Desktop", Icon: Monitor };
  if (/mac os x/.test(s)) return { label: "Laptop", Icon: Laptop };
  return { label: "Unknown device", Icon: Monitor };
}

function detectBrowserOS(ua: string | null): string {
  if (!ua) return "—";
  const s = ua;
  let browser = "Browser";
  if (/Edg\//.test(s)) browser = "Edge";
  else if (/Chrome\//.test(s)) browser = "Chrome";
  else if (/Firefox\//.test(s)) browser = "Firefox";
  else if (/Safari\//.test(s)) browser = "Safari";
  let os = "OS";
  if (/Windows NT/.test(s)) os = "Windows";
  else if (/Android/.test(s)) os = "Android";
  else if (/iPhone|iPad|iOS/.test(s)) os = "iOS";
  else if (/Mac OS X/.test(s)) os = "macOS";
  else if (/Linux/.test(s)) os = "Linux";
  return `${browser} · ${os}`;
}

export default function AdminDeviceApprovals() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Admin access required");
      navigate("/dashboard");
    }
  }, [authLoading, isAdmin, navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("device-auth", {
        body: { action: "admin_list_pending" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRequests((data?.requests ?? []) as PendingRequest[]);
    } catch (e: any) {
      toast.error(e.message || "Failed to load pending requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(
      (r) =>
        (r.full_name ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        r.user_id.toLowerCase().includes(q)
    );
  }, [requests, search]);

  const act = async (id: string, action: "admin_approve" | "admin_deny") => {
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke("device-auth", {
        body: { action, request_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(action === "admin_approve" ? "Device approved" : "Request denied");
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setBusyId(null);
    }
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
              <ShieldCheck className="h-6 w-6 text-emerald-500" /> Pending Device Approvals
            </h1>
            <p className="text-sm text-muted-foreground">
              Approve or reject new sign-in devices on behalf of your users.
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={load} disabled={loading} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search</CardTitle>
            <CardDescription>Filter by user name, email, or user ID.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user…"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Pending requests ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No pending device approval requests.
              </p>
            ) : (
              <div className="space-y-3">
                {filtered.map((r) => {
                  const { label: deviceTypeLabel, Icon } = detectDeviceType(r.user_agent);
                  const expired = new Date(r.expires_at) < new Date();
                  return (
                    <div
                      key={r.id}
                      className="rounded-lg border border-border/60 p-4 flex flex-col md:flex-row gap-4 md:items-center"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold truncate">
                            {r.full_name || "Unnamed user"}
                          </span>
                          {r.email && (
                            <span className="text-xs text-muted-foreground truncate">
                              {r.email}
                            </span>
                          )}
                          <Badge variant="secondary" className="ml-1">
                            {r.enrolled_device_count} device{r.enrolled_device_count === 1 ? "" : "s"} enrolled
                          </Badge>
                          {expired && <Badge variant="destructive">Expired</Badge>}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="font-medium">{deviceTypeLabel}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{detectBrowserOS(r.user_agent)}</span>
                          {r.device_label && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-muted-foreground truncate max-w-[260px]">
                                {r.device_label}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Requested {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })} ·
                          expires {format(new Date(r.expires_at), "MMM d, HH:mm")}
                        </div>

                        <div className="text-[11px] font-mono text-muted-foreground/80 truncate">
                          fp: {r.device_fingerprint_hash.slice(0, 24)}…
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <Button
                          onClick={() => act(r.id, "admin_approve")}
                          disabled={busyId === r.id || expired}
                          className="gap-1"
                        >
                          {busyId === r.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => act(r.id, "admin_deny")}
                          disabled={busyId === r.id}
                          className="gap-1"
                        >
                          <X className="h-4 w-4" /> Deny
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

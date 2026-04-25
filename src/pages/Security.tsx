import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getDeviceFingerprint } from "@/lib/deviceFingerprint";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Shield, ShieldCheck, ShieldAlert, Trash2, LogOut, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface TrustedDevice {
  id: string;
  device_label: string | null;
  user_agent: string | null;
  device_fingerprint_hash: string;
  last_seen_at: string;
  approved_at: string;
}

interface PendingRequest {
  id: string;
  device_label: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  created_at: string;
  expires_at: string;
}

interface AuditEntry {
  id: string;
  event_type: string;
  device_label: string | null;
  created_at: string;
  metadata: any;
}

export default function Security() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [currentFp, setCurrentFp] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!session?.user) return;
    const fp = await getDeviceFingerprint();
    setCurrentFp(fp.hash);

    const [devRes, reqRes, auditRes] = await Promise.all([
      supabase
        .from("trusted_devices")
        .select("*")
        .eq("user_id", session.user.id)
        .is("revoked_at", null)
        .order("last_seen_at", { ascending: false }),
      supabase
        .from("device_approval_requests")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }),
      supabase
        .from("auth_audit_log")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    setDevices((devRes.data as any) ?? []);
    setRequests((reqRes.data as any) ?? []);
    setAudit((auditRes.data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const handleApprove = async (requestId: string) => {
    setBusy(requestId);
    try {
      const fp = await getDeviceFingerprint();
      const { error } = await supabase.functions.invoke("device-auth", {
        body: { action: "approve", request_id: requestId, approving_fingerprint_hash: fp.hash },
      });
      if (error) throw error;
      toast.success("Device approved");
      load();
    } catch (e: any) {
      toast.error(e.message || "Could not approve");
    } finally {
      setBusy(null);
    }
  };

  const handleDeny = async (requestId: string) => {
    setBusy(requestId);
    try {
      const { error } = await supabase.functions.invoke("device-auth", {
        body: { action: "deny", request_id: requestId },
      });
      if (error) throw error;
      toast.success("Request denied");
      load();
    } catch (e: any) {
      toast.error(e.message || "Could not deny");
    } finally {
      setBusy(null);
    }
  };

  const handleRevoke = async (deviceId: string) => {
    setBusy(deviceId);
    try {
      const { error } = await supabase.functions.invoke("device-auth", {
        body: { action: "revoke", device_id: deviceId },
      });
      if (error) throw error;
      toast.success("Device revoked");
      load();
    } catch (e: any) {
      toast.error(e.message || "Could not revoke");
    } finally {
      setBusy(null);
    }
  };

  const handleSignOutAll = async () => {
    setBusy("all");
    try {
      const { error } = await supabase.functions.invoke("device-auth", {
        body: { action: "sign_out_all" },
      });
      if (error) throw error;
      toast.success("Signed out of all devices");
      await supabase.auth.signOut();
      window.location.href = "/auth";
    } catch (e: any) {
      toast.error(e.message || "Could not sign out");
      setBusy(null);
    }
  };

  const eventLabel = (t: string) =>
    ({
      login_attempt_trusted: "Login (trusted device)",
      login_attempt_new_device: "New device login attempt",
      device_approved: "Device approved",
      device_denied: "Device denied",
      device_revoked: "Device revoked",
      first_device_otp_sent: "Email code sent",
      first_device_otp_verified: "Email code verified",
      sign_out_all_devices: "Signed out everywhere",
    }[t] || t);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" /> Security
            </h1>
            <p className="text-sm text-muted-foreground">Manage devices that can sign in to your account</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Pending requests */}
            {requests.length > 0 && (
              <Card className="border-primary/40 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldAlert className="h-5 w-5 text-primary" /> Pending device approvals ({requests.length})
                  </CardTitle>
                  <CardDescription>Someone is trying to sign in. Review carefully before approving.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {requests.map((r) => (
                    <div key={r.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                      <div>
                        <p className="font-medium text-sm">{r.device_label || "Unknown device"}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.user_agent}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })} ·
                          expires in {formatDistanceToNow(new Date(r.expires_at))}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleApprove(r.id)}
                          disabled={busy === r.id}
                        >
                          {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleDeny(r.id)}
                          disabled={busy === r.id}
                        >
                          <X className="h-4 w-4 mr-1" /> Deny
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Trusted devices */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Trusted devices ({devices.length})
                </CardTitle>
                <CardDescription>Devices that can sign in without approval</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {devices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No trusted devices yet</p>
                ) : (
                  devices.map((d) => {
                    const isCurrent = d.device_fingerprint_hash === currentFp;
                    return (
                      <div key={d.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{d.device_label || "Unknown"}</p>
                            {isCurrent && <Badge variant="default" className="text-[10px]">This device</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{d.user_agent}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Last active {formatDistanceToNow(new Date(d.last_seen_at), { addSuffix: true })}
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" disabled={busy === d.id}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke this device?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {isCurrent
                                  ? "This is the device you're using right now. You'll be signed out and need to verify again to sign back in."
                                  : "This device will need to be re-approved before it can sign in again."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRevoke(d.id)}>Revoke</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Sign out all */}
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base text-destructive">Panic button</CardTitle>
                <CardDescription>
                  Revokes every device and ends every active session. You'll need to verify again to sign back in.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={busy === "all"}>
                      <LogOut className="h-4 w-4 mr-2" /> Sign out of all devices
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sign out everywhere?</AlertDialogTitle>
                      <AlertDialogDescription>
                        All your devices will be signed out and need to verify with an email code to sign back in.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSignOutAll}>Sign out everywhere</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* Audit log */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent activity</CardTitle>
                <CardDescription>Last 30 security events on your account</CardDescription>
              </CardHeader>
              <CardContent>
                {audit.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
                ) : (
                  <ul className="space-y-2">
                    {audit.map((a) => (
                      <li key={a.id} className="text-xs flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
                        <div className="min-w-0">
                          <p className="font-medium">{eventLabel(a.event_type)}</p>
                          {a.device_label && <p className="text-muted-foreground truncate">{a.device_label}</p>}
                        </div>
                        <span className="text-muted-foreground whitespace-nowrap ml-2">
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

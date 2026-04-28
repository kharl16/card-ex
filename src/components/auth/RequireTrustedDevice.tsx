import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getDeviceFingerprint, clearDeviceToken, type DeviceFingerprint } from "@/lib/deviceFingerprint";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, ShieldCheck, ShieldAlert, LogOut, Mail, Loader2, MailCheck, MailX, KeyRound } from "lucide-react";
import { toast } from "sonner";
import CardExLogo from "@/assets/Card-Ex-Logo.png";

type EmailStatus = "sent" | "failed" | "skipped" | undefined;

type State =
  | { phase: "loading" }
  | { phase: "trusted" }
  | { phase: "pending"; requestId: string; isFirstDevice: boolean; fingerprint: DeviceFingerprint; emailStatus: EmailStatus }
  | { phase: "error"; message: string };

export default function RequireTrustedDevice({ children }: { children: React.ReactNode }) {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const [state, setState] = useState<State>({ phase: "loading" });
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const checkDevice = useCallback(async () => {
    if (!session?.user) return;
    setState({ phase: "loading" });

    try {
      const fp = await getDeviceFingerprint();
      const { data, error } = await supabase.functions.invoke("device-auth", {
        body: { action: "check", fingerprint_hash: fp.hash, device_label: fp.label },
      });

      if (error) throw error;

      if (data.status === "trusted") {
        setState({ phase: "trusted" });
      } else if (data.status === "pending") {
        setState({
          phase: "pending",
          requestId: data.request_id,
          isFirstDevice: !!data.is_first_device,
          fingerprint: fp,
          emailStatus: data.email_status as EmailStatus,
        });
      } else {
        setState({ phase: "error", message: "Unexpected response" });
      }
    } catch (e: any) {
      console.error("Device check failed:", e);
      setState({ phase: "error", message: e.message || "Could not verify device" });
    }
  }, [session?.user]);

  useEffect(() => {
    if (authLoading) return;
    if (!session?.user) return;
    checkDevice();
  }, [authLoading, session?.user, checkDevice]);

  // Real-time: watch for approval from another device
  useEffect(() => {
    if (state.phase !== "pending" || state.isFirstDevice) return;

    const channel = supabase
      .channel(`device_req_${state.requestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "device_approval_requests",
          filter: `id=eq.${state.requestId}`,
        },
        (payload) => {
          const status = (payload.new as any).status;
          if (status === "approved") {
            toast.success("Device approved! Welcome back.");
            checkDevice();
          } else if (status === "denied") {
            toast.error("Device denied by account owner.");
            handleSignOut();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state, checkDevice]);

  const handleVerifyOtp = async () => {
    if (state.phase !== "pending") return;
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code from your email");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("device-auth", {
        body: { action: "verify_otp", request_id: state.requestId, otp },
      });
      if (error) throw error;
      if (data.status === "approved") {
        toast.success("Device verified!");
        checkDevice();
      }
    } catch (e: any) {
      toast.error(e.message || "Invalid code");
    } finally {
      setSubmitting(false);
    }
  };

  const [revealedOtp, setRevealedOtp] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);

  const handleRevealFallback = async () => {
    if (state.phase !== "pending") return;
    setRevealing(true);
    try {
      const { data, error } = await supabase.functions.invoke("device-auth", {
        body: { action: "reveal_fallback_otp", request_id: state.requestId },
      });
      if (error) throw error;
      if (data?.otp) {
        setRevealedOtp(data.otp);
        setOtp(data.otp);
        toast.success("Backup code retrieved");
      }
    } catch (e: any) {
      toast.error(e.message || "Could not retrieve backup code");
    } finally {
      setRevealing(false);
    }
  };

  const handleSignOut = async () => {
    clearDeviceToken();
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  // Bypass for super admins (so they can never get locked out)
  if (!authLoading && session && isAdmin) return <>{children}</>;

  if (authLoading || state.phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Shield className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Verifying your device…</p>
        </div>
      </div>
    );
  }

  if (state.phase === "trusted") return <>{children}</>;

  if (state.phase === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Device verification failed</CardTitle>
            <CardDescription>{state.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" onClick={checkDevice}>Try again</Button>
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PENDING
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-16 w-16 rounded-2xl overflow-hidden bg-transparent">
            <img src={CardExLogo} alt="Card-Ex" className="h-full w-full object-contain" />
          </div>
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            {state.isFirstDevice ? (
              <Mail className="h-6 w-6 text-primary" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-xl">
            {state.isFirstDevice ? "Verify this device" : "Waiting for approval"}
          </CardTitle>
          <CardDescription className="text-sm">
            {state.isFirstDevice ? (
              <>We sent a 6-digit code to <strong className="text-foreground">{session?.user?.email}</strong>. Enter it below to trust this device.</>
            ) : (
              <>For your security, this new device must be approved from a device you've already trusted. Open Card-Ex on your other device and tap the notification to approve.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium">{state.fingerprint.label}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{state.fingerprint.userAgent}</p>
          </div>

          {state.isFirstDevice ? (
            <>
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                maxLength={6}
                inputMode="numeric"
              />
              <Button
                className="w-full"
                onClick={handleVerifyOtp}
                disabled={submitting || otp.length !== 6}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verify & Continue
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Listening for approval…
            </div>
          )}

          <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Cancel and sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

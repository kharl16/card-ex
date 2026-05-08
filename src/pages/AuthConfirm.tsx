import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, Mail, MailWarning, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAuthCallbackUrl } from "@/lib/authUrl";

const EMAIL_STORAGE_KEY = "auth_confirm_email";

type Status = "success" | "expired" | "error" | "verified_no_session" | "pending";

const TITLES: Record<Status, string> = {
  success: "Email confirmed",
  verified_no_session: "Email verified",
  expired: "Link expired",
  error: "Confirmation failed",
  pending: "Check your email",
};

const DESCRIPTIONS: Record<Status, string> = {
  success: "Your account is ready. You can continue to your dashboard.",
  verified_no_session: "Your email was verified, but we couldn't sign you in automatically. Please log in to continue.",
  expired: "This confirmation link has expired or already been used. Request a new one below.",
  error: "We couldn't confirm your email. You can request a new confirmation link below.",
  pending: "Didn't get the confirmation email? Enter your address and we'll send a new link.",
};

export default function AuthConfirm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawStatus = (searchParams.get("status") || "pending") as Status;
  const status: Status = ["success", "expired", "error", "verified_no_session", "pending"].includes(rawStatus)
    ? rawStatus
    : "pending";
  const detail = searchParams.get("detail") || "";
  const urlEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(() => {
    if (urlEmail) return urlEmail;
    try {
      return localStorage.getItem(EMAIL_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  const [autoCancelled, setAutoCancelled] = useState(false);

  // Persist email to localStorage whenever it changes
  useEffect(() => {
    if (email) {
      try {
        localStorage.setItem(EMAIL_STORAGE_KEY, email);
      } catch {
        // localStorage may be unavailable in some environments
      }
    }
  }, [email]);

  const doResend = async (emailToUse: string) => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: emailToUse,
        options: { emailRedirectTo: getAuthCallbackUrl() },
      });
      if (error) throw error;
      setResent(true);
      toast.success("Confirmation email sent. Check your inbox.");
    } catch (err: any) {
      toast.error(err?.message || "Could not resend the confirmation email.");
    } finally {
      setResending(false);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }
    await doResend(email);
  };

  // Auto-resend countdown when link is expired and we have an email on file
  useEffect(() => {
    if (status !== "expired") return;
    if (!email) return;
    if (autoCancelled || resent || resending) return;
    setAutoCountdown(5);
  }, [status, email, autoCancelled, resent, resending]);

  useEffect(() => {
    if (autoCountdown === null) return;
    if (autoCountdown <= 0) {
      setAutoCountdown(null);
      doResend(email);
      return;
    }
    const t = setTimeout(() => setAutoCountdown((n) => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(t);
  }, [autoCountdown, email]);

  const Icon =
    status === "success" || status === "verified_no_session"
      ? CheckCircle2
      : status === "expired"
        ? MailWarning
        : status === "error"
          ? AlertTriangle
          : Mail;

  const iconTone =
    status === "success" || status === "verified_no_session"
      ? "text-primary bg-primary/10"
      : status === "expired" || status === "error"
        ? "text-destructive bg-destructive/10"
        : "text-primary bg-primary/10";

  const showResend = status === "expired" || status === "error" || status === "pending";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="text-center space-y-3">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${iconTone}`}>
            <Icon className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">{TITLES[status]}</CardTitle>
          <CardDescription>{DESCRIPTIONS[status]}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {detail && status === "error" && (
            <Alert variant="destructive">
              <AlertTitle>Details</AlertTitle>
              <AlertDescription>{detail}</AlertDescription>
            </Alert>
          )}

          {status === "success" && (
            <Button className="w-full" onClick={() => navigate("/dashboard", { replace: true })}>
              Go to Dashboard
            </Button>
          )}

          {status === "verified_no_session" && (
            <Button className="w-full" onClick={() => navigate("/auth", { replace: true })}>
              Sign in
            </Button>
          )}

          {showResend && autoCountdown !== null && (
            <Alert>
              <AlertTitle>Resending automatically in {autoCountdown}s</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-2">
                <span>We'll send a new confirmation link to {email}.</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAutoCountdown(null);
                    setAutoCancelled(true);
                  }}
                >
                  Cancel
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {showResend && (
            <form onSubmit={handleResend} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="resend-email">Email</Label>
                <Input
                  id="resend-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <Button type="submit" className="w-full" disabled={resending || resent}>
                {resending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : resent ? (
                  "Email sent — check your inbox"
                ) : (
                  "Resend confirmation email"
                )}
              </Button>
            </form>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 text-sm">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Go to Sign in
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/signup")}>
              Create account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

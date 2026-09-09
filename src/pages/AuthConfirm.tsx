import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, Mail, MailWarning, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { resolveAuthenticatedDestination } from "@/lib/authDestination";

const EMAIL_STORAGE_KEY = "auth_confirm_email";
const LOCKOUT_STORAGE_KEY = "auth_confirm_code_attempts";
const OTP_TYPE_STORAGE_KEY = "auth_confirm_otp_type";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

type AttemptRecord = { count: number; lockedUntil: number };

function readAttempts(): Record<string, AttemptRecord> {
  try {
    return JSON.parse(localStorage.getItem(LOCKOUT_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeAttempts(data: Record<string, AttemptRecord>) {
  try {
    localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

type ConfirmationOtpType = "signup" | "magiclink";

function readOtpType(email: string): ConfirmationOtpType {
  try {
    const stored = JSON.parse(localStorage.getItem(OTP_TYPE_STORAGE_KEY) || "{}") as Record<string, ConfirmationOtpType>;
    return stored[normalizeEmail(email)] === "magiclink" ? "magiclink" : "signup";
  } catch {
    return "signup";
  }
}

function writeOtpType(email: string, type: ConfirmationOtpType) {
  try {
    let stored: Record<string, ConfirmationOtpType> = {};
    try {
      stored = JSON.parse(localStorage.getItem(OTP_TYPE_STORAGE_KEY) || "{}") as Record<string, ConfirmationOtpType>;
    } catch {
      // Replace legacy scalar or malformed state.
    }
    stored[normalizeEmail(email)] = type;
    localStorage.setItem(OTP_TYPE_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // storage unavailable
  }
}

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
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [otpType, setOtpType] = useState<ConfirmationOtpType>(() => readOtpType(urlEmail));
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  const [autoCancelled, setAutoCancelled] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number>(0);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(MAX_ATTEMPTS);
  const [now, setNow] = useState(Date.now());
  const resendInFlight = useRef(false);

  const isLocked = lockedUntil > now;
  const lockMinutes = Math.max(1, Math.ceil((lockedUntil - now) / 60000));

  // Load the lockout state for whichever email is currently entered.
  useEffect(() => {
    const key = normalizeEmail(email);
    if (!key) {
      setLockedUntil(0);
      setAttemptsLeft(MAX_ATTEMPTS);
      return;
    }
    const rec = readAttempts()[key];
    if (!rec || (rec.lockedUntil && rec.lockedUntil <= Date.now())) {
      setLockedUntil(0);
      setAttemptsLeft(MAX_ATTEMPTS);
      return;
    }
    setLockedUntil(rec.lockedUntil || 0);
    setAttemptsLeft(Math.max(0, MAX_ATTEMPTS - (rec.count || 0)));
  }, [email]);

  useEffect(() => {
    setOtpType(readOtpType(email));
  }, [email]);

  // Tick so the lockout expires on screen without a refresh.
  useEffect(() => {
    if (!lockedUntil) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [lockedUntil]);

  const registerFailure = (emailKey: string) => {
    const all = readAttempts();
    const prev = all[emailKey];
    const count = (prev && prev.lockedUntil > Date.now() ? prev.count : (prev?.count ?? 0)) + 1;
    const locked = count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0;
    all[emailKey] = { count, lockedUntil: locked };
    writeAttempts(all);
    setAttemptsLeft(Math.max(0, MAX_ATTEMPTS - count));
    setLockedUntil(locked);
    setNow(Date.now());
    return locked > 0;
  };

  const clearFailures = (emailKey: string) => {
    const all = readAttempts();
    delete all[emailKey];
    writeAttempts(all);
    setAttemptsLeft(MAX_ATTEMPTS);
    setLockedUntil(0);
  };

  const handleTryAnotherEmail = () => {
    setEmail("");
    setCode("");
    setResent(false);
    setAutoCancelled(true);
    setAutoCountdown(null);
    setLockedUntil(0);
    setAttemptsLeft(MAX_ATTEMPTS);
    try {
      localStorage.removeItem(EMAIL_STORAGE_KEY);
    } catch {
      // storage unavailable
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address first.");
      return;
    }
    const emailKey = normalizeEmail(email);
    if (lockedUntil > Date.now()) {
      toast.error(`Too many wrong codes. Try again in ${lockMinutes} minute${lockMinutes === 1 ? "" : "s"}.`);
      return;
    }
    setVerifying(true);
    try {
      // Verify exactly the challenge type returned by the resend endpoint.
      // Trying several types consumes server attempts and can reject a valid code.
      const { data, error } = await supabase.auth.verifyOtp({ email: emailKey, token: code, type: otpType });
      if (error) throw error;
      const verifiedUser = data.user ?? data.session?.user;
      if (!verifiedUser) throw new Error("Email verified, but no account session was created.");

      clearFailures(emailKey);
      toast.success("Email confirmed.");
      const destination = await resolveAuthenticatedDestination(verifiedUser);
      navigate(destination, { replace: true });
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();
      const nowLocked = registerFailure(emailKey);
      setCode("");
      if (nowLocked) {
        toast.error("Too many wrong codes. This email is locked for 15 minutes.");
      } else {
        const remaining = Math.max(0, MAX_ATTEMPTS - (readAttempts()[emailKey]?.count ?? 0));
        toast.error(
          (msg.includes("expired")
            ? "That code has expired. Please request a new confirmation email."
            : "That code doesn't match. Please double-check and try again.") +
            ` ${remaining} attempt${remaining === 1 ? "" : "s"} left.`,
        );
      }
    } finally {
      setVerifying(false);
    }
  };


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
    if (resendInFlight.current) return;
    resendInFlight.current = true;
    setResending(true);
    try {
      // Server-side resend: generates a fresh link and delivers it through our
      // own sender, so it works even when the old link expired or was used.
      const { data, error } = await supabase.functions.invoke("resend-confirmation", {
        body: { email: normalizeEmail(emailToUse) },
      });

      if (error) {
        throw error;
      } else if (data?.error) {
        throw new Error(data.error);
      } else if (data?.otp_type === "magiclink" || data?.otp_type === "signup") {
        setOtpType(data.otp_type);
        writeOtpType(emailToUse, data.otp_type);
      }
      setCode("");

      setResent(true);
      toast.success("Confirmation email sent. Check your inbox.");
    } catch (err: any) {
      toast.error(err?.message || "Could not resend the confirmation email.");
    } finally {
      resendInFlight.current = false;
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
              <Button type="submit" className="w-full" disabled={resending}>
                {resending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : resent ? (
                  "Send another confirmation email"
                ) : (
                  "Resend confirmation email"
                )}
              </Button>

            </form>
          )}

          {showResend && (
            <form onSubmit={handleVerifyCode} className="space-y-3 border-t border-border/50 pt-4">
              {isLocked && (
                <Alert variant="destructive">
                  <AlertTitle>Too many wrong codes</AlertTitle>
                  <AlertDescription>
                    For your security, code entry for {email} is paused for about {lockMinutes} more minute
                    {lockMinutes === 1 ? "" : "s"}. You can use a different email address in the meantime.
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="confirm-code">6-digit code from the email</Label>
                <Input
                  id="confirm-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={6}
                  value={code}
                  disabled={isLocked}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-2xl tracking-[0.5em]"
                />
                {!isLocked && attemptsLeft < MAX_ATTEMPTS && (
                  <p className="text-xs text-muted-foreground">
                    {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} left before this email is paused for 15 minutes.
                  </p>
                )}
              </div>
              <Button
                type="submit"
                variant="secondary"
                className="w-full"
                disabled={verifying || code.length !== 6 || isLocked}
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Confirm with code"
                )}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={handleTryAnotherEmail}>
                Try another email
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

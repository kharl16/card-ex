import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { TurnstileWidget, turnstileEnabled } from "@/components/auth/TurnstileWidget";
import { verifySignupAllowed, recordAuthEvent } from "@/lib/authClient";

import CardExLogo from "@/assets/Card-Ex-Logo.png";
import { getAuthCallbackUrl, storeAuthNext } from "@/lib/authUrl";
import { SEO } from "@/components/SEO";

type Mode = "choose" | "signin" | "signup" | "forgot";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("choose");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard", { replace: true });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/dashboard", { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const getErrorMessage = (error: any): string => {
    const message = error?.message?.toLowerCase() || "";
    if (
      message.includes("user already registered") ||
      message.includes("already been registered") ||
      message.includes("email already in use") ||
      message.includes("duplicate")
    ) {
      return "This email address already has a Card-Ex account.";
    }
    if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
      return "Invalid email or password. Please check your credentials and try again.";
    }
    if (message.includes("email not confirmed")) {
      return "Please verify your email before signing in. Check your inbox for the verification link.";
    }
    if (message.includes("password") && message.includes("weak")) {
      return "Password is too weak. Please use at least 8 characters with a mix of letters and numbers.";
    }
    return error?.message || "An unexpected error occurred. Please try again.";
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      storeAuthNext();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getAuthCallbackUrl() },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(getErrorMessage(error));
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (turnstileEnabled && !captchaToken) {
      toast.error("Please complete the security check first.");
      return;
    }
    setLoading(true);
    try {
      await verifySignupAllowed(email, captchaToken);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName }, emailRedirectTo: getAuthCallbackUrl() },
      });
      if (error) throw error;

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        toast.error("This email address already has a Card-Ex account.");
        return;
      }

      await recordAuthEvent("signup", "email");
      toast.success("Account created! Check your email to verify before signing in.");
      setMode("signin");
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
      setCaptchaToken(null);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await recordAuthEvent("login", "email");
      toast.success("Welcome back!");
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("If an account with that email exists, a password reset link has been sent.");
      setMode("signin");
      setResetEmail("");
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const Shell = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
    <div className="flex min-h-screen items-center justify-center p-4">
      <SEO
        title="Sign in to Card-Ex — Digital Business Portfolio"
        description="Sign in or create a Card-Ex account to build your premium digital business portfolio."
        path="/auth"
        noIndex
      />
      <h1 className="sr-only">Sign in to Card-Ex</h1>
      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-transparent animate-fade-in">
            <img src={CardExLogo} alt="Card-Ex Logo" className="h-full w-full object-contain animate-scale-in" />
          </div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">{children}</CardContent>
      </Card>
    </div>
  );

  const GoogleButton = () => (
    <Button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="h-14 w-full gap-3 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.01]"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background">
        <GoogleIcon className="h-4 w-4" />
      </span>
      Continue with Google
    </Button>
  );

  const Divider = () => (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-2 text-muted-foreground">or</span>
      </div>
    </div>
  );

  if (mode === "forgot") {
    return (
      <Shell title="Reset Password" description="We'll email you a link to set a new password.">
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="you@example.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="h-12"
              required
            />
          </div>
          <Button type="submit" className="h-12 w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
          <Button type="button" variant="ghost" className="h-12 w-full gap-2" onClick={() => setMode("signin")}>
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Button>
        </form>
      </Shell>
    );
  }

  if (mode === "signup") {
    return (
      <Shell title="Create your Card-Ex" description="Start your digital business portfolio">
        <GoogleButton />
        <Divider />
        <form onSubmit={handleEmailSignUp} className="space-y-4" autoComplete="off">
          <div className="space-y-2">
            <Label htmlFor="signup-name">Full Name</Label>
            <Input
              id="signup-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Dela Cruz"
              className="h-12"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12"
              autoComplete="new-email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="h-12"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <TurnstileWidget onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} className="flex justify-center" />
          <Button type="submit" className="h-12 w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Button variant="link" className="h-auto p-0" onClick={() => setMode("signin")}>
            Sign in
          </Button>
        </p>
      </Shell>
    );
  }

  if (mode === "signin") {
    return (
      <Shell title="Welcome back" description="Sign in to your Card-Ex account">
        <GoogleButton />
        <Divider />
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-email">Email</Label>
            <Input
              id="signin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signin-password">Password</Label>
            <Input
              id="signin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12"
              required
            />
          </div>
          <Button type="submit" className="h-12 w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <div className="flex flex-col gap-1 text-center text-sm text-muted-foreground">
          <Button variant="link" className="h-auto p-0" onClick={() => setMode("forgot")}>
            Forgot password?
          </Button>
          <span>
            New to Card-Ex?{" "}
            <Button variant="link" className="h-auto p-0" onClick={() => setMode("signup")}>
              Create an account
            </Button>
          </span>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Welcome to Card-Ex" description="Your premium digital business portfolio">
      <GoogleButton />
      <Divider />
      <Button
        type="button"
        variant="outline"
        className="h-14 w-full gap-3 rounded-xl text-base font-medium"
        onClick={() => setMode("signin")}
        disabled={loading}
      >
        <Mail className="h-5 w-5" />
        Continue with Email
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New to Card-Ex?{" "}
        <Button variant="link" className="h-auto p-0" onClick={() => setMode("signup")}>
          Create an account
        </Button>
      </p>
    </Shell>
  );
}

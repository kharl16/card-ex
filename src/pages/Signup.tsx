import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Chrome, Gift } from "lucide-react";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
import { storeReferralCode, getStoredReferralCode } from "@/hooks/useReferral";

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    // Check for referral code in URL
    const refCode = searchParams.get("ref");
    if (refCode) {
      storeReferralCode(refCode);
      setReferralCode(refCode);
    } else {
      // Check localStorage for previously stored code
      const storedCode = getStoredReferralCode();
      if (storedCode) {
        setReferralCode(storedCode);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const getErrorMessage = (error: any): string => {
    const message = error?.message?.toLowerCase() || "";
    
    if (message.includes("user already registered") || 
        message.includes("already been registered") ||
        message.includes("email already in use") ||
        message.includes("duplicate")) {
      return "This email is already registered. Please sign in or use a different email.";
    }
    
    if (message.includes("password") && message.includes("weak")) {
      return "Password is too weak. Please use at least 6 characters with a mix of letters and numbers.";
    }
    
    return error?.message || "An unexpected error occurred. Please try again.";
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            full_name: fullName,
            referral_code: referralCode, // Store referral code in user metadata
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
      
      // Check if user already exists (Supabase returns user with empty identities for duplicate emails)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        toast.error("This email is already registered. Please sign in or use a different email.");
        return;
      }
      
      toast.success("Account created! Check your email to verify.");
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(getErrorMessage(error));
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden bg-transparent animate-fade-in">
            <img src={CardExLogo} alt="Card-Ex Logo" className="h-full w-full object-contain animate-scale-in" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Your Card-Ex</CardTitle>
          <CardDescription>Start your digital business card journey</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {referralCode && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">
              <Gift className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-primary">Referral Applied!</p>
                <p className="text-xs text-muted-foreground">Code: {referralCode}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-name">Full Name</Label>
              <Input
                id="signup-name"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or sign up with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <Chrome className="h-4 w-4" />
            Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/auth")}>
              Sign in
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

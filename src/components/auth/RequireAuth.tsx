import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, RefreshCw, LogOut } from "lucide-react";
import { toast } from "sonner";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { session, isAdmin, loading } = useAuth();
  const [resending, setResending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      navigate("/auth", { replace: true });
    }
  }, [loading, session, navigate]);

  const handleResendVerification = async () => {
    if (!session?.user?.email) return;
    
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: session.user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) throw error;
      toast.success("Verification email sent! Please check your inbox.");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend verification email");
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    const { data: { session: freshSession } } = await supabase.auth.getSession();
    setRefreshing(false);
    
    if (freshSession?.user?.email_confirmed_at) {
      toast.success("Email verified! Welcome to Card-Ex.");
      window.location.reload();
    } else {
      toast.info("Email not yet verified. Please check your inbox.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Check if email is verified (admins bypass this check)
  const isEmailVerified = session.user?.email_confirmed_at != null;

  if (!isEmailVerified && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden bg-transparent animate-fade-in">
              <img src={CardExLogo} alt="Card-Ex Logo" className="h-full w-full object-contain" />
            </div>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
            <CardDescription className="text-base">
              We've sent a verification link to:
              <br />
              <span className="font-medium text-foreground">{session.user?.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Please check your inbox and click the verification link to continue. 
              Don't forget to check your spam folder!
            </p>
            
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleRefreshStatus}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                I've verified my email
              </Button>
              
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleResendVerification}
                disabled={resending}
              >
                <Mail className="h-4 w-4" />
                {resending ? "Sending..." : "Resend verification email"}
              </Button>
              
              <Button
                variant="ghost"
                className="w-full gap-2 text-muted-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign out and use a different email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

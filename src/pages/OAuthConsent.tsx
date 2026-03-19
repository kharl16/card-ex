import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CardExLogo from "@/assets/Card-Ex-Logo.png";

type ConsentStatus = "loading" | "ready" | "processing" | "error" | "needs_login";

interface AuthorizationDetails {
  client: { name: string; id: string };
  redirect_uri: string;
  scope?: string;
}

const SCOPE_LABELS: Record<string, string> = {
  openid: "Verify your identity",
  email: "View your email address",
  profile: "View your profile information",
  phone: "View your phone number",
};

export default function OAuthConsent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<ConsentStatus>("loading");
  const [authDetails, setAuthDetails] = useState<AuthorizationDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const authorizationId = searchParams.get("authorization_id");

  useEffect(() => {
    if (authLoading) return;

    if (!authorizationId) {
      setStatus("error");
      setErrorMessage("Missing authorization_id parameter.");
      return;
    }

    if (!session) {
      // Store current URL so we come back after login
      const returnUrl = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
      sessionStorage.setItem("auth_next", returnUrl);
      setStatus("needs_login");
      return;
    }

    // Fetch authorization details
    fetchAuthorizationDetails();
  }, [authLoading, session, authorizationId]);

  const fetchAuthorizationDetails = async () => {
    if (!authorizationId) return;

    try {
      // @ts-ignore — supabase.auth.oauth may not be in older type defs
      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

      if (error || !data) {
        setStatus("error");
        setErrorMessage(error?.message || "Invalid or expired authorization request.");
        return;
      }

      setAuthDetails(data as AuthorizationDetails);
      setStatus("ready");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err?.message || "Failed to fetch authorization details.");
    }
  };

  const handleApprove = async () => {
    if (!authorizationId) return;
    setStatus("processing");

    try {
      // @ts-ignore
      const { data, error } = await supabase.auth.oauth.approveAuthorization(authorizationId);

      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }

      if (data?.redirect_to) {
        window.location.href = data.redirect_to;
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err?.message || "Failed to approve authorization.");
    }
  };

  const handleDeny = async () => {
    if (!authorizationId) return;
    setStatus("processing");

    try {
      // @ts-ignore
      const { data, error } = await supabase.auth.oauth.denyAuthorization(authorizationId);

      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }

      if (data?.redirect_to) {
        window.location.href = data.redirect_to;
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err?.message || "Failed to deny authorization.");
    }
  };

  const scopes = authDetails?.scope?.trim().split(" ").filter(Boolean) || [];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden bg-transparent">
            <img src={CardExLogo} alt="Card-Ex Logo" className="h-full w-full object-contain" />
          </div>

          {status === "loading" && (
            <>
              <div className="mx-auto mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <CardTitle className="text-xl">Loading...</CardTitle>
              <CardDescription>Retrieving authorization details</CardDescription>
            </>
          )}

          {status === "needs_login" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Sign In Required</CardTitle>
              <CardDescription>
                You need to sign in to authorize this application.
              </CardDescription>
            </>
          )}

          {status === "ready" && authDetails && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Authorize Application</CardTitle>
              <CardDescription>
                <span className="font-semibold text-foreground">{authDetails.client.name}</span>
                {" "}wants to access your Card-Ex account.
              </CardDescription>
            </>
          )}

          {status === "processing" && (
            <>
              <div className="mx-auto mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <CardTitle className="text-xl">Processing...</CardTitle>
              <CardDescription>Please wait</CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Authorization Error</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {status === "needs_login" && (
            <Button
              className="w-full"
              onClick={() => navigate("/auth", { replace: true })}
            >
              Sign In to Continue
            </Button>
          )}

          {status === "ready" && authDetails && (
            <>
              {scopes.length > 0 && (
                <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    This application will be able to:
                  </p>
                  <ul className="space-y-1.5">
                    {scopes.map((scope) => (
                      <li key={scope} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        {SCOPE_LABELS[scope] || scope}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-xs text-muted-foreground text-center">
                Redirecting to: <Badge variant="secondary" className="text-xs font-mono">{authDetails.redirect_uri}</Badge>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleDeny}
                >
                  <XCircle className="h-4 w-4" />
                  Deny
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleApprove}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </Button>
              </div>
            </>
          )}

          {status === "error" && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/", { replace: true })}
            >
              Return to Home
            </Button>
          )}

          {session && (
            <p className="text-xs text-center text-muted-foreground">
              Signed in as {session.user?.email}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

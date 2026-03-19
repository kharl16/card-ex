import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAndClearAuthNext, safeRedirectPath, getAppUrl } from "@/lib/authUrl";
import { Button } from "@/components/ui/button";

type CallbackStatus = "loading" | "success" | "error" | "expired" | "verified_no_session";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [errorDetail, setErrorDetail] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    let cleanupSubscription: (() => void) | undefined;

    const redirectToDestination = () => {
      const nextParam = searchParams.get("next");
      return nextParam ? safeRedirectPath(nextParam) : getAndClearAuthNext();
    };

    const handleCallback = async () => {
      if (import.meta.env.DEV) {
        console.log("[AuthCallback] Processing callback...");
        console.log("[AuthCallback] Current URL:", window.location.href);
        console.log("[AuthCallback] Hash:", window.location.hash);
      }

      // ── 0. Check for error params from Supabase redirect ──
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashError = hashParams.get("error");
      const hashErrorDesc = hashParams.get("error_description");
      const queryError = searchParams.get("error");
      const queryErrorDesc = searchParams.get("error_description");

      const error = hashError || queryError;
      const errorDesc = hashErrorDesc || queryErrorDesc || "";

      if (error) {
        console.warn("[AuthCallback] Auth error from redirect:", error, errorDesc);
        if (mounted) {
          if (errorDesc.toLowerCase().includes("expired") || errorDesc.toLowerCase().includes("invalid")) {
            setStatus("expired");
            setErrorDetail(errorDesc);
          } else {
            setStatus("error");
            setErrorDetail(errorDesc);
          }
        }
        return;
      }

      // ── 1. Handle PKCE code exchange (email confirmation links) ──
      const code = searchParams.get("code");
      if (code) {
        if (import.meta.env.DEV) {
          console.log("[AuthCallback] Found PKCE code, exchanging...");
        }
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("[AuthCallback] Code exchange failed:", error);
          // Code exchange failed — likely opened in different browser
        } else if (data.session && mounted) {
          setStatus("success");
          const destination = redirectToDestination();
          navigate(destination, { replace: true });
          return;
        }
      }

      // ── 2. Handle hash-based tokens (implicit flow / magic links) ──
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error && data.session && mounted) {
          setStatus("success");
          const destination = redirectToDestination();
          navigate(destination, { replace: true });
          return;
        }
        if (error) {
          console.error("[AuthCallback] setSession from hash failed:", error);
        }
      }

      // ── 3. Check for an existing session ──
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("[AuthCallback] Session error:", sessionError);
        if (mounted) {
          setStatus("error");
          setErrorDetail(sessionError.message);
        }
        return;
      }

      if (session && mounted) {
        setStatus("success");
        const destination = redirectToDestination();
        navigate(destination, { replace: true });
        return;
      }

      // ── 4. No session — if we had a code param, verification likely succeeded
      //       but user opened link in a different browser ──
      if (code && mounted) {
        setStatus("verified_no_session");
        return;
      }

      // ── 5. Listen for auth state changes ──
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;
        if (session) {
          setStatus("success");
          const destination = redirectToDestination();
          navigate(destination, { replace: true });
        } else if (event === "SIGNED_OUT") {
          setStatus("error");
          navigate("/auth", { replace: true });
        }
      });

      cleanupSubscription = () => subscription.unsubscribe();

      // ── 6. Timeout fallback ──
      setTimeout(() => {
        if (mounted && status === "loading") {
          setStatus("verified_no_session");
        }
      }, 8000);
    };

    handleCallback();

    return () => {
      mounted = false;
      cleanupSubscription?.();
    };
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-sm mx-auto px-4">
        {status === "loading" && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Completing sign in...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 flex items-center justify-center rounded-full bg-primary/10">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-muted-foreground">Sign in successful! Redirecting...</p>
          </>
        )}
        {status === "expired" && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 flex items-center justify-center rounded-full bg-destructive/10">
              <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-foreground mb-2">Link Expired</p>
            <p className="text-muted-foreground text-sm mb-6">
              This verification link has expired. Please sign in and request a new one.
            </p>
            <Button onClick={() => navigate("/auth", { replace: true })} className="w-full">
              Go to Sign In
            </Button>
          </>
        )}
        {status === "verified_no_session" && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 flex items-center justify-center rounded-full bg-primary/10">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-foreground mb-2">Email Verified!</p>
            <p className="text-muted-foreground text-sm mb-6">
              Your email has been verified. Please sign in to continue.
            </p>
            <Button onClick={() => navigate("/auth", { replace: true })} className="w-full">
              Sign In
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 flex items-center justify-center rounded-full bg-destructive/10">
              <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-foreground mb-2">Something went wrong</p>
            <p className="text-muted-foreground text-sm mb-6">
              {errorDetail || "Authentication failed. Please try signing in again."}
            </p>
            <Button onClick={() => navigate("/auth", { replace: true })} className="w-full">
              Go to Sign In
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
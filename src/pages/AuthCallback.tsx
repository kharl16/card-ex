import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAndClearAuthNext, safeRedirectPath, getAppUrl } from "@/lib/authUrl";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

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
        console.log("[AuthCallback] App URL:", getAppUrl());
      }

      // ── 1. Handle PKCE code exchange (email confirmation links) ──
      // On mobile, email links often include ?code=... which needs explicit exchange
      const code = searchParams.get("code");
      if (code) {
        if (import.meta.env.DEV) {
          console.log("[AuthCallback] Found PKCE code, exchanging...");
        }
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("[AuthCallback] Code exchange failed:", error);
          // Don't bail out yet — fall through to other methods
        } else if (data.session && mounted) {
          setStatus("success");
          const destination = redirectToDestination();
          if (import.meta.env.DEV) {
            console.log("[AuthCallback] PKCE exchange success, redirecting to:", destination);
          }
          navigate(destination, { replace: true });
          return;
        }
      }

      // ── 2. Handle hash-based tokens (implicit flow / magic links) ──
      // The Supabase client auto-detects hash fragments, but on mobile in-app
      // browsers it can be slow. Give it a moment, then check.
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        if (import.meta.env.DEV) {
          console.log("[AuthCallback] Found hash tokens, setting session...");
        }
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

      // ── 3. Check for an existing session (OAuth or already-processed) ──
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("[AuthCallback] Session error:", sessionError);
        if (mounted) {
          setStatus("error");
          setTimeout(() => navigate("/auth", { replace: true }), 2000);
        }
        return;
      }

      if (session && mounted) {
        setStatus("success");
        const destination = redirectToDestination();
        if (import.meta.env.DEV) {
          console.log("[AuthCallback] Existing session found, redirecting to:", destination);
        }
        navigate(destination, { replace: true });
        return;
      }

      // ── 4. No session yet — listen for auth state changes ──
      if (import.meta.env.DEV) {
        console.log("[AuthCallback] No session yet, waiting for auth state change...");
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;
        if (import.meta.env.DEV) {
          console.log("[AuthCallback] Auth event:", event, "Session:", !!session);
        }

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

      // ── 5. Timeout fallback — if nothing happens after 10s, show error ──
      setTimeout(() => {
        if (mounted && status === "loading") {
          console.warn("[AuthCallback] Timed out waiting for session");
          setStatus("error");
          setTimeout(() => navigate("/auth", { replace: true }), 2000);
        }
      }, 10000);
    };

    handleCallback();

    return () => {
      mounted = false;
      cleanupSubscription?.();
    };
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
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
        {status === "error" && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 flex items-center justify-center rounded-full bg-destructive/10">
              <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-muted-foreground">Authentication failed. Redirecting to sign in...</p>
          </>
        )}
      </div>
    </div>
  );
}

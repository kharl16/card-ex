import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAndClearAuthNext, safeRedirectPath, getAppUrl } from "@/lib/authUrl";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const handleCallback = async () => {
      if (import.meta.env.DEV) {
        console.log("[AuthCallback] Processing callback...");
        console.log("[AuthCallback] Current URL:", window.location.href);
        console.log("[AuthCallback] App URL:", getAppUrl());
      }

      // First, check for session from OAuth callback
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("[AuthCallback] Session error:", sessionError);
        setStatus("error");
        setTimeout(() => navigate("/auth", { replace: true }), 2000);
        return;
      }

      if (session) {
        setStatus("success");
        
        // Determine where to redirect
        // Priority: 1) URL query param, 2) sessionStorage, 3) default
        const nextParam = searchParams.get("next");
        let destination: string;
        
        if (nextParam) {
          destination = safeRedirectPath(nextParam);
        } else {
          destination = getAndClearAuthNext();
        }
        
        if (import.meta.env.DEV) {
          console.log("[AuthCallback] Session found, redirecting to:", destination);
        }
        
        navigate(destination, { replace: true });
        return;
      }

      // No session yet - set up listener for OAuth completion
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (import.meta.env.DEV) {
          console.log("[AuthCallback] Auth event:", event, "Session:", !!session);
        }
        
        if (session) {
          setStatus("success");
          const nextParam = searchParams.get("next");
          const destination = nextParam ? safeRedirectPath(nextParam) : getAndClearAuthNext();
          
          if (import.meta.env.DEV) {
            console.log("[AuthCallback] Auth complete, redirecting to:", destination);
          }
          
          navigate(destination, { replace: true });
        } else if (event === "SIGNED_OUT") {
          setStatus("error");
          navigate("/auth", { replace: true });
        }
      });

      // Cleanup subscription on unmount
      return () => {
        subscription.unsubscribe();
      };
    };

    handleCallback();
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
            <p className="text-muted-foreground">Authentication failed. Redirecting...</p>
          </>
        )}
      </div>
    </div>
  );
}

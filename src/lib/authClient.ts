import { supabase } from "@/integrations/supabase/client";

/**
 * Server-side signup gate: Cloudflare Turnstile, disposable-domain rejection
 * and duplicate-email detection. Throws with a user-facing message on failure.
 */
export async function verifySignupAllowed(email: string, captchaToken: string | null) {
  const { data, error } = await supabase.functions.invoke("auth-signup-check", {
    body: { email, captchaToken },
  });

  // Non-2xx responses surface as FunctionsHttpError; read the JSON body for the reason.
  if (error) {
    let message = "We could not verify your signup. Please try again.";
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      } catch {
        /* keep default */
      }
    }
    throw new Error(message);
  }

  if (data && data.ok === false) {
    throw new Error(data.error ?? "Signup blocked. Please try again.");
  }
}

/** Records a signup or login event (IP, browser, OS, country, provider). */
export async function recordAuthEvent(event: "signup" | "login", provider: string) {
  try {
    await supabase.functions.invoke("auth-log", { body: { event, provider } });
  } catch (e) {
    // Logging must never block authentication.
    console.warn("auth-log failed", e);
  }
}

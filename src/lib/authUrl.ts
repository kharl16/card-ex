/**
 * Canonical App URL utility for OAuth redirects
 * Ensures OAuth always redirects to the correct domain (not Supabase or preview URLs)
 */

// Production app URL - set this in your environment variables
const PRODUCTION_APP_URL = "https://tagex.app";

/**
 * Returns the canonical app URL for OAuth redirects
 * Priority:
 * 1. VITE_APP_URL environment variable (if set)
 * 2. Production URL (tagex.app) in production builds
 * 3. window.location.origin for local/preview development
 */
export function getAppUrl(): string {
  // Check for explicit environment variable first
  const envUrl = import.meta.env.VITE_APP_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, ""); // Remove trailing slash
  }

  // In production (when not on localhost/preview), use the production URL
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    
    // If we're on the production domain, use it
    if (origin.includes("tagex.app")) {
      return "https://tagex.app";
    }
    
    // For local development and lovable previews, use current origin
    return origin;
  }

  // Fallback to production URL
  return PRODUCTION_APP_URL;
}

/**
 * Get the OAuth callback URL
 */
export function getAuthCallbackUrl(): string {
  return `${getAppUrl()}/auth/callback`;
}

/**
 * Store the intended destination before OAuth redirect
 * This allows returning users to where they were after login
 */
export function storeAuthNext(path?: string): void {
  const next = path || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/dashboard");
  
  // Don't store auth-related paths as return destinations
  if (next.startsWith("/auth") || next === "/" || next.startsWith("/signup")) {
    sessionStorage.setItem("auth_next", "/dashboard");
  } else {
    sessionStorage.setItem("auth_next", next);
  }
  
  if (import.meta.env.DEV) {
    console.log("[Auth] Stored auth_next:", sessionStorage.getItem("auth_next"));
  }
}

/**
 * Get and clear the stored next destination
 * Only allows same-origin paths (security)
 */
export function getAndClearAuthNext(): string {
  const next = sessionStorage.getItem("auth_next");
  sessionStorage.removeItem("auth_next");
  
  if (import.meta.env.DEV) {
    console.log("[Auth] Retrieved auth_next:", next);
  }
  
  return safeRedirectPath(next);
}

/**
 * Validate and sanitize redirect path (security)
 * Only allows same-origin relative paths
 */
export function safeRedirectPath(path: string | null): string {
  const defaultPath = "/dashboard";
  
  if (!path) return defaultPath;
  
  // Must start with single "/" (not "//" which could be protocol-relative URL)
  if (!path.startsWith("/") || path.startsWith("//")) {
    return defaultPath;
  }
  
  // Block any path that looks like it could be an external redirect
  if (path.includes("://") || path.includes("@")) {
    return defaultPath;
  }
  
  return path;
}

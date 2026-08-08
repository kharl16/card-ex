import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, RefreshCw, Copy, KeyRound, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAppUrl, getAuthCallbackUrl } from "@/lib/authUrl";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/** Providers we care about surfacing, in display order. */
const WATCHED = ["google", "apple", "facebook", "azure", "github"] as const;

type SettingsResponse = {
  external?: Record<string, boolean>;
  disable_signup?: boolean;
  mailer_autoconfirm?: boolean;
};

function copy(value: string, label: string) {
  navigator.clipboard
    ?.writeText(value)
    .then(() => toast.success(`${label} copied`))
    .catch(() => toast.error("Copy failed — select and copy manually"));
}

export function OAuthProviderStatus({ isAdmin }: { isAdmin: boolean }) {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  if (!isAdmin) {
    return null;
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: SUPABASE_KEY },
      });
      if (!res.ok) throw new Error(`Auth settings request failed (${res.status})`);
      setData((await res.json()) as SettingsResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the auth service");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const external = data?.external ?? {};
  const callbackUrl = getAuthCallbackUrl();
  const supabaseCallback = `${SUPABASE_URL}/auth/v1/callback`;
  const appUrl = getAppUrl();
  const originMatchesApp = typeof window !== "undefined" && window.location.origin === appUrl;

  const googleCloudOrigins = [appUrl, appUrl.replace("https://", "https://www.")].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  return (
    <section className="rounded-2xl border border-border/40 bg-card/40 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Sign-in providers</h2>
          <p className="text-xs text-muted-foreground">Live status from Supabase Auth</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={load}
          disabled={loading}
          aria-label="Refresh provider status"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error ? (
        <p className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : (
        <ul className="space-y-2">
          {WATCHED.map((p) => {
            const enabled = Boolean(external[p]);
            return (
              <li
                key={p}
                className="flex min-h-[44px] items-center gap-3 rounded-xl border border-border/30 bg-background/30 px-3 py-2"
              >
                {enabled ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <span className="flex-1 text-sm font-medium capitalize">{p}</span>
                <span className={`text-xs font-semibold ${enabled ? "text-emerald-400" : "text-muted-foreground"}`}>
                  {loading ? "Checking…" : enabled ? "Enabled" : "Disabled"}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Redirect URLs</h3>

        {[
          { label: "App callback (Supabase redirect allow-list)", value: callbackUrl },
          { label: "Provider callback (Google Cloud Console)", value: supabaseCallback },
        ].map((row) => (
          <div
            key={row.value}
            className="flex items-center gap-2 rounded-xl border border-border/30 bg-background/30 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">{row.label}</p>
              <p className="truncate text-xs font-mono">{row.value}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => copy(row.value, row.label)}
              aria-label={`Copy ${row.label}`}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {!originMatchesApp && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            You are on {typeof window !== "undefined" ? window.location.origin : ""}, but OAuth redirects to{" "}
            {appUrl}. Add both origins to the Supabase redirect allow-list to test from here.
          </p>
        )}
      </div>

      {external.google && (
        <div className="mt-4 space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <ExternalLink className="h-3.5 w-3.5" />
            Google Cloud Console setup
          </h3>
          <p className="text-xs text-muted-foreground">
            Add these exact values to your Google OAuth 2.0 Web client to avoid the 403 error:
          </p>

          <div className="space-y-2">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Authorized JavaScript origins</p>
              <ul className="mt-1 space-y-1">
                {googleCloudOrigins.map((origin) => (
                  <li
                    key={origin}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/30 bg-background/30 px-2 py-1.5"
                  >
                    <span className="truncate text-xs font-mono">{origin}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => copy(origin, "JavaScript origin")}
                      aria-label={`Copy ${origin}`}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Authorized redirect URIs</p>
              <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-border/30 bg-background/30 px-2 py-1.5">
                <span className="truncate text-xs font-mono">{supabaseCallback}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => copy(supabaseCallback, "Redirect URI")}
                  aria-label="Copy redirect URI"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Then verify Supabase Authentication → URL Configuration has{" "}
            <span className="font-mono text-foreground">{appUrl}</span> as the Site URL and{" "}
            <span className="font-mono text-foreground">{callbackUrl}</span> in the redirect allow-list.
          </p>
        </div>
      )}
    </section>
  );
}

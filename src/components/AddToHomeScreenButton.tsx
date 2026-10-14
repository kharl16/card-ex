import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Share, PlusSquare, MoreVertical, Loader2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Captured globally so the prompt is not lost before the dialog mounts.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
let deferredPrompt: InstallPromptEvent | null = null;
let installedInSession = false;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    installedInSession = false;
  });
  window.addEventListener("appinstalled", () => {
    installedInSession = true;
    deferredPrompt = null;
  });
}

const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true);

type InstallPhase = "idle" | "installing" | "done";

export default function AddToHomeScreenButton({
  label = "Add Card to Home Screen",
  variant = "default",
  floating = false,
}: { label?: string; variant?: "default" | "outline"; floating?: boolean }) {
  const [steps, setSteps] = useState<null | "ios" | "android">(null);
  const [installed, setInstalled] = useState(false);
  const [phase, setPhase] = useState<InstallPhase>("idle");
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    let checkVersion = 0;
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const checkInstallation = async () => {
      const version = ++checkVersion;
      if (isStandalone()) {
        setInstalled(true);
        return;
      }
      // No durable installed flag: it would leave the button hidden after uninstall.
      const nav = navigator as Navigator & {
        getInstalledRelatedApps?: () => Promise<Array<{ platform: string; id?: string; url?: string }>>;
      };
      let detected = installedInSession;
      if (nav.getInstalledRelatedApps) {
        try {
          const apps = await nav.getInstalledRelatedApps();
          const currentId = new URL(window.location.pathname, window.location.origin).href;
          if (apps.length > 0) {
            detected = apps.some((app) => app.platform === "webapp" &&
              (app.id === currentId || app.id === window.location.pathname));
          }
        } catch { /* Keep the current session signal if the browser refuses detection. */ }
      }
      if (active && version === checkVersion) setInstalled(detected);
    };
    const finish = () => {
      if (!active) return;
      setPhase("done");
      if (doneTimer.current) clearTimeout(doneTimer.current);
      doneTimer.current = setTimeout(() => setInstalled(true), 2500);
    };
    // Chrome fires appinstalled before Android finishes placing the icon; keep progress until confirmed.
    const waitForIcon = async () => {
      const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> };
      const started = Date.now();
      const minMs = 20000, maxMs = 90000;
      while (active && Date.now() - started < maxMs) {
        await new Promise((r) => setTimeout(r, 2000));
        if (Date.now() - started < minMs) continue;
        try {
          if (nav.getInstalledRelatedApps && (await nav.getInstalledRelatedApps()).length > 0) break;
        } catch { /* keep waiting */ }
      }
      finish();
    };
    const onInstalled = () => {
      ++checkVersion;
      installedInSession = true;
      deferredPrompt = null;
      setSteps(null);
      setPhase((current) => {
        if (current === "installing") {
          void waitForIcon();
          return "installing";
        }
        setInstalled(true);
        return current;
      });
    };
    const onInstallAvailable = () => {
      ++checkVersion;
      installedInSession = false;
      setPhase("idle");
      setInstalled(isStandalone());
    };
    const onVisibility = () => { if (document.visibilityState === "visible") void checkInstallation(); };
    void checkInstallation();
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("beforeinstallprompt", onInstallAvailable);
    window.addEventListener("focus", checkInstallation);
    window.addEventListener("pageshow", checkInstallation);
    document.addEventListener("visibilitychange", onVisibility);
    displayMode.addEventListener?.("change", checkInstallation);
    return () => {
      active = false;
      if (doneTimer.current) clearTimeout(doneTimer.current);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("beforeinstallprompt", onInstallAvailable);
      window.removeEventListener("focus", checkInstallation);
      window.removeEventListener("pageshow", checkInstallation);
      document.removeEventListener("visibilitychange", onVisibility);
      displayMode.removeEventListener?.("change", checkInstallation);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      try {
        const prompt = deferredPrompt;
        deferredPrompt = null;
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === "accepted") {
          // Android builds the app package in the background; show progress until appinstalled fires.
          setPhase("installing");
        }
        return;
      } catch {
        deferredPrompt = null;
        /* fall through to manual steps */
      }
    }
    setSteps(isIOS() ? "ios" : "android");
  };

  const statusCard = (
    <div
      role="status"
      aria-live="polite"
      className={
        (floating
          ? "pointer-events-auto w-64 rounded-2xl border border-primary/50 bg-background/95 p-4 shadow-gold backdrop-blur-md"
          : "w-full rounded-2xl border border-primary/50 bg-card p-4 shadow-gold") +
        " space-y-3"
      }
    >
      <div className="flex items-center gap-3">
        {phase === "done" ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-5 w-5" />
          </span>
        ) : (
          <Loader2 className="h-8 w-8 shrink-0 animate-spin text-primary" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">
            {phase === "done" ? "Installed successfully!" : "Installing Card-Ex…"}
          </p>
          <p className="text-xs text-muted-foreground">
            {phase === "done"
              ? "Find the gold icon on your home screen."
              : "Preparing the app for your home screen. This may take a moment."}
          </p>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
        <div
          className={
            phase === "done"
              ? "h-full w-full rounded-full bg-primary transition-[width] duration-500"
              : "h-full w-1/3 animate-[install-slide_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary/40"
          }
        />
      </div>
      <style>{`@keyframes install-slide{0%{margin-left:-33%}100%{margin-left:100%}}`}</style>
    </div>
  );

  const installButton = (
    <Button variant={variant} onClick={handleClick}
      className={floating
        ? "pointer-events-auto h-12 gap-2 rounded-full border border-primary-subtle bg-primary px-4 text-sm font-bold text-primary-foreground shadow-gold hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary"
        : "w-full h-12 gap-2 font-semibold"}>
      <Smartphone className="h-5 w-5 shrink-0" />
      {label}
    </Button>
  );

  const control = phase === "idle" ? installButton : statusCard;

  return floating ? (
    <>
      <div data-card-install className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-40">
        <div className="mx-auto flex max-w-2xl justify-end px-4">{control}</div>
      </div>
      <Dialog open={steps !== null} onOpenChange={(open) => { if (!open) setSteps(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Install Card-Ex</DialogTitle>
            <DialogDescription>Add this card to your home screen.</DialogDescription>
          </DialogHeader>
          {instructions(steps)}
        </DialogContent>
      </Dialog>
    </>
  ) : (
    <div className="space-y-2">{control}{instructions(steps)}</div>
  );
}

function instructions(steps: null | "ios" | "android") {
  return (
    <>
      {steps === "ios" && (
        <ol className="rounded-lg border border-border/60 bg-card p-3 text-sm space-y-2">
          <li className="flex items-center gap-2">
            1. Tap <Share className="h-4 w-4 text-primary" /> <b>Share</b> at the bottom of Safari
          </li>
          <li className="flex items-center gap-2">
            2. Choose <PlusSquare className="h-4 w-4 text-primary" /> <b>Add to Home Screen</b>
          </li>
          <li>3. Tap <b>Add</b></li>
        </ol>
      )}
      {steps === "android" && (
        <ol className="rounded-lg border border-border/60 bg-card p-3 text-sm space-y-2">
          <li className="flex items-center gap-2">
            1. Tap <MoreVertical className="h-4 w-4 text-primary" /> <b>menu</b> in your browser
          </li>
          <li>2. Choose <b>Add to Home screen</b> or <b>Install app</b></li>
          <li>3. Tap <b>Add</b></li>
        </ol>
      )}
    </>
  );
}

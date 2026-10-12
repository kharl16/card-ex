import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Share, PlusSquare, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Captured globally so the prompt is not lost before the dialog mounts.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
let deferredPrompt: InstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
  });
}

const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true);

export default function AddToHomeScreenButton({
  label = "Add Card to Home Screen",
  variant = "default",
  floating = false,
}: { label?: string; variant?: "default" | "outline"; floating?: boolean }) {
  const [steps, setSteps] = useState<null | "ios" | "android">(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    let active = true;
    let installedThisSession = false;
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
      let detected = installedThisSession;
      if (nav.getInstalledRelatedApps) {
        try {
          const apps = await nav.getInstalledRelatedApps();
          const currentId = new URL(window.location.pathname, window.location.origin).href;
          detected = apps.some((app) => app.platform === "webapp" &&
            (app.id === currentId || app.id === window.location.pathname));
        } catch { /* Keep the current session signal if the browser refuses detection. */ }
      }
      if (active && version === checkVersion) setInstalled(detected);
    };
    const onInstalled = () => {
      ++checkVersion;
      installedThisSession = true;
      deferredPrompt = null;
      setInstalled(true);
      setSteps(null);
    };
    const onInstallAvailable = () => {
      ++checkVersion;
      installedThisSession = false;
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
        if (outcome === "accepted") toast.success("Added to your home screen");
        return;
      } catch {
        deferredPrompt = null;
        /* fall through to manual steps */
      }
    }
    setSteps(isIOS() ? "ios" : "android");
  };

  const instructions = (
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

  const installButton = (
    <Button variant={variant} onClick={handleClick}
      className={floating
        ? "pointer-events-auto h-12 gap-2 rounded-full border border-primary-subtle bg-primary px-4 text-sm font-bold text-primary-foreground shadow-gold hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary"
        : "w-full h-12 gap-2 font-semibold"}>
      <Smartphone className="h-5 w-5 shrink-0" />
      {label}
    </Button>
  );

  return floating ? (
    <>
      <div data-card-install className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-40">
        <div className="mx-auto flex max-w-2xl justify-end px-4">{installButton}</div>
      </div>
      <Dialog open={steps !== null} onOpenChange={(open) => { if (!open) setSteps(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Install Card-Ex</DialogTitle>
            <DialogDescription>Add this card to your home screen.</DialogDescription>
          </DialogHeader>
          {instructions}
        </DialogContent>
      </Dialog>
    </>
  ) : (
    <div className="space-y-2">{installButton}{instructions}</div>
  );
}

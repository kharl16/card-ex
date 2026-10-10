import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Share, PlusSquare, MoreVertical } from "lucide-react";
import { toast } from "sonner";

// Captured globally so the prompt is not lost before the dialog mounts.
let deferredPrompt: any = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
}

const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true);

export default function AddToHomeScreenButton() {
  const [steps, setSteps] = useState<null | "ios" | "android">(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        if (outcome === "accepted") toast.success("Card added to your home screen");
        return;
      } catch {
        /* fall through to manual steps */
      }
    }
    setSteps(isIOS() ? "ios" : "android");
  };

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} className="w-full h-12 gap-2 font-semibold">
        <Smartphone className="h-5 w-5" />
        Add Card to Home Screen
      </Button>
      {steps === "ios" && (
        <ol className="rounded-lg border border-border/60 bg-card p-3 text-sm space-y-2">
          <li className="flex items-center gap-2">
            1. Tap <Share className="h-4 w-4 text-primary" /> <b>Share</b> at the bottom of Safari
          </li>
          <li className="flex items-center gap-2">
            2. Choose <PlusSquare className="h-4 w-4 text-primary" /> <b>Add to Home Screen</b>
          </li>
          <li>3. Tap <b>Add</b> — the card opens like an app</li>
        </ol>
      )}
      {steps === "android" && (
        <ol className="rounded-lg border border-border/60 bg-card p-3 text-sm space-y-2">
          <li className="flex items-center gap-2">
            1. Tap <MoreVertical className="h-4 w-4 text-primary" /> <b>menu</b> in your browser
          </li>
          <li>2. Choose <b>Add to Home screen</b> or <b>Install app</b></li>
          <li>3. Tap <b>Add</b> — the card opens like an app</li>
        </ol>
      )}
    </div>
  );
}

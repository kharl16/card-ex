import { useEffect, useState } from "react";
import { Smartphone, Download, Copy } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IAM_ECOMM_BASE, isIamEcommUrl, normalizeIamId } from "@/lib/iamEcommUrl";

const EVENT = "iam-shop-open";
const APP_STORE = "https://apps.apple.com/ph/app/iam-ecom/id6767620078";
const playStore = (id: string) =>
  `https://play.google.com/store/apps/details?id=com.IAM.IAM_Ecomm&referrer=${encodeURIComponent(`ref=${id}`)}`;

/** If href is an IAM Ecomm link, open the Shop Now sheet and return true. */
export function openIamShopSheet(href: string | null | undefined): boolean {
  if (!isIamEcommUrl(href)) return false;
  const id = normalizeIamId(href!.split("/r/")[1]?.split(/[?#/]/)[0]);
  if (!id) return false;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
  return true;
}

async function copyId(id: string) {
  try {
    await navigator.clipboard.writeText(id);
    toast.success(`IAM ID ${id} copied — paste it as your Referral ID`);
  } catch {
    toast(`Your Referral ID: ${id}`);
  }
}

export default function IamShopSheet() {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => setId((e as CustomEvent<string>).detail);
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, []);

  if (!id) return null;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(navigator.userAgent);

  const openApp = () => {
    const fallback = `${IAM_ECOMM_BASE}/${id}`;
    const timer = window.setTimeout(() => {
      if (!document.hidden) window.location.href = fallback;
    }, 1600);
    const clear = () => { if (document.hidden) window.clearTimeout(timer); };
    document.addEventListener("visibilitychange", clear, { once: true });
    window.location.href = `iamecomm://signup?ref=${id}`;
  };

  const download = async () => {
    await copyId(id);
    const url = isIOS ? APP_STORE : isAndroid ? playStore(id) : `${IAM_ECOMM_BASE}/${id}`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && setId(null)}>
      <DialogContent className="glass-shimmer top-auto bottom-0 translate-y-0 rounded-t-2xl rounded-b-none border-primary/30 sm:bottom-auto sm:top-[50%] sm:translate-y-[-50%] sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Already have the IAM Ecomm app?</DialogTitle>
          <DialogDescription className="text-base">
            Sign up with Referral ID <span className="font-semibold text-primary">{id}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button className="h-14 gap-3 rounded-xl text-base font-semibold" onClick={openApp}>
            <Smartphone className="h-5 w-5" /> Yes, open the app
          </Button>
          <Button variant="outline" className="h-14 gap-3 rounded-xl text-base" onClick={download}>
            <Download className="h-5 w-5" /> No, Download &amp; Sign Up
          </Button>
          <Button variant="ghost" className="h-12 gap-2 text-sm" onClick={() => copyId(id)}>
            <Copy className="h-4 w-4" /> Copy Referral ID
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

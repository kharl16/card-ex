import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Clock, Copy, ImagePlus, Loader2, RefreshCw, Smartphone, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  MAX_PROOF_BYTES,
  formatPeso,
  formatPhMobile,
  isValidGcashReference,
  latestSubmission,
  normalizeGcashReference,
  normalizePhMobile,
} from "@/lib/gcashPayment";

type Settings = Tables<"gcash_payment_settings">;
type Submission = Tables<"gcash_payment_submissions">;

interface Props {
  cardId: string;
  plan: { id: string; name: string; retail_price: number } | undefined;
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.info(`${label}: ${text}`);
  }
}

function friendlyError(message: string | undefined): string {
  const m = message ?? "";
  if (m.includes("gcash_submissions_reference_unique")) return "This reference number was already sent. Please check the number on your GCash receipt.";
  if (m.includes("gcash_submissions_one_pending_per_card")) return "We're already checking a GCash payment for this card.";
  if (m.includes("already paid")) return "This card is already paid.";
  if (m.includes("not available")) return "GCash payments are not available right now.";
  return "We couldn't send your payment details. Please try again.";
}

export function GcashPayPanel({ cardId, plan }: Props) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [latest, setLatest] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [reference, setReference] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [senderName, setSenderName] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [{ data: s }, { data: subs }] = await Promise.all([
      supabase.from("gcash_payment_settings").select("*").maybeSingle(),
      supabase
        .from("gcash_payment_submissions")
        .select("*")
        .eq("card_id", cardId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    setSettings(s ?? null);
    setLatest(latestSubmission(subs ?? []));
    setLoading(false);
  }, [cardId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !settings?.enabled || !plan) return null;

  const amount = Number(plan.retail_price);

  const handleSubmit = async () => {
    if (!user?.id) return;
    const ref = normalizeGcashReference(reference);
    if (!isValidGcashReference(ref)) {
      toast.error("Please enter the 13-digit reference number from your GCash receipt.");
      return;
    }
    const mobile = normalizePhMobile(senderNumber);
    if (!mobile) {
      toast.error("Please enter the GCash number you paid from, like 0917 123 4567.");
      return;
    }
    if (proof && proof.size > MAX_PROOF_BYTES) {
      toast.error("The screenshot is too large. Please choose one under 10 MB.");
      return;
    }

    setSubmitting(true);
    try {
      let proofPath: string | null = null;
      if (proof) {
        const ext = (proof.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        proofPath = `${user.id}/${cardId}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("gcash-proofs")
          .upload(proofPath, proof, { contentType: proof.type || "image/jpeg", upsert: false });
        if (upErr) throw new Error("We couldn't upload your screenshot. Please try again.");
      }

      const { data, error } = await supabase
        .from("gcash_payment_submissions")
        .insert({
          user_id: user.id,
          card_id: cardId,
          plan_id: plan.id,
          amount,
          reference_number: ref,
          sender_number: mobile,
          sender_name: senderName.trim() || null,
          proof_path: proofPath,
        })
        .select("*")
        .single();
      if (error) throw new Error(friendlyError(error.message));

      setLatest(data);
      setRetrying(false);
      setReference("");
      setProof(null);
      toast.success("Thank you! We'll check your GCash payment and activate your card.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Waiting for the admin to check
  if (latest?.status === "pending") {
    return (
      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-6 w-6 text-primary" />
            We're checking your GCash payment
          </CardTitle>
          <CardDescription className="text-base">
            Your card will be activated as soon as we confirm it. You don't need to pay again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-base">
          <div className="grid gap-2 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Amount</span><span className="font-semibold">{formatPeso(Number(latest.amount))}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Reference no.</span><span className="font-mono">{latest.reference_number}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Sent</span><span>{new Date(latest.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</span></div>
          </div>
          <Button variant="outline" size="lg" className="min-h-[48px] w-full" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-5 w-5" /> Check again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const showRejected = latest?.status === "rejected" && !retrying;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Smartphone className="h-6 w-6 text-primary" />
          Pay directly with GCash
        </CardTitle>
        <CardDescription className="text-base">
          Send the exact amount, then tell us your reference number. We'll activate your card after we check it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showRejected && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-base">
            <p className="flex items-center gap-2 font-semibold text-destructive">
              <XCircle className="h-5 w-5" /> We couldn't confirm your last GCash payment
            </p>
            {latest?.review_note && <p className="mt-2">{latest.review_note}</p>}
            <Button size="lg" className="mt-3 min-h-[48px]" onClick={() => setRetrying(true)}>
              Send payment details again
            </Button>
          </div>
        )}

        {!showRejected && (
          <>
            {/* Step 1: send money */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Step 1 — Send {formatPeso(amount)} to this GCash account</h3>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start">
                {settings.qr_image_url && (
                  <img
                    src={settings.qr_image_url}
                    alt="GCash QR code to scan for payment"
                    className="mx-auto w-full max-w-[220px] rounded-xl border border-border bg-background object-contain"
                  />
                )}
                <div className="space-y-3 text-base">
                  <div>
                    <p className="text-sm text-muted-foreground">Account name</p>
                    <p className="text-lg font-semibold">{settings.account_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">GCash number</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-xl font-semibold tracking-wide">{formatPhMobile(settings.gcash_number)}</p>
                      <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => void copyText(settings.gcash_number, "GCash number")}>
                        <Copy className="mr-1 h-4 w-4" /> Copy
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Exact amount ({plan.name})</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-2xl font-bold text-primary">{formatPeso(amount)}</p>
                      <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => void copyText(String(amount), "Amount")}>
                        <Copy className="mr-1 h-4 w-4" /> Copy
                      </Button>
                    </div>
                  </div>
                  {settings.instructions && (
                    <p className="whitespace-pre-line text-muted-foreground">{settings.instructions}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Step 2: tell us */}
            <section className="space-y-4 border-t border-border pt-5">
              <h3 className="text-lg font-semibold">Step 2 — Tell us about your payment</h3>
              <div className="space-y-2">
                <Label htmlFor="gcash-ref" className="text-base">Reference number (on your GCash receipt)</Label>
                <Input
                  id="gcash-ref"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="13 digits, e.g. 1012 345 678912"
                  className="h-12 text-lg"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gcash-sender" className="text-base">GCash number you paid from</Label>
                <Input
                  id="gcash-sender"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0917 123 4567"
                  className="h-12 text-lg"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gcash-name" className="text-base">Name on that GCash account (optional)</Label>
                <Input
                  id="gcash-name"
                  autoComplete="name"
                  className="h-12 text-lg"
                  maxLength={120}
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base">Screenshot of your receipt (optional, helps us check faster)</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setProof(e.target.files?.[0] ?? null)}
                />
                <Button type="button" variant="outline" size="lg" className="min-h-[48px] w-full" onClick={() => fileRef.current?.click()}>
                  {proof ? <Check className="mr-2 h-5 w-5 text-primary" /> : <ImagePlus className="mr-2 h-5 w-5" />}
                  <span className="truncate">{proof ? proof.name : "Add screenshot"}</span>
                </Button>
              </div>
              <Button size="lg" className="min-h-[52px] w-full text-lg" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {submitting ? "Sending..." : "I've paid — send for checking"}
              </Button>
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

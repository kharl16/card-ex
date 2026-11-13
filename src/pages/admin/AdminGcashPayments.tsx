import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Check, ImageIcon, ImagePlus, Loader2, RefreshCw, Save, Smartphone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatPeso, formatPhMobile, normalizePhMobile, type GcashSubmissionStatus } from "@/lib/gcashPayment";

type Settings = Tables<"gcash_payment_settings">;
type Submission = Tables<"gcash_payment_submissions"> & {
  cards: { full_name: string | null } | null;
  card_plans: { name: string } | null;
};

function SettingsCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [number, setNumber] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("gcash_payment_settings").select("*").maybeSingle();
      const s = data as Settings | null;
      if (s) {
        setEnabled(s.enabled);
        setAccountName(s.account_name);
        setNumber(s.gcash_number ? formatPhMobile(s.gcash_number) : "");
        setQrUrl(s.qr_image_url);
        setInstructions(s.instructions ?? "");
      }
      setLoading(false);
    })();
  }, []);

  const uploadQr = async (file: File) => {
    if (!user?.id) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a photo of your GCash QR code.");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "png";
      const path = `${user.id}/gcash/qr-${Date.now()}.${safeExt}`;
      const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      setQrUrl(supabase.storage.from("media").getPublicUrl(path).data.publicUrl);
      toast.success("QR code added. Press Save to show it to members.");
    } catch {
      toast.error("We couldn't upload the QR code. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const mobile = number.trim() ? normalizePhMobile(number) : "";
    if (mobile === null) {
      toast.error("Please enter a GCash number like 0917 123 4567.");
      return;
    }
    if (enabled && (!accountName.trim() || !mobile)) {
      toast.error("Add the account name and GCash number before turning GCash on.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("gcash_payment_settings").upsert({
      id: true,
      enabled,
      account_name: accountName.trim(),
      gcash_number: mobile,
      qr_image_url: qrUrl,
      instructions: instructions.trim() || null,
      updated_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error("Couldn't save your GCash details.");
      return;
    }
    toast.success(enabled ? "Saved. Members now see GCash on the payment page." : "Saved. GCash is hidden from members.");
  };

  if (loading) return <Skeleton className="h-80" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl"><Smartphone className="h-6 w-6 text-primary" /> Your GCash details</CardTitle>
        <CardDescription className="text-base">Members see these on the payment page and send money straight to you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
          <Label htmlFor="gcash-enabled" className="text-base">Show GCash on the payment page</Label>
          <Switch id="gcash-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gcash-account-name" className="text-base">Account name</Label>
            <Input id="gcash-account-name" className="h-12 text-lg" maxLength={120} value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g. Carlomagno T." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gcash-number" className="text-base">GCash number</Label>
            <Input id="gcash-number" className="h-12 text-lg" inputMode="tel" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="0917 123 4567" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-base">GCash QR code (from GCash → Receive → QR)</Label>
          <div className="flex flex-wrap items-center gap-4">
            {qrUrl ? (
              <img src={qrUrl} alt="Your GCash QR code" className="h-40 w-40 rounded-xl border border-border bg-background object-contain" />
            ) : (
              <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>
            )}
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadQr(f); e.target.value = ""; }} />
              <Button variant="outline" size="lg" className="min-h-[48px]" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ImagePlus className="mr-2 h-5 w-5" />}
                {qrUrl ? "Change QR code" : "Add QR code"}
              </Button>
              {qrUrl && <Button variant="ghost" size="lg" className="min-h-[48px]" onClick={() => setQrUrl(null)}>Remove QR code</Button>}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gcash-instructions" className="text-base">Extra note for members (optional)</Label>
          <Textarea id="gcash-instructions" className="text-base" maxLength={1000} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. Please put your card name in the GCash message." />
        </div>
        <Button size="lg" className="min-h-[52px] w-full text-lg" onClick={save} disabled={saving || uploading}>
          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />} Save GCash details
        </Button>
      </CardContent>
    </Card>
  );
}

function SubmissionsCard() {
  const [status, setStatus] = useState<GcashSubmissionStatus>("pending");
  const [rows, setRows] = useState<Submission[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [approveRow, setApproveRow] = useState<Submission | null>(null);
  const [rejectRow, setRejectRow] = useState<Submission | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("gcash_payment_submissions")
      .select("*, cards!gcash_payment_submissions_card_id_fkey(full_name), card_plans!gcash_payment_submissions_plan_id_fkey(name)")
      .eq("status", status)
      .order("created_at", { ascending: status === "pending" })
      .limit(100);
    if (error) {
      toast.error("Couldn't load GCash payments.");
      setRows([]);
    } else {
      const list = (data ?? []) as unknown as Submission[];
      setRows(list);
      const ids = [...new Set(list.map((r) => r.user_id))];
      if (ids.length) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        setNames(Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name ?? ""])));
      }
    }
    setLoading(false);
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  const openProof = async (path: string) => {
    const { data, error } = await supabase.storage.from("gcash-proofs").createSignedUrl(path, 600);
    if (error || !data?.signedUrl) {
      toast.error("Couldn't open the screenshot.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const review = async (row: Submission, approve: boolean) => {
    setBusy(true);
    const { error } = await supabase.rpc("review_gcash_payment", {
      _submission_id: row.id,
      _approve: approve,
      _note: approve ? null : reason.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message || "Couldn't save your decision.");
      return;
    }
    toast.success(approve ? "Approved. The member's card is now active." : "Rejected. The member will see your reason.");
    setApproveRow(null);
    setRejectRow(null);
    setReason("");
    void load();
  };

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl">GCash payments to check</CardTitle>
            <CardDescription className="text-base">Match each one with your GCash history before approving.</CardDescription>
          </div>
          <Button variant="outline" size="lg" className="min-h-[48px]" onClick={() => void load()}><RefreshCw className="mr-2 h-5 w-5" /> Refresh</Button>
        </div>
        <Tabs value={status} onValueChange={(v) => setStatus(v as GcashSubmissionStatus)}>
          <TabsList className="grid h-auto w-full grid-cols-3">
            <TabsTrigger value="pending" className="min-h-[44px]">Waiting</TabsTrigger>
            <TabsTrigger value="approved" className="min-h-[44px]">Approved</TabsTrigger>
            <TabsTrigger value="rejected" className="min-h-[44px]">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-40" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-base text-muted-foreground">
            {status === "pending" ? "No GCash payments waiting right now." : "Nothing here yet."}
          </p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{r.cards?.full_name || names[r.user_id] || "Member"}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.card_plans?.name ?? "Plan"} · sent {new Date(r.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <p className="text-2xl font-bold text-primary">{formatPeso(Number(r.amount))}</p>
              </div>
              <div className="grid gap-2 text-base sm:grid-cols-2">
                <p><span className="text-muted-foreground">Reference no.: </span><span className="font-mono font-semibold">{r.reference_number}</span></p>
                <p><span className="text-muted-foreground">Paid from: </span><span className="font-mono">{formatPhMobile(r.sender_number)}</span>{r.sender_name ? ` (${r.sender_name})` : ""}</p>
              </div>
              {r.review_note && <p className="text-base"><span className="text-muted-foreground">Note: </span>{r.review_note}</p>}
              <div className="flex flex-wrap gap-2">
                {r.proof_path && (
                  <Button variant="outline" size="lg" className="min-h-[48px]" onClick={() => void openProof(r.proof_path!)}>
                    <ImageIcon className="mr-2 h-5 w-5" /> View screenshot
                  </Button>
                )}
                {r.status === "pending" ? (
                  <>
                    <Button size="lg" className="min-h-[48px]" onClick={() => setApproveRow(r)}><Check className="mr-2 h-5 w-5" /> Approve</Button>
                    <Button variant="outline" size="lg" className="min-h-[48px] border-destructive/50 text-destructive" onClick={() => { setReason(""); setRejectRow(r); }}><X className="mr-2 h-5 w-5" /> Reject</Button>
                  </>
                ) : (
                  <Badge variant={r.status === "approved" ? "default" : "destructive"} className="self-center text-sm">
                    {r.status === "approved" ? "Approved" : "Rejected"}
                    {r.reviewed_at ? ` · ${new Date(r.reviewed_at).toLocaleDateString("en-PH", { dateStyle: "medium" })}` : ""}
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>

      <AlertDialog open={!!approveRow} onOpenChange={(o) => !o && setApproveRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this GCash payment?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Only approve if your GCash history shows {approveRow ? formatPeso(Number(approveRow.amount)) : ""} with reference {approveRow?.reference_number}. Their card will be activated right away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[48px]">Cancel</AlertDialogCancel>
            <AlertDialogAction className="min-h-[48px]" disabled={busy} onClick={(e) => { e.preventDefault(); if (approveRow) void review(approveRow, true); }}>
              {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null} Yes, I received it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rejectRow} onOpenChange={(o) => !o && setRejectRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this GCash payment</DialogTitle>
            <DialogDescription className="text-base">The member will see this reason and can send their details again.</DialogDescription>
          </DialogHeader>
          <Textarea className="text-base" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. We couldn't find this reference number. Please check your GCash receipt." />
          <DialogFooter>
            <Button variant="outline" size="lg" className="min-h-[48px]" onClick={() => setRejectRow(null)}>Cancel</Button>
            <Button variant="destructive" size="lg" className="min-h-[48px]" disabled={busy || !reason.trim()} onClick={() => rejectRow && void review(rejectRow, false)}>
              {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null} Reject payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function AdminGcashPayments() {
  const { isSuperAdmin, loading } = useAuth();

  if (loading) {
    return <div className="mx-auto max-w-4xl space-y-4 px-4 py-8"><Skeleton className="h-10 w-64" /><Skeleton className="h-80" /></div>;
  }
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-11 w-11" asChild aria-label="Back to Super Admin Console">
            <Link to="/superadmin"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">GCash Payments</h1>
            <p className="text-base text-muted-foreground">Members pay your GCash directly; you confirm and activate their card.</p>
          </div>
        </div>
        <SubmissionsCard />
        <SettingsCard />
      </div>
    </div>
  );
}

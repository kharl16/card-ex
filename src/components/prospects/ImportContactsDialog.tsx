import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Smartphone, FileText, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Prospect } from "@/hooks/useProspects";

interface ImportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (prospect: Partial<Prospect>) => Promise<Prospect | null>;
}

interface ParsedContact {
  full_name: string;
  phone: string | null;
  email: string | null;
  selected: boolean;
}

type Step = "choose" | "review" | "importing";

export default function ImportContactsDialog({ open, onOpenChange, onAdd }: ImportContactsDialogProps) {
  const [step, setStep] = useState<Step>("choose");
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // @ts-ignore - Contact Picker API not in TS lib
  const supportsContactPicker = typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;

  const reset = () => {
    setStep("choose");
    setContacts([]);
    setImportProgress({ done: 0, total: 0 });
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  // ---------- Android Contact Picker ----------
  const pickFromPhone = async () => {
    try {
      // @ts-ignore
      const props = ["name", "tel", "email"];
      // @ts-ignore
      const opts = { multiple: true };
      // @ts-ignore
      const picked = await navigator.contacts.select(props, opts);
      if (!picked || picked.length === 0) return;

      const parsed: ParsedContact[] = picked
        .map((c: any) => ({
          full_name: (c.name?.[0] || "").trim() || (c.tel?.[0] || "Unknown"),
          phone: c.tel?.[0] || null,
          email: c.email?.[0] || null,
          selected: true,
        }))
        .filter((c: ParsedContact) => c.full_name && c.full_name !== "Unknown");

      if (parsed.length === 0) {
        toast.error("No usable contacts selected");
        return;
      }
      setContacts(parsed);
      setStep("review");
    } catch (err: any) {
      console.error(err);
      if (err?.name !== "AbortError") {
        toast.error("Failed to read contacts. Try the file upload instead.");
      }
    }
  };

  // ---------- File Upload (vCard / CSV) ----------
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const ext = file.name.toLowerCase().split(".").pop();
      let parsed: ParsedContact[] = [];

      if (ext === "vcf" || text.includes("BEGIN:VCARD")) {
        parsed = parseVCard(text);
      } else if (ext === "csv") {
        parsed = parseCSV(text);
      } else {
        toast.error("Unsupported file. Use .vcf or .csv");
        return;
      }

      if (parsed.length === 0) {
        toast.error("No contacts found in file");
        return;
      }
      setContacts(parsed);
      setStep("review");
    } catch (err) {
      console.error(err);
      toast.error("Failed to read file");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const parseVCard = (text: string): ParsedContact[] => {
    const cards = text.split(/BEGIN:VCARD/i).slice(1);
    return cards
      .map((raw) => {
        const block = raw.split(/END:VCARD/i)[0];
        const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

        let fullName = "";
        let phone: string | null = null;
        let email: string | null = null;

        for (const line of lines) {
          const upper = line.toUpperCase();
          if (upper.startsWith("FN:") || upper.startsWith("FN;")) {
            const idx = line.indexOf(":");
            if (idx > -1) fullName = line.slice(idx + 1).trim();
          } else if (!fullName && (upper.startsWith("N:") || upper.startsWith("N;"))) {
            const idx = line.indexOf(":");
            if (idx > -1) {
              const parts = line.slice(idx + 1).split(";");
              fullName = `${parts[1] || ""} ${parts[0] || ""}`.trim();
            }
          } else if (upper.startsWith("TEL")) {
            const idx = line.indexOf(":");
            if (idx > -1 && !phone) phone = line.slice(idx + 1).trim();
          } else if (upper.startsWith("EMAIL")) {
            const idx = line.indexOf(":");
            if (idx > -1 && !email) email = line.slice(idx + 1).trim();
          }
        }

        return {
          full_name: fullName || phone || "Unknown",
          phone,
          email,
          selected: true,
        };
      })
      .filter((c) => c.full_name && c.full_name !== "Unknown");
  };

  const parseCSV = (text: string): ParsedContact[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];

    const splitRow = (row: string): string[] => {
      const out: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '"') {
          if (inQuotes && row[i + 1] === '"') { cur += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
          out.push(cur); cur = "";
        } else { cur += ch; }
      }
      out.push(cur);
      return out.map((s) => s.trim());
    };

    const headers = splitRow(lines[0]).map((h) => h.toLowerCase());
    const findIdx = (...keys: string[]) =>
      headers.findIndex((h) => keys.some((k) => h.includes(k)));

    const nameIdx = findIdx("name", "full name", "display name");
    const firstIdx = findIdx("first name", "given name");
    const lastIdx = findIdx("last name", "family name", "surname");
    const phoneIdx = findIdx("phone", "mobile", "tel");
    const emailIdx = findIdx("email", "e-mail");

    return lines
      .slice(1)
      .map((line) => {
        const cols = splitRow(line);
        let fullName = nameIdx > -1 ? cols[nameIdx] : "";
        if (!fullName && (firstIdx > -1 || lastIdx > -1)) {
          fullName = `${firstIdx > -1 ? cols[firstIdx] : ""} ${lastIdx > -1 ? cols[lastIdx] : ""}`.trim();
        }
        const phone = phoneIdx > -1 ? cols[phoneIdx] || null : null;
        const email = emailIdx > -1 ? cols[emailIdx] || null : null;
        return {
          full_name: fullName || phone || email || "",
          phone,
          email,
          selected: true,
        };
      })
      .filter((c) => c.full_name);
  };

  // ---------- Import ----------
  const toggleContact = (idx: number) => {
    setContacts((prev) => prev.map((c, i) => (i === idx ? { ...c, selected: !c.selected } : c)));
  };

  const toggleAll = (val: boolean) => {
    setContacts((prev) => prev.map((c) => ({ ...c, selected: val })));
  };

  const handleImport = async () => {
    const toImport = contacts.filter((c) => c.selected);
    if (toImport.length === 0) {
      toast.error("Select at least one contact");
      return;
    }
    setStep("importing");
    setImportProgress({ done: 0, total: toImport.length });

    let successCount = 0;
    for (let i = 0; i < toImport.length; i++) {
      const c = toImport[i];
      const result = await onAdd({
        full_name: c.full_name.slice(0, 200),
        phone: c.phone?.slice(0, 50) || null,
        email: c.email?.slice(0, 200) || null,
        source_type: "manual",
        interest_level: "warm",
      });
      if (result) successCount++;
      setImportProgress({ done: i + 1, total: toImport.length });
    }

    toast.success(`Imported ${successCount} of ${toImport.length} contacts`);
    handleClose(false);
  };

  const selectedCount = contacts.filter((c) => c.selected).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            {step === "choose" && "Import Contacts"}
            {step === "review" && `Review (${selectedCount}/${contacts.length})`}
            {step === "importing" && "Importing..."}
          </DialogTitle>
          {step === "choose" && (
            <DialogDescription>
              Bulk-add prospects from your phone or a contacts file.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "choose" && (
          <div className="space-y-3">
            {supportsContactPicker && (
              <button
                onClick={pickFromPhone}
                className="w-full text-left p-4 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-primary/15 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Pick from Phone Contacts</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Choose multiple contacts using the native picker (Android Chrome).
                    </p>
                  </div>
                </div>
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-left p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-accent flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Upload Contacts File</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Upload a <strong>.vcf</strong> (vCard) or <strong>.csv</strong> file exported from your phone or Google Contacts.
                  </p>
                </div>
              </div>
            </button>

            {!supportsContactPicker && (
              <p className="text-[11px] text-muted-foreground text-center pt-2">
                💡 Tip: On iPhone, open Contacts → Share → AirDrop to your computer or save as .vcf to upload here.
              </p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".vcf,.csv,text/vcard,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {step === "review" && (
          <>
            <div className="flex items-center justify-between gap-2 pb-2 border-b">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedCount === contacts.length}
                  onCheckedChange={(v) => toggleAll(!!v)}
                />
                <span className="text-xs font-medium">Select all</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep("choose")} className="h-8 gap-1 text-xs">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            </div>

            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-1 py-2">
                {contacts.map((c, idx) => (
                  <label
                    key={idx}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/40 cursor-pointer"
                  >
                    <Checkbox
                      checked={c.selected}
                      onCheckedChange={() => toggleContact(idx)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.full_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {c.phone || c.email || "No contact info"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => handleClose(false)} className="flex-1 h-12">
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={selectedCount === 0} className="flex-1 h-12 gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Import {selectedCount}
              </Button>
            </div>
          </>
        )}

        {step === "importing" && (
          <div className="py-8 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Importing contacts...</p>
              <p className="text-sm text-muted-foreground mt-1">
                {importProgress.done} of {importProgress.total}
              </p>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full transition-all"
                style={{ width: `${(importProgress.done / Math.max(importProgress.total, 1)) * 100}%` }}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

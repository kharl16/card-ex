import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageIcon, Search, Upload } from "lucide-react";
import { toast } from "sonner";

type MatchRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  company: string | null;
  cover_url: string | null;
};

export default function BulkCoverReplaceTool() {
  const [company, setCompany] = useState("");
  const [companies, setCompanies] = useState<{ name: string; count: number }[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [bannerUrl, setBannerUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [matches, setMatches] = useState<MatchRow[] | null>(null);
  const [resultLog, setResultLog] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const trimmedCompany = company.trim();

  useEffect(() => {
    (async () => {
      setLoadingCompanies(true);
      try {
        const { data, error } = await supabase
          .from("cards")
          .select("company")
          .not("company", "is", null)
          .limit(10000);
        if (error) throw error;
        const counts = new Map<string, number>();
        for (const row of (data as { company: string | null }[]) || []) {
          const name = (row.company || "").trim();
          if (!name) continue;
          counts.set(name, (counts.get(name) || 0) + 1);
        }
        const list = Array.from(counts.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCompanies(list);
      } catch (e: any) {
        toast.error(e.message || "Failed to load companies");
      } finally {
        setLoadingCompanies(false);
      }
    })();
  }, []);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/bulk-banners/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("media")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
      setBannerUrl(urlData.publicUrl);
      toast.success("Banner uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function runPreview() {
    if (!trimmedCompany) {
      toast.error("Enter a company name");
      return;
    }
    setPreviewing(true);
    setResultLog(null);
    try {
      const { data, error } = await supabase
        .from("cards")
        .select("id, full_name, email, company, cover_url")
        .ilike("company", trimmedCompany)
        .order("full_name", { ascending: true })
        .limit(1000);
      if (error) throw error;
      setMatches((data as MatchRow[]) || []);
      toast.success(`Found ${data?.length ?? 0} matching cards`);
    } catch (e: any) {
      toast.error(e.message || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  async function applyReplace() {
    if (!trimmedCompany) return toast.error("Enter a company name");
    if (!bannerUrl) return toast.error("Provide a banner image URL or upload one");
    if (!matches || matches.length === 0) {
      return toast.error("Run preview first to confirm matches");
    }
    if (!confirm(`Replace cover photo on ${matches.length} cards matching "${trimmedCompany}"?`)) return;

    setApplying(true);
    setResultLog(null);
    const logs: string[] = [];
    try {
      const { data, error } = await supabase
        .from("cards")
        .update({ cover_url: bannerUrl })
        .ilike("company", trimmedCompany)
        .select("id");
      if (error) throw error;
      logs.push(`✓ Updated ${data?.length ?? 0} cards`);
      logs.push(`Banner: ${bannerUrl}`);
      setResultLog(logs.join("\n"));
      toast.success(`Updated ${data?.length ?? 0} cards`);
      // Refresh preview to reflect new state
      await runPreview();
    } catch (e: any) {
      logs.push(`❌ ${e.message}`);
      setResultLog(logs.join("\n"));
      toast.error(e.message || "Update failed");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Bulk Cover Photo Replace
        </CardTitle>
        <CardDescription>
          Replace the cover photo on every card whose company name matches. Run a dry-run preview first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bulk-company">Company name</Label>
            <Select value={company} onValueChange={(v) => { setCompany(v); setMatches(null); }}>
              <SelectTrigger id="bulk-company">
                <SelectValue placeholder={loadingCompanies ? "Loading companies..." : "Select a company"} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {companies.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name} ({c.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-banner-url">Banner image URL</Label>
            <Input
              id="bulk-banner-url"
              placeholder="https://..."
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Upload banner"}
          </Button>
          {bannerUrl && (
            <a href={bannerUrl} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline">
              Open banner
            </a>
          )}
        </div>

        {bannerUrl && (
          <div className="overflow-hidden rounded-lg border">
            <img src={bannerUrl} alt="Banner preview" className="max-h-48 w-full object-cover" />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={runPreview} disabled={previewing || !trimmedCompany} variant="secondary">
            <Search className="mr-2 h-4 w-4" />
            {previewing ? "Searching..." : "Preview matches (dry run)"}
          </Button>
          <Button
            onClick={applyReplace}
            disabled={applying || !bannerUrl || !matches || matches.length === 0}
          >
            {applying ? "Replacing..." : `Replace ${matches?.length ?? 0} covers`}
          </Button>
        </div>

        {matches && (
          <div className="rounded-lg border">
            <div className="border-b bg-muted/30 px-3 py-2 text-sm font-medium">
              {matches.length} card{matches.length === 1 ? "" : "s"} match "{trimmedCompany}"
            </div>
            <div className="max-h-72 overflow-auto">
              {matches.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">No matches.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/20 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Current cover</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m) => (
                      <tr key={m.id} className="border-t">
                        <td className="px-3 py-2">{m.full_name || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{m.email || "—"}</td>
                        <td className="px-3 py-2">
                          {m.cover_url ? (
                            <a href={m.cover_url} target="_blank" rel="noreferrer" className="text-primary underline">
                              view
                            </a>
                          ) : (
                            <span className="text-muted-foreground">none</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {resultLog && (
          <div className={`rounded-lg p-4 ${resultLog.includes("❌") ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-600"}`}>
            <pre className="whitespace-pre-wrap text-sm">{resultLog}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

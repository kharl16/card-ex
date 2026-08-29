import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, Loader2, RefreshCw, Search, ShieldCheck, UserPlus, Users, Wand2 } from "lucide-react";
import { SEO } from "@/components/SEO";

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  card_ex_id: string | null;
  role: string;
  is_permanent_super_admin: boolean;
  status: string;
  provider: string;
  email_verified: boolean;
  phone: string | null;
  phone_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  referral_code: string | null;
  sponsor: string | null;
  published_cards: number;
  subscription_status: string;
  must_change_password: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  inactive: "bg-muted text-muted-foreground border-border",
  suspended: "bg-destructive/15 text-destructive border-destructive/30",
  pending_verification: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const ROLES = ["super_admin", "admin", "moderator", "member"];
const STATUSES = ["active", "inactive", "suspended", "pending_verification"];

const LOGIN_URL = "https://tagex.app/auth";

/** Edge functions return their reason in the response body on non-2xx. */
async function readFnError(error: unknown) {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = await ctx.json();
      if (body?.error) return String(body.error);
    } catch {
      /* fall through */
    }
  }
  return (error as { message?: string })?.message || "Request failed";
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/** Clipboard copy with a legacy fallback so it works inside mobile webviews. */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

interface CreatedCredential {
  email: string;
  full_name?: string;
  password?: string;
  status?: string;
  reason?: string;
}

function credentialsBlock(rows: CreatedCredential[]) {
  return rows
    .map((r) =>
      [
        `Name: ${r.full_name ?? "—"}`,
        `Login: ${r.email}`,
        `Password: ${r.password ?? "—"}`,
        `Sign in: ${LOGIN_URL}`,
      ].join("\n"),
    )
    .join("\n\n");
}

/** Parses "first,last,email,mobile,sponsor,role" rows (header row optional). */
function parseBulkRows(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^first[_ ]?name\s*,/i.test(l))
    .map((line) => {
      const [first_name = "", last_name = "", email = "", mobile_number = "", sponsor_code = "", role = "member"] =
        line.split(",").map((c) => c.trim());
      return {
        first_name,
        last_name,
        email,
        mobile_number,
        sponsor_code,
        role: ROLES.includes(role) ? role : "member",
        send_invitation: false,
      };
    });
}

export default function AdminUsers() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResults, setBulkResults] = useState<CreatedCredential[] | null>(null);
  const [credentials, setCredentials] = useState<CreatedCredential[] | null>(null);

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", mobile_number: "",
    sponsor_code: "", role: "member", password: generatePassword(), send_invitation: false,
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      toast.error("Super Admin access required.");
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, isSuperAdmin, navigate]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-list-users");
      if (error) throw error;
      setUsers((data?.records ?? []) as UserRecord[]);
    } catch (e: any) {
      toast.error(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  const runAction = async (payload: Record<string, unknown>, successMsg: string) => {
    setBusyId(payload.user_id as string);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.action_link) {
        await navigator.clipboard.writeText(data.action_link).catch(() => {});
        toast.success("Impersonation link copied to clipboard.");
      } else {
        toast.success(successMsg);
      }
      await loadUsers();
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async () => {
    if (!form.email || !form.first_name || !form.password) {
      toast.error("First name, email and temporary password are required.");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { ...form, full_name: `${form.first_name} ${form.last_name}`.trim() },
      });
      if (error) throw new Error(await readFnError(error));
      if (data?.error) throw new Error(data.error);
      toast.success(`Account created for ${form.email}`);
      setCredentials([
        {
          email: data?.user?.email ?? form.email,
          full_name: data?.user?.full_name ?? `${form.first_name} ${form.last_name}`.trim(),
          password: data?.user?.temporary_password ?? form.password,
        },
      ]);
      if (data?.invitation_link) {
        await copyText(data.invitation_link);
        toast.info("Invitation link copied to clipboard.");
      }
      setCreateOpen(false);
      setForm({
        first_name: "", last_name: "", email: "", mobile_number: "",
        sponsor_code: "", role: "member", password: generatePassword(), send_invitation: false,
      });
      await loadUsers();
    } catch (e: any) {
      toast.error(e.message || "Failed to create account");
    } finally {
      setCreating(false);
    }
  };

  const handleBulkCreate = async () => {
    const rows = parseBulkRows(bulkText);
    if (rows.length === 0) {
      toast.error("Add at least one row.");
      return;
    }
    setBulkBusy(true);
    setBulkResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { users: rows },
      });
      if (error) throw new Error(await readFnError(error));
      if (data?.error) throw new Error(data.error);
      const results = (data?.results ?? []) as CreatedCredential[];
      setBulkResults(results);
      const s = data?.summary ?? {};
      toast.success(`${s.created ?? 0} created · ${s.skipped ?? 0} skipped · ${s.failed ?? 0} failed`);
      await loadUsers();
    } catch (e: any) {
      toast.error(e.message || "Bulk creation failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleResetPassword = async (u: UserRecord) => {
    setBusyId(u.id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        body: { action: "reset_password", user_id: u.id },
      });
      if (error) throw new Error(await readFnError(error));
      if (data?.error) throw new Error(data.error);
      setCredentials([{ email: u.email, full_name: u.full_name, password: data?.temporary_password }]);
      toast.success("Temporary password set. No email was sent.");
      await loadUsers();
    } catch (e: any) {
      toast.error(e.message || "Reset failed");
    } finally {
      setBusyId(null);
    }
  };


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!q) return true;
      return [u.email, u.full_name, u.card_ex_id, u.referral_code, u.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [users, query, roleFilter, statusFilter]);

  if (authLoading || !isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 pb-24">
      <SEO title="User Management — Card-Ex Admin" description="Manage Card-Ex accounts, roles and access." path="/admin/users" noIndex />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShieldCheck className="h-6 w-6 text-primary" />
            User Management
          </h1>
          <p className="text-sm text-muted-foreground">{users.length} accounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-11 gap-2" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" className="h-11 gap-2" onClick={() => { setBulkResults(null); setBulkOpen(true); }}>
            <Users className="h-4 w-4" />
            Bulk Create
          </Button>
          <Button className="h-11 gap-2" onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Create Account
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, ID..."
            className="h-11 pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-11"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <Card key={u.id} className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{u.full_name || "Unnamed user"}</CardTitle>
                    <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className={STATUS_STYLES[u.status] ?? ""}>{u.status.replace("_", " ")}</Badge>
                    <Badge variant="secondary">{u.role.replace("_", " ")}</Badge>
                    {u.is_permanent_super_admin && <Badge className="bg-primary/20 text-primary">Permanent</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                  <span>ID: {u.card_ex_id ?? "—"}</span>
                  <span>Provider: {u.provider}</span>
                  <span>Verified: {u.email_verified ? "Yes" : "No"}</span>
                  <span>Cards: {u.published_cards}</span>
                  <span>Sponsor: {u.sponsor ?? "—"}</span>
                  <span>Plan: {u.subscription_status}</span>
                  <span>Joined: {new Date(u.created_at).toLocaleDateString()}</span>
                  <span>Last login: {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "—"}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={u.role}
                    onValueChange={(role) => runAction({ action: "set_role", user_id: u.id, role }, "Role updated")}
                    disabled={busyId === u.id || u.is_permanent_super_admin}
                  >
                    <SelectTrigger className="h-11 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select
                    value={u.status}
                    onValueChange={(status) => runAction({ action: "set_status", user_id: u.id, status }, "Status updated")}
                    disabled={busyId === u.id || u.is_permanent_super_admin}
                  >
                    <SelectTrigger className="h-11 w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    className="h-11"
                    disabled={busyId === u.id}
                    onClick={() => runAction({ action: "reset_password", user_id: u.id }, "Password reset email sent")}
                  >
                    Reset password
                  </Button>

                  <Button
                    variant="outline"
                    className="h-11"
                    disabled={busyId === u.id}
                    onClick={() => runAction({ action: "impersonate", user_id: u.id }, "Impersonation link ready")}
                  >
                    Login as user
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="py-16 text-center text-muted-foreground">No accounts match your filters.</p>
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Account</DialogTitle>
            <DialogDescription>
              The account is verified immediately and the user must set their own password on first login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input className="h-11" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Last name</Label>
                <Input className="h-11" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input className="h-11" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Mobile number</Label>
                <Input className="h-11" value={form.mobile_number} onChange={(e) => setForm({ ...form, mobile_number: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Sponsor / referral code</Label>
                <Input className="h-11" value={form.sponsor_code} onChange={(e) => setForm({ ...form, sponsor_code: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Temporary password</Label>
                <Input className="h-11" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 characters" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <div>
                <p className="text-sm font-medium">Send invitation link</p>
                <p className="text-xs text-muted-foreground">Copies a one-time sign-in link to your clipboard.</p>
              </div>
              <Switch checked={form.send_invitation} onCheckedChange={(v) => setForm({ ...form, send_invitation: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="h-11" onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

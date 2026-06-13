import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Building2, Plus, Pencil, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ActiveCompanyProvider, useActiveCompany, Company } from "@/contexts/ActiveCompanyContext";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function CompaniesPageInner() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { companies, activeCompanyId, setActiveCompanyId, refetch, loading } = useActiveCompany();
  const [editing, setEditing] = useState<Company | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", logo_url: "", brand_color: "#D4AF37", is_active: true });
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadCounts = async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        companies.map(async (c) => {
          const { count } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("company_id", c.id);
          counts[c.id] = count ?? 0;
        })
      );
      setUserCounts(counts);
    };
    if (companies.length) loadCounts();
  }, [companies]);

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", slug: "", logo_url: "", brand_color: "#D4AF37", is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (c: Company) => {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      logo_url: c.logo_url ?? "",
      brand_color: c.brand_color ?? "#D4AF37",
      is_active: c.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name.trim(),
      slug: (form.slug.trim() || slugify(form.name)).toLowerCase(),
      logo_url: form.logo_url.trim() || null,
      brand_color: form.brand_color.trim() || null,
      is_active: form.is_active,
    };
    const op = editing
      ? supabase.from("companies").update(payload).eq("id", editing.id)
      : supabase.from("companies").insert(payload);
    const { error } = await op;
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Company updated" : "Company created" });
    setDialogOpen(false);
    refetch();
  };

  const handleDelete = async (c: Company) => {
    if (c.is_default) {
      toast({ title: "Cannot delete the default company", variant: "destructive" });
      return;
    }
    if (!confirm(`Delete "${c.name}"? All associated content will be removed.`)) return;
    const { error } = await supabase.from("companies").delete().eq("id", c.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Company deleted" });
    refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/superadmin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Companies
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage tenants. Each company owns its own videos, tools, files, and content.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add company
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-4">
        {loading ? (
          <Skeleton className="h-40" />
        ) : (
          companies.map((c) => (
            <Card key={c.id} className={activeCompanyId === c.id ? "border-primary" : ""}>
              <CardContent className="p-4 flex items-center gap-4">
                <div
                  className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: c.brand_color ?? "#D4AF37" }}
                >
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.name} className="h-12 w-12 object-cover rounded-lg" />
                  ) : (
                    c.name.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{c.name}</h3>
                    {c.is_default && <Badge variant="secondary">Default</Badge>}
                    {!c.is_active && <Badge variant="outline">Inactive</Badge>}
                    {activeCompanyId === c.id && (
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        <Check className="h-3 w-3 mr-1" /> Editing
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    /{c.slug} · {userCounts[c.id] ?? 0} users
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {activeCompanyId !== c.id && (
                    <Button variant="outline" size="sm" onClick={() => setActiveCompanyId(c.id)}>
                      Edit content
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!c.is_default && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDelete(c)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit company" : "New company"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))}
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="acme-corp"
              />
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input
                value={form.logo_url}
                onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Brand color</Label>
              <Input
                type="color"
                value={form.brand_color}
                onChange={(e) => setForm((f) => ({ ...f, brand_color: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CompaniesPage() {
  return (
    <ActiveCompanyProvider>
      <CompaniesPageInner />
    </ActiveCompanyProvider>
  );
}

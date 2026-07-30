import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { DashboardDock } from "@/components/dashboard/DashboardDock";

export default function DashboardProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [form, setForm] = useState({ full_name: "", phone: "", facebook_url: "" });

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return setLoading(false);
      setEmail(user.email ?? "");
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) {
        setForm({
          full_name: (data as any).full_name ?? "",
          phone: (data as any).phone ?? "",
          facebook_url: (data as any).facebook_url ?? "",
        });
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return setSaving(false);
    const { error } = await supabase.from("profiles").update(form as any).eq("id", user.id);
    setSaving(false);
    if (error) toast.error("Could not save your profile");
    else toast.success("Profile updated");
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden max-w-[100vw] pb-24 sm:pb-8">
      <header className="sticky top-0 z-40 border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center gap-2 px-4">
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => navigate("/dashboard")} aria-label="Back to dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <User className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold tracking-tight">Profile</h1>
        </div>
      </header>

      <DashboardDock />

      <main className="container mx-auto max-w-xl space-y-5 px-4 py-5">
        <div className="space-y-4 rounded-3xl border border-border/40 bg-card/40 p-4 backdrop-blur-xl">
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-base">Full name</Label>
            <Input
              id="full_name"
              className="h-12 text-base"
              value={form.full_name}
              disabled={loading}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base">Email</Label>
            <Input id="email" className="h-12 text-base" value={email} readOnly disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-base">Phone</Label>
            <Input
              id="phone"
              className="h-12 text-base"
              value={form.phone}
              disabled={loading}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebook_url" className="text-base">Facebook link</Label>
            <Input
              id="facebook_url"
              className="h-12 text-base"
              placeholder="https://facebook.com/yourname"
              value={form.facebook_url}
              disabled={loading}
              onChange={(e) => setForm({ ...form, facebook_url: e.target.value })}
            />
          </div>

          <Button className="h-12 w-full text-base" onClick={handleSave} disabled={saving || loading}>
            <Save className="mr-2 h-5 w-5" />
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}

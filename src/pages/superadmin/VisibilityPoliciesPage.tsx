import { useState, useEffect, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Shield, AlertTriangle, Save, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ResourcesProvider, useResources } from "@/contexts/ResourcesContext";
import { useAuth } from "@/contexts/AuthContext";
import type { VisibilityLevel } from "@/types/resources";

interface VisibilityDefaults {
  files: VisibilityLevel;
  ambassadors: VisibilityLevel;
  links: VisibilityLevel;
  directory: VisibilityLevel;
  ways: VisibilityLevel;
}

interface SystemSettings {
  lockdown_mode: boolean;
  visibility_defaults: VisibilityDefaults;
}

const visibilityOptions: { value: VisibilityLevel; label: string }[] = [
  { value: "public_members", label: "All Members" },
  { value: "leaders_only", label: "Leaders Only" },
  { value: "admins_only", label: "Admins Only" },
  { value: "super_admin_only", label: "Super Admin Only" },
];

const moduleLabels: Record<keyof VisibilityDefaults, string> = {
  files: "Files Repository",
  ambassadors: "Ambassadors Library",
  links: "Quick Links",
  directory: "Directory",
  ways: "13 Ways",
};

function VisibilityPoliciesPageContent() {
  const { user } = useAuth();
  const { isResourceSuperAdmin, loading: roleLoading } = useResources();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lockdownMode, setLockdownMode] = useState(false);
  const [visibilityDefaults, setVisibilityDefaults] = useState<VisibilityDefaults>({
    files: "public_members",
    ambassadors: "public_members",
    links: "public_members",
    directory: "public_members",
    ways: "public_members",
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .in("key", ["lockdown_mode", "visibility_defaults"]);

      if (error) throw error;

      if (data) {
        const lockdown = data.find((d) => d.key === "lockdown_mode");
        const defaults = data.find((d) => d.key === "visibility_defaults");

        if (lockdown?.value && typeof lockdown.value === 'object' && !Array.isArray(lockdown.value)) {
          setLockdownMode((lockdown.value as Record<string, unknown>).enabled === true);
        }
        if (defaults?.value && typeof defaults.value === 'object' && !Array.isArray(defaults.value)) {
          const defaultsValue = defaults.value as Record<string, unknown>;
          setVisibilityDefaults((prev) => ({
            files: (defaultsValue.files as VisibilityLevel) || prev.files,
            ambassadors: (defaultsValue.ambassadors as VisibilityLevel) || prev.ambassadors,
            links: (defaultsValue.links as VisibilityLevel) || prev.links,
            directory: (defaultsValue.directory as VisibilityLevel) || prev.directory,
            ways: (defaultsValue.ways as VisibilityLevel) || prev.ways,
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isResourceSuperAdmin) {
      fetchSettings();
    }
  }, [isResourceSuperAdmin, fetchSettings]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Save lockdown mode - use 'as any' to bypass strict type checking
      const { error: lockdownError } = await (supabase.from("system_settings") as any).upsert(
        {
          key: "lockdown_mode",
          value: { enabled: lockdownMode },
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
      if (lockdownError) throw lockdownError;

      // Save visibility defaults
      const { error: defaultsError } = await (supabase.from("system_settings") as any).upsert(
        {
          key: "visibility_defaults",
          value: visibilityDefaults,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
      if (defaultsError) throw defaultsError;

      // Log the action
      await (supabase.from("superadmin_audit_log") as any).insert({
        actor_user_id: user.id,
        action: "update_visibility_policies",
        details: {
          lockdown_mode: lockdownMode,
          visibility_defaults: visibilityDefaults,
        },
      });

      toast.success("Settings saved successfully");
    } catch (err) {
      console.error("Error saving settings:", err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const toggleLockdown = () => {
    setLockdownMode(!lockdownMode);
  };

  const updateDefault = (module: keyof VisibilityDefaults, value: VisibilityLevel) => {
    setVisibilityDefaults((prev) => ({ ...prev, [module]: value }));
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!isResourceSuperAdmin) {
    return <Navigate to="/resources" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/superadmin">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Visibility Policies</h1>
                <p className="text-sm text-muted-foreground">Configure global visibility defaults and overrides</p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Lockdown Mode */}
        <Card className={lockdownMode ? "border-destructive bg-destructive/5" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {lockdownMode ? (
                  <Lock className="h-6 w-6 text-destructive" />
                ) : (
                  <Unlock className="h-6 w-6 text-muted-foreground" />
                )}
                <div>
                  <CardTitle>Lockdown Mode</CardTitle>
                  <CardDescription>
                    Emergency override that restricts visibility to role-specific levels only
                  </CardDescription>
                </div>
              </div>
              <Switch checked={lockdownMode} onCheckedChange={toggleLockdown} />
            </div>
          </CardHeader>
          {lockdownMode && (
            <CardContent>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Lockdown Active</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Members can only see <strong>public_members</strong> content</li>
                    <li>Leaders can only see <strong>leaders_only</strong> content</li>
                    <li>Admins can only see <strong>admins_only</strong> content</li>
                    <li>Super Admins are unaffected</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
        </Card>

        {/* Visibility Defaults */}
        <Card>
          <CardHeader>
            <CardTitle>Default Visibility per Module</CardTitle>
            <CardDescription>
              Set the default visibility level for new resources in each module
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(Object.keys(moduleLabels) as Array<keyof VisibilityDefaults>).map((module) => (
              <div key={module} className="flex items-center justify-between">
                <div>
                  <Label className="text-base">{moduleLabels[module]}</Label>
                  <p className="text-sm text-muted-foreground">
                    Default visibility for new {module}
                  </p>
                </div>
                <Select
                  value={visibilityDefaults[module]}
                  onValueChange={(v) => updateDefault(module, v as VisibilityLevel)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {visibilityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              How Visibility Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold">Visibility Levels</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li><strong>public_members:</strong> All authenticated users</li>
                  <li><strong>leaders_only:</strong> Leaders, Admins, Super Admins</li>
                  <li><strong>admins_only:</strong> Admins, Super Admins</li>
                  <li><strong>super_admin_only:</strong> Super Admins only</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Site Restrictions</h4>
                <p className="text-sm text-muted-foreground">
                  Resources can also be restricted to specific sites. Users must be assigned to matching sites to view site-restricted content. Admins and Super Admins bypass site restrictions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function VisibilityPoliciesPage() {
  return (
    <ResourcesProvider>
      <VisibilityPoliciesPageContent />
    </ResourcesProvider>
  );
}

import { useState, useEffect, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Search, Shield, UserCog, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ResourcesProvider, useResources } from "@/contexts/ResourcesContext";
import { useAuth } from "@/contexts/AuthContext";
import type { ResourceRole, Site } from "@/types/resources";

interface UserWithRole {
  id: string;
  email?: string;
  full_name?: string;
  role: ResourceRole;
  assigned_sites: string[];
}

interface AuditLog {
  id: string;
  actor_user_id: string;
  action: string;
  target_user_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const roleOptions: { value: ResourceRole; label: string; color: string }[] = [
  { value: "member", label: "Member", color: "bg-gray-500" },
  { value: "leader", label: "Leader", color: "bg-blue-500" },
  { value: "admin", label: "Admin", color: "bg-amber-500" },
  { value: "super_admin", label: "Super Admin", color: "bg-red-500" },
];

function UserRolesPageContent() {
  const { user } = useAuth();
  const { isResourceSuperAdmin, loading: roleLoading } = useResources();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<ResourceRole>("member");
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");

      if (profilesError) throw profilesError;

      // Fetch all resource_user_roles
      const { data: roles, error: rolesError } = await supabase
        .from("resource_user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Fetch sites
      const { data: sitesData, error: sitesError } = await supabase
        .from("sites")
        .select("*")
        .eq("is_active", true);

      if (sitesError) throw sitesError;

      // Merge data
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const roleData = (roles || []).find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          full_name: profile.full_name || "Unknown",
          role: (roleData?.role as ResourceRole) || "member",
          assigned_sites: roleData?.assigned_sites || [],
        };
      });

      setUsers(usersWithRoles);
      setSites((sitesData as Site[]) || []);

      // Fetch audit logs
      const { data: logs, error: logsError } = await supabase
        .from("superadmin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!logsError) {
        setAuditLogs((logs as AuditLog[]) || []);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isResourceSuperAdmin) {
      fetchData();
    }
  }, [isResourceSuperAdmin, fetchData]);

  const handleEditUser = (userToEdit: UserWithRole) => {
    setEditingUser(userToEdit);
    setSelectedRole(userToEdit.role);
    setSelectedSites(userToEdit.assigned_sites);
  };

  const handleSaveUser = async () => {
    if (!editingUser || !user) return;

    setSaving(true);
    try {
      // Upsert role
      const { error } = await supabase
        .from("resource_user_roles")
        .upsert({
          user_id: editingUser.id,
          role: selectedRole,
          assigned_sites: selectedSites,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;

      // Log the action
      await supabase.from("superadmin_audit_log").insert({
        actor_user_id: user.id,
        action: "update_role",
        target_user_id: editingUser.id,
        details: {
          old_role: editingUser.role,
          new_role: selectedRole,
          old_sites: editingUser.assigned_sites,
          new_sites: selectedSites,
        },
      });

      toast.success("User role updated");
      setEditingUser(null);
      fetchData();
    } catch (err) {
      console.error("Error saving user:", err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const toggleSite = (siteName: string) => {
    setSelectedSites((prev) =>
      prev.includes(siteName)
        ? prev.filter((s) => s !== siteName)
        : [...prev, siteName]
    );
  };

  const filteredUsers = users.filter((u) =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <h1 className="text-2xl font-bold">User Role Management</h1>
                <p className="text-sm text-muted-foreground">Manage user roles and site assignments</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowAuditLog(true)}>
              <History className="h-4 w-4 mr-2" />
              Audit Log
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {roleOptions.map((role) => (
            <Card key={role.value}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-full ${role.color}/20`}>
                  <UserCog className={`h-5 w-5 ${role.color.replace("bg-", "text-")}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {users.filter((u) => u.role === role.value).length}
                  </p>
                  <p className="text-xs text-muted-foreground">{role.label}s</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary">{filteredUsers.length} users</Badge>
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned Sites</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => {
                  const roleConfig = roleOptions.find((r) => r.value === u.role);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell>
                        <Badge className={`${roleConfig?.color} text-white`}>
                          {roleConfig?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.assigned_sites.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.assigned_sites.slice(0, 3).map((site) => (
                              <Badge key={site} variant="outline" className="text-xs">
                                {site}
                              </Badge>
                            ))}
                            {u.assigned_sites.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{u.assigned_sites.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">All sites</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleEditUser(u)}>
                          <UserCog className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-6">
              <div>
                <p className="font-semibold">{editingUser.full_name}</p>
                <p className="text-sm text-muted-foreground">ID: {editingUser.id}</p>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as ResourceRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assigned Sites (leave empty for all)</Label>
                <ScrollArea className="h-[200px] border rounded-md p-3">
                  <div className="space-y-2">
                    {sites.map((site) => (
                      <div key={site.id} className="flex items-center gap-2">
                        <Checkbox
                          id={site.id}
                          checked={selectedSites.includes(site.sites)}
                          onCheckedChange={() => toggleSite(site.sites)}
                        />
                        <label htmlFor={site.id} className="text-sm cursor-pointer">
                          {site.sites}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Log Dialog */}
      <Dialog open={showAuditLog} onOpenChange={setShowAuditLog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No audit logs yet</p>
              ) : (
                auditLogs.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{log.action}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {JSON.stringify(log.details)}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function UserRolesPage() {
  return (
    <ResourcesProvider>
      <UserRolesPageContent />
    </ResourcesProvider>
  );
}

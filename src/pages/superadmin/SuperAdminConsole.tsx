import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Users, Shield, Settings, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResourcesProvider, useResources } from "@/contexts/ResourcesContext";

function SuperAdminConsoleContent() {
  const { isResourceSuperAdmin, loading } = useResources();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isResourceSuperAdmin) {
    return <Navigate to="/resources" replace />;
  }

  const consoleLinks = [
    {
      title: "User Role Management",
      description: "Manage user roles, promote/demote users, and assign sites",
      icon: <Users className="h-8 w-8" />,
      href: "/superadmin/users",
      color: "bg-blue-500/10 text-blue-500",
    },
    {
      title: "Visibility Policies",
      description: "Configure global visibility defaults and emergency overrides",
      icon: <Shield className="h-8 w-8" />,
      href: "/superadmin/visibility",
      color: "bg-amber-500/10 text-amber-500",
    },
    {
      title: "Admin Center",
      description: "Access resource management and CSV imports",
      icon: <Settings className="h-8 w-8" />,
      href: "/admin/resources",
      color: "bg-green-500/10 text-green-500",
    },
    {
      title: "Activity Logs",
      description: "View audit logs and system activity",
      icon: <Activity className="h-8 w-8" />,
      href: "/superadmin/users",
      color: "bg-purple-500/10 text-purple-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/resources">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Super Admin Console</h1>
              <p className="text-sm text-muted-foreground">System-wide controls and management</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-8">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-primary/20">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Welcome, Super Admin</h2>
                <p className="text-muted-foreground">
                  You have full access to all system controls and can manage user roles, visibility policies, and more.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Console Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {consoleLinks.map((link) => (
            <Link key={link.href} to={link.href}>
              <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                <CardHeader>
                  <div className={`p-3 rounded-lg w-fit ${link.color}`}>
                    {link.icon}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="mb-2">{link.title}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function SuperAdminConsole() {
  return (
    <ResourcesProvider>
      <SuperAdminConsoleContent />
    </ResourcesProvider>
  );
}

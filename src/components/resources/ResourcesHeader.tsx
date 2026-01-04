import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Heart, Clock, FolderOpen, Settings, Shield, ArrowLeft } from "lucide-react";
import { useResources } from "@/contexts/ResourcesContext";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
import SignOutButton from "@/components/auth/SignOutButton";

interface ResourcesHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  title?: string;
  showBackButton?: boolean;
}

export function ResourcesHeader({
  searchTerm,
  onSearchChange,
  title = "Resources Hub",
  showBackButton = false,
}: ResourcesHeaderProps) {
  const { isResourceAdmin, isResourceSuperAdmin } = useResources();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        {/* Top bar */}
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            {showBackButton ? (
              <Button variant="ghost" size="icon" asChild>
                <Link to="/resources">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <Link to="/dashboard" className="flex items-center gap-2">
                <img src={CardExLogo} alt="Card-Ex" className="h-8 w-8" />
                <span className="font-bold text-xl hidden sm:inline">Card-Ex</span>
              </Link>
            )}
            <h1 className="text-xl font-bold">{title}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden md:block w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/resources/favorites">
                  <Heart className="h-4 w-4 mr-2" />
                  <span className="hidden lg:inline">Favorites</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/resources/recent">
                  <Clock className="h-4 w-4 mr-2" />
                  <span className="hidden lg:inline">Recent</span>
                </Link>
              </Button>

              {isResourceAdmin && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/resources">
                    <Settings className="h-4 w-4 mr-2" />
                    <span className="hidden lg:inline">Admin</span>
                  </Link>
                </Button>
              )}

              {isResourceSuperAdmin && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/superadmin">
                    <Shield className="h-4 w-4 mr-2" />
                    <span className="hidden lg:inline">Super Admin</span>
                  </Link>
                </Button>
              )}

              <SignOutButton />
            </nav>
          </div>
        </div>

        {/* Mobile search */}
        <div className="pb-4 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

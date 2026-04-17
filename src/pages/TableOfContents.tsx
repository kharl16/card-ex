import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  LayoutDashboard,
  CreditCard,
  Users,
  UserPlus,
  CalendarDays,
  Gift,
  MapPin,
  BarChart3,
  BookOpen,
  Wrench,
  Shield,
  Settings,
  Sparkles,
  FileText,
  Link as LinkIcon,
  Building2,
  Image as ImageIcon,
  Brain,
  Crown,
  Globe,
  Receipt,
  KeyRound,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TocEntry = {
  label: string;
  description: string;
  path: string;
  badge?: string;
};

type TocSection = {
  title: string;
  icon: typeof LayoutDashboard;
  color: string;
  entries: TocEntry[];
};

const SECTIONS: TocSection[] = [
  {
    title: "Dashboard & Home",
    icon: LayoutDashboard,
    color: "text-emerald-500",
    entries: [
      { label: "Landing Page", description: "Public homepage", path: "/" },
      { label: "Dashboard", description: "Main hub with cards, stats, quick actions", path: "/dashboard" },
    ],
  },
  {
    title: "Digital Cards",
    icon: CreditCard,
    color: "text-violet-500",
    entries: [
      { label: "My Cards (Dashboard)", description: "View and manage your cards", path: "/dashboard" },
      { label: "Card Gallery", description: "Browse card templates and previews", path: "/gallery" },
    ],
  },
  {
    title: "Prospects & Leads (CRM)",
    icon: UserPlus,
    color: "text-blue-500",
    entries: [
      { label: "Prospect List", description: "Mini CRM — track and nurture prospects", path: "/prospects" },
      { label: "Lead Inbox", description: "Aggregated engagement leads from cards", path: "/dashboard/leads" },
    ],
  },
  {
    title: "Appointments",
    icon: CalendarDays,
    color: "text-pink-500",
    entries: [
      { label: "Appointments Manager", description: "View and manage card bookings", path: "/dashboard/appointments" },
    ],
  },
  {
    title: "Referrals",
    icon: Gift,
    color: "text-amber-500",
    entries: [
      { label: "Referral Program", description: "Your referral code, earnings, and history", path: "/dashboard/referrals" },
    ],
  },
  {
    title: "Networking",
    icon: MapPin,
    color: "text-rose-500",
    entries: [
      { label: "Distributor Locator", description: "Public map of distributors", path: "/locator" },
    ],
  },
  {
    title: "Analytics",
    icon: BarChart3,
    color: "text-cyan-500",
    entries: [
      { label: "Card Analytics", description: "Views, scans, downloads (per card — open from Dashboard)", path: "/dashboard" },
    ],
  },
  {
    title: "Resources Hub",
    icon: BookOpen,
    color: "text-indigo-500",
    entries: [
      { label: "Resources Hub", description: "All learning materials in one place", path: "/resources" },
      { label: "Files", description: "Downloadable documents and assets", path: "/resources/files" },
      { label: "Ambassadors", description: "Endorsement videos and clips", path: "/resources/ambassadors" },
      { label: "Links", description: "Curated links library", path: "/resources/links" },
      { label: "Directory", description: "Branch and partner directory", path: "/resources/directory" },
      { label: "13 Ways", description: "13 Ways resource collection", path: "/resources/13-ways" },
      { label: "Favorites", description: "Your saved resources", path: "/resources/favorites" },
      { label: "Recent", description: "Recently viewed resources", path: "/resources/recent" },
    ],
  },
  {
    title: "Tools",
    icon: Wrench,
    color: "text-orange-500",
    entries: [
      { label: "Tools Orb", description: "Floating drawer of tools, links, presentations, DISC test", path: "/tools" },
    ],
  },
  {
    title: "Account & Billing",
    icon: Receipt,
    color: "text-teal-500",
    entries: [
      { label: "Sign In", description: "Login to your account", path: "/auth" },
      { label: "Sign Up", description: "Create a new account", path: "/signup" },
      { label: "Reset Password", description: "Recover your account", path: "/auth/reset-password" },
    ],
  },
  {
    title: "Admin",
    icon: Shield,
    color: "text-red-500",
    entries: [
      { label: "Admin Cards", description: "Manage all user cards", path: "/admin/cards", badge: "Admin" },
      { label: "Global Product Photos", description: "Shared product image library", path: "/admin/global-products", badge: "Admin" },
      { label: "AI Training", description: "Manage global AI Q&A knowledge", path: "/admin/ai-training", badge: "Admin" },
      { label: "Resources Admin", description: "Manage resources, files, links", path: "/admin/resources", badge: "Admin" },
      { label: "Design Patcher", description: "Bulk-apply design changes across cards", path: "/admin/design-patcher", badge: "Admin" },
      { label: "Referrals Admin", description: "Oversee referrals across the platform", path: "/admin/referrals", badge: "Admin" },
      { label: "Data Tools", description: "Admin data utilities", path: "/admin/data-tools", badge: "Admin" },
    ],
  },
  {
    title: "Super Admin",
    icon: Crown,
    color: "text-yellow-500",
    entries: [
      { label: "Super Admin Console", description: "Top-level system controls", path: "/superadmin", badge: "Super" },
      { label: "User Roles", description: "Assign user roles and permissions", path: "/superadmin/users", badge: "Super" },
      { label: "Visibility Policies", description: "Control resource visibility", path: "/superadmin/visibility", badge: "Super" },
    ],
  },
];

export default function TableOfContents() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return SECTIONS;
    const q = query.toLowerCase();
    return SECTIONS.map((s) => ({
      ...s,
      entries: s.entries.filter(
        (e) =>
          e.label.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q),
      ),
    })).filter((s) => s.entries.length > 0);
  }, [query]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold tracking-tight">Table of Contents</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            A complete map of every feature in Card-Ex. Tap any item to jump there.
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search features…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-6">
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No matches for "{query}".
            </Card>
          )}

          {filtered.map((section) => {
            const Icon = section.icon;
            return (
              <section key={section.title} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${section.color}`} />
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground/80">
                    {section.title}
                  </h2>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {section.entries.map((entry) => (
                    <button
                      key={entry.path + entry.label}
                      onClick={() => navigate(entry.path)}
                      className="group flex items-center gap-3 rounded-xl border border-border/40 bg-card/60 p-3 text-left transition-all hover:border-border hover:bg-accent/40 hover:shadow-sm active:scale-[0.99]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {entry.label}
                          </span>
                          {entry.badge && (
                            <Badge variant="secondary" className="text-[10px]">
                              {entry.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {entry.description}
                        </p>
                        <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground/60">
                          {entry.path}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}

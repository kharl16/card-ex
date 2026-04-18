import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  LayoutDashboard,
  CreditCard,
  UserPlus,
  CalendarDays,
  Gift,
  MapPin,
  BarChart3,
  BookOpen,
  Wrench,
  Shield,
  Crown,
  Receipt,
  ArrowUpRight,
  Sparkles,
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
  tagline: string;
  icon: typeof LayoutDashboard;
  /** tailwind gradient classes from-... via-... to-... */
  gradient: string;
  /** size on desktop bento: 'sm' (1col), 'md' (2col), 'lg' (2col x 2row) */
  size: "sm" | "md" | "lg";
  entries: TocEntry[];
};

const SECTIONS: TocSection[] = [
  {
    title: "Dashboard & Home",
    tagline: "Your command center",
    icon: LayoutDashboard,
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    size: "md",
    entries: [
      { label: "Landing Page", description: "Public homepage", path: "/" },
      { label: "Dashboard", description: "Cards, stats, quick actions", path: "/dashboard" },
    ],
  },
  {
    title: "Digital Cards",
    tagline: "Your business identity",
    icon: CreditCard,
    gradient: "from-violet-500/25 via-fuchsia-500/10 to-transparent",
    size: "lg",
    entries: [
      { label: "My Cards", description: "View and manage your cards", path: "/dashboard" },
      { label: "Card Gallery", description: "Browse templates and previews", path: "/gallery" },
    ],
  },
  {
    title: "Prospects & Leads",
    tagline: "Mini CRM",
    icon: UserPlus,
    gradient: "from-blue-500/20 via-cyan-500/5 to-transparent",
    size: "md",
    entries: [
      { label: "Prospect List", description: "Track and nurture prospects", path: "/prospects" },
      { label: "Lead Inbox", description: "Aggregated engagement leads", path: "/dashboard/leads" },
    ],
  },
  {
    title: "Appointments",
    tagline: "Bookings made simple",
    icon: CalendarDays,
    gradient: "from-pink-500/20 via-rose-500/5 to-transparent",
    size: "sm",
    entries: [
      { label: "Appointments", description: "Manage card bookings", path: "/dashboard/appointments" },
    ],
  },
  {
    title: "Referrals",
    tagline: "Earn while you share",
    icon: Gift,
    gradient: "from-amber-500/25 via-orange-500/5 to-transparent",
    size: "sm",
    entries: [
      { label: "Referral Program", description: "Code, earnings, history", path: "/dashboard/referrals" },
    ],
  },
  {
    title: "Networking",
    tagline: "Find your people",
    icon: MapPin,
    gradient: "from-rose-500/20 via-red-500/5 to-transparent",
    size: "sm",
    entries: [
      { label: "Distributor Locator", description: "Public map of distributors", path: "/locator" },
    ],
  },
  {
    title: "Analytics",
    tagline: "Measure what matters",
    icon: BarChart3,
    gradient: "from-cyan-500/20 via-sky-500/5 to-transparent",
    size: "sm",
    entries: [
      { label: "Card Analytics", description: "Views, scans, downloads", path: "/dashboard" },
    ],
  },
  {
    title: "Resources Hub",
    tagline: "Learn and grow",
    icon: BookOpen,
    gradient: "from-indigo-500/25 via-purple-500/10 to-transparent",
    size: "lg",
    entries: [
      { label: "Resources Hub", description: "All learning materials", path: "/resources" },
      { label: "Files", description: "Documents and assets", path: "/resources/files" },
      { label: "Ambassadors", description: "Endorsement videos", path: "/resources/ambassadors" },
      { label: "Links", description: "Curated links library", path: "/resources/links" },
      { label: "Directory", description: "Branch and partner directory", path: "/resources/directory" },
      { label: "13 Ways", description: "13 Ways collection", path: "/resources/13-ways" },
      { label: "Favorites", description: "Saved resources", path: "/resources/favorites" },
      { label: "Recent", description: "Recently viewed", path: "/resources/recent" },
    ],
  },
  {
    title: "Tools",
    tagline: "Power tools at hand",
    icon: Wrench,
    gradient: "from-orange-500/20 via-amber-500/5 to-transparent",
    size: "md",
    entries: [
      { label: "Tools Orb", description: "Tools, links, presentations, DISC test", path: "/tools" },
    ],
  },
  {
    title: "Account & Billing",
    tagline: "Sign in & subscription",
    icon: Receipt,
    gradient: "from-teal-500/20 via-emerald-500/5 to-transparent",
    size: "md",
    entries: [
      { label: "Sign In", description: "Login to your account", path: "/auth" },
      { label: "Sign Up", description: "Create a new account", path: "/signup" },
      { label: "Reset Password", description: "Recover your account", path: "/auth/reset-password" },
    ],
  },
  {
    title: "Admin",
    tagline: "Operate the platform",
    icon: Shield,
    gradient: "from-red-500/25 via-rose-500/10 to-transparent",
    size: "lg",
    entries: [
      { label: "Admin Cards", description: "Manage all user cards", path: "/admin/cards", badge: "Admin" },
      { label: "Global Product Photos", description: "Shared image library", path: "/admin/global-products", badge: "Admin" },
      { label: "AI Training", description: "Global AI Q&A knowledge", path: "/admin/ai-training", badge: "Admin" },
      { label: "Resources Admin", description: "Manage files & links", path: "/admin/resources", badge: "Admin" },
      { label: "Design Patcher", description: "Bulk design changes", path: "/admin/design-patcher", badge: "Admin" },
      { label: "Referrals Admin", description: "Oversee referrals", path: "/admin/referrals", badge: "Admin" },
      { label: "Data Tools", description: "Admin data utilities", path: "/admin/data-tools", badge: "Admin" },
    ],
  },
  {
    title: "Super Admin",
    tagline: "Top-level controls",
    icon: Crown,
    gradient: "from-yellow-500/25 via-amber-500/10 to-transparent",
    size: "md",
    entries: [
      { label: "Super Admin Console", description: "System controls", path: "/superadmin", badge: "Super" },
      { label: "User Roles", description: "Roles and permissions", path: "/superadmin/users", badge: "Super" },
      { label: "Visibility Policies", description: "Resource visibility", path: "/superadmin/visibility", badge: "Super" },
    ],
  },
];

const sizeToClass: Record<TocSection["size"], string> = {
  sm: "md:col-span-2",
  md: "md:col-span-3",
  lg: "md:col-span-4 md:row-span-2",
};

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

  const totalEntries = useMemo(
    () => SECTIONS.reduce((sum, s) => sum + s.entries.length, 0),
    [],
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background flourish */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[480px] overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-20 right-10 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-32 left-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/20 bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold tracking-tight">Table of Contents</h1>
        </div>
      </header>

      <main className="container relative z-10 mx-auto max-w-7xl px-4 py-8 sm:py-12">
        {/* Hero */}
        <div className="mb-8 max-w-2xl">
          <Badge variant="secondary" className="mb-3 gap-1.5 rounded-full px-3 py-1 text-[11px] uppercase tracking-widest">
            <Sparkles className="h-3 w-3" />
            Card-Ex map
          </Badge>
          <h2 className="bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
            Everything in one beautiful map.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {SECTIONS.length} sections • {totalEntries} destinations. Tap any tile to jump there.
          </p>

          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search features, pages, or routes…"
              className="h-12 rounded-xl border-border/50 bg-card/60 pl-10 text-sm shadow-sm backdrop-blur"
            />
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            No matches for "{query}".
          </Card>
        )}

        {/* Bento grid */}
        <div className="grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-6 md:gap-4">
          {filtered.map((section) => {
            const Icon = section.icon;
            return (
              <section
                key={section.title}
                className={`group relative overflow-hidden rounded-2xl border border-border/40 bg-card/70 p-4 backdrop-blur transition-all hover:border-border hover:shadow-xl sm:p-5 ${sizeToClass[section.size]}`}
              >
                {/* gradient wash */}
                <div
                  className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br opacity-80 transition-opacity group-hover:opacity-100 ${section.gradient}`}
                />
                {/* corner glyph */}
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-foreground/[0.03] blur-2xl" />

                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/40 bg-background/60 backdrop-blur">
                      <Icon className="h-4.5 w-4.5 text-foreground/80" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold tracking-tight text-foreground">
                        {section.title}
                      </h3>
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">
                        {section.tagline}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-full border-border/40 bg-background/40 text-[10px] backdrop-blur">
                    {section.entries.length}
                  </Badge>
                </div>

                <ul className="space-y-1.5">
                  {section.entries.map((entry) => (
                    <li key={entry.path + entry.label}>
                      <button
                        onClick={() => navigate(entry.path)}
                        className="group/link flex w-full items-center gap-2 rounded-lg border border-transparent bg-background/40 px-2.5 py-2 text-left transition-all hover:border-border/40 hover:bg-background/80 active:scale-[0.99]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-medium text-foreground">
                              {entry.label}
                            </span>
                            {entry.badge && (
                              <Badge variant="secondary" className="h-4 rounded-full px-1.5 text-[9px] font-semibold">
                                {entry.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {entry.description}
                          </p>
                        </div>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-all group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5 group-hover/link:text-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Search, Users, MapPin, Mail, Phone, ExternalLink } from "lucide-react";
import LoadingAnimation from "@/components/LoadingAnimation";
import { getPublicCardUrl } from "@/lib/cardUrl";

interface TeamMember {
  id: string;
  full_name: string;
  title: string | null;
  company: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  slug: string;
  custom_slug: string | null;
}

export default function TeamDirectory() {
  const { orgSlug } = useParams();
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [orgName, setOrgName] = useState("");
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [orgColor, setOrgColor] = useState("#D4AF37");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadTeam();
  }, [orgSlug]);

  const loadTeam = async () => {
    if (!orgSlug) return;

    // Load organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, logo_url, theme_color")
      .eq("slug", orgSlug)
      .single();

    if (orgError || !org) {
      setLoading(false);
      return;
    }

    setOrgName(org.name);
    setOrgLogo(org.logo_url);
    setOrgColor(org.theme_color || "#D4AF37");

    // Load members via memberships -> cards
    const { data: membershipData } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("organization_id", org.id);

    if (membershipData && membershipData.length > 0) {
      const userIds = membershipData.map((m) => m.user_id);

      const { data: cards } = await supabase
        .from("cards")
        .select("id, full_name, title, company, avatar_url, bio, location, email, phone, slug, custom_slug")
        .in("user_id", userIds)
        .eq("is_published", true)
        .eq("is_template", false);

      if (cards) {
        setMembers(cards);
      }
    }

    setLoading(false);
  };

  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.full_name.toLowerCase().includes(q) ||
      (m.title || "").toLowerCase().includes(q) ||
      (m.company || "").toLowerCase().includes(q) ||
      (m.location || "").toLowerCase().includes(q)
    );
  });

  if (loading) return <LoadingAnimation />;

  if (!orgName) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold">404</h1>
          <p className="text-muted-foreground">Team not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${orgColor}, ${orgColor}88)` }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-16">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-6 gap-2 text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-4">
            {orgLogo && (
              <img
                src={orgLogo}
                alt={orgName}
                className="h-16 w-16 rounded-xl object-cover border-2 border-white/30"
              />
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{orgName}</h1>
              <p className="text-white/70 flex items-center gap-2 mt-1">
                <Users className="h-4 w-4" />
                {members.length} team member{members.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Search & Grid */}
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredMembers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">
              {search ? "No members match your search" : "No published team members yet"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => (
              <Link
                key={member.id}
                to={getPublicCardUrl(member.custom_slug || member.slug, !!member.custom_slug)}
                className="group"
              >
                <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div
                        className="h-14 w-14 rounded-full flex-shrink-0 bg-muted flex items-center justify-center overflow-hidden border-2 transition-colors"
                        style={{ borderColor: orgColor }}
                      >
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.full_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-muted-foreground">
                            {member.full_name.charAt(0)}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {member.full_name}
                        </h3>
                        {member.title && (
                          <p className="text-sm text-muted-foreground truncate">{member.title}</p>
                        )}
                        {member.company && (
                          <p className="text-xs text-muted-foreground/70 truncate">{member.company}</p>
                        )}
                      </div>

                      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                    </div>

                    {/* Details */}
                    <div className="mt-3 space-y-1">
                      {member.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {member.location}
                        </p>
                      )}
                      {member.email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          {member.email}
                        </p>
                      )}
                      {member.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          {member.phone}
                        </p>
                      )}
                    </div>

                    {member.bio && (
                      <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{member.bio}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

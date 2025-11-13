import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Phone, MapPin, Globe, Download, Facebook, Linkedin, Instagram, Twitter, Github, MessageCircle, Music, Youtube } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { downloadVCard } from "@/utils/vcard";
import { toast } from "sonner";
import LoadingAnimation from "@/components/LoadingAnimation";

type CardData = Tables<"cards">;

interface SocialLink {
  id: string;
  kind: string;
  label: string;
  value: string;
  icon: string;
}

const iconMap: Record<string, any> = {
  Facebook: Facebook,
  Linkedin: Linkedin,
  Instagram: Instagram,
  Twitter: Twitter,
  Youtube: Youtube,
  Github: Github,
  MessageCircle: MessageCircle,
  Music: Music,
};

const socialBrandColors: Record<string, string> = {
  facebook: "bg-[#1877F2]",
  linkedin: "bg-[#0A66C2]",
  instagram: "bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#FD1D1D]",
  x: "bg-black",
  youtube: "bg-[#FF0000]",
  telegram: "bg-[#26A5E4]",
  tiktok: "bg-black",
};

const contactBrandColors: Record<string, string> = {
  email: "bg-[#EA4335]",
  phone: "bg-[#34A853]",
  website: "bg-[#4285F4]",
  location: "bg-[#FBBC04]",
};

export default function PublicCard() {
  const { slug } = useParams();
  const [card, setCard] = useState<CardData | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCard();
  }, [slug]);

  const loadCard = async () => {
    if (!slug) return;

    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (!error && data) {
      setCard(data);
      // Track view through Edge Function (with rate limiting)
      supabase.functions.invoke('track-card-event', {
        body: { card_id: data.id, kind: 'view' }
      }).catch(err => console.error('Failed to track view:', err));
      
      // Load social links
      const { data: links } = await supabase
        .from("card_links")
        .select("*")
        .eq("card_id", data.id)
        .in("kind", ["facebook", "linkedin", "instagram", "x", "youtube", "telegram", "tiktok"])
        .order("sort_index");
      
      if (links) {
        setSocialLinks(links.map(link => ({
          id: link.id,
          kind: link.kind,
          label: link.label,
          value: link.value,
          icon: link.icon || "",
        })));
      }
    }
    setLoading(false);
  };

  if (loading) {
    return <LoadingAnimation />;
  }

  if (!card) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold">404</h1>
          <p className="text-muted-foreground">Card not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-md">
        <Card className="overflow-hidden border-border/50 shadow-lg">
          {/* Header with cover image */}
          <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 bg-gradient-to-br from-primary/20 to-primary/5 overflow-visible">
            {card.cover_url && (
              <>
                <img src={card.cover_url} alt="Cover" className="h-full w-full object-contain" />
                {/* Subtle bottom gradient overlay for contrast without blurring the image */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent"></div>
              </>
            )}
            
            {/* Avatar - Bottom Left - Responsive sizing */}
            <div className="absolute -bottom-12 sm:-bottom-14 md:-bottom-16 lg:-bottom-16 left-4 sm:left-5 md:left-6 h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 rounded-full border-4 border-background bg-muted overflow-hidden shadow-2xl ring-4 ring-black/10 hover:scale-105 transition-transform duration-300">
              {card.avatar_url && (
                <img src={card.avatar_url} alt={card.full_name} className="h-full w-full object-cover" />
              )}
            </div>
            
            {/* Logo - Bottom Right - Responsive sizing */}
            {card.logo_url && (
              <div className="absolute -bottom-9 sm:-bottom-10 md:-bottom-12 lg:-bottom-12 right-4 sm:right-5 md:right-6 h-[72px] w-[72px] sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-lg bg-black/90 p-2 sm:p-2.5 md:p-3 shadow-2xl ring-4 ring-black/10 hover:scale-105 transition-transform duration-300">
                <img src={card.logo_url} alt="Logo" className="h-full w-full object-contain" />
              </div>
            )}
          </div>
          
          {/* Spacer for overlapping elements - Responsive */}
          <div className="h-12 sm:h-14 md:h-16 lg:h-16"></div>

          {/* Profile Info */}
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold">{card.full_name}</h1>
            {card.title && <p className="text-lg text-foreground/80 mt-1">{card.title}</p>}
            {card.company && <p className="text-sm text-muted-foreground">{card.company}</p>}
            {card.bio && <p className="mt-3 text-sm text-muted-foreground">{card.bio}</p>}
          </div>

          {/* Social Media Links */}
          {socialLinks.length > 0 && (
            <div className="flex flex-wrap gap-3 justify-center px-6 pb-4">
              {socialLinks.map((link) => {
                const IconComponent = iconMap[link.icon] || Globe;
                const brandColor = socialBrandColors[link.kind] || "bg-primary";
                return (
                  <a
                    key={link.id}
                    href={link.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${brandColor} hover:scale-110 hover:opacity-90 transition-all duration-200 cursor-pointer shadow-md`}
                    title={link.label}
                  >
                    <IconComponent className="h-6 w-6 text-white" />
                  </a>
                );
              })}
            </div>
          )}

          {/* Contact Buttons */}
          <div className="space-y-3 px-6 pb-6">
            {card.email && (
              <button
                onClick={() => window.open(`mailto:${card.email}`)}
                className="flex w-full items-center gap-3 text-left group"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${contactBrandColors.email} group-hover:scale-110 transition-transform duration-200 shadow-md`}>
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{card.email}</p>
                  <p className="text-xs text-muted-foreground">Personal</p>
                </div>
              </button>
            )}

            {card.phone && (
              <button
                onClick={() => window.open(`tel:${card.phone}`)}
                className="flex w-full items-center gap-3 text-left group"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${contactBrandColors.phone} group-hover:scale-110 transition-transform duration-200 shadow-md`}>
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{card.phone}</p>
                  <p className="text-xs text-muted-foreground">Mobile</p>
                </div>
              </button>
            )}

            {card.website && (
              <button
                onClick={() => window.open(card.website!, "_blank")}
                className="flex w-full items-center gap-3 text-left group"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${contactBrandColors.website} group-hover:scale-110 transition-transform duration-200 shadow-md`}>
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{card.website}</p>
                  <p className="text-xs text-muted-foreground">Website</p>
                </div>
              </button>
            )}

            {card.location && (
              <div className="flex w-full items-center gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${contactBrandColors.location} shadow-md`}>
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{card.location}</p>
                  <p className="text-xs text-muted-foreground">Location</p>
                </div>
              </div>
            )}
          </div>

          {/* QR Code */}
          {card.qr_code_url && (
            <div className="flex flex-col items-center gap-3 p-6 bg-muted/30">
              <img 
                src={card.qr_code_url} 
                alt="QR Code" 
                className="w-48 h-48 rounded-lg border border-border"
              />
              <a 
                href={card.qr_code_url} 
                download={`${card.slug}-qr.png`}
                className="text-sm text-primary hover:underline flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download QR Code
              </a>
            </div>
          )}
        </Card>

        {/* Save Contact Button */}
        <div className="mt-6">
          <Button 
            className="w-full gap-2 bg-green-500 hover:bg-green-600"
            onClick={() => {
              downloadVCard(card);
              toast.success("Contact saved! Check your downloads.");
            }}
          >
            <Download className="h-4 w-4" />
            Save Contact
          </Button>
        </div>
      </div>
    </div>
  );
}

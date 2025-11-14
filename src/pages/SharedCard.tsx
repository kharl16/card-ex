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

interface ShareLinkData {
  card_id: string;
  is_active: boolean;
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

export default function SharedCard() {
  const { code } = useParams();
  const [card, setCard] = useState<CardData | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSharedCard();
  }, [code]);

  const loadSharedCard = async () => {
    if (!code) return;

    // Get share link
    const { data: shareLink, error: shareLinkError } = await supabase
      .from("share_links" as any)
      .select("card_id, is_active")
      .eq("code", code)
      .single() as { data: ShareLinkData | null; error: any };

    if (shareLinkError || !shareLink || !shareLink.is_active) {
      setLoading(false);
      return;
    }

    // Get card data
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("id", shareLink.card_id)
      .eq("is_published", true)
      .single();

    if (!error && data) {
      setCard(data);
      
      // Track view with share code
      supabase.functions.invoke('track-card-event', {
        body: { 
          card_id: data.id, 
          kind: 'view',
          share_code: code 
        }
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
          <p className="text-muted-foreground">Share link not found or inactive</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl">
        <Card className="overflow-hidden border-0 rounded-none shadow-lg">
          {/* Header with cover image */}
          <div className="relative h-48 sm:h-56 md:h-64 bg-gradient-to-br from-primary/20 to-primary/5">
            {card.cover_url && (
              <>
                <img src={card.cover_url} alt="Cover" className="h-full w-full object-contain" />
                {/* Subtle bottom gradient overlay for contrast */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/50 to-transparent" />
              </>
            )}
            
            {/* Avatar - Bottom Left - Half overlapping the cover */}
            <div className="absolute -bottom-12 left-6 h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 rounded-full border-4 border-background bg-muted overflow-hidden shadow-2xl ring-4 ring-black/10 hover:scale-105 transition-transform duration-300">
              {card.avatar_url && (
                <img src={card.avatar_url} alt={card.full_name} className="h-full w-full object-cover" />
              )}
            </div>
            
            {/* Logo - Bottom Right - Half overlapping the cover */}
            {card.logo_url && (
              <div className="absolute -bottom-10 right-6 h-20 w-32 sm:h-24 sm:w-36 md:h-28 md:w-40 rounded-lg bg-black/90 p-1.5 shadow-2xl ring-4 ring-black/10 hover:scale-105 transition-transform duration-300">
                <img src={card.logo_url} alt="Logo" className="h-full w-full object-contain" />
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="px-6 pt-16 pb-4">
            <h1 className="text-2xl font-bold">{card.full_name}</h1>
            {card.title && <p className="text-lg text-foreground/80 mt-1">{card.title}</p>}
            {card.company && <p className="text-sm text-muted-foreground">{card.company}</p>}
          </div>

          {/* Bio */}
          {card.bio && (
            <div className="px-6 py-3">
              <p className="text-sm leading-relaxed text-foreground/90">{card.bio}</p>
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-2 px-6 py-4">
            {card.email && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => window.location.href = `mailto:${card.email}`}
              >
                <Mail className="h-4 w-4" />
                <span className="truncate">{card.email}</span>
              </Button>
            )}
            {card.phone && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => window.location.href = `tel:${card.phone}`}
              >
                <Phone className="h-4 w-4" />
                {card.phone}
              </Button>
            )}
            {card.website && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => window.open(card.website, '_blank')}
              >
                <Globe className="h-4 w-4" />
                <span className="truncate">{card.website}</span>
              </Button>
            )}
            {card.location && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
              >
                <MapPin className="h-4 w-4" />
                <span className="truncate">{card.location}</span>
              </Button>
            )}
          </div>

          {/* Social Links */}
          {socialLinks.length > 0 && (
            <div className="px-6 py-4">
              <h3 className="mb-3 text-sm font-semibold">Connect</h3>
              <div className="grid grid-cols-2 gap-2">
                {socialLinks.map((link) => {
                  const IconComponent = iconMap[link.icon] || MessageCircle;
                  const brandColor = socialBrandColors[link.kind.toLowerCase()] || "bg-primary";
                  
                  return (
                    <Button
                      key={link.id}
                      variant="outline"
                      className="justify-start gap-3"
                      onClick={() => window.open(link.value, '_blank')}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${brandColor}`}>
                        <IconComponent className="h-4 w-4 text-white" />
                      </div>
                      <span className="truncate text-sm">{link.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

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

          {/* Actions */}
          <div className="px-6 py-4">
            <Button
              className="w-full gap-2"
              onClick={() => downloadVCard(card)}
            >
              <Download className="h-4 w-4" />
              Save Contact
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

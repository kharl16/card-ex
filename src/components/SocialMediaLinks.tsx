import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Facebook, Linkedin, Instagram, Twitter, Github } from "lucide-react";
import { z } from "zod";

interface SocialLink {
  id: string;
  kind: string;
  label: string;
  value: string;
  icon: string;
}

interface SocialMediaLinksProps {
  cardId: string;
}

const socialPlatforms = [
  { value: "facebook", label: "Facebook", icon: "Facebook" },
  { value: "linkedin", label: "LinkedIn", icon: "Linkedin" },
  { value: "instagram", label: "Instagram", icon: "Instagram" },
  { value: "x", label: "Twitter/X", icon: "Twitter" },
  { value: "youtube", label: "YouTube", icon: "Youtube" },
  { value: "telegram", label: "Telegram", icon: "MessageCircle" },
  { value: "tiktok", label: "TikTok", icon: "Music" },
];

const linkSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(100, "Label must be 100 characters or less"),
  value: z.string().trim().min(1, "Value is required").max(500, "Value must be 500 characters or less")
    .refine((val) => val.startsWith("http://") || val.startsWith("https://"), {
      message: "URL must start with http:// or https://"
    }),
});

export default function SocialMediaLinks({ cardId }: SocialMediaLinksProps) {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [newLink, setNewLink] = useState({ platform: "", url: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLinks();
  }, [cardId]);

  const loadLinks = async () => {
    const { data, error } = await supabase
      .from("card_links")
      .select("*")
      .eq("card_id", cardId)
      .in("kind", ["facebook", "linkedin", "instagram", "x", "youtube", "telegram", "tiktok"])
      .order("sort_index");

    if (!error && data) {
      setLinks(data.map(link => ({
        id: link.id,
        kind: link.kind,
        label: link.label,
        value: link.value,
        icon: link.icon || "",
      })));
    }
  };

  const addLink = async () => {
    if (!newLink.platform || !newLink.url) {
      toast.error("Please select a platform and enter a URL");
      return;
    }

    const platform = socialPlatforms.find(p => p.value === newLink.platform);
    if (!platform) return;

    try {
      linkSchema.parse({ label: platform.label, value: newLink.url });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);
    const { error } = await supabase
      .from("card_links")
      .insert({
        card_id: cardId,
        kind: platform.value as any,
        label: platform.label,
        value: newLink.url,
        icon: platform.icon,
        sort_index: links.length,
      });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Social link added");
      setNewLink({ platform: "", url: "" });
      await loadLinks();
    }
    setLoading(false);
  };

  const deleteLink = async (id: string) => {
    const { error } = await supabase
      .from("card_links")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Link deleted");
      await loadLinks();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Media Links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {links.map((link) => (
            <div key={link.id} className="flex items-center gap-2 p-3 border border-border rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-sm">{link.label}</p>
                <p className="text-xs text-muted-foreground truncate">{link.value}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteLink(link.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-3 pt-4 border-t border-border">
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select
              value={newLink.platform}
              onValueChange={(value) => setNewLink({ ...newLink, platform: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {socialPlatforms.map((platform) => (
                  <SelectItem key={platform.value} value={platform.value}>
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>URL</Label>
            <Input
              placeholder="https://"
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
            />
          </div>
          <Button onClick={addLink} disabled={loading} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Add Social Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

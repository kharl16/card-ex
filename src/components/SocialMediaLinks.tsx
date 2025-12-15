import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Globe, Pencil, Check, X } from "lucide-react";
import { z } from "zod";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface SocialLink {
  id: string;
  kind: string;
  label: string;
  value: string;
  icon: string;
}

interface SocialMediaLinksProps {
  cardId: string;
  onLinksChange?: (links: SocialLink[]) => void;
}

const socialPlatforms = [
  { value: "facebook", label: "Facebook", icon: "Facebook" },
  { value: "linkedin", label: "LinkedIn", icon: "Linkedin" },
  { value: "instagram", label: "Instagram", icon: "Instagram" },
  { value: "x", label: "Twitter/X", icon: "Twitter" },
  { value: "youtube", label: "YouTube", icon: "Youtube" },
  { value: "telegram", label: "Telegram", icon: "MessageCircle" },
  { value: "tiktok", label: "TikTok", icon: "Music" },
  { value: "url", label: "Website", icon: "Globe" },
];

const linkSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(100, "Label must be 100 characters or less"),
  value: z.string().trim().min(1, "Value is required").max(500, "Value must be 500 characters or less")
    .refine((val) => val.startsWith("http://") || val.startsWith("https://"), {
      message: "URL must start with http:// or https://"
    }),
});

interface SortableLinkProps {
  link: SocialLink;
  onDelete: (id: string) => void;
  onEdit: (id: string, label: string, value: string) => void;
  isEditing: boolean;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
}

function SortableLink({ link, onDelete, onEdit, isEditing, onStartEdit, onCancelEdit }: SortableLinkProps) {
  const [editLabel, setEditLabel] = useState(link.label);
  const [editValue, setEditValue] = useState(link.value);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    if (!editValue.trim()) {
      toast.error("URL is required");
      return;
    }
    if (!editValue.startsWith("http://") && !editValue.startsWith("https://")) {
      toast.error("URL must start with http:// or https://");
      return;
    }
    onEdit(link.id, editLabel.trim() || link.label, editValue.trim());
  };

  const handleCancel = () => {
    setEditLabel(link.label);
    setEditValue(link.value);
    onCancelEdit();
  };

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="p-3 border border-primary rounded-lg bg-card space-y-2"
      >
        <div className="space-y-1">
          <Label className="text-xs">Label</Label>
          <Input
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            placeholder="Label"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">URL</Label>
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="https://"
            className="h-8 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Check className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 border border-border rounded-lg bg-card"
    >
      <button
        className="cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{link.label}</p>
        <p className="text-xs text-muted-foreground truncate">{link.value}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onStartEdit(link.id)}
        className="text-muted-foreground hover:text-foreground"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(link.id)}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function SocialMediaLinks({ cardId, onLinksChange }: SocialMediaLinksProps) {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [newLink, setNewLink] = useState({ platform: "", url: "" });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Helper to update links and notify parent
  const updateLinksState = (newLinks: SocialLink[]) => {
    setLinks(newLinks);
    onLinksChange?.(newLinks);
  };

  useEffect(() => {
    loadLinks();
  }, [cardId]);

  // Load social links from the card's social_links JSON field
  const loadLinks = async () => {
    const { data: card, error } = await supabase
      .from("cards")
      .select("social_links")
      .eq("id", cardId)
      .single();

    if (!error && card?.social_links) {
      const socialLinksData = card.social_links as unknown as SocialLink[];
      // Ensure each link has an id
      const linksWithIds = (Array.isArray(socialLinksData) ? socialLinksData : []).map((link, index) => ({
        ...link,
        id: link.id || `link-${index}-${Date.now()}`,
      }));
      updateLinksState(linksWithIds);
    } else {
      // Fallback: try to load from card_links table for backward compatibility
      const { data: legacyLinks } = await supabase
        .from("card_links")
        .select("*")
        .eq("card_id", cardId)
        .in("kind", ["facebook", "linkedin", "instagram", "x", "youtube", "telegram", "tiktok", "url"])
        .order("sort_index");

      if (legacyLinks && legacyLinks.length > 0) {
        const mappedLinks = legacyLinks.map(link => ({
          id: link.id,
          kind: link.kind,
          label: link.label,
          value: link.value,
          icon: link.icon || "",
        }));
        updateLinksState(mappedLinks);
        // Migrate to JSON field
        await saveSocialLinksToCard(mappedLinks);
      }
    }
  };

  // Save social links to the card's social_links JSON field
  const saveSocialLinksToCard = async (linksToSave: SocialLink[]) => {
    // Cast to any to bypass strict Json typing - data is valid JSON
    const { error } = await supabase
      .from("cards")
      .update({ social_links: JSON.parse(JSON.stringify(linksToSave)) })
      .eq("id", cardId);

    if (error) {
      console.error("Error saving social links:", error);
      return false;
    }
    return true;
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
    
    const newLinkData: SocialLink = {
      id: `link-${Date.now()}`,
      kind: platform.value,
      label: platform.label,
      value: newLink.url,
      icon: platform.icon,
    };

    const updatedLinks = [...links, newLinkData];
    
    const success = await saveSocialLinksToCard(updatedLinks);
    
    if (success) {
      updateLinksState(updatedLinks);
      toast.success("Social link added");
      setNewLink({ platform: "", url: "" });
    } else {
      toast.error("Failed to add social link");
    }
    
    setLoading(false);
  };

  const deleteLink = async (id: string) => {
    const updatedLinks = links.filter(link => link.id !== id);
    
    const success = await saveSocialLinksToCard(updatedLinks);
    
    if (success) {
      updateLinksState(updatedLinks);
      toast.success("Link deleted");
    } else {
      toast.error("Failed to delete link");
    }
  };

  const editLink = async (id: string, label: string, value: string) => {
    const updatedLinks = links.map(link => 
      link.id === id ? { ...link, label, value } : link
    );
    
    const success = await saveSocialLinksToCard(updatedLinks);
    
    if (success) {
      updateLinksState(updatedLinks);
      setEditingId(null);
      toast.success("Link updated");
    } else {
      toast.error("Failed to update link");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = links.findIndex((link) => link.id === active.id);
    const newIndex = links.findIndex((link) => link.id === over.id);

    const newLinks = arrayMove(links, oldIndex, newIndex);
    updateLinksState(newLinks);

    // Save reordered links to database
    const success = await saveSocialLinksToCard(newLinks);
    
    if (success) {
      toast.success("Links reordered");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Media Links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-4">
            <SortableContext
              items={links.map((link) => link.id)}
              strategy={verticalListSortingStrategy}
            >
              {links.map((link) => (
                <SortableLink
                  key={link.id}
                  link={link}
                  onDelete={deleteLink}
                  onEdit={editLink}
                  isEditing={editingId === link.id}
                  onStartEdit={setEditingId}
                  onCancelEdit={() => setEditingId(null)}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>

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
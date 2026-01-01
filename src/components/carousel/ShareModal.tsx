import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  Facebook,
  Send,
  Mail,
  ExternalLink,
} from "lucide-react";

// Social share URL generators
function getMessengerShareUrl(url: string): string {
  // Messenger web share (no app_id needed for basic link sharing)
  return `https://www.facebook.com/dialog/share?display=popup&href=${encodeURIComponent(url)}`;
}

function getFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

function getWhatsAppShareUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
}

function getTelegramShareUrl(text: string, url: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

function getXShareUrl(text: string, url: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

function getViberShareUrl(text: string, url: string): string {
  return `viber://forward?text=${encodeURIComponent(text + " " + url)}`;
}

function getEmailShareUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The image URL(s) to share - can be single or multiple */
  imageUrls: string[];
  /** The public card URL - NOT the editor URL */
  publicCardUrl: string;
  /** Title for share actions */
  title: string;
  /** Text for share actions */
  text?: string;
  /** Preview thumbnail URL (usually first image) */
  thumbnailUrl?: string;
}

export default function ShareModal({
  open,
  onOpenChange,
  imageUrls,
  publicCardUrl,
  title,
  text = "Check out these images!",
  thumbnailUrl,
}: ShareModalProps) {
  const primaryImageUrl = imageUrls[0] || thumbnailUrl || "";
  const isMultiple = imageUrls.length > 1;

  // For sharing, we share the card URL so recipients can view all images
  const shareUrl = publicCardUrl;
  const shareText = isMultiple
    ? `${text} (${imageUrls.length} images)`
    : text;

  const openShareUrl = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const socialButtons = [
    {
      name: "Messenger",
      icon: MessageCircle,
      color: "bg-gradient-to-r from-[#00C6FF] to-[#0078FF]",
      onClick: () => openShareUrl(getMessengerShareUrl(shareUrl)),
    },
    {
      name: "Facebook",
      icon: Facebook,
      color: "bg-[#1877F2]",
      onClick: () => openShareUrl(getFacebookShareUrl(shareUrl)),
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-[#25D366]",
      onClick: () => openShareUrl(getWhatsAppShareUrl(shareText, shareUrl)),
    },
    {
      name: "Telegram",
      icon: Send,
      color: "bg-[#26A5E4]",
      onClick: () => openShareUrl(getTelegramShareUrl(shareText, shareUrl)),
    },
    {
      name: "X",
      icon: ExternalLink,
      color: "bg-black",
      onClick: () => openShareUrl(getXShareUrl(shareText, shareUrl)),
    },
    {
      name: "Viber",
      icon: MessageCircle,
      color: "bg-[#7360F2]",
      onClick: () => openShareUrl(getViberShareUrl(shareText, shareUrl)),
    },
    {
      name: "Email",
      icon: Mail,
      color: "bg-[#EA4335]",
      onClick: () => {
        const body = `${shareText}\n\n${shareUrl}`;
        window.location.href = getEmailShareUrl(title, body);
      },
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {isMultiple ? `${imageUrls.length} Images` : "Image"}</DialogTitle>
        </DialogHeader>

        {/* Thumbnail preview */}
        {primaryImageUrl && (
          <div className="flex justify-center mb-4">
            <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted">
              <img
                src={primaryImageUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              {isMultiple && (
                <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                  +{imageUrls.length - 1} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Social share buttons */}
        <div className="grid grid-cols-4 gap-3">
          {socialButtons.map((btn) => (
            <button
              key={btn.name}
              onClick={btn.onClick}
              className={`${btn.color} flex flex-col items-center justify-center p-3 rounded-xl hover:opacity-90 transition-opacity`}
            >
              <btn.icon className="h-6 w-6 text-white" />
              <span className="text-[10px] text-white mt-1 font-medium">{btn.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

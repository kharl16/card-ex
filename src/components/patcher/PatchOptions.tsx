import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Palette, 
  QrCode, 
  Image, 
  Layout, 
  MessageSquare,
  Share2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type CardTemplate = Tables<"card_templates">;

export interface CarouselImageMode {
  apply: boolean;
  mode: "none" | "merge" | "overwrite";
}

export interface PatchOptionsState {
  // Design / Layout
  theme: boolean;
  fonts: boolean;
  buttonStyles: boolean;
  layoutConfig: boolean;
  
  // QR
  qrTheme: boolean;
  qrContainer: boolean;
  
  // Carousel Settings (per section)
  carouselProducts: {
    settings: boolean;
    images: CarouselImageMode;
  };
  carouselPackages: {
    settings: boolean;
    images: CarouselImageMode;
  };
  carouselTestimonies: {
    settings: boolean;
    images: CarouselImageMode;
  };
  
  // Social Links
  socialLinkStyling: boolean;
  socialLinksMerge: boolean;
  socialLinksOverwrite: boolean;
  
  // Section visibility
  sectionHeaders: boolean;
  sectionVisibility: boolean;
}

export const DEFAULT_PATCH_OPTIONS: PatchOptionsState = {
  theme: true,
  fonts: false,
  buttonStyles: false,
  layoutConfig: false,
  
  qrTheme: false,
  qrContainer: false,
  
  carouselProducts: {
    settings: false,
    images: { apply: false, mode: "none" },
  },
  carouselPackages: {
    settings: false,
    images: { apply: false, mode: "none" },
  },
  carouselTestimonies: {
    settings: false,
    images: { apply: false, mode: "none" },
  },
  
  socialLinkStyling: false,
  socialLinksMerge: false,
  socialLinksOverwrite: false,
  
  sectionHeaders: false,
  sectionVisibility: false,
};

interface PatchOptionsProps {
  options: PatchOptionsState;
  onChange: (options: PatchOptionsState) => void;
  template: CardTemplate | null;
}

export function PatchOptions({ options, onChange, template }: PatchOptionsProps) {
  const handleToggle = (key: keyof PatchOptionsState, value: boolean) => {
    onChange({ ...options, [key]: value });
  };
  
  const handleCarouselChange = (
    section: "carouselProducts" | "carouselPackages" | "carouselTestimonies",
    field: "settings" | "images",
    value: any
  ) => {
    if (field === "settings") {
      onChange({
        ...options,
        [section]: { ...options[section], settings: value },
      });
    } else {
      onChange({
        ...options,
        [section]: { ...options[section], images: value },
      });
    }
  };
  
  const applyAll = () => {
    onChange({
      theme: true,
      fonts: true,
      buttonStyles: true,
      layoutConfig: true,
      qrTheme: true,
      qrContainer: true,
      carouselProducts: {
        settings: true,
        images: { apply: true, mode: "merge" },
      },
      carouselPackages: {
        settings: true,
        images: { apply: true, mode: "merge" },
      },
      carouselTestimonies: {
        settings: true,
        images: { apply: true, mode: "merge" },
      },
      socialLinkStyling: true,
      socialLinksMerge: false,
      socialLinksOverwrite: false,
      sectionHeaders: true,
      sectionVisibility: true,
    });
  };
  
  const clearAll = () => {
    onChange(DEFAULT_PATCH_OPTIONS);
  };
  
  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex gap-3">
        <button
          onClick={applyAll}
          className="text-sm text-primary hover:underline"
        >
          Apply All (Safe Mode)
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          onClick={clearAll}
          className="text-sm text-muted-foreground hover:underline"
        >
          Clear All
        </button>
      </div>
      
      {/* Design / Layout */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <Label className="font-medium">Design & Layout</Label>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 pl-6">
          <CheckboxItem
            id="theme"
            label="Theme & Background"
            description="Colors, gradients, patterns"
            checked={options.theme}
            onChange={(c) => handleToggle("theme", c)}
          />
          <CheckboxItem
            id="fonts"
            label="Typography"
            description="Fonts and text styles"
            checked={options.fonts}
            onChange={(c) => handleToggle("fonts", c)}
          />
          <CheckboxItem
            id="buttonStyles"
            label="Button Styles"
            description="Colors and shapes"
            checked={options.buttonStyles}
            onChange={(c) => handleToggle("buttonStyles", c)}
          />
          <CheckboxItem
            id="layoutConfig"
            label="Layout Config"
            description="Spacing, sections, header"
            checked={options.layoutConfig}
            onChange={(c) => handleToggle("layoutConfig", c)}
          />
        </div>
      </div>
      
      <Separator />
      
      {/* QR */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-primary" />
          <Label className="font-medium">QR Code</Label>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 pl-6">
          <CheckboxItem
            id="qrTheme"
            label="QR Theme"
            description="Eyes, pattern, colors"
            checked={options.qrTheme}
            onChange={(c) => handleToggle("qrTheme", c)}
          />
          <CheckboxItem
            id="qrContainer"
            label="QR Container"
            description="Section styling"
            checked={options.qrContainer}
            onChange={(c) => handleToggle("qrContainer", c)}
          />
        </div>
      </div>
      
      <Separator />
      
      {/* Carousel Sections */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-primary" />
          <Label className="font-medium">Carousel Sections</Label>
        </div>
        
        <CarouselSectionOptions
          label="Products"
          section={options.carouselProducts}
          onChange={(v) => handleCarouselChange("carouselProducts", "settings", v)}
          onImagesChange={(v) => handleCarouselChange("carouselProducts", "images", v)}
        />
        
        <CarouselSectionOptions
          label="Packages"
          section={options.carouselPackages}
          onChange={(v) => handleCarouselChange("carouselPackages", "settings", v)}
          onImagesChange={(v) => handleCarouselChange("carouselPackages", "images", v)}
        />
        
        <CarouselSectionOptions
          label="Testimonies"
          section={options.carouselTestimonies}
          onChange={(v) => handleCarouselChange("carouselTestimonies", "settings", v)}
          onImagesChange={(v) => handleCarouselChange("carouselTestimonies", "images", v)}
        />
      </div>
      
      <Separator />
      
      {/* Social Links */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" />
          <Label className="font-medium">Social Links</Label>
        </div>
        <div className="space-y-3 pl-6">
          <CheckboxItem
            id="socialLinkStyling"
            label="Link Styling"
            description="Icon styles and layout"
            checked={options.socialLinkStyling}
            onChange={(c) => handleToggle("socialLinkStyling", c)}
          />
          <CheckboxItem
            id="socialLinksMerge"
            label="Merge Template Links"
            description="Add template links to existing"
            checked={options.socialLinksMerge}
            onChange={(c) => handleToggle("socialLinksMerge", c)}
            disabled={options.socialLinksOverwrite}
          />
          <CheckboxItem
            id="socialLinksOverwrite"
            label="Overwrite Links"
            description="Replace all existing links"
            checked={options.socialLinksOverwrite}
            onChange={(c) => handleToggle("socialLinksOverwrite", c)}
            danger
          />
        </div>
      </div>
      
      <Separator />
      
      {/* Section Visibility */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <Label className="font-medium">Section Visibility</Label>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 pl-6">
          <CheckboxItem
            id="sectionHeaders"
            label="Section Headers"
            description="Labels for Products/Packages/etc"
            checked={options.sectionHeaders}
            onChange={(c) => handleToggle("sectionHeaders", c)}
          />
          <CheckboxItem
            id="sectionVisibility"
            label="Show/Hide Rules"
            description="Section visibility settings"
            checked={options.sectionVisibility}
            onChange={(c) => handleToggle("sectionVisibility", c)}
          />
        </div>
      </div>
    </div>
  );
}

interface CheckboxItemProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  danger?: boolean;
}

function CheckboxItem({ id, label, description, checked, onChange, disabled, danger }: CheckboxItemProps) {
  return (
    <div className={`flex items-start space-x-3 p-3 rounded-lg border ${checked ? "border-primary/50 bg-primary/5" : "border-border"} ${disabled ? "opacity-50" : ""}`}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(c) => onChange(!!c)}
        disabled={disabled}
      />
      <div className="space-y-0.5">
        <Label htmlFor={id} className={`text-sm cursor-pointer flex items-center gap-2 ${danger ? "text-destructive" : ""}`}>
          {label}
          {danger && <AlertTriangle className="h-3 w-3" />}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

interface CarouselSectionOptionsProps {
  label: string;
  section: {
    settings: boolean;
    images: CarouselImageMode;
  };
  onChange: (settings: boolean) => void;
  onImagesChange: (images: CarouselImageMode) => void;
}

function CarouselSectionOptions({ label, section, onChange, onImagesChange }: CarouselSectionOptionsProps) {
  return (
    <div className="pl-6 space-y-3 p-3 rounded-lg border">
      <Label className="font-medium text-sm">{label} Carousel</Label>
      
      <div className="flex items-center space-x-3">
        <Checkbox
          id={`${label}-settings`}
          checked={section.settings}
          onCheckedChange={(c) => onChange(!!c)}
        />
        <Label htmlFor={`${label}-settings`} className="text-sm cursor-pointer">
          Apply carousel settings (direction, speed, size, CTA, etc.)
        </Label>
      </div>
      
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Images</Label>
        <RadioGroup
          value={section.images.mode}
          onValueChange={(v) => onImagesChange({ 
            apply: v !== "none", 
            mode: v as "none" | "merge" | "overwrite" 
          })}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id={`${label}-img-none`} />
            <Label htmlFor={`${label}-img-none`} className="text-sm cursor-pointer">
              Don't touch images
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="merge" id={`${label}-img-merge`} />
            <Label htmlFor={`${label}-img-merge`} className="text-sm cursor-pointer">
              Merge (add template images to existing)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="overwrite" id={`${label}-img-overwrite`} />
            <Label htmlFor={`${label}-img-overwrite`} className="text-sm cursor-pointer text-destructive flex items-center gap-1">
              Overwrite (replace all)
              <AlertTriangle className="h-3 w-3" />
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TemplateGallery } from "./TemplateGallery";
import { CardTemplate } from "@/hooks/useTemplates";
import { Layers } from "lucide-react";

interface TemplateSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: CardTemplate) => void;
  onBuildFromScratch: () => void;
}

export function TemplateSelectionModal({
  open,
  onOpenChange,
  onSelectTemplate,
  onBuildFromScratch,
}: TemplateSelectionModalProps) {
  const handleSelectTemplate = (template: CardTemplate) => {
    onSelectTemplate(template);
    onOpenChange(false);
  };

  const handleBuildFromScratch = () => {
    onBuildFromScratch();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Layers className="h-5 w-5 text-primary" />
            Choose How to Create Your Card
          </DialogTitle>
          <DialogDescription>
            Start with a template for quick setup, or build from scratch for full control.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <TemplateGallery
            onSelectTemplate={handleSelectTemplate}
            onBuildFromScratch={handleBuildFromScratch}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

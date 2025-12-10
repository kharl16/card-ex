import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
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
import { GripVertical } from "lucide-react";

export interface EditorSection {
  id: string;
  title: string;
  description?: string;
  isPremium?: boolean;
  content: React.ReactNode;
  icon?: React.ReactNode;
  progress?: number; // 0-100 completion percentage
}

interface SmartAccordionProps {
  sections: EditorSection[];
  allowMultipleOpen?: boolean;
  defaultOpenId?: string;
  enableDragDrop?: boolean;
  onReorder?: (newOrder: string[]) => void;
}

interface SortableAccordionItemProps {
  section: EditorSection;
  isOpen: boolean;
  enableDragDrop: boolean;
}

function SortableAccordionItem({ section, isOpen, enableDragDrop }: SortableAccordionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled: !enableDragDrop });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="w-full max-w-full overflow-x-hidden">
      <AccordionItem
        value={section.id}
        className={cn(
          "border border-border/60 rounded-lg mb-3 overflow-hidden transition-all duration-200 w-full",
          "bg-card/50 hover:bg-card/80",
          isOpen && "border-l-4 border-l-[#D4AF37] bg-card"
        )}
      >
        <AccordionTrigger
          className={cn(
            "px-3 sm:px-4 py-3 hover:no-underline hover:bg-muted/40 transition-colors w-full",
            "[&[data-state=open]>div]:text-foreground",
            "[&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-muted-foreground [&>svg]:shrink-0"
          )}
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-1 text-left min-w-0">
            {enableDragDrop && (
              <button
                className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 hover:bg-muted rounded shrink-0"
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            {section.icon && (
              <span className="text-muted-foreground shrink-0">{section.icon}</span>
            )}
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className={cn("font-medium text-sm sm:text-base truncate", isOpen && "text-foreground font-semibold")}>
                  {section.title}
                </span>
                {section.isPremium && (
                  <Badge
                    variant="outline"
                    className="text-[9px] sm:text-[10px] uppercase tracking-wide px-1.5 sm:px-2 py-0.5 bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/40 font-medium shrink-0"
                  >
                    Premium
                  </Badge>
                )}
                {section.progress === 100 && (
                  <span className="flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-green-500/20 text-green-500 shrink-0">
                    <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {section.description && (
                  <p className="text-xs text-muted-foreground truncate">{section.description}</p>
                )}
                {section.progress !== undefined && section.progress < 100 && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {section.progress}%
                  </span>
                )}
              </div>
              {section.progress !== undefined && (
                <Progress 
                  value={section.progress} 
                  className="h-1 mt-2 bg-muted/50"
                  style={{
                    // @ts-ignore - custom property for indicator color
                    '--progress-background': section.progress === 100 
                      ? 'rgb(34 197 94 / 0.8)' 
                      : 'hsl(var(--primary))'
                  } as React.CSSProperties}
                />
              )}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-3 sm:px-4 pb-4 pt-2 w-full max-w-full overflow-x-hidden">
          <div className="w-full max-w-full overflow-x-hidden">
            {section.content}
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}

export function SmartAccordion({
  sections,
  allowMultipleOpen = false,
  defaultOpenId,
  enableDragDrop = false,
  onReorder,
}: SmartAccordionProps) {
  const [orderedSections, setOrderedSections] = useState(sections);
  const [openItems, setOpenItems] = useState<string[]>(defaultOpenId ? [defaultOpenId] : []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update sections when props change
  if (sections !== orderedSections && !enableDragDrop) {
    setOrderedSections(sections);
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = orderedSections.findIndex((s) => s.id === active.id);
    const newIndex = orderedSections.findIndex((s) => s.id === over.id);

    const newOrder = arrayMove(orderedSections, oldIndex, newIndex);
    setOrderedSections(newOrder);
    onReorder?.(newOrder.map((s) => s.id));
  };

  const renderItems = () => {
    if (enableDragDrop) {
      return (
        <SortableContext
          items={orderedSections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {orderedSections.map((section) => (
            <SortableAccordionItem
              key={section.id}
              section={section}
              isOpen={openItems.includes(section.id)}
              enableDragDrop={enableDragDrop}
            />
          ))}
        </SortableContext>
      );
    }
    return orderedSections.map((section) => (
      <SortableAccordionItem
        key={section.id}
        section={section}
        isOpen={openItems.includes(section.id)}
        enableDragDrop={false}
      />
    ));
  };

  const accordionContent = allowMultipleOpen ? (
    <Accordion
      type="multiple"
      value={openItems}
      onValueChange={(value) => setOpenItems(value)}
      className="space-y-0"
    >
      {renderItems()}
    </Accordion>
  ) : (
    <Accordion
      type="single"
      value={openItems[0] || ""}
      onValueChange={(value) => setOpenItems(value ? [value] : [])}
      collapsible
      className="space-y-0"
    >
      {renderItems()}
    </Accordion>
  );

  if (enableDragDrop) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {accordionContent}
      </DndContext>
    );
  }

  return accordionContent;
}

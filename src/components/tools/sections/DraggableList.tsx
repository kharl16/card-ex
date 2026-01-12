import { useState } from "react";
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
import { cn } from "@/lib/utils";

interface DraggableItemProps {
  id: string | number;
  children: React.ReactNode;
  disabled?: boolean;
}

export function DraggableItem({ id, children, disabled }: DraggableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "z-50 opacity-90 shadow-lg"
      )}
    >
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "p-2 cursor-grab active:cursor-grabbing",
            "touch-none"
          )}
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      {children}
    </div>
  );
}

interface DraggableListProps<T extends { id: string | number }> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T) => React.ReactNode;
  disabled?: boolean;
}

export function DraggableList<T extends { id: string | number }>({
  items,
  onReorder,
  renderItem,
  disabled = false,
}: DraggableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems);
    }
  };

  if (disabled) {
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id}>{renderItem(item)}</div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4 pl-8">
          {items.map((item) => (
            <DraggableItem key={item.id} id={item.id} disabled={disabled}>
              {renderItem(item)}
            </DraggableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

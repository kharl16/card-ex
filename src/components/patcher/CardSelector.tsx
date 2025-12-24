import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search, Users, User } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type CardData = Tables<"cards">;

interface CardFilters {
  search: string;
  paidOnly: boolean;
  publishedOnly: boolean;
}

interface CardSelectorProps {
  cards: CardData[];
  selectedCardIds: Set<string>;
  targetMode: "selected" | "all";
  onTargetModeChange: (mode: "selected" | "all") => void;
  onCardSelect: (cardId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  filters: CardFilters;
  onFiltersChange: (filters: CardFilters) => void;
  loading?: boolean;
}

export function CardSelector({
  cards,
  selectedCardIds,
  targetMode,
  onTargetModeChange,
  onCardSelect,
  onSelectAll,
  filters,
  onFiltersChange,
  loading,
}: CardSelectorProps) {
  const allSelected = cards.length > 0 && cards.every(c => selectedCardIds.has(c.id));
  const someSelected = selectedCardIds.size > 0 && !allSelected;
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Target Mode */}
      <div className="space-y-3">
        <Label>Target Mode</Label>
        <RadioGroup 
          value={targetMode} 
          onValueChange={(v) => onTargetModeChange(v as "selected" | "all")}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="selected" id="mode-selected" />
            <Label htmlFor="mode-selected" className="flex items-center gap-2 cursor-pointer">
              <User className="h-4 w-4" />
              Selected Cards
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="mode-all" />
            <Label htmlFor="mode-all" className="flex items-center gap-2 cursor-pointer">
              <Users className="h-4 w-4" />
              All Filtered Cards
            </Label>
          </div>
        </RadioGroup>
      </div>
      
      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="Search by name, email, company..."
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-paid"
              checked={filters.paidOnly}
              onCheckedChange={(c) => onFiltersChange({ ...filters, paidOnly: !!c })}
            />
            <Label htmlFor="filter-paid" className="text-sm cursor-pointer">Paid only</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filter-published"
              checked={filters.publishedOnly}
              onCheckedChange={(c) => onFiltersChange({ ...filters, publishedOnly: !!c })}
            />
            <Label htmlFor="filter-published" className="text-sm cursor-pointer">Published only</Label>
          </div>
        </div>
      </div>
      
      {/* Card List */}
      <div className="border rounded-lg">
        <div className="flex items-center gap-3 p-3 border-b bg-muted/50">
          {targetMode === "selected" && (
            <Checkbox
              checked={allSelected}
              // @ts-ignore - indeterminate is valid
              indeterminate={someSelected}
              onCheckedChange={(c) => onSelectAll(!!c)}
            />
          )}
          <span className="text-sm font-medium">
            {cards.length} card{cards.length !== 1 ? "s" : ""} 
            {targetMode === "selected" && selectedCardIds.size > 0 && (
              <span className="text-muted-foreground"> ({selectedCardIds.size} selected)</span>
            )}
          </span>
        </div>
        
        <ScrollArea className="h-[280px]">
          {cards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No cards match your filters
            </div>
          ) : (
            <div className="divide-y">
              {cards.map(card => {
                const isSelected = selectedCardIds.has(card.id);
                
                return (
                  <div
                    key={card.id}
                    className={`
                      flex items-center gap-3 p-3 transition-colors
                      ${targetMode === "selected" ? "hover:bg-muted/50" : ""}
                      ${targetMode === "all" ? "bg-primary/5" : ""}
                    `}
                  >
                    {targetMode === "selected" && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(c) => onCardSelect(card.id, !!c)}
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{card.full_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {card.email || card.company || "No email"}
                      </div>
                    </div>
                    
                    <div className="flex gap-1.5 flex-shrink-0">
                      {card.is_paid ? (
                        <Badge variant="default" className="text-xs">Paid</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Unpaid</Badge>
                      )}
                      {card.is_published && (
                        <Badge variant="outline" className="text-xs">Published</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
      
      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        {targetMode === "all" ? (
          <span>Will patch <strong>{cards.length}</strong> cards matching filters</span>
        ) : (
          <span>Will patch <strong>{selectedCardIds.size}</strong> selected cards</span>
        )}
      </div>
    </div>
  );
}
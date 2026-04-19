import { useState } from "react";
import { RefreshCw, Wrench, Plus, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToolsHeader } from "@/components/tools/ToolsHeader";
import { ToolsFilters } from "@/components/tools/ToolsFilters";
import { ToolsList } from "@/components/tools/ToolsList";
import { ToolFormDialog } from "@/components/tools/ToolFormDialog";
import { DeleteToolDialog } from "@/components/tools/DeleteToolDialog";
import { useTools, Tool, ToolInput } from "@/hooks/useTools";
import { useAuth } from "@/contexts/AuthContext";
import DiscTestSection from "@/components/tools/sections/DiscTestSection";
import LoveLanguagesSection from "@/components/tools/sections/LoveLanguagesSection";
import MindsetQuizSection from "@/components/tools/sections/MindsetQuizSection";
import AffirmationsSection from "@/components/tools/sections/AffirmationsSection";
import BookRecommendationsSection from "@/components/tools/sections/BookRecommendationsSection";
import { Brain, Heart, GraduationCap, Sparkles, BookOpen } from "lucide-react";

export default function Tools() {
  const { tools, loading, error, categories, refetch, createTool, updateTool, deleteTool } = useTools();
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [deletingTool, setDeletingTool] = useState<Tool | null>(null);

  const handleAddTool = () => {
    setEditingTool(null);
    setFormDialogOpen(true);
  };

  const handleEditTool = (tool: Tool) => {
    setEditingTool(tool);
    setFormDialogOpen(true);
  };

  const handleDeleteTool = (tool: Tool) => {
    setDeletingTool(tool);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: ToolInput) => {
    if (editingTool) {
      await updateTool(editingTool.id, data);
    } else {
      await createTool(data);
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingTool) {
      await deleteTool(deletingTool.id);
      setDeletingTool(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ToolsHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wrench className="h-8 w-8 text-primary" />
              Tools Repository
            </h1>
            <p className="text-muted-foreground mt-1">
              Centralized tools and resources for our team.
            </p>
          </div>
          {isAdmin && (
            <Button onClick={handleAddTool} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Add Tool
            </Button>
          )}
        </div>

        {/* Featured: D.I.S.C. Personality Test */}
        <Collapsible className="mb-3">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
            <CollapsibleTrigger className="w-full group">
              <div className="flex items-center gap-3 p-3 sm:p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h2 className="text-sm sm:text-base font-bold truncate">D.I.S.C. Personality Test</h2>
                  <p className="text-xs text-muted-foreground truncate">Discover your personality type and growth areas</p>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-3 pb-3 sm:px-4 sm:pb-4 border-t border-border/50 pt-4">
                <DiscTestSection />
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Featured: 5 Love Languages Test */}
        <Collapsible className="mb-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
            <CollapsibleTrigger className="w-full group">
              <div className="flex items-center gap-3 p-3 sm:p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h2 className="text-sm sm:text-base font-bold truncate">5 Love Languages Test</h2>
                  <p className="text-xs text-muted-foreground truncate">Discover how you give and receive love best</p>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-3 pb-3 sm:px-4 sm:pb-4 border-t border-border/50 pt-4">
                <LoveLanguagesSection />
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Filters */}
        {!loading && !error && tools.length > 0 && (
          <div className="mb-6">
            <ToolsFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>
        )}

        {/* Content states */}
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : tools.length === 0 ? null : (
          <ToolsList
            tools={tools}
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
            isAdmin={isAdmin}
            onEdit={handleEditTool}
            onDelete={handleDeleteTool}
          />
        )}
      </main>

      {/* Admin Dialogs */}
      <ToolFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        tool={editingTool}
        onSubmit={handleFormSubmit}
        existingCategories={categories}
      />

      <DeleteToolDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        tool={deletingTool}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-20" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-9 w-full mt-4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive mb-4 text-center">
          Failed to load tools: {error}
        </p>
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({ isAdmin, onAddTool }: { isAdmin?: boolean; onAddTool?: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Wrench className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">No tools available yet</h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          {isAdmin ? "Get started by adding your first tool." : "Please check back later."}
        </p>
        {isAdmin && onAddTool && (
          <Button onClick={onAddTool} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Tool
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

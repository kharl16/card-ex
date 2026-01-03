import { useState } from "react";
import { RefreshCw, Wrench, Plus } from "lucide-react";
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
        ) : tools.length === 0 ? (
          <EmptyState isAdmin={isAdmin} onAddTool={handleAddTool} />
        ) : (
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

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import type { Tool } from "@/hooks/useTools";

const toolFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  category: z.string().min(1, "Category is required").max(50, "Category must be 50 characters or less"),
  tool_url: z.string().url("Must be a valid URL"),
  visibility: z.string().default("all_members"),
  is_active: z.boolean().default(true),
});

type ToolFormValues = z.infer<typeof toolFormSchema>;

interface ToolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool?: Tool | null;
  onSubmit: (data: ToolFormValues) => Promise<void>;
  existingCategories?: string[];
}

export function ToolFormDialog({
  open,
  onOpenChange,
  tool,
  onSubmit,
  existingCategories = [],
}: ToolFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!tool;

  const form = useForm<ToolFormValues>({
    resolver: zodResolver(toolFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      tool_url: "",
      visibility: "all_members",
      is_active: true,
    },
  });

  // Reset form when tool changes or dialog opens
  useEffect(() => {
    if (open) {
      if (tool) {
        form.reset({
          title: tool.title,
          description: tool.description || "",
          category: tool.category,
          tool_url: tool.tool_url,
          visibility: tool.visibility,
          is_active: tool.is_active,
        });
      } else {
        form.reset({
          title: "",
          description: "",
          category: "",
          tool_url: "",
          visibility: "all_members",
          is_active: true,
        });
      }
    }
  }, [open, tool, form]);

  const handleSubmit = async (data: ToolFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Tool" : "Add New Tool"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the tool details below." : "Fill in the details to add a new tool."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Tool name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the tool"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Onboarding, Training, Scripts"
                      list="category-suggestions"
                      {...field}
                    />
                  </FormControl>
                  {existingCategories.length > 0 && (
                    <datalist id="category-suggestions">
                      {existingCategories.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tool_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tool URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/tool" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Only active tools are visible to members
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Add Tool"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

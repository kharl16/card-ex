import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  X,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Wand2,
  FolderInput,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";
import type { ResourceFolder, VisibilityLevel } from "@/types/resources";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: ResourceFolder[];
  onSaved: () => void;
}

type RowStatus = "idle" | "uploading" | "saving" | "done" | "error";

interface Row {
  id: string;
  file: File;
  previewUrl: string;
  fileName: string;
  caption: string;
  folder: string;
  visibility: VisibilityLevel;
  status: RowStatus;
  progress: number;
  error?: string;
}

const visibilityOptions: { value: VisibilityLevel; label: string }[] = [
  { value: "public_members", label: "All Members" },
  { value: "leaders_only", label: "Leaders" },
  { value: "admins_only", label: "Admins" },
  { value: "super_admin_only", label: "Super Admin" },
];

function cleanName(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function BulkUploadDialog({ open, onOpenChange, folders, onSaved }: Props) {
  const { activeCompanyId } = useActiveCompany();
  const [rows, setRows] = useState<Row[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [bulkFolder, setBulkFolder] = useState<string>("");
  const [bulkVisibility, setBulkVisibility] = useState<VisibilityLevel>("public_members");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files);
    const newRows: Row[] = incoming.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f,
      previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : "",
      fileName: cleanName(f.name),
      caption: "",
      folder: bulkFolder,
      visibility: bulkVisibility,
      status: "idle",
      progress: 0,
    }));
    setRows((prev) => [...prev, ...newRows]);
  }, [bulkFolder, bulkVisibility]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) =>
    setRows((p) => p.filter((r) => r.id !== id));

  const applyFolderToAll = () => {
    if (!bulkFolder) return;
    setRows((p) => p.map((r) => (r.status === "done" ? r : { ...r, folder: bulkFolder })));
    toast.success(`Applied "${bulkFolder}" to all`);
  };

  const applyVisibilityToAll = () => {
    setRows((p) => p.map((r) => (r.status === "done" ? r : { ...r, visibility: bulkVisibility })));
    toast.success("Visibility applied to all");
  };

  const captionFromFilenames = () => {
    setRows((p) =>
      p.map((r) => (r.status === "done" || r.caption ? r : { ...r, caption: r.fileName }))
    );
    toast.success("Captions filled from filenames");
  };

  const uploadOne = async (row: Row): Promise<void> => {
    updateRow(row.id, { status: "uploading", progress: 10, error: undefined });
    try {
      const ext = row.file.name.split(".").pop() || "bin";
      const path = `files/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("resources")
        .upload(path, row.file, { contentType: row.file.type || undefined });
      if (upErr) throw upErr;

      updateRow(row.id, { progress: 70, status: "saving" });
      const { data: pub } = supabase.storage.from("resources").getPublicUrl(path);

      const insertPayload: Record<string, unknown> = {
        file_name: row.fileName || row.file.name,
        caption: row.caption || null,
        description: row.caption || null,
        images: pub.publicUrl,
        folder_name: row.folder || null,
        visibility_level: row.visibility,
        is_active: true,
      };
      if (activeCompanyId) insertPayload.company_id = activeCompanyId;

      const { error: dbErr } = await supabase.from("files_repository").insert(insertPayload as never);
      if (dbErr) throw dbErr;

      updateRow(row.id, { status: "done", progress: 100 });
    } catch (e) {
      updateRow(row.id, {
        status: "error",
        progress: 0,
        error: e instanceof Error ? e.message : "Failed",
      });
    }
  };

  const uploadAll = async () => {
    const pending = rows.filter((r) => r.status !== "done");
    if (pending.length === 0) {
      toast.info("Nothing to upload");
      return;
    }
    setUploading(true);
    // Concurrency limit of 3
    const queue = [...pending];
    const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
      while (queue.length) {
        const next = queue.shift();
        if (next) await uploadOne(next);
      }
    });
    await Promise.all(workers);
    setUploading(false);

    const successCount = rows.filter((r) => r.status === "done").length + pending.filter((r) => {
      const row = rows.find((x) => x.id === r.id);
      return row?.status === "done";
    }).length;
    toast.success(`Uploaded ${pending.filter((p) => {
      const row = rows.find((x) => x.id === p.id);
      return row?.status === "done";
    }).length} of ${pending.length}`);
    onSaved();
  };

  const clearDone = () => setRows((p) => p.filter((r) => r.status !== "done"));

  const allDone = rows.length > 0 && rows.every((r) => r.status === "done");
  const pendingCount = rows.filter((r) => r.status !== "done").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Bulk Upload Files</DialogTitle>
          <DialogDescription className="text-base">
            Drop many files at once. Add captions, pick a folder, then click Upload All.
          </DialogDescription>
        </DialogHeader>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
            "hover:border-primary hover:bg-primary/5",
            isDragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-border"
          )}
        >
          <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-base font-semibold">Drop files here or click to browse</p>
          <p className="text-sm text-muted-foreground mt-1">
            Images, PDFs, videos — multiple files supported
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* Bulk controls */}
        {rows.length > 0 && (
          <div className="flex flex-wrap items-end gap-3 p-3 rounded-xl bg-muted/30 border">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">Folder for all</Label>
              <Select value={bulkFolder} onValueChange={setBulkFolder}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Choose folder…" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.folder_name}>
                      {f.folder_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={applyFolderToAll} disabled={!bulkFolder}>
              <FolderInput className="h-4 w-4 mr-1" /> Apply to all
            </Button>

            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">Visibility for all</Label>
              <Select
                value={bulkVisibility}
                onValueChange={(v) => setBulkVisibility(v as VisibilityLevel)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visibilityOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={applyVisibilityToAll}>
              Apply to all
            </Button>

            <Button variant="outline" size="sm" onClick={captionFromFilenames}>
              <Wand2 className="h-4 w-4 mr-1" /> Captions from filenames
            </Button>
          </div>
        )}

        {/* Rows */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {rows.map((row) => (
            <div
              key={row.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border bg-card transition-colors",
                row.status === "done" && "border-emerald-500/40 bg-emerald-500/5",
                row.status === "error" && "border-destructive/50 bg-destructive/5"
              )}
            >
              {/* Thumb */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                {row.previewUrl ? (
                  <img src={row.previewUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>

              {/* Inputs */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_1.4fr_140px] gap-2 min-w-0">
                <Input
                  value={row.fileName}
                  onChange={(e) => updateRow(row.id, { fileName: e.target.value })}
                  placeholder="Name"
                  className="h-10"
                  disabled={row.status === "done"}
                />
                <Input
                  value={row.caption}
                  onChange={(e) => updateRow(row.id, { caption: e.target.value })}
                  placeholder="Caption / description"
                  className="h-10"
                  disabled={row.status === "done"}
                />
                <Select
                  value={row.folder || "__none"}
                  onValueChange={(v) => updateRow(row.id, { folder: v === "__none" ? "" : v })}
                  disabled={row.status === "done"}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No folder</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.folder_name}>
                        {f.folder_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="w-28 flex-shrink-0 text-right">
                {row.status === "idle" && (
                  <Badge variant="outline" className="text-xs">
                    Ready
                  </Badge>
                )}
                {(row.status === "uploading" || row.status === "saving") && (
                  <div className="flex items-center gap-2 justify-end">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-xs">{row.progress}%</span>
                  </div>
                )}
                {row.status === "done" && (
                  <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                  </Badge>
                )}
                {row.status === "error" && (
                  <Badge variant="destructive" title={row.error}>
                    <AlertCircle className="h-3 w-3 mr-1" /> Error
                  </Badge>
                )}
                {(row.status === "uploading" || row.status === "saving") && (
                  <Progress value={row.progress} className="h-1 mt-1" />
                )}
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeRow(row.id)}
                disabled={row.status === "uploading" || row.status === "saving"}
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {rows.some((r) => r.status === "done") && (
            <Button variant="outline" onClick={clearDone}>
              <Trash2 className="h-4 w-4 mr-1" /> Clear done
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setRows([]);
            }}
            disabled={uploading}
          >
            Reset
          </Button>
          <Button
            onClick={uploadAll}
            disabled={uploading || rows.length === 0 || allDone}
            className="min-w-[160px]"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" /> Upload All ({pendingCount})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

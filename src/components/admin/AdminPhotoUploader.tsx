import { useRef, useState } from "react";
import { ImagePlus, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminPhotoUploaderProps {
  busy: boolean;
  onFilesSelected: (files: FileList | null) => void | Promise<void>;
  label?: string;
}

export default function AdminPhotoUploader({
  busy,
  onFilesSelected,
  label = "Upload photos",
}: AdminPhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const submitFiles = async (files: FileList | null) => {
    await onFilesSelected(files);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
        dragging ? "border-primary bg-primary/10" : "border-border bg-muted/30"
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!busy) void submitFiles(event.dataTransfer.files);
      }}
    >
      <UploadCloud className="mx-auto mb-2 h-8 w-8 text-primary" aria-hidden="true" />
      <p className="text-sm font-medium">Choose photos from your device</p>
      <p className="mb-3 text-xs text-muted-foreground">
        JPEG, PNG, GIF, or WebP · up to 10MB each · multiple photos allowed
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        className="hidden"
        disabled={busy}
        onChange={(event) => void submitFiles(event.target.files)}
      />
      <Button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="min-h-11">
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
        {busy ? "Uploading…" : label}
      </Button>
    </div>
  );
}
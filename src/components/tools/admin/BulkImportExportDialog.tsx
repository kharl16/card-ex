import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Download, Upload, FileSpreadsheet, Copy, Check } from "lucide-react";

type ResourceType = "trainings" | "links" | "files";

interface BulkImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const RESOURCE_CONFIGS: Record<ResourceType, { 
  table: string; 
  columns: string[];
  requiredColumns: string[];
  displayName: string;
}> = {
  trainings: {
    table: "training_items",
    columns: ["title", "description", "video_url", "thumbnail_url", "source_type", "category", "is_active"],
    requiredColumns: ["title"],
    displayName: "Videos",
  },
  links: {
    table: "iam_links",
    columns: ["name", "link", "category", "icon_url", "is_active"],
    requiredColumns: ["name", "link"],
    displayName: "Links",
  },
  files: {
    table: "files_repository",
    columns: ["file_name", "description", "folder_name", "images", "drive_link_download", "drive_link_share", "view_video_url", "price_dp", "price_srp", "is_active"],
    requiredColumns: ["file_name"],
    displayName: "Files",
  },
};

export default function BulkImportExportDialog({ open, onOpenChange, onImported }: BulkImportExportDialogProps) {
  const [resourceType, setResourceType] = useState<ResourceType>("trainings");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = RESOURCE_CONFIGS[resourceType];

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from(config.table as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info("No data to export");
        setExporting(false);
        return;
      }

      // Generate CSV
      const headers = config.columns;
      const csvRows = [headers.join(",")];

      data.forEach((item: any) => {
        const row = headers.map((col) => {
          const value = item[col];
          if (value === null || value === undefined) return "";
          if (typeof value === "boolean") return value ? "true" : "false";
          // Escape quotes and wrap in quotes if contains comma
          const strValue = String(value);
          if (strValue.includes(",") || strValue.includes('"') || strValue.includes("\n")) {
            return `"${strValue.replace(/"/g, '""')}"`;
          }
          return strValue;
        });
        csvRows.push(row.join(","));
      });

      const csvString = csvRows.join("\n");
      
      // Download file
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${config.table}_export_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${data.length} ${config.displayName.toLowerCase()}`);
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error(err.message || "Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || "";
      });
      rows.push(row);
    }

    return rows;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleImport = async () => {
    if (!csvContent.trim()) {
      toast.error("Please paste CSV content or upload a file");
      return;
    }

    setImporting(true);
    try {
      const rows = parseCSV(csvContent);
      
      if (rows.length === 0) {
        toast.error("No valid rows found in CSV");
        setImporting(false);
        return;
      }

      // Validate required columns
      const firstRow = rows[0];
      const missingColumns = config.requiredColumns.filter((col) => !(col in firstRow));
      if (missingColumns.length > 0) {
        toast.error(`Missing required columns: ${missingColumns.join(", ")}`);
        setImporting(false);
        return;
      }

      // Prepare data for insert
      const insertData = rows.map((row) => {
        const item: Record<string, any> = {};
        config.columns.forEach((col) => {
          if (col in row) {
            let value: any = row[col];
            if (col === "is_active") {
              value = value.toLowerCase() === "true" || value === "1";
            } else if (value === "") {
              value = null;
            }
            item[col] = value;
          }
        });
        // Ensure is_active defaults to true if not specified
        if (!("is_active" in item)) {
          item.is_active = true;
        }
        return item;
      });

      // Insert in batches
      const batchSize = 50;
      let successCount = 0;

      for (let i = 0; i < insertData.length; i += batchSize) {
        const batch = insertData.slice(i, i + batchSize);
        const { error } = await supabase.from(config.table as any).insert(batch);
        
        if (error) {
          console.error("Batch insert error:", error);
          toast.error(`Error importing batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          successCount += batch.length;
        }
      }

      toast.success(`Imported ${successCount} ${config.displayName.toLowerCase()}`);
      setCsvContent("");
      onImported();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error(err.message || "Failed to import data");
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvContent(text);
      toast.success("File loaded successfully");
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsText(file);
  };

  const copyTemplate = () => {
    const template = config.columns.join(",") + "\n";
    navigator.clipboard.writeText(template);
    setCopied(true);
    toast.success("Template copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Import/Export
          </DialogTitle>
          <DialogDescription>
            Import multiple items from CSV or export existing data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Resource Type</Label>
            <Select value={resourceType} onValueChange={(v) => setResourceType(v as ResourceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trainings">Videos</SelectItem>
                <SelectItem value="links">Links</SelectItem>
                <SelectItem value="files">Files</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="import" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="import">Import</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
            </TabsList>

            <TabsContent value="import" className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyTemplate} className="gap-2">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  Copy Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload CSV
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="font-medium mb-1">Required columns:</p>
                <code className="text-xs">{config.requiredColumns.join(", ")}</code>
                <p className="font-medium mt-2 mb-1">All columns:</p>
                <code className="text-xs break-all">{config.columns.join(", ")}</code>
              </div>

              <div className="space-y-2">
                <Label>CSV Content</Label>
                <Textarea
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder={`Paste your CSV content here...\n\nExample:\n${config.columns.join(",")}\nExample Value 1,Example Value 2,...`}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <Button onClick={handleImport} disabled={importing} className="w-full gap-2">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import Data
              </Button>
            </TabsContent>

            <TabsContent value="export" className="space-y-4">
              <div className="p-4 rounded-lg border bg-muted/30 text-center">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">
                  Export all {config.displayName.toLowerCase()} to a CSV file
                </p>
                <Button onClick={handleExport} disabled={exporting} className="gap-2">
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download CSV
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

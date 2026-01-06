import { useState, useRef, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Upload, Plus, Trash2, Eye, EyeOff, FileText, Users, Link2, MapPin, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ResourcesProvider, useResources } from "@/contexts/ResourcesContext";
import { useResourceData } from "@/hooks/useResourceData";
import type { VisibilityLevel } from "@/types/resources";

type ModuleType = "files" | "ambassadors" | "links" | "directory" | "ways";

const moduleConfig: Record<ModuleType, { table: string; label: string; icon: React.ReactNode }> = {
  files: { table: "files_repository", label: "Files", icon: <FileText className="h-4 w-4" /> },
  ambassadors: { table: "ambassadors_library", label: "Ambassadors", icon: <Users className="h-4 w-4" /> },
  links: { table: "iam_links", label: "Links", icon: <Link2 className="h-4 w-4" /> },
  directory: { table: "directory_entries", label: "Directory", icon: <MapPin className="h-4 w-4" /> },
  ways: { table: "ways_13", label: "13 Ways", icon: <BookOpen className="h-4 w-4" /> },
};

const visibilityOptions: { value: VisibilityLevel; label: string }[] = [
  { value: "public_members", label: "All Members" },
  { value: "leaders_only", label: "Leaders Only" },
  { value: "admins_only", label: "Admins Only" },
  { value: "super_admin_only", label: "Super Admin Only" },
];

function AdminResourcesContent() {
  const { isResourceAdmin, loading: roleLoading } = useResources();
  const { files, ambassadors, links, directory, ways, loading: dataLoading, refetch } = useResourceData();
  const [activeTab, setActiveTab] = useState<ModuleType>("files");
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get data for current tab
  const getData = useCallback(() => {
    switch (activeTab) {
      case "files": return files;
      case "ambassadors": return ambassadors;
      case "links": return links;
      case "directory": return directory;
      case "ways": return ways;
      default: return [];
    }
  }, [activeTab, files, ambassadors, links, directory, ways]);

  const currentData = getData();

  // Toggle active status
  const toggleActive = async (id: string | number, currentStatus: boolean) => {
    const table = moduleConfig[activeTab].table;
    const { error } = await supabase
      .from(table as any)
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Item ${!currentStatus ? "activated" : "deactivated"}`);
      refetch();
    }
  };

  // Update visibility
  const updateVisibility = async (id: string | number, visibility: VisibilityLevel) => {
    const table = moduleConfig[activeTab].table;
    const { error } = await supabase
      .from(table as any)
      .update({ visibility_level: visibility })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update visibility");
    } else {
      toast.success("Visibility updated");
      refetch();
    }
  };

  // CSV Header Mappings per module
  const csvHeaderMappings: Record<ModuleType, Record<string, string>> = {
    files: {
      "id": "id",
      "File Name": "file_name",
      "Images": "images",
      "Drive Link Download": "drive_link_download",
      "Drive Link share": "drive_link_share",
      "Description": "description",
      "Price (DP)": "price_dp",
      "Price (SRP)": "price_srp",
      "Unilevel Points": "unilevel_points",
      "Folder Name": "folder_name",
      "Wholesale Package Commission": "wholesale_package_commission",
      "Package Points (SMC)": "package_points_smc",
      "RQV": "rqv",
      "Infinity": "infinity",
      "Check Match": "check_match",
      "Give Me 5": "give_me_5",
      "Just 4 You": "just_4_you",
      "View Video URL": "view_video_url",
    },
    directory: {
      "id": "id",
      "Location": "location",
      "Address": "address",
      "Maps Link": "maps_link",
      "Owner": "owner",
      "Facebook Page": "facebook_page",
      "Operating Hours": "operating_hours",
      "Phone 1": "phone_1",
      "Phone 2": "phone_2",
      "Phone 3": "phone_3",
      "Sites": "sites",
    },
    ambassadors: {
      "id": "id",
      "Endorser": "endorser",
      "Product Endorsed": "product_endorsed",
      "Thumbnail": "thumbnail",
      "Drive Link": "drive_link",
      "Drive Share Link": "drive_share_link",
      "Video File URL": "video_file_url",
      "Folder Name": "folder_name",
    },
    links: {
      "id": "id",
      "Name": "name",
      "Link": "link",
    },
    ways: {
      "id": "id",
      "New Column": "content",
      "Content": "content",
    },
  };

  // CSV Import with explicit header mapping
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const errors: string[] = [];
    
    try {
      const text = await file.text();
      const lines = text.split("\n");
      const rawHeaders = parseCSVLine(lines[0]);
      const mapping = csvHeaderMappings[activeTab];
      
      // Map CSV headers to DB columns
      const columnMap: { csvIndex: number; dbColumn: string }[] = [];
      rawHeaders.forEach((header, idx) => {
        const trimmedHeader = header.trim();
        const dbColumn = mapping[trimmedHeader];
        if (dbColumn) {
          columnMap.push({ csvIndex: idx, dbColumn });
        }
      });

      if (columnMap.length === 0) {
        toast.error("No matching columns found. Check CSV headers match expected format.");
        return;
      }

      const rows: Record<string, any>[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        try {
          const values = parseCSVLine(lines[i]);
          const row: Record<string, any> = {};
          
          columnMap.forEach(({ csvIndex, dbColumn }) => {
            const rawValue = values[csvIndex]?.trim() || null;
            let value: string | number | null = rawValue;
            // Handle numeric fields
            if (dbColumn === "unilevel_points" && rawValue) {
              value = parseFloat(rawValue) || null;
            }
            if (dbColumn === "id" && rawValue) {
              value = parseInt(rawValue, 10) || null;
            }
            row[dbColumn] = value;
          });
          
          // Add default visibility and is_active
          row.visibility_level = row.visibility_level || "public_members";
          row.is_active = row.is_active ?? true;
          
          rows.push(row);
        } catch (rowErr) {
          errors.push(`Row ${i}: Parse error`);
        }
      }

      if (rows.length === 0) {
        toast.error("No valid rows found in CSV");
        return;
      }

      const table = moduleConfig[activeTab].table;
      
      // Use different upsert strategy based on table
      let upsertConfig: { onConflict?: string } = {};
      if (activeTab === "files" || activeTab === "directory") {
        upsertConfig = { onConflict: "id" };
      }
      
      const { error, data } = await supabase
        .from(table as any)
        .upsert(rows, upsertConfig);

      if (error) throw error;

      const successMsg = `Imported ${rows.length} records`;
      if (errors.length > 0) {
        toast.warning(`${successMsg} with ${errors.length} errors`);
      } else {
        toast.success(successMsg);
      }
      refetch();
    } catch (err) {
      console.error("Import error:", err);
      toast.error(`Failed to import CSV: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Simple CSV line parser
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
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

  // Filter data
  const filteredData = currentData.filter((item: any) => {
    const searchLower = searchTerm.toLowerCase();
    if (activeTab === "files") {
      return item.file_name?.toLowerCase().includes(searchLower);
    }
    if (activeTab === "ambassadors") {
      return item.endorser?.toLowerCase().includes(searchLower) || item.product_endorsed?.toLowerCase().includes(searchLower);
    }
    if (activeTab === "links") {
      return item.name?.toLowerCase().includes(searchLower);
    }
    if (activeTab === "directory") {
      return item.location?.toLowerCase().includes(searchLower);
    }
    if (activeTab === "ways") {
      return item.content?.toLowerCase().includes(searchLower);
    }
    return true;
  });

  if (roleLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!isResourceAdmin) {
    return <Navigate to="/resources" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/resources">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Admin Center</h1>
              <p className="text-sm text-muted-foreground">Manage resources and visibility</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {(Object.keys(moduleConfig) as ModuleType[]).map((key) => (
            <Card key={key} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab(key)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  {moduleConfig[key].icon}
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {key === "files" ? files.length :
                     key === "ambassadors" ? ambassadors.length :
                     key === "links" ? links.length :
                     key === "directory" ? directory.length :
                     ways.length}
                  </p>
                  <p className="text-xs text-muted-foreground">{moduleConfig[key].label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ModuleType)}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              {(Object.keys(moduleConfig) as ModuleType[]).map((key) => (
                <TabsTrigger key={key} value={key} className="gap-2">
                  {moduleConfig[key].icon}
                  {moduleConfig[key].label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[200px]"
              />
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleImport}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                <Upload className="h-4 w-4 mr-2" />
                {importing ? "Importing..." : "Import CSV"}
              </Button>
            </div>
          </div>

          {/* Table Content */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {activeTab === "files" && item.file_name}
                          {activeTab === "ambassadors" && `${item.endorser} - ${item.product_endorsed}`}
                          {activeTab === "links" && item.name}
                          {activeTab === "directory" && item.location}
                          {activeTab === "ways" && (item.content?.slice(0, 50) + "...")}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.visibility_level || "public_members"}
                            onValueChange={(v) => updateVisibility(item.id, v as VisibilityLevel)}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {visibilityOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={item.is_active}
                              onCheckedChange={() => toggleActive(item.id, item.is_active)}
                            />
                            <Badge variant={item.is_active ? "default" : "secondary"}>
                              {item.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon">
                            {item.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Tabs>
      </main>
    </div>
  );
}

export default function AdminResources() {
  return (
    <ResourcesProvider>
      <AdminResourcesContent />
    </ResourcesProvider>
  );
}

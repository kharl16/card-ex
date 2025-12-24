import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { RotateCcw, Download, Eye, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { rollbackPatch } from "@/lib/designPatcher";

interface AdminPatch {
  id: string;
  created_at: string;
  admin_user_id: string;
  template_id: string | null;
  target_mode: string;
  target_card_ids: string[];
  patch_options: Record<string, any>;
  results: {
    successIds?: string[];
    failedIds?: string[];
    errors?: Array<{ cardId: string; message: string }>;
  };
  before_states: Record<string, any>;
  cards_affected: number;
  status: string;
}

interface PatchHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatchHistory({ open, onOpenChange }: PatchHistoryProps) {
  const [patches, setPatches] = useState<AdminPatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatch, setSelectedPatch] = useState<AdminPatch | null>(null);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  
  useEffect(() => {
    if (open) {
      loadPatches();
    }
  }, [open]);
  
  const loadPatches = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_patches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (error) {
      toast.error("Failed to load patch history");
    } else {
      setPatches((data || []).map(p => ({
        ...p,
        target_card_ids: p.target_card_ids as string[],
        patch_options: p.patch_options as Record<string, any>,
        results: p.results as AdminPatch["results"],
        before_states: p.before_states as Record<string, any>,
      })));
    }
    setLoading(false);
  };
  
  const handleRollback = async () => {
    if (!selectedPatch) return;
    
    setRollingBack(true);
    try {
      await rollbackPatch(selectedPatch.id, selectedPatch.before_states);
      toast.success("Rollback completed successfully");
      setShowRollbackConfirm(false);
      setSelectedPatch(null);
      await loadPatches();
    } catch (error: any) {
      toast.error(error.message || "Rollback failed");
    } finally {
      setRollingBack(false);
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "rolled_back":
        return <Badge variant="secondary"><RotateCcw className="h-3 w-3 mr-1" />Rolled Back</Badge>;
      case "in_progress":
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  const downloadReport = (patch: AdminPatch) => {
    const report = {
      id: patch.id,
      created_at: patch.created_at,
      target_mode: patch.target_mode,
      cards_affected: patch.cards_affected,
      status: patch.status,
      results: patch.results,
      patch_options: patch.patch_options,
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patch-report-${patch.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Patch History</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : patches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No patches have been applied yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Cards</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Results</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patches.map(patch => (
                    <TableRow key={patch.id}>
                      <TableCell className="text-sm">
                        {format(new Date(patch.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>{patch.cards_affected}</TableCell>
                      <TableCell className="capitalize">{patch.target_mode}</TableCell>
                      <TableCell>{getStatusBadge(patch.status)}</TableCell>
                      <TableCell>
                        {patch.results && (
                          <span className="text-sm">
                            <span className="text-green-500">{patch.results.successIds?.length || 0} ✓</span>
                            {" / "}
                            <span className="text-red-500">{patch.results.failedIds?.length || 0} ✗</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadReport(patch)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {patch.status === "completed" && Object.keys(patch.before_states || {}).length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPatch(patch);
                                setShowRollbackConfirm(true);
                              }}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showRollbackConfirm} onOpenChange={setShowRollbackConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Rollback
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will restore {Object.keys(selectedPatch?.before_states || {}).length} cards 
              to their state before this patch was applied.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rollingBack}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRollback}
              disabled={rollingBack}
            >
              {rollingBack ? "Rolling back..." : "Rollback"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
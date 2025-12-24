import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import SignOutButton from "@/components/auth/SignOutButton";
import {
  ArrowLeft,
  Palette,
  QrCode,
  Image,
  Layout,
  Settings,
  Play,
  Eye,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Download,
  History,
} from "lucide-react";
import { toast } from "sonner";
import type { Tables, Json } from "@/integrations/supabase/types";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
import LoadingAnimation from "@/components/LoadingAnimation";
import { TemplateSelector } from "@/components/patcher/TemplateSelector";
import { CardSelector } from "@/components/patcher/CardSelector";
import { PatchOptions, PatchOptionsState, DEFAULT_PATCH_OPTIONS } from "@/components/patcher/PatchOptions";
import { PatchPreview } from "@/components/patcher/PatchPreview";
import { PatchProgress } from "@/components/patcher/PatchProgress";
import { PatchHistory } from "@/components/patcher/PatchHistory";
import { executePatch, PatchResult } from "@/lib/designPatcher";
import { format } from "date-fns";

type CardTemplate = Tables<"card_templates">;
type CardData = Tables<"cards">;

export default function AdminDesignPatcher() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading, session, user } = useAuth();
  
  // Step state
  const [currentStep, setCurrentStep] = useState<"select" | "configure" | "preview" | "execute" | "results">("select");
  
  // Template selection
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  
  // Card selection
  const [cards, setCards] = useState<CardData[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [targetMode, setTargetMode] = useState<"selected" | "all">("selected");
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardFilters, setCardFilters] = useState({
    search: "",
    paidOnly: false,
    publishedOnly: false,
  });
  
  // Patch options
  const [patchOptions, setPatchOptions] = useState<PatchOptionsState>(DEFAULT_PATCH_OPTIONS);
  
  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: "" });
  const [patchResults, setPatchResults] = useState<PatchResult | null>(null);
  
  // Confirmation
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  
  // History
  const [showHistory, setShowHistory] = useState(false);
  
  // Dry run preview
  const [previewCard, setPreviewCard] = useState<CardData | null>(null);
  
  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      navigate("/auth");
      return;
    }
    if (!isAdmin) {
      toast.error("Access denied: Super admin only");
      navigate("/dashboard");
      return;
    }
    loadData();
  }, [authLoading, session, isAdmin, navigate]);
  
  const loadData = async () => {
    await Promise.all([loadTemplates(), loadCards()]);
  };
  
  const loadTemplates = async () => {
    setTemplatesLoading(true);
    const { data, error } = await supabase
      .from("card_templates")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("Failed to load templates");
    } else {
      setTemplates(data || []);
    }
    setTemplatesLoading(false);
  };
  
  const loadCards = async () => {
    setCardsLoading(true);
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("is_template", false)
      .order("updated_at", { ascending: false });
    
    if (error) {
      toast.error("Failed to load cards");
    } else {
      setCards(data || []);
    }
    setCardsLoading(false);
  };
  
  // Filter cards based on criteria
  const filteredCards = cards.filter(card => {
    if (cardFilters.search) {
      const search = cardFilters.search.toLowerCase();
      const matchesSearch = 
        card.full_name?.toLowerCase().includes(search) ||
        card.email?.toLowerCase().includes(search) ||
        card.company?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }
    if (cardFilters.paidOnly && !card.is_paid) return false;
    if (cardFilters.publishedOnly && !card.is_published) return false;
    return true;
  });
  
  // Cards to patch
  const cardsToPatch = targetMode === "all" 
    ? filteredCards 
    : filteredCards.filter(c => selectedCardIds.has(c.id));
  
  const handleSelectAllCards = (checked: boolean) => {
    if (checked) {
      setSelectedCardIds(new Set(filteredCards.map(c => c.id)));
    } else {
      setSelectedCardIds(new Set());
    }
  };
  
  const handleCardSelect = (cardId: string, checked: boolean) => {
    const newSet = new Set(selectedCardIds);
    if (checked) {
      newSet.add(cardId);
    } else {
      newSet.delete(cardId);
    }
    setSelectedCardIds(newSet);
  };
  
  const canProceedToConfig = selectedTemplate !== null;
  const canProceedToPreview = cardsToPatch.length > 0 && Object.values(patchOptions).some(v => v === true || (typeof v === "object" && Object.values(v).some(Boolean)));
  
  const handleStartPatch = () => {
    setShowConfirmDialog(true);
    setConfirmText("");
  };
  
  const handleConfirmPatch = async () => {
    if (confirmText !== "APPLY PATCH") return;
    
    setShowConfirmDialog(false);
    setCurrentStep("execute");
    setIsExecuting(true);
    
    try {
      const result = await executePatch({
        template: selectedTemplate!,
        cards: cardsToPatch,
        options: patchOptions,
        targetMode,
        adminUserId: user?.id || "",
        onProgress: (current, total, status) => {
          setProgress({ current, total, status });
        },
      });
      
      setPatchResults(result);
      setCurrentStep("results");
      
      if (result.failedIds.length === 0) {
        toast.success(`Successfully patched ${result.successIds.length} cards`);
      } else {
        toast.warning(`Patched ${result.successIds.length} cards, ${result.failedIds.length} failed`);
      }
    } catch (error: any) {
      toast.error(error.message || "Patch failed");
      setCurrentStep("preview");
    } finally {
      setIsExecuting(false);
    }
  };
  
  const handleReset = () => {
    setSelectedTemplate(null);
    setSelectedCardIds(new Set());
    setTargetMode("selected");
    setPatchOptions(DEFAULT_PATCH_OPTIONS);
    setPatchResults(null);
    setCurrentStep("select");
  };
  
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingAnimation />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/cards")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={CardExLogo} alt="Card-Ex" className="h-8" />
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Design Patcher
              </h1>
              <p className="text-sm text-muted-foreground">Apply template designs to existing cards</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
              <History className="h-4 w-4 mr-2" />
              Patch History
            </Button>
            <SignOutButton />
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {["select", "configure", "preview", "execute", "results"].map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${currentStep === step ? "bg-primary text-primary-foreground" : 
                  ["select", "configure", "preview", "execute", "results"].indexOf(currentStep) > idx 
                    ? "bg-primary/20 text-primary" 
                    : "bg-muted text-muted-foreground"}
              `}>
                {idx + 1}
              </div>
              <span className={`text-sm capitalize hidden sm:inline ${currentStep === step ? "font-medium" : "text-muted-foreground"}`}>
                {step}
              </span>
              {idx < 4 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>
        
        {/* Step Content */}
        {currentStep === "select" && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Source Template
                </CardTitle>
                <CardDescription>Select the design template to apply</CardDescription>
              </CardHeader>
              <CardContent>
                <TemplateSelector
                  templates={templates}
                  selectedTemplate={selectedTemplate}
                  onSelect={setSelectedTemplate}
                  loading={templatesLoading}
                />
              </CardContent>
            </Card>
            
            {/* Target Cards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Target Cards
                </CardTitle>
                <CardDescription>Choose which cards to update</CardDescription>
              </CardHeader>
              <CardContent>
                <CardSelector
                  cards={filteredCards}
                  selectedCardIds={selectedCardIds}
                  targetMode={targetMode}
                  onTargetModeChange={setTargetMode}
                  onCardSelect={handleCardSelect}
                  onSelectAll={handleSelectAllCards}
                  filters={cardFilters}
                  onFiltersChange={setCardFilters}
                  loading={cardsLoading}
                />
              </CardContent>
            </Card>
          </div>
        )}
        
        {currentStep === "select" && (
          <div className="mt-6 flex justify-end">
            <Button 
              onClick={() => setCurrentStep("configure")} 
              disabled={!canProceedToConfig}
            >
              Next: Configure Patch Options
            </Button>
          </div>
        )}
        
        {currentStep === "configure" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Patch Options</CardTitle>
                <CardDescription>
                  Select what design elements to apply from the template. Personal data is never modified by default.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PatchOptions 
                  options={patchOptions} 
                  onChange={setPatchOptions}
                  template={selectedTemplate}
                />
              </CardContent>
            </Card>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep("select")}>
                Back
              </Button>
              <Button 
                onClick={() => {
                  setPreviewCard(cardsToPatch[0] || null);
                  setCurrentStep("preview");
                }} 
                disabled={!canProceedToPreview}
              >
                Next: Preview Changes
              </Button>
            </div>
          </div>
        )}
        
        {currentStep === "preview" && (
          <div className="space-y-6">
            <PatchPreview
              template={selectedTemplate!}
              previewCard={previewCard}
              patchOptions={patchOptions}
              totalCards={cardsToPatch.length}
            />
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep("configure")}>
                Back
              </Button>
              <Button onClick={handleStartPatch}>
                <Play className="h-4 w-4 mr-2" />
                Apply Patch to {cardsToPatch.length} Card{cardsToPatch.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}
        
        {currentStep === "execute" && (
          <PatchProgress progress={progress} />
        )}
        
        {currentStep === "results" && patchResults && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {patchResults.failedIds.length === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                  Patch Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-green-500">{patchResults.successIds.length}</div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                  <div className="text-center p-4 bg-red-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-red-500">{patchResults.failedIds.length}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{patchResults.successIds.length + patchResults.failedIds.length}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>
                
                {patchResults.errors.length > 0 && (
                  <div className="space-y-2">
                    <Label>Errors</Label>
                    <ScrollArea className="h-32 border rounded-md p-2">
                      {patchResults.errors.map((err, idx) => (
                        <div key={idx} className="text-sm text-red-500 py-1">
                          {err.cardId}: {err.message}
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Start New Patch
                  </Button>
                  <Button variant="outline" onClick={() => setShowHistory(true)}>
                    <History className="h-4 w-4 mr-2" />
                    View History
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Patch Application
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                You are about to apply design changes to <strong>{cardsToPatch.length} card{cardsToPatch.length !== 1 ? "s" : ""}</strong>.
              </p>
              <p className="text-sm">
                This action will modify the selected design elements. Personal information will NOT be changed unless explicitly enabled.
              </p>
              <div className="pt-2">
                <Label htmlFor="confirm-text">Type <strong>APPLY PATCH</strong> to confirm:</Label>
                <Input
                  id="confirm-text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="APPLY PATCH"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmPatch}
              disabled={confirmText !== "APPLY PATCH"}
              className="bg-primary"
            >
              Apply Patch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* History Dialog */}
      <PatchHistory open={showHistory} onOpenChange={setShowHistory} />
    </div>
  );
}
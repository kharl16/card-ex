import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import SignOutButton from "@/components/auth/SignOutButton";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Search,
  Plus,
  User,
  CreditCard,
  Users,
  UserPlus,
  Key,
  Mail,
  Copy,
  MoreHorizontal,
  DollarSign,
  Palette,
  Globe,
  RefreshCw,
  Wand2,
  Settings,
  ShieldCheck,
  Eye,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
import LoadingAnimation from "@/components/LoadingAnimation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { AdminCreateCardDialog } from "@/components/admin/AdminCreateCardDialog";
import { DuplicateCardDialog } from "@/components/DuplicateCardDialog";
import { SaveTemplateDialog } from "@/components/templates/SaveTemplateDialog";
import { useAdminOverridePayment } from "@/hooks/usePayments";
import { useCardPlans } from "@/hooks/useCardPlans";
import { LayoutTemplate, Quote } from "lucide-react";
import { useTemplates, CardTemplate } from "@/hooks/useTemplates";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

type CardData = Tables<"cards">;

interface UserProfile {
  id: string;
  full_name: string | null;
  created_at: string;
  email?: string;
  email_confirmed_at?: string | null;
  card_count?: number;
}

interface UserReferralData {
  referral_code: string | null;
  has_referral_access: boolean;
}

// Generate unique referral code
function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "CEX-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Admin Card Row Component with payment controls
function AdminCardRow({
  card,
  referralData,
  ownerEmail,
  onEdit,
  onDuplicate,
  onSaveAsTemplate,
  onDelete,
  onPaymentChange,
  onGenerateReferralCode,
}: {
  card: CardData;
  referralData?: UserReferralData;
  ownerEmail?: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onSaveAsTemplate: () => void;
  onDelete: () => void;
  onPaymentChange: () => void;
  onGenerateReferralCode: (userId: string) => void;
}) {
  const navigate = useNavigate();
  const adminOverride = useAdminOverridePayment();
  const { data: plans } = useCardPlans();
  const defaultPlan = plans?.find((p) => p.code === "ESSENTIAL") || plans?.[0];
  const [loginInfoOpen, setLoginInfoOpen] = useState(false);

  const cardSlug = card.custom_slug || card.slug || "";
  const cardLink = card.custom_slug
    ? `https://tagex.app/${card.custom_slug}`
    : `https://tagex.app/c/${cardSlug}`;
  const loginInfoText = `Card link: ${cardLink}\n\nWebsite: https://tagex.app\nUsername: ${ownerEmail || "—"}\nPassword: 123456`;

  const handlePaidChange = async (checked: boolean) => {
    const planId = card.plan_id || defaultPlan?.id;
    const amount = defaultPlan?.retail_price || 599;

    if (!planId) {
      toast.error("No plan available");
      return;
    }

    await adminOverride.mutateAsync({
      cardId: card.id,
      userId: card.user_id,
      planId,
      amount,
      isPaid: checked,
    });

    // Auto-generate referral code when card becomes PAID
    if (checked && (!referralData?.has_referral_access || !referralData?.referral_code)) {
      onGenerateReferralCode(card.user_id);
    }

    onPaymentChange();
  };

  const handlePublishedChange = async (checked: boolean) => {
    const { error } = await supabase.from("cards").update({ is_published: checked }).eq("id", card.id);

    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success(checked ? "Published" : "Unpublished");
      onPaymentChange();
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{card.full_name}</TableCell>
      <TableCell>{(card as any).owner_name || "—"}</TableCell>
      <TableCell>{card.company || "—"}</TableCell>
      <TableCell>
        {plans && plans.length > 0 ? (
          <Select
            value={card.plan_id ?? undefined}
            onValueChange={async (newPlanId) => {
              // Update card's plan
              const { error: cardError } = await supabase
                .from("cards")
                .update({ plan_id: newPlanId })
                .eq("id", card.id);

              if (cardError) {
                toast.error("Failed to update plan");
                return;
              }

              // Also update any referral that links to this card
              const { error: referralError } = await supabase
                .from("referrals")
                .update({ plan_id: newPlanId })
                .eq("referred_card_id", card.id);

              if (referralError) {
                console.error("Failed to sync referral plan:", referralError);
              }

              toast.success("Plan updated");
              onPaymentChange();
            }}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="No plan">
                {(() => {
                  const plan = plans?.find((p) => p.id === card.plan_id);
                  return plan ? `${plan.name} • ₱${plan.retail_price.toLocaleString()}` : "No plan";
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id} className="text-xs">
                  <span className="font-medium">{plan.name}</span>
                  <span className="ml-2 text-muted-foreground">₱{plan.retail_price.toLocaleString()}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-muted-foreground">Loading...</span>
        )}
      </TableCell>
      <TableCell>
        <Checkbox checked={card.is_paid} onCheckedChange={handlePaidChange} disabled={adminOverride.isPending} />
      </TableCell>
      <TableCell>
        <Switch checked={card.is_published || false} onCheckedChange={handlePublishedChange} disabled={!card.is_paid} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {card.is_paid && card.is_published && (card as any).owner_referral_code ? (
            <div className="flex flex-col gap-0.5">
              <Badge variant="default" className="text-xs w-fit">
                Active
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">{(card as any).owner_referral_code}</span>
            </div>
          ) : referralData?.has_referral_access && referralData.referral_code ? (
            <div className="flex flex-col gap-0.5">
              <Badge variant="secondary" className="text-xs w-fit">
                Has Code
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">{referralData.referral_code}</span>
            </div>
          ) : (
            <Badge variant="secondary" className="text-xs">
              No Access
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        {(card as any).referred_by_name || (card as any).referred_by_code ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium">{(card as any).referred_by_name || "Unknown"}</span>
            <span className="text-xs text-muted-foreground font-mono">{(card as any).referred_by_code || "—"}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/dashboard?viewAs=${card.user_id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              View Owner Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Card
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate Design to User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSaveAsTemplate}>
              <LayoutTemplate className="mr-2 h-4 w-4" />
              Save as Template
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLoginInfoOpen(true)}>
              <Key className="mr-2 h-4 w-4" />
              Show Login Info
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Card
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={loginInfoOpen} onOpenChange={setLoginInfoOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Login Info — {card.full_name || "Card"}</DialogTitle>
              <DialogDescription>
                Share these credentials with the card owner. They can change their password after signing in.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-xs font-mono text-foreground">
{loginInfoText}
              </pre>
              {!ownerEmail && (
                <p className="text-xs text-destructive">
                  Owner email not loaded yet — open the Users tab once, then retry.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(loginInfoText);
                  toast.success("Login info copied to clipboard");
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button onClick={() => setLoginInfoOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}

interface FilterableHeadProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
}

function FilterableHead({ label, options, selected, onChange, className }: FilterableHeadProps) {
  const active = selected.length > 0;
  const toggle = (v: string) => {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else onChange([...selected, v]);
  };
  return (
    <TableHead className={className}>
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-6 w-6 ${active ? "text-primary" : "text-muted-foreground"}`}
              aria-label={`Filter ${label}`}
            >
              <Filter className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-2 z-50 bg-popover">
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="text-xs font-semibold">Filter {label}</span>
              {active && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onChange([])}>
                  Clear
                </Button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {options.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-1">No values</p>
              ) : (
                options.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-sm"
                  >
                    <Checkbox checked={selected.includes(opt)} onCheckedChange={() => toggle(opt)} />
                    <span className="truncate">{opt || "—"}</span>
                  </label>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TableHead>
  );
}


export default function AdminCards() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading, session } = useAuth();
  const [cards, setCards] = useState<CardData[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userReferrals, setUserReferrals] = useState<Record<string, UserReferralData>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const { data: cardPlans } = useCardPlans();
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Admin Create Card Dialog state (with template support)
  const [showCreateCardDialog, setShowCreateCardDialog] = useState(false);
  const [selectedUserForCard, setSelectedUserForCard] = useState<UserProfile | null>(null);

  // Create User Dialog state
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  // Edit User Dialog state
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");
  const [updatingUser, setUpdatingUser] = useState(false);

  // Duplicate Card to User Dialog state
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateSourceCard, setDuplicateSourceCard] = useState<CardData | null>(null);
  const [showSelectUserForDuplicateDialog, setShowSelectUserForDuplicateDialog] = useState(false);
  const [selectedUserForDuplicate, setSelectedUserForDuplicate] = useState<string>("");
  const [duplicateUserSearch, setDuplicateUserSearch] = useState<string>("");

  // Save as Template Dialog state
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [templateSourceCard, setTemplateSourceCard] = useState<CardData | null>(null);
  const [templateProductImages, setTemplateProductImages] = useState<
    Array<{ image_url: string; alt_text?: string | null; description?: string | null; sort_order?: number | null }>
  >([]);

  // Templates management state
  const { getAllTemplatesForAdmin, updateTemplate, deleteTemplate } = useTemplates();
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<CardTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<CardTemplate | null>(null);
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editTemplateDescription, setEditTemplateDescription] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  
  // Default template for new cards
  const [defaultTemplateId, setDefaultTemplateId] = useState<string>("");
  const [savingDefaultTemplate, setSavingDefaultTemplate] = useState(false);

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
    await Promise.all([loadCards(), loadUsers(), loadTemplates(), loadDefaultTemplate()]);
  };

  const loadDefaultTemplate = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "default_template_id")
      .single();
    if (data?.value) {
      setDefaultTemplateId(data.value);
    }
  };

  const handleSetDefaultTemplate = async (templateId: string) => {
    setSavingDefaultTemplate(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ value: templateId })
      .eq("key", "default_template_id");

    if (error) {
      toast.error("Failed to set default template");
    } else {
      setDefaultTemplateId(templateId);
      toast.success(templateId ? "Default template set" : "Default template cleared");
    }
    setSavingDefaultTemplate(false);
  };

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    const data = await getAllTemplatesForAdmin();
    setTemplates(data);
    setTemplatesLoading(false);
  };

  const handleEditTemplate = (template: CardTemplate) => {
    setEditingTemplate(template);
    setEditTemplateName(template.name);
    setEditTemplateDescription(template.description || "");
  };

  const handleSaveTemplateEdit = async () => {
    if (!editingTemplate || !editTemplateName.trim()) return;

    setSavingTemplate(true);
    const success = await updateTemplate(editingTemplate.id, {
      name: editTemplateName.trim(),
      description: editTemplateDescription.trim() || undefined,
    });

    if (success) {
      setEditingTemplate(null);
      await loadTemplates();
    }
    setSavingTemplate(false);
  };

  const handleDeleteTemplate = async () => {
    if (!deletingTemplate) return;

    setSavingTemplate(true);
    const success = await deleteTemplate(deletingTemplate.id);
    if (success) {
      setDeletingTemplate(null);
      await loadTemplates();
    }
    setSavingTemplate(false);
  };

  const loadCards = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("cards").select("*").order("updated_at", { ascending: false });

    if (error) {
      toast.error("Failed to load cards");
    } else {
      setCards(data || []);

      // Fetch referral data for all card owners
      const userIds = [...new Set((data || []).map((c) => c.user_id))];
      if (userIds.length > 0) {
        const { data: referralProfiles } = await supabase
          .from("profiles")
          .select("id, referral_code, has_referral_access")
          .in("id", userIds);

        const referralMap: Record<string, UserReferralData> = {};
        referralProfiles?.forEach((p) => {
          referralMap[p.id] = {
            referral_code: p.referral_code,
            has_referral_access: p.has_referral_access,
          };
        });
        setUserReferrals(referralMap);
      }
    }
    setLoading(false);
  };

  const handleGenerateReferralCode = async (userId: string) => {
    // Check if user already has a referral code
    const existingData = userReferrals[userId];
    
    if (existingData?.referral_code) {
      // Code exists - copy to clipboard instead of regenerating
      await navigator.clipboard.writeText(existingData.referral_code);
      toast.success("Referral code copied to clipboard");
      return;
    }

    // No code exists - call the database function to generate one
    const { data, error } = await supabase.rpc("ensure_user_referral_code", {
      p_user_id: userId,
    });

    if (error) {
      toast.error("Failed to generate referral code");
      return;
    }

    const newCode = data as string;
    toast.success(`Referral code generated: ${newCode}`);

    // Also update the card's owner_referral_code
    const userCards = cards.filter((c) => c.user_id === userId);
    for (const card of userCards) {
      await supabase
        .from("cards")
        .update({ owner_referral_code: newCode })
        .eq("id", card.id);
    }

    // Update local state
    setUserReferrals((prev) => ({
      ...prev,
      [userId]: {
        referral_code: newCode,
        has_referral_access: true,
      },
    }));

    // Refresh cards to get updated owner_referral_code
    await loadCards();
  };

  const loadUsers = async () => {
    // Get profiles with card counts
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .order("created_at", { ascending: false });

    if (profilesError) {
      toast.error("Failed to load users");
      return;
    }

    // Get card counts per user
    const { data: cardCounts, error: cardsError } = await supabase.from("cards").select("user_id");

    if (cardsError) {
      console.error("Failed to load card counts:", cardsError);
    }

    // Count cards per user
    const countMap: Record<string, number> = {};
    cardCounts?.forEach((card) => {
      countMap[card.user_id] = (countMap[card.user_id] || 0) + 1;
    });

    // Fetch user emails and verification status from admin edge function
    let emailMap: Record<string, string> = {};
    let confirmedMap: Record<string, string | null> = {};
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const response = await fetch(`https://lorowpouhpjjxembvwyi.supabase.co/functions/v1/admin-list-users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (response.ok) {
          const result = await response.json();
          emailMap = result.users || {};
          confirmedMap = result.confirmed || {};
        }
      }
    } catch (e) {
      console.error("Failed to fetch user emails:", e);
    }

    // Combine data
    const usersWithCounts: UserProfile[] = (profiles || []).map((p) => ({
      ...p,
      email: emailMap[p.id] || "",
      email_confirmed_at: confirmedMap[p.id] || null,
      card_count: countMap[p.id] || 0,
    }));

    setUsers(usersWithCounts);
  };

  const handleDelete = async () => {
    if (!deleteCardId) return;

    const { error } = await supabase.from("cards").delete().eq("id", deleteCardId);

    if (error) {
      toast.error("Failed to delete card");
    } else {
      toast.success("Card deleted");
      loadCards();
    }
    setDeleteCardId(null);
  };

  // Open the create card dialog for a specific user
  const openCreateCardForUser = (user: UserProfile) => {
    setSelectedUserForCard(user);
    setShowCreateCardDialog(true);
  };

  // Open the duplicate card flow for a specific card
  const openDuplicateCardFlow = (card: CardData) => {
    setDuplicateSourceCard(card);
    setSelectedUserForDuplicate("");
    setShowSelectUserForDuplicateDialog(true);
  };

  // Handle user selection for duplicate and open the duplicate dialog
  const confirmDuplicateToUser = () => {
    if (!selectedUserForDuplicate || !duplicateSourceCard) return;
    setShowSelectUserForDuplicateDialog(false);
    setShowDuplicateDialog(true);
  };

  // Open the save as template flow for a specific card
  const openSaveAsTemplateFlow = async (card: CardData) => {
    // Get product images from cards.product_images JSONB column
    const rawProductImages = (card as any).product_images;
    const productImages = Array.isArray(rawProductImages)
      ? rawProductImages.map((img: any, index: number) => ({
          image_url: img.image_url,
          alt_text: img.alt_text || null,
          description: img.description || null,
          sort_order: img.sort_order ?? index,
        }))
      : [];

    setTemplateSourceCard(card);
    setTemplateProductImages(productImages);
    setShowSaveTemplateDialog(true);
  };

  // Get the selected user profile for duplicate
  const getSelectedUserForDuplicate = () => {
    return users.find((u) => u.id === selectedUserForDuplicate);
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newUserPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setCreatingUser(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(`https://lorowpouhpjjxembvwyi.supabase.co/functions/v1/admin-create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: newUserEmail.trim(),
          password: newUserPassword,
          full_name: newUserName.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create user");
      }

      toast.success(`User "${newUserName}" created successfully! They can now sign in.`);
      setShowCreateUserDialog(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    setDeletingUser(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(`https://lorowpouhpjjxembvwyi.supabase.co/functions/v1/admin-delete-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: deleteUserId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete user");
      }

      toast.success("User deleted successfully");
      setDeleteUserId(null);
      loadUsers();
      loadCards();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    } finally {
      setDeletingUser(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    if (!editUserEmail.trim() && !editUserPassword.trim()) {
      toast.error("Please enter an email or password to update");
      return;
    }

    if (editUserPassword && editUserPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setUpdatingUser(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const body: { user_id: string; email?: string; password?: string } = {
        user_id: editingUser.id,
      };
      if (editUserEmail.trim()) body.email = editUserEmail.trim();
      if (editUserPassword.trim()) body.password = editUserPassword;

      const response = await fetch(`https://lorowpouhpjjxembvwyi.supabase.co/functions/v1/admin-update-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update user");
      }

      toast.success("User updated successfully");
      setShowEditUserDialog(false);
      setEditingUser(null);
      setEditUserEmail("");
      setEditUserPassword("");
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to update user");
    } finally {
      setUpdatingUser(false);
    }
  };

  // Per-card derived values used for column filtering
  const getCardColumnValues = (card: CardData) => {
    const planName = cardPlans?.find((p) => p.id === card.plan_id)?.name || "No plan";
    const referralStatus =
      card.is_paid && card.is_published && (card as any).owner_referral_code
        ? "Active"
        : userReferrals[card.user_id]?.has_referral_access && userReferrals[card.user_id]?.referral_code
        ? "Has Code"
        : "No Access";
    return {
      Name: card.full_name || "—",
      Owner: (card as any).owner_name || "—",
      Company: card.company || "—",
      Plan: planName,
      Paid: card.is_paid ? "Paid" : "Unpaid",
      Published: card.is_published ? "Published" : "Unpublished",
      Referral: referralStatus,
      "Referred By": (card as any).referred_by_name || "—",
    } as Record<string, string>;
  };

  const filteredCards = cards.filter((card) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      card.full_name?.toLowerCase().includes(q) ||
      card.slug?.toLowerCase().includes(q) ||
      card.company?.toLowerCase().includes(q) ||
      (card as any).owner_name?.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    const vals = getCardColumnValues(card);
    for (const [col, selected] of Object.entries(columnFilters)) {
      if (!selected || selected.length === 0) continue;
      if (!selected.includes(vals[col])) return false;
    }
    return true;
  });

  const columnOptions = useMemo(() => {
    const cols = ["Name", "Owner", "Company", "Plan", "Paid", "Published", "Referral", "Referred By"];
    const map: Record<string, string[]> = {};
    for (const c of cols) map[c] = [];
    const seen: Record<string, Set<string>> = {};
    for (const c of cols) seen[c] = new Set();
    cards.forEach((card) => {
      const vals = getCardColumnValues(card);
      for (const c of cols) seen[c].add(vals[c]);
    });
    for (const c of cols) map[c] = Array.from(seen[c]).sort((a, b) => a.localeCompare(b));
    return map;
  }, [cards, cardPlans, userReferrals]);

  const setColFilter = (col: string) => (next: string[]) =>
    setColumnFilters((prev) => ({ ...prev, [col]: next }));


  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(userSearchTerm.toLowerCase()),
  );

  if (authLoading || !isAdmin) {
    return <LoadingAnimation />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden bg-transparent">
                <img src={CardExLogo} alt="Card-Ex Logo" className="h-full w-full object-contain" />
              </div>
              <span className="text-xl font-bold">Card-Ex Admin</span>
            </div>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button onClick={() => navigate("/admin/data-tools")} variant="outline">
            Data Tools & Migration
          </Button>
          <Button onClick={() => navigate("/admin/referrals")} variant="outline" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Referrals
          </Button>
          <Button onClick={() => navigate("/admin/design-patcher")} variant="outline" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Design Patcher
          </Button>
          <Button onClick={() => navigate("/admin/global-products")} variant="outline" className="gap-2">
            <Globe className="h-4 w-4" />
            Global Product Photos
          </Button>
          <Button onClick={() => navigate("/admin/global-packages")} variant="outline" className="gap-2">
            <Globe className="h-4 w-4" />
            Global Package Photos
          </Button>
          <Button onClick={() => navigate("/admin/global-testimonies")} variant="outline" className="gap-2">
            <Globe className="h-4 w-4" />
            Global Testimony Photos
          </Button>
          <Button onClick={() => setShowCreateUserDialog(true)} variant="outline" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Create New User
          </Button>
          <Button onClick={() => navigate("/admin/otp-audit")} variant="outline" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            OTP Audit
          </Button>
          <Button onClick={() => navigate("/admin/device-approvals")} variant="outline" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Device Approvals
          </Button>
          <Button onClick={() => navigate("/admin/daily-quotes")} variant="outline" className="gap-2">
            <Quote className="h-4 w-4" />
            Daily Quotes
          </Button>
          {/* Note: "Create Card for User" now available via the "+ Card" button on individual users in the All Users tab */}
        </div>

        <Tabs defaultValue="cards" className="space-y-4">
          <TabsList>
            <TabsTrigger value="cards" className="gap-2">
              <CreditCard className="h-4 w-4" />
              All Cards
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              All Users
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Palette className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cards">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>All Cards ({cards.length})</span>
                  <Badge variant="destructive">Super Admin</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search cards..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {loading ? (
                  <LoadingAnimation />
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {(["Name", "Owner", "Company", "Plan", "Paid", "Published", "Referral", "Referred By"] as const).map((col) => (
                            <FilterableHead
                              key={col}
                              label={col}
                              options={columnOptions[col] || []}
                              selected={columnFilters[col] || []}
                              onChange={setColFilter(col)}
                            />
                          ))}
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {filteredCards.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center text-muted-foreground">
                              No cards found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCards.map((card) => (
                            <AdminCardRow
                              key={card.id}
                              card={card}
                              referralData={userReferrals[card.user_id]}
                              ownerEmail={users.find((u) => u.id === card.user_id)?.email}
                              onEdit={() => navigate(`/cards/${card.id}/edit`)}
                              onDuplicate={() => openDuplicateCardFlow(card)}
                              onSaveAsTemplate={() => openSaveAsTemplateFlow(card)}
                              onDelete={() => setDeleteCardId(card.id)}
                              onPaymentChange={loadCards}
                              onGenerateReferralCode={handleGenerateReferralCode}
                            />
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>All Users ({users.length})</span>
                  <Badge variant="destructive">Super Admin</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Verified</TableHead>
                        <TableHead>Password</TableHead>
                        <TableHead>Cards</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {user.full_name || "Unnamed User"}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{user.email || "—"}</TableCell>
                            <TableCell>
                              {user.email_confirmed_at ? (
                                <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                                  <ShieldCheck className="h-3 w-3" />
                                  Verified
                                </Badge>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-xs border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                                  onClick={async () => {
                                    try {
                                      const { data: { session } } = await supabase.auth.getSession();
                                      if (!session) return;
                                      const response = await fetch(
                                        `https://lorowpouhpjjxembvwyi.supabase.co/functions/v1/admin-update-user`,
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                            Authorization: `Bearer ${session.access_token}`,
                                          },
                                          body: JSON.stringify({ user_id: user.id, email_confirm: true }),
                                        }
                                      );
                                      const result = await response.json();
                                      if (result.success) {
                                        toast.success(`Email verified for ${user.email}`);
                                        loadUsers();
                                      } else {
                                        toast.error(result.error || "Failed to verify email");
                                      }
                                    } catch {
                                      toast.error("Failed to verify email");
                                    }
                                  }}
                                >
                                  <Mail className="h-3 w-3" />
                                  Verify
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">••••••••</TableCell>
                            <TableCell>
                              <Badge variant={user.card_count && user.card_count > 0 ? "default" : "secondary"}>
                                {user.card_count || 0} card{user.card_count !== 1 ? "s" : ""}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => {
                                    setEditingUser(user);
                                    setEditUserEmail(user.email || "");
                                    setEditUserPassword("");
                                    setShowEditUserDialog(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                                  onClick={() => navigate(`/dashboard?viewAs=${user.id}`)}
                                  title="View this user's dashboard as Super Admin"
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => openCreateCardForUser(user)}
                                >
                                  <Plus className="h-4 w-4" />
                                  Card
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setDeleteUserId(user.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Templates ({templates.length})</span>
                  <Badge variant="destructive">Super Admin</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Default Template Setting */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">Default Theme for New Cards</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    When users create a new card, this template will be applied automatically.
                  </p>
                  <div className="flex items-center gap-3">
                    <Select
                      value={defaultTemplateId || "none"}
                      onValueChange={(value) => handleSetDefaultTemplate(value === "none" ? "" : value)}
                      disabled={savingDefaultTemplate}
                    >
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select default template">
                          {defaultTemplateId
                            ? templates.find((t) => t.id === defaultTemplateId)?.name || "Unknown template"
                            : "No default (blank card)"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="none">No default (blank card)</SelectItem>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <span>{template.name}</span>
                              {template.is_global && (
                                <Badge variant="outline" className="text-xs">Global</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {savingDefaultTemplate && (
                      <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Templates Grid */}
                {templatesLoading ? (
                  <LoadingAnimation />
                ) : templates.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <Palette className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 font-semibold">No templates yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Save a card as a template from the All Cards tab to get started.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => (
                      <Card key={template.id} className="overflow-hidden">
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                                <Palette className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-base">{template.name}</CardTitle>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant={template.is_global ? "default" : "secondary"} className="text-xs">
                                    {template.is_global ? (
                                      <>
                                        <Globe className="mr-1 h-3 w-3" />
                                        Global
                                      </>
                                    ) : (
                                      <>
                                        <User className="mr-1 h-3 w-3" />
                                        Personal
                                      </>
                                    )}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(template.created_at), "MMM d, yyyy")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="py-2 pt-0">
                          {template.description && (
                            <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditTemplate(template)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingTemplate(template)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Card Dialog */}
      <AlertDialog open={!!deleteCardId} onOpenChange={() => setDeleteCardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this card? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user account? This will permanently remove the user and all their
              associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingUser}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground"
              disabled={deletingUser}
            >
              {deletingUser ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Create Card Dialog (with template support) */}
      {selectedUserForCard && (
        <AdminCreateCardDialog
          open={showCreateCardDialog}
          onOpenChange={(open) => {
            setShowCreateCardDialog(open);
            if (!open) setSelectedUserForCard(null);
          }}
          targetUserId={selectedUserForCard.id}
          targetUserName={selectedUserForCard.full_name || "New Card"}
          onSuccess={() => {
            loadCards();
            loadUsers();
          }}
        />
      )}

      {/* Create New User Dialog */}
      <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account. The user will be auto-verified and can sign in immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-user-name">Full Name</Label>
              <Input
                id="new-user-name"
                placeholder="Enter full name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-email">Email</Label>
              <Input
                id="new-user-email"
                type="email"
                placeholder="Enter email address"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-password">Password</Label>
              <Input
                id="new-user-password"
                type="password"
                placeholder="Enter password (min 6 characters)"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">The user can change this password after signing in.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUserDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={creatingUser}>
              {creatingUser ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update the user's email address or reset their password. Leave a field empty to keep the current value.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-user-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="edit-user-email"
                type="email"
                placeholder="Enter new email address"
                value={editUserEmail}
                onChange={(e) => setEditUserEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-password" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                New Password
              </Label>
              <Input
                id="edit-user-password"
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={editUserPassword}
                onChange={(e) => setEditUserPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave empty to keep the current password.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUserDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={updatingUser}>
              {updatingUser ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Select User for Duplicate Dialog */}
      <Dialog open={showSelectUserForDuplicateDialog} onOpenChange={setShowSelectUserForDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Design to User</DialogTitle>
            <DialogDescription>
              Select a user to receive a copy of the card design from "{duplicateSourceCard?.full_name}". Only the
              design elements (theme, images, carousel) will be copied. Personal information will not be transferred.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duplicate-target-user">Select User</Label>
              <Select value={selectedUserForDuplicate} onValueChange={setSelectedUserForDuplicate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{user.full_name || "Unnamed User"}</span>
                        <span className="text-xs text-muted-foreground">({user.email})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSelectUserForDuplicateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmDuplicateToUser} disabled={!selectedUserForDuplicate}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Card Dialog */}
      {duplicateSourceCard && getSelectedUserForDuplicate() && (
        <DuplicateCardDialog
          card={duplicateSourceCard}
          open={showDuplicateDialog}
          onOpenChange={(open) => {
            setShowDuplicateDialog(open);
            if (!open) {
              setDuplicateSourceCard(null);
              setSelectedUserForDuplicate("");
            }
          }}
          targetUserId={selectedUserForDuplicate}
          targetUserName={getSelectedUserForDuplicate()?.full_name || getSelectedUserForDuplicate()?.email || "User"}
          onDuplicated={() => {
            loadCards();
            loadUsers();
          }}
        />
      )}

      {/* Save as Template Dialog */}
      {templateSourceCard && (
        <SaveTemplateDialog
          open={showSaveTemplateDialog}
          onOpenChange={(open) => {
            setShowSaveTemplateDialog(open);
            if (!open) {
              setTemplateSourceCard(null);
              setTemplateProductImages([]);
            }
          }}
          card={templateSourceCard}
          onSaved={() => {
            toast.success(`Template created from '${templateSourceCard.full_name}' and added to your Templates list.`);
            setTemplateSourceCard(null);
            setTemplateProductImages([]);
            loadTemplates();
          }}
        />
      )}

      {/* Edit Template Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>Update the template name and description.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-template-name">Name</Label>
              <Input
                id="edit-template-name"
                value={editTemplateName}
                onChange={(e) => setEditTemplateName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-template-description">Description</Label>
              <Textarea
                id="edit-template-description"
                value={editTemplateDescription}
                onChange={(e) => setEditTemplateDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplateEdit} disabled={!editTemplateName.trim() || savingTemplate}>
              {savingTemplate ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={savingTemplate}
            >
              {savingTemplate ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { AdminCreateCardDialog } from "@/components/admin/AdminCreateCardDialog";
import { DuplicateCardDialog } from "@/components/DuplicateCardDialog";
import { useAdminOverridePayment } from "@/hooks/usePayments";
import { useCardPlans } from "@/hooks/useCardPlans";

type CardData = Tables<"cards">;

interface UserProfile {
  id: string;
  full_name: string | null;
  created_at: string;
  email?: string;
  card_count?: number;
}

// Admin Card Row Component with payment controls
function AdminCardRow({ card, onEdit, onDuplicate, onDelete, onPaymentChange }: {
  card: CardData;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onPaymentChange: () => void;
}) {
  const navigate = useNavigate();
  const adminOverride = useAdminOverridePayment();
  const { data: plans } = useCardPlans();
  const defaultPlan = plans?.find(p => p.code === "ESSENTIAL") || plans?.[0];

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
    onPaymentChange();
  };

  const handlePublishedChange = async (checked: boolean) => {
    const { error } = await supabase
      .from("cards")
      .update({ is_published: checked })
      .eq("id", card.id);
    
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
              const { error } = await supabase
                .from("cards")
                .update({ plan_id: newPlanId })
                .eq("id", card.id);
              if (error) {
                toast.error("Failed to update plan");
              } else {
                toast.success("Plan updated");
                onPaymentChange();
              }
            }}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="No plan">
                {(() => {
                  const plan = plans?.find(p => p.id === card.plan_id);
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
        <Checkbox
          checked={card.is_paid}
          onCheckedChange={handlePaidChange}
          disabled={adminOverride.isPending}
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={card.is_published || false}
          onCheckedChange={handlePublishedChange}
          disabled={!card.is_paid}
        />
      </TableCell>
      <TableCell>{card.views_count || 0}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(card.updated_at).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Card
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate Design to User
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Card
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default function AdminCards() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading, session } = useAuth();
  const [cards, setCards] = useState<CardData[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
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
    await Promise.all([loadCards(), loadUsers()]);
  };

  const loadCards = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("cards").select("*").order("updated_at", { ascending: false });

    if (error) {
      toast.error("Failed to load cards");
    } else {
      setCards(data || []);
    }
    setLoading(false);
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

    // Fetch user emails from admin edge function
    let emailMap: Record<string, string> = {};
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
        }
      }
    } catch (e) {
      console.error("Failed to fetch user emails:", e);
    }

    // Combine data
    const usersWithCounts: UserProfile[] = (profiles || []).map((p) => ({
      ...p,
      email: emailMap[p.id] || "",
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

  const filteredCards = cards.filter((card) => {
    const q = searchTerm.toLowerCase();

    return (
      card.full_name?.toLowerCase().includes(q) ||
      card.slug?.toLowerCase().includes(q) ||
      card.company?.toLowerCase().includes(q) ||
      // owner_name is a new column; cast to any until Supabase types are regenerated
      (card as any).owner_name?.toLowerCase().includes(q)
    );
  });

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
          <Button onClick={() => setShowCreateUserDialog(true)} variant="outline" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Create New User
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
                          <TableHead>Name</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Published</TableHead>
                          <TableHead>Views</TableHead>
                          <TableHead>Updated</TableHead>
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
                              onEdit={() => navigate(`/cards/${card.id}/edit`)}
                              onDuplicate={() => openDuplicateCardFlow(card)}
                              onDelete={() => setDeleteCardId(card.id)}
                              onPaymentChange={loadCards}
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
                        <TableHead>Password</TableHead>
                        <TableHead>Cards</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
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
    </div>
  );
}

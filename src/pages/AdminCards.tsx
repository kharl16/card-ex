import { useEffect, useState } from "react"; // Admin page
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SignOutButton from "@/components/auth/SignOutButton";
import { ArrowLeft, Edit, Trash2, Search, Plus, User, CreditCard, Users, UserPlus } from "lucide-react";
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
import { Label } from "@/components/ui/label";

type CardData = Tables<"cards">;

interface UserProfile {
  id: string;
  full_name: string | null;
  created_at: string;
  email?: string;
  card_count?: number;
}

export default function AdminCards() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<CardData[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [newCardName, setNewCardName] = useState("");
  const [creating, setCreating] = useState(false);
  
  // Create User Dialog state
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: adminCheck, error } = await supabase
      .rpc("is_super_admin", { _user_id: user.id });

    if (error || !adminCheck) {
      toast.error("Access denied: Super admin only");
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    await Promise.all([loadCards(), loadUsers()]);
  };

  const loadCards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .order("updated_at", { ascending: false });

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
    const { data: cardCounts, error: cardsError } = await supabase
      .from("cards")
      .select("user_id");

    if (cardsError) {
      console.error("Failed to load card counts:", cardsError);
    }

    // Count cards per user
    const countMap: Record<string, number> = {};
    cardCounts?.forEach(card => {
      countMap[card.user_id] = (countMap[card.user_id] || 0) + 1;
    });

    // Combine data
    const usersWithCounts: UserProfile[] = (profiles || []).map(p => ({
      ...p,
      card_count: countMap[p.id] || 0
    }));

    setUsers(usersWithCounts);
  };

  const handleDelete = async () => {
    if (!deleteCardId) return;

    const { error } = await supabase
      .from("cards")
      .delete()
      .eq("id", deleteCardId);

    if (error) {
      toast.error("Failed to delete card");
    } else {
      toast.success("Card deleted");
      loadCards();
    }
    setDeleteCardId(null);
  };

  const generateSlug = () => {
    return Math.random().toString(36).substring(2, 10);
  };

  const handleCreateCardForUser = async () => {
    if (!selectedUserId || !newCardName.trim()) {
      toast.error("Please select a user and enter a card name");
      return;
    }

    setCreating(true);
    try {
      const slug = generateSlug();
      const { data, error } = await supabase
        .from("cards")
        .insert({
          user_id: selectedUserId,
          full_name: newCardName.trim(),
          slug: slug,
          is_published: false
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Card created successfully");
      setShowCreateDialog(false);
      setSelectedUserId("");
      setNewCardName("");
      loadCards();
      
      // Navigate to edit the new card
      navigate(`/cards/${data.id}/edit`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create card");
    } finally {
      setCreating(false);
    }
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `https://lorowpouhpjjxembvwyi.supabase.co/functions/v1/admin-create-user`,
        {
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
        }
      );

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

  const filteredCards = cards.filter(card =>
    card.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return <LoadingAnimation />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
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
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Card for User
          </Button>
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
                          <TableHead>Company</TableHead>
                          <TableHead>Slug</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Views</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCards.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              No cards found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCards.map((card) => (
                            <TableRow key={card.id}>
                              <TableCell className="font-medium">{card.full_name}</TableCell>
                              <TableCell>{card.company || "—"}</TableCell>
                              <TableCell className="font-mono text-xs">{card.slug}</TableCell>
                              <TableCell>
                                <Badge variant={card.is_published ? "default" : "secondary"}>
                                  {card.is_published ? "Published" : "Draft"}
                                </Badge>
                              </TableCell>
                              <TableCell>{card.views_count || 0}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(card.updated_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => navigate(`/cards/${card.id}/edit`)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteCardId(card.id)}
                                  >
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
                        <TableHead>User ID</TableHead>
                        <TableHead>Cards</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
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
                            <TableCell className="font-mono text-xs">{user.id.slice(0, 8)}...</TableCell>
                            <TableCell>
                              <Badge variant={user.card_count && user.card_count > 0 ? "default" : "secondary"}>
                                {user.card_count || 0} card{user.card_count !== 1 ? "s" : ""}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => {
                                  setSelectedUserId(user.id);
                                  setNewCardName(user.full_name || "");
                                  setShowCreateDialog(true);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                                Create Card
                              </Button>
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

      {/* Create Card for User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Card for User</DialogTitle>
            <DialogDescription>
              Create a new digital business card on behalf of a user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-select">Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || "Unnamed User"} ({user.card_count || 0} cards)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-name">Card Name (Full Name)</Label>
              <Input
                id="card-name"
                placeholder="Enter the card holder's name"
                value={newCardName}
                onChange={(e) => setNewCardName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCardForUser} disabled={creating}>
              {creating ? "Creating..." : "Create Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <p className="text-xs text-muted-foreground">
                The user can change this password after signing in.
              </p>
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
    </div>
  );
}

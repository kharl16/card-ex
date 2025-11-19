import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import SignOutButton from "@/components/auth/SignOutButton";
import { ArrowLeft, Edit, Trash2, Search } from "lucide-react";
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

type CardData = Tables<"cards">;

export default function AdminCards() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoadCards();
  }, []);

  const checkAdminAndLoadCards = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: isAdmin, error } = await supabase
      .rpc("is_super_admin", { _user_id: user.id });

    if (error || !isAdmin) {
      toast.error("Access denied: Super admin only");
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    loadCards();
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

  const filteredCards = cards.filter(card =>
    card.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.company?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div className="mb-4">
          <Button onClick={() => navigate("/admin/data-tools")} variant="outline">
            Data Tools & Migration
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>All Cards</span>
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
              <div className="rounded-md border">
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
      </main>

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
    </div>
  );
}

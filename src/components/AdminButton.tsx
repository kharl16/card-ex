import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminButton() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAuth();

  if (loading || !isAdmin) {
    return null;
  }

  return (
    <Button
      variant="outline"
      onClick={() => navigate("/admin/cards")}
      className="gap-2"
    >
      <Shield className="h-4 w-4" />
      Admin
    </Button>
  );
}

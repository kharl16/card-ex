import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

interface AdminButtonProps {
  userId?: string;
}

export default function AdminButton({ userId }: AdminButtonProps) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .rpc("is_super_admin", { _user_id: userId });

      if (!error && data) {
        setIsAdmin(true);
      }
      setLoading(false);
    };

    checkAdmin();
  }, [userId]);

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

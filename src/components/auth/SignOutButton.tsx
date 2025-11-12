import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <Button
      variant="outline"
      onClick={signOut}
      disabled={loading}
      className="gap-2"
    >
      <LogOut className="h-4 w-4" />
      {loading ? "Signing out..." : "Sign out"}
    </Button>
  );
}

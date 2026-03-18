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
      size="sm"
      onClick={signOut}
      disabled={loading}
      className="gap-1.5"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{loading ? "Signing out..." : "Sign out"}</span>
    </Button>
  );
}

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SignOutButton from "@/components/auth/SignOutButton";
import AdminButton from "@/components/AdminButton";
import CardExLogo from "@/assets/Card-Ex-Logo.png";

export function ToolsHeader() {
  const navigate = useNavigate();

  return (
    <header className="border-b border-border/50 bg-card/30 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => navigate("/dashboard")}
        >
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden bg-transparent transition-transform duration-300 hover:rotate-12">
            <img src={CardExLogo} alt="Card-Ex Logo" className="h-full w-full object-contain" />
          </div>
          <span className="text-xl font-bold">Card-Ex</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("/dashboard")} variant="outline" size="sm">
            Dashboard
          </Button>
          <AdminButton />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

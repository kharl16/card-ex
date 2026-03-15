import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import LeadManager from "@/components/leads/LeadManager";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
import SignOutButton from "@/components/auth/SignOutButton";

export default function Leads() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden">
                <img src={CardExLogo} alt="Card-Ex" className="h-full w-full object-contain" />
              </div>
              <span className="text-xl font-bold">Lead Inbox</span>
            </div>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <LeadManager />
      </main>
    </div>
  );
}

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, Shield } from "lucide-react";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
const Index = () => {
  const navigate = useNavigate();
  useEffect(() => {
    // Redirect to dashboard if already authenticated
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session) {
        navigate("/dashboard", {
          replace: true
        });
      }
    });
  }, [navigate]);
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden bg-transparent transition-transform duration-300 hover:rotate-12">
              <img src={CardExLogo} alt="Card-Ex Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl font-bold">Card-Ex</span>
          </div>
          
        </div>
      </header>

      <main className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex h-28 w-28 items-center justify-center overflow-hidden bg-transparent animate-fade-in">
            <img src={CardExLogo} alt="Card-Ex Logo" className="h-full w-full object-contain animate-scale-in" />
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight md:text-6xl">
            Your Digital Business Card,
            <br />
            <span className="bg-gradient-to-r from-primary to-primary-subtle bg-clip-text text-transparent">
              Elevated
            </span>
          </h1>
          <p className="mb-8 text-xl text-muted-foreground">
            Create stunning, shareable digital business cards in minutes.
            <br />
            Track engagement, manage contacts, and make lasting impressions.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
              Create Your Card
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/c/demo")}>
              View Demo
            </Button>
          </div>
        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-border/50 bg-card/50 p-6 text-center backdrop-blur">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Track Analytics</h3>
            <p className="text-sm text-muted-foreground">
              See who views your card, scans your QR code, and downloads your contact.
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/50 p-6 text-center backdrop-blur">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Team Management</h3>
            <p className="text-sm text-muted-foreground">
              Create organizations, manage team members, and maintain brand consistency.
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/50 p-6 text-center backdrop-blur">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Secure & Private</h3>
            <p className="text-sm text-muted-foreground">
              Your data is encrypted and secure. Control who sees your information.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/50 bg-card/30 backdrop-blur mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2025 Card-Ex. Built with React, Supabase & Tailwind CSS.</p>
        </div>
      </footer>
    </div>;
};
export default Index;
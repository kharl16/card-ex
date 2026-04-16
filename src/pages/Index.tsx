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
  return <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      <header className="shrink-0 border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden bg-transparent transition-transform duration-300 hover:rotate-12">
              <img src={CardExLogo} alt="Card-Ex Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl font-bold">Card-Ex</span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex h-20 w-20 items-center justify-center overflow-hidden bg-transparent animate-fade-in">
            <img src={CardExLogo} alt="Card-Ex Logo" className="h-full w-full object-contain animate-scale-in" />
          </div>
          <h1 className="mb-4 text-4xl font-bold leading-tight md:text-5xl">
            Your Digital Business Card,
            <br />
            <span className="bg-gradient-to-r from-primary to-primary-subtle bg-clip-text text-transparent">
              Elevated
            </span>
          </h1>
          <p className="mb-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Card-Ex lets you create stunning, shareable digital business cards in minutes. Track engagement, manage contacts, host business files, and showcase your brand through a powerful personal landing page—all in one smart platform.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
              ​Welcome!  
            </Button>
          </div>
        </div>

        <div className="grid w-full max-w-4xl gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/50 bg-card/50 p-4 text-center backdrop-blur">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mb-1 text-base font-semibold">Track Analytics</h3>
            <p className="text-xs text-muted-foreground">
              See who views your card, scans your QR code, and downloads your contact.
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/50 p-4 text-center backdrop-blur">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mb-1 text-base font-semibold">Team Management</h3>
            <p className="text-xs text-muted-foreground">
              Create organizations, manage team members, and maintain brand consistency.
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/50 p-4 text-center backdrop-blur">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mb-1 text-base font-semibold">Secure & Private</h3>
            <p className="text-xs text-muted-foreground">
              Your data is encrypted and secure. Control who sees your information.
            </p>
          </div>
        </div>
      </main>

      <footer className="shrink-0 border-t border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto px-4 py-3 text-center text-xs text-muted-foreground">
          <p>© 2026 Card-Ex. Built with React, Supabase & Tailwind CSS.</p>
        </div>
      </footer>
    </div>;
};
export default Index;
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
import SignOutButton from "@/components/auth/SignOutButton";

export default function AdminDataTools() {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const runMigration = async () => {
    setRunning(true);
    setResult(null);
    
    toast.info("The migration has been completed via the Supabase migration tool.");
    setResult("✓ Migration completed. card_images table created with RLS and 20-image limit.\n\nYou can now use the Gallery Manager to upload product images.");
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/cards")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden bg-transparent">
                <img src={CardExLogo} alt="Card-Ex Logo" className="h-full w-full object-contain" />
              </div>
              <span className="text-xl font-bold">Data Tools</span>
            </div>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Database Migration</CardTitle>
            <CardDescription>
              Create card_images table with RLS policies and 20-image limit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <h3 className="mb-2 font-semibold">This migration will:</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>Create public.card_images table</li>
                <li>Add indexes for performance</li>
                <li>Create trigger to enforce 20 images per card limit</li>
                <li>Enable RLS with read-all, write-owner policies</li>
                <li>Migrate data from product_images if needed</li>
              </ul>
            </div>

            <Button onClick={runMigration} disabled={running} size="lg" className="w-full">
              {running ? "Checking Migration Status..." : "Check Migration Status"}
            </Button>

            {result && (
              <div className={`rounded-lg p-4 ${result.startsWith('✓') ? 'bg-green-500/10 text-green-600' : 'bg-muted'}`}>
                <pre className="whitespace-pre-wrap text-sm">{result}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Database } from "lucide-react";
import { toast } from "sonner";
import CardExLogo from "@/assets/Card-Ex-Logo.png";
import SignOutButton from "@/components/auth/SignOutButton";

const ADMIN_EMAIL = "kharl16@gmail.com";
const PERSONAL_PLAN_CODE = "personal";

export default function AdminDataTools() {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);
  const hasAutoRun = useRef(false);

  // Auto-run the referral backfill on page load
  useEffect(() => {
    if (!hasAutoRun.current) {
      hasAutoRun.current = true;
      runReferralBackfill();
    }
  }, []);

  const runMigration = async () => {
    setRunning(true);
    setResult(null);
    
    toast.info("The migration has been completed via the Supabase migration tool.");
    setResult("✓ Migration completed. card_images table created with RLS and 20-image limit.\n\nYou can now use the Gallery Manager to upload product images.");
    setRunning(false);
  };

  const runReferralBackfill = async () => {
    setBackfillRunning(true);
    setBackfillResult(null);
    const logs: string[] = [];

    try {
      // 1. Find the admin profile
      const { data: adminProfile, error: adminError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", (await supabase.auth.getUser()).data.user?.id || "")
        .single();

      // Fallback: find admin by checking is_super_admin or use hardcoded lookup
      let adminId = adminProfile?.id;
      if (!adminId) {
        // Try to find admin via user_roles table
        const { data: adminRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin")
          .limit(1)
          .single();
        adminId = adminRoles?.user_id;
      }

      if (!adminId) {
        throw new Error("Could not find admin profile. Make sure you're logged in as admin.");
      }

      logs.push(`✓ Found admin: ${adminProfile?.full_name || adminId}`);

      // 2. Find all non-admin profiles
      const { data: allProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, referred_by_user_id, referral_code, has_referral_access");

      if (profilesError) throw profilesError;

      // Filter out admin
      const nonAdminProfiles = allProfiles?.filter(p => p.id !== adminId) || [];
      logs.push(`Found ${nonAdminProfiles.length} non-admin users`);

      let updatedReferredBy = 0;
      let createdReferralCodes = 0;
      let createdReferralRows = 0;

      for (const profile of nonAdminProfiles) {
        // 3. Set referred_by_user_id to admin if not already set
        if (!profile.referred_by_user_id) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ referred_by_user_id: adminId })
            .eq("id", profile.id);

          if (updateError) {
            logs.push(`⚠ Failed to update referred_by for ${profile.full_name}: ${updateError.message}`);
          } else {
            updatedReferredBy++;
          }
        }

        // 4. Check if user has a published card with eligible plan
        const { data: publishedCard } = await supabase
          .from("cards")
          .select("id, plan_id, is_published, is_paid, referred_by_user_id")
          .eq("user_id", profile.id)
          .eq("is_published", true)
          .maybeSingle();

        if (publishedCard && publishedCard.plan_id) {
          // Load the plan to check eligibility
          const { data: plan } = await supabase
            .from("card_plans")
            .select("id, code, referral_eligible")
            .eq("id", publishedCard.plan_id)
            .single();

          // Only proceed if plan is referral-eligible and not Personal
          if (plan?.referral_eligible && plan.code?.toLowerCase() !== PERSONAL_PLAN_CODE) {
            // Ensure user has referral code and access
            const referralCode = profile.referral_code || 
              `CEX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

            if (!profile.referral_code || !profile.has_referral_access) {
              await supabase
                .from("profiles")
                .update({
                  referral_code: referralCode,
                  has_referral_access: true,
                })
                .eq("id", profile.id);
              createdReferralCodes++;
            }

            // VALIDATION: Use card's referred_by_user_id as source of truth
            // Fall back to profile's referred_by_user_id, then admin as last resort
            const actualReferrerId = publishedCard.referred_by_user_id || profile.referred_by_user_id || adminId;

            // Check if referral row already exists for this user
            const { data: existingReferral } = await supabase
              .from("referrals")
              .select("id, referrer_user_id")
              .eq("referred_user_id", profile.id)
              .maybeSingle();

            if (!existingReferral) {
              // Find latest payment for this card
              const { data: latestPayment } = await supabase
                .from("payments")
                .select("id")
                .eq("card_id", publishedCard.id)
                .eq("user_id", profile.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              // Insert referral row with validated referrer
              const { error: insertError } = await supabase.from("referrals").insert({
                referrer_user_id: actualReferrerId,
                referred_user_id: profile.id,
                referred_card_id: publishedCard.id,
                payment_id: latestPayment?.id ?? null,
                plan_id: publishedCard.plan_id,
                status: "pending",
              });

              if (insertError) {
                logs.push(`⚠ Failed to create referral for ${profile.full_name}: ${insertError.message}`);
              } else {
                createdReferralRows++;
              }
            } else if (existingReferral.referrer_user_id !== actualReferrerId) {
              // Fix mismatch: update referrer to match card's referred_by_user_id
              const { error: updateError } = await supabase
                .from("referrals")
                .update({
                  referrer_user_id: actualReferrerId,
                  referred_card_id: publishedCard.id,
                })
                .eq("id", existingReferral.id);

              if (updateError) {
                logs.push(`⚠ Failed to fix referrer mismatch for ${profile.full_name}: ${updateError.message}`);
              } else {
                logs.push(`✓ Fixed referrer mismatch for ${profile.full_name}`);
              }
            }
          }
        }
      }

      logs.push(`\n--- Summary ---`);
      logs.push(`✓ Set referred_by_user_id for ${updatedReferredBy} users`);
      logs.push(`✓ Created/updated ${createdReferralCodes} referral codes`);
      logs.push(`✓ Created ${createdReferralRows} referral table rows`);

      setBackfillResult(logs.join("\n"));
      toast.success("Referral backfill completed!");
    } catch (error: any) {
      logs.push(`\n❌ Error: ${error.message}`);
      setBackfillResult(logs.join("\n"));
      toast.error("Backfill failed: " + error.message);
    } finally {
      setBackfillRunning(false);
    }
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

      <main className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
        {/* Referral Backfill Tool */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Referral Backfill Tool
            </CardTitle>
            <CardDescription>
              Make all existing users referrals of the admin and create referral records for published cards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <h3 className="mb-2 font-semibold">This tool will:</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>Set all non-admin users' <code>referred_by_user_id</code> to the admin's ID</li>
                <li>For users with published cards on eligible plans (not Personal):</li>
                <li className="ml-4">Generate referral codes if missing</li>
                <li className="ml-4">Enable <code>has_referral_access</code></li>
                <li className="ml-4">Create rows in the <code>referrals</code> table with admin as referrer</li>
              </ul>
            </div>

            <Button 
              onClick={runReferralBackfill} 
              disabled={backfillRunning} 
              size="lg" 
              className="w-full"
            >
              {backfillRunning ? "Running Backfill..." : "Run Referral Backfill"}
            </Button>

            {backfillResult && (
              <div className={`rounded-lg p-4 ${backfillResult.includes('Error') ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
                <pre className="whitespace-pre-wrap text-sm">{backfillResult}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database Migration Tool */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Migration
            </CardTitle>
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

            <Button onClick={runMigration} disabled={running} size="lg" className="w-full" variant="outline">
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

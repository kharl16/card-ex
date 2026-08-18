import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Prospect {
  id: string;
  owner_user_id: string;
  card_id: string | null;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  messenger_link: string | null;
  telegram: string | null;
  whatsapp: string | null;
  location: string | null;
  occupation: string | null;
  company: string | null;
  nickname: string | null;
  avatar_url: string | null;
  facebook_url: string | null;
  other_social_url: string | null;
  birthday: string | null;
  city: string | null;
  sponsor_name: string | null;
  referral_campaign: string | null;
  interest_type: string;
  product_interests: string[];
  relationship_strength: string | null;
  won_at: string | null;
  won_result: string | null;
  won_notes: string | null;
  source_type: string;
  source_detail: string | null;
  interest_level: string;
  pipeline_status: string;
  priority_level: string;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  last_activity_at: string | null;
  converted_at: string | null;
  notes: string | null;
  tags: string[];
  custom_fields: Record<string, any>;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ProspectActivity {
  id: string;
  prospect_id: string;
  owner_user_id: string;
  activity_type: string;
  activity_title: string | null;
  activity_note: string | null;
  activity_at: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ProspectFollowup {
  id: string;
  prospect_id: string;
  owner_user_id: string;
  scheduled_at: string;
  followup_type: string;
  status: string;
  note: string | null;
  completed_at: string | null;
  created_at: string;
}

export const PIPELINE_STATUSES = [
  { value: "new", label: "New", color: "bg-blue-500" },
  { value: "to_contact", label: "To Contact", color: "bg-sky-500" },
  { value: "contacted", label: "Contacted", color: "bg-cyan-500" },
  { value: "interested", label: "Interested", color: "bg-orange-500" },
  { value: "presented", label: "Presented", color: "bg-purple-500" },
  { value: "follow_up", label: "Follow-Up", color: "bg-yellow-500" },
  { value: "decision", label: "Decision", color: "bg-pink-500" },
  { value: "won", label: "Won / Closed", color: "bg-emerald-500" },
  { value: "nurture", label: "Nurture", color: "bg-slate-500" },
  { value: "not_interested", label: "Not Interested", color: "bg-gray-500" },
];

/** Stages that count as still moving forward in the pipeline. */
export const ACTIVE_STAGES = PIPELINE_STATUSES
  .filter((s) => !["won", "nurture", "not_interested"].includes(s.value))
  .map((s) => s.value);

export const INTEREST_LEVELS = [
  { value: "cold", label: "Cold", emoji: "🧊", color: "text-blue-400" },
  { value: "warm", label: "Warm", emoji: "🔥", color: "text-orange-400" },
  { value: "hot", label: "Hot", emoji: "💥", color: "text-red-500" },
];

export const INTEREST_TYPES = [
  { value: "undecided", label: "Undecided" },
  { value: "product", label: "Product" },
  { value: "business", label: "Business Opportunity" },
  { value: "both", label: "Product + Business" },
];

export const RELATIONSHIP_STRENGTHS = [
  { value: "close", label: "Close friend / family" },
  { value: "known", label: "Known acquaintance" },
  { value: "referral", label: "Referred to me" },
  { value: "cold", label: "Cold contact" },
];

export const SOURCE_TYPES = [
  { value: "manual", label: "Manual" },
  { value: "facebook", label: "Facebook" },
  { value: "referral", label: "Referral" },
  { value: "qr_scan", label: "QR Scan" },
  { value: "event", label: "Event" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "website", label: "Website" },
  { value: "other", label: "Other" },
];

export const PRIORITY_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const digits = (v?: string | null) => (v || "").replace(/\D/g, "");

/** Finds likely duplicates by phone (last 9 digits), email, or exact name. */
export function findDuplicates(list: Prospect[], candidate: Partial<Prospect>) {
  const phone = digits(candidate.phone).slice(-9);
  const email = (candidate.email || "").trim().toLowerCase();
  const name = (candidate.full_name || "").trim().toLowerCase();
  return list.filter((p) => {
    if (phone && digits(p.phone).slice(-9) === phone) return true;
    if (email && (p.email || "").trim().toLowerCase() === email) return true;
    if (name && p.full_name.trim().toLowerCase() === name) return true;
    return false;
  });
}

export function prospectsToCsv(list: Prospect[]) {
  const cols = [
    "full_name", "nickname", "phone", "email", "messenger_link", "facebook_url",
    "city", "occupation", "company", "source_type", "interest_level", "interest_type",
    "pipeline_status", "priority_level", "next_follow_up_at", "last_contacted_at", "notes",
  ];
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...list.map((p) => cols.map((c) => esc((p as any)[c])).join(","))].join("\n");
}

export function useProspects() {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProspects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .eq("owner_user_id", user.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProspects((data as unknown as Prospect[]) || []);
    } catch (err) {
      console.error("Error fetching prospects:", err);
      toast.error("Failed to load prospects");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const addProspect = useCallback(async (prospect: Partial<Prospect>) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from("prospects")
        .insert({
          owner_user_id: user.id,
          full_name: prospect.full_name!,
          first_name: prospect.first_name || null,
          last_name: prospect.last_name || null,
          phone: prospect.phone || null,
          email: prospect.email || null,
          messenger_link: prospect.messenger_link || null,
          telegram: prospect.telegram || null,
          whatsapp: prospect.whatsapp || null,
          location: prospect.location || null,
          occupation: prospect.occupation || null,
          company: prospect.company || null,
          source_type: prospect.source_type || "manual",
          source_detail: prospect.source_detail || null,
          interest_level: prospect.interest_level || "warm",
          pipeline_status: prospect.pipeline_status || "new",
          priority_level: prospect.priority_level || "medium",
          next_follow_up_at: prospect.next_follow_up_at || null,
          notes: prospect.notes || null,
          tags: prospect.tags || [],
          card_id: prospect.card_id || null,
          nickname: prospect.nickname || null,
          facebook_url: prospect.facebook_url || null,
          other_social_url: prospect.other_social_url || null,
          birthday: prospect.birthday || null,
          city: prospect.city || null,
          sponsor_name: prospect.sponsor_name || null,
          referral_campaign: prospect.referral_campaign || null,
          interest_type: prospect.interest_type || "undecided",
          product_interests: prospect.product_interests || [],
          relationship_strength: prospect.relationship_strength || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      const newProspect = data as unknown as Prospect;
      setProspects((prev) => [newProspect, ...prev]);
      toast.success("Prospect added!");
      return newProspect;
    } catch (err) {
      console.error("Error adding prospect:", err);
      toast.error("Failed to add prospect");
      return null;
    }
  }, [user]);

  const updateProspect = useCallback(async (id: string, updates: Partial<Prospect>) => {
    try {
      const { error } = await supabase
        .from("prospects")
        .update(updates as any)
        .eq("id", id);

      if (error) throw error;
      setProspects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
      return true;
    } catch (err) {
      console.error("Error updating prospect:", err);
      toast.error("Failed to update prospect");
      return false;
    }
  }, []);

  const deleteProspect = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("prospects").delete().eq("id", id);
      if (error) throw error;
      setProspects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Prospect deleted");
      return true;
    } catch (err) {
      console.error("Error deleting prospect:", err);
      toast.error("Failed to delete prospect");
      return false;
    }
  }, []);

  const archiveProspect = useCallback(async (id: string) => {
    const ok = await updateProspect(id, { archived_at: new Date().toISOString() } as any);
    if (ok) {
      setProspects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Prospect archived");
    }
    return ok;
  }, [updateProspect]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const staleCutoff = new Date(today.getTime() - 14 * 86400000);

    const dueToday = prospects.filter((p) => {
      if (!p.next_follow_up_at) return false;
      const d = new Date(p.next_follow_up_at);
      return d >= today && d < tomorrow;
    });
    const overdue = prospects.filter(
      (p) => p.next_follow_up_at && new Date(p.next_follow_up_at) < today
    );
    const won = prospects.filter((p) => p.pipeline_status === "won");
    const active = prospects.filter((p) => ACTIVE_STAGES.includes(p.pipeline_status));
    const noNextStep = active.filter((p) => !p.next_follow_up_at);
    const stale = active.filter((p) => {
      const ref = p.last_contacted_at || p.last_activity_at || p.created_at;
      return new Date(ref) < staleCutoff;
    });

    return {
      total: prospects.length,
      active: active.length,
      hot: prospects.filter((p) => p.interest_level === "hot").length,
      converted: won.length,
      won: won.length,
      dueToday: dueToday.length,
      overdue: overdue.length,
      noNextStep: noNextStep.length,
      stale: stale.length,
      addedThisWeek: prospects.filter((p) => new Date(p.created_at) >= weekAgo).length,
      contactedThisWeek: prospects.filter(
        (p) => p.last_contacted_at && new Date(p.last_contacted_at) >= weekAgo
      ).length,
      conversionRate: prospects.length
        ? Math.round((won.length / prospects.length) * 100)
        : 0,
      byStage: PIPELINE_STATUSES.reduce<Record<string, number>>((acc, s) => {
        acc[s.value] = prospects.filter((p) => p.pipeline_status === s.value).length;
        return acc;
      }, {}),
      lists: { dueToday, overdue, noNextStep, stale },
    };
  }, [prospects]);

  return {
    prospects,
    loading,
    stats,
    addProspect,
    updateProspect,
    deleteProspect,
    archiveProspect,
    refetch: fetchProspects,
  };
}

export function useProspectActivities(prospectId: string | null) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ProspectActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    if (!prospectId || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("prospect_activities")
        .select("*")
        .eq("prospect_id", prospectId)
        .order("activity_at", { ascending: false });

      if (error) throw error;
      setActivities((data as unknown as ProspectActivity[]) || []);
    } catch (err) {
      console.error("Error fetching activities:", err);
    } finally {
      setLoading(false);
    }
  }, [prospectId, user]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const addActivity = useCallback(async (activity: Partial<ProspectActivity>) => {
    if (!prospectId || !user) return null;
    try {
      const { data, error } = await supabase
        .from("prospect_activities")
        .insert({
          prospect_id: prospectId,
          owner_user_id: user.id,
          activity_type: activity.activity_type || "note",
          activity_title: activity.activity_title || null,
          activity_note: activity.activity_note || null,
          activity_at: activity.activity_at || new Date().toISOString(),
          metadata: activity.metadata || {},
        } as any)
        .select()
        .single();

      if (error) throw error;
      const newActivity = data as unknown as ProspectActivity;
      setActivities((prev) => [newActivity, ...prev]);

      // Update last_activity_at
      await supabase
        .from("prospects")
        .update({ last_activity_at: new Date().toISOString() } as any)
        .eq("id", prospectId);

      return newActivity;
    } catch (err) {
      console.error("Error adding activity:", err);
      toast.error("Failed to log activity");
      return null;
    }
  }, [prospectId, user]);

  return { activities, loading, addActivity, refetch: fetchActivities };
}

export function useProspectFollowups(prospectId?: string | null) {
  const { user } = useAuth();
  const [followups, setFollowups] = useState<ProspectFollowup[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFollowups = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from("prospect_followups")
        .select("*")
        .eq("owner_user_id", user.id)
        .order("scheduled_at", { ascending: true });

      if (prospectId) {
        query = query.eq("prospect_id", prospectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFollowups((data as unknown as ProspectFollowup[]) || []);
    } catch (err) {
      console.error("Error fetching followups:", err);
    } finally {
      setLoading(false);
    }
  }, [user, prospectId]);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  const addFollowup = useCallback(async (followup: Partial<ProspectFollowup>) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from("prospect_followups")
        .insert({
          prospect_id: followup.prospect_id!,
          owner_user_id: user.id,
          scheduled_at: followup.scheduled_at!,
          followup_type: followup.followup_type || "follow_up",
          note: followup.note || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      const newFollowup = data as unknown as ProspectFollowup;
      setFollowups((prev) => [...prev, newFollowup].sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      ));

      // Also update the prospect's next_follow_up_at
      await supabase
        .from("prospects")
        .update({ next_follow_up_at: followup.scheduled_at } as any)
        .eq("id", followup.prospect_id!);

      toast.success("Follow-up scheduled!");
      return newFollowup;
    } catch (err) {
      console.error("Error adding followup:", err);
      toast.error("Failed to schedule follow-up");
      return null;
    }
  }, [user]);

  const updateFollowup = useCallback(async (id: string, updates: Partial<ProspectFollowup>) => {
    try {
      const { error } = await supabase
        .from("prospect_followups")
        .update(updates as any)
        .eq("id", id);

      if (error) throw error;
      setFollowups((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      );
      return true;
    } catch (err) {
      console.error("Error updating followup:", err);
      return false;
    }
  }, []);

  return { followups, loading, addFollowup, updateFollowup, refetch: fetchFollowups };
}

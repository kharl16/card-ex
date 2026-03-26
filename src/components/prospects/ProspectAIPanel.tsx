import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Copy, RefreshCw, Loader2, Lightbulb, MessageSquareText, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Prospect, ProspectActivity, ProspectFollowup } from "@/hooks/useProspects";

interface ProspectAIPanelProps {
  prospect: Prospect;
  activities: ProspectActivity[];
  followups: ProspectFollowup[];
}

type AIAction = "summary" | "suggest_reply" | "next_action";

export default function ProspectAIPanel({ prospect, activities, followups }: ProspectAIPanelProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [suggestedReply, setSuggestedReply] = useState<string | null>(null);
  const [nextAction, setNextAction] = useState<string | null>(null);
  const [loading, setLoading] = useState<Record<AIAction, boolean>>({
    summary: false,
    suggest_reply: false,
    next_action: false,
  });

  const callAI = async (action: AIAction) => {
    setLoading((prev) => ({ ...prev, [action]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("prospect-ai", {
        body: { action, prospect, activities, followups },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const result = data.result;
      if (action === "summary") setSummary(result);
      else if (action === "suggest_reply") setSuggestedReply(result);
      else if (action === "next_action") setNextAction(result);
    } catch (err: any) {
      console.error(`AI ${action} error:`, err);
      toast.error(err?.message || "AI request failed");
    } finally {
      setLoading((prev) => ({ ...prev, [action]: false }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="space-y-3">
      {/* AI Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Brain className="h-4 w-4 text-primary" />
              AI Summary
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => callAI("summary")}
              disabled={loading.summary}
            >
              {loading.summary ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : summary ? (
                <RefreshCw className="h-3 w-3" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {summary ? "Refresh" : "Generate"}
            </Button>
          </div>
          {summary ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summary}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">Tap Generate for an AI-powered summary</p>
          )}
        </CardContent>
      </Card>

      {/* Next Best Action */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Next Best Action
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => callAI("next_action")}
              disabled={loading.next_action}
            >
              {loading.next_action ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : nextAction ? (
                <RefreshCw className="h-3 w-3" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {nextAction ? "Refresh" : "Suggest"}
            </Button>
          </div>
          {nextAction ? (
            <p className="text-sm text-muted-foreground">{nextAction}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">Get AI-powered action recommendations</p>
          )}
        </CardContent>
      </Card>

      {/* Suggested Reply */}
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquareText className="h-4 w-4 text-emerald-500" />
              Suggested Reply
            </div>
            <div className="flex items-center gap-1">
              {suggestedReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => copyToClipboard(suggestedReply)}
                >
                  <Copy className="h-3 w-3" /> Copy
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => callAI("suggest_reply")}
                disabled={loading.suggest_reply}
              >
                {loading.suggest_reply ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : suggestedReply ? (
                  <RefreshCw className="h-3 w-3" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {suggestedReply ? "Regenerate" : "Generate"}
              </Button>
            </div>
          </div>
          {suggestedReply ? (
            <div className="bg-background/60 rounded-lg p-3 text-sm border">
              "{suggestedReply}"
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Generate a personalized follow-up message</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

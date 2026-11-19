import { Bot, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHATBOT_NAME_MAX, chatTriggerLabel, resolveChatbotName } from "@/lib/chatbotName";

interface ChatbotNameFieldProps {
  value: string | null | undefined;
  fullName: string | null | undefined;
  onChange: (value: string) => void;
}

export function ChatbotNameField({ value, fullName, onChange }: ChatbotNameFieldProps) {
  const current = value ?? "";
  const previewLabel = chatTriggerLabel(resolveChatbotName(current, fullName));
  const fallbackName = resolveChatbotName(null, fullName);

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="space-y-1">
        <Label htmlFor="chatbot-name" className="text-sm font-semibold">
          Chat button name
        </Label>
        <p className="text-xs text-muted-foreground">
          This name shows on your card's chat button as "Ask [name]". Leave it blank to use{" "}
          {fallbackName ? `your first name (${fallbackName})` : "\u201CAsk AI\u201D"}.
        </p>
      </div>
      <Input
        id="chatbot-name"
        value={current}
        maxLength={CHATBOT_NAME_MAX}
        placeholder={fallbackName || "e.g. Sofia"}
        onChange={(e) => onChange(e.target.value.slice(0, CHATBOT_NAME_MAX))}
        className="h-12 text-base"
        autoComplete="off"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 max-w-full items-center gap-2 rounded-full border border-primary/40 bg-background/80 px-4 py-2 text-primary">
          <span className="relative flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden="true">
            <Bot className="h-5 w-5" strokeWidth={1.8} />
            <Sparkles className="absolute -right-1 -top-1 h-3 w-3 fill-current" strokeWidth={1.5} />
          </span>
          <span className="min-w-0 break-words text-sm font-semibold" data-testid="chatbot-name-preview">
            {previewLabel}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {current.length}/{CHATBOT_NAME_MAX}
        </span>
      </div>
    </div>
  );
}

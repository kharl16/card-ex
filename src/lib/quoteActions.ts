/**
 * Generates a contextual, quote-specific business action when a quote does
 * not carry an explicit `business_action`. Rules are ordered — the first
 * matching category wins — and each one produces a distinct, actionable
 * suggestion so the Daily Quote behaves like the Bible Verse section.
 */

interface ActionRule {
  keywords: string[];
  action: string;
}

const RULES: ActionRule[] = [
  {
    keywords: ["network", "net worth", "connect", "relationship", "circle", "surround yourself"],
    action: "Reach out to one contact today — a prospect, upline, or downline — and add value before asking for anything.",
  },
  {
    keywords: ["start", "begin", "getting started", "first step", "quit talking"],
    action: "Pick the task you have been postponing and take the very first step within the next hour.",
  },
  {
    keywords: ["fail", "failure", "knocked down", "mistake", "fall ", "get up", "lose"],
    action: "Review one recent setback and write down one lesson you will apply to your next presentation.",
  },
  {
    keywords: ["success", "succeed", "achieve", "accomplish", "great", "greatness"],
    action: "Define what success looks like for you this week in one measurable number — then chase it today.",
  },
  {
    keywords: ["time", "clock", "today", "now", "tomorrow", "yesterday", "future", "moment", "day "],
    action: "Block 30 focused minutes today for your highest-priority business activity — no phone, no distractions.",
  },
  {
    keywords: ["idea", "plan", "create", "dream", "imagine", "vision", "invent"],
    action: "Turn one idea into a concrete next step: write it down, set a date, and tell one person about it.",
  },
  {
    keywords: ["work", "hard work", "hustle", "busy", "effort", "labor", "grind"],
    action: "Identify the one task that moves your business forward most, and finish it before anything else today.",
  },
  {
    keywords: ["goal", "target", "aim", "discipline", "habit", "consisten", "daily"],
    action: "Commit to one small daily habit this week (e.g., 3 new contacts a day) and track it tonight.",
  },
  {
    keywords: ["believe", "belief", "think", "mind", "attitude", "confiden", "whether you think"],
    action: "Catch one limiting thought today and reframe it into an empowering statement you say out loud.",
  },
  {
    keywords: ["lead", "leader", "people", "team", "follow", "inspire", "lift", "serve", "help", "give", "others"],
    action: "Find one person on your team or prospect list you can genuinely help today — then do it.",
  },
  {
    keywords: ["risk", "afraid", "fear", "courage", "brave", "comfort zone", "ordinary"],
    action: "Do one thing outside your comfort zone today — call that prospect you have been avoiding.",
  },
  {
    keywords: ["learn", "listen", "mentor", "teach", "education", "read", "study", "wisdom", "knowledge"],
    action: "Spend 15 minutes today learning from a mentor, training, or book — then apply one takeaway immediately.",
  },
  {
    keywords: ["sell", "sale", "customer", "client", "prospect", "business", "market"],
    action: "Present your product or opportunity to at least one new person before the day ends.",
  },
  {
    keywords: ["money", "rich", "wealth", "income", "financial", "invest", "worth"],
    action: "Review one money habit today — track a sale, follow up a payment, or set aside part of today's earnings.",
  },
  {
    keywords: ["change", "improve", "grow", "growth", "better", "progress", "improvement"],
    action: "Choose one part of your routine to improve by just 1% today and write down how you will do it.",
  },
  {
    keywords: ["act", "action", "do ", "doing", "execute", "make it happen", "happen"],
    action: "Stop planning for a moment: execute one revenue-producing action in the next 60 minutes.",
  },
  {
    keywords: ["quit", "give up", "persist", "persever", "keep going", "continue", "stay", "never"],
    action: "When you feel like stopping today, do one more call or follow-up — persistence compounds.",
  },
  {
    keywords: ["focus", "priority", "important", "essential", "simplify", "one thing"],
    action: "Write down your single most important task for tomorrow before you sleep tonight.",
  },
  {
    keywords: ["opportunit", "luck", "chance", "door", "open"],
    action: "Create your own opportunity today: start one conversation with someone not yet on your list.",
  },
  {
    keywords: ["passion", "love", "enjoy", "purpose", "why ", "heart"],
    action: "Reconnect with your 'why' for one minute today — then let it fuel your next prospecting call.",
  },
  {
    keywords: ["quality", "excellent", "best", "good they can't ignore", "master"],
    action: "Raise the bar on one deliverable today — a message, a follow-up, a presentation — make it your best.",
  },
  {
    keywords: ["small", "little", "step", "journey", "mile", "brick"],
    action: "Take one small step on your biggest goal right now — momentum beats motivation.",
  },
];

/** Extracts a quoted phrase or the first meaningful words for a tailored fallback. */
function extractKeyPhrase(text: string): string {
  const words = text
    .replace(/[""".!,;:]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  return words.slice(0, 3).join(" ").toLowerCase() || "this message";
}

export function getQuoteBusinessAction(quoteText: string): string {
  const text = quoteText.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return rule.action;
  }
  return `Reflect on "${extractKeyPhrase(quoteText)}" — then turn it into one concrete business action before the day ends.`;
}

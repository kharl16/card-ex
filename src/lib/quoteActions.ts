/**
 * Generates a contextual, quote-specific business action when a quote does
 * not carry an explicit `business_action`.
 *
 * Matching is word-boundary based (so "know" never triggers "now") and every
 * category holds several variants. The best-scoring category wins and a stable
 * hash of the quote picks the variant, so different quotes on the same theme
 * still get different actions — mirroring the Bible Verse behaviour.
 */

interface ActionRule {
  keywords: string[];
  actions: string[];
}

const RULES: ActionRule[] = [
  {
    keywords: ["network", "networking", "connect", "connection", "relationship", "relationships", "circle", "friends", "people you meet"],
    actions: [
      "Reach out to one contact today and add value before asking for anything.",
      "Reconnect with someone you have not spoken to in 90 days — no pitch, just a check-in.",
      "Add three new names to your prospect list from people you already know.",
      "Introduce two people in your network who could help each other.",
    ],
  },
  {
    keywords: ["fail", "fails", "failure", "mistake", "mistakes", "setback", "defeat", "rejection", "rejected"],
    actions: [
      "Write down one lesson from a recent 'no' and change one line of your invite because of it.",
      "Review your last three lost prospects and identify the one objection you keep missing.",
      "Ask for one rejection today on purpose — then log what you learned.",
      "Turn one past setback into a story you can share in your next presentation.",
    ],
  },
  {
    keywords: ["success", "succeed", "achieve", "achievement", "accomplish", "win", "winning", "greatness"],
    actions: [
      "Define this week's success in one measurable number, then work on it first today.",
      "List the three activities that actually produce results for you and drop one that does not.",
      "Celebrate one win with your team today so the behaviour repeats.",
      "Copy one habit from someone already achieving what you want.",
    ],
  },
  {
    keywords: ["time", "clock", "today", "tomorrow", "yesterday", "moment", "hours", "minutes"],
    actions: [
      "Block 30 uninterrupted minutes today for prospecting — phone on silent.",
      "Cut one recurring time-waster from your calendar this week.",
      "Schedule tomorrow's first business task before you sleep tonight.",
      "Set a 15-minute timer and clear your entire follow-up backlog.",
    ],
  },
  {
    keywords: ["idea", "ideas", "dream", "dreams", "imagine", "imagination", "vision", "create", "creative"],
    actions: [
      "Turn one idea into a dated next step and tell one person about it.",
      "Sketch your 12-month vision in three lines, then pick this week's first move.",
      "Test one new content idea with your audience today.",
      "Write your dream down where you will see it every morning this week.",
    ],
  },
  {
    keywords: ["work", "hustle", "effort", "labor", "grind", "sweat", "hard"],
    actions: [
      "Finish your single highest-impact task before opening any social app today.",
      "Do one extra hour of income-producing activity today, not admin work.",
      "Track your working hours today and see how many were truly productive.",
      "Choose the hardest task on your list and start with it.",
    ],
  },
  {
    keywords: ["goal", "goals", "target", "discipline", "habit", "habits", "consistent", "consistency", "routine"],
    actions: [
      "Commit to a daily number (e.g. three new contacts) and track it tonight.",
      "Build one 10-minute morning routine that starts your business day.",
      "Break your monthly goal into a daily action and put it on your calendar.",
      "Review your streak today — protect it with one small action.",
    ],
  },
  {
    keywords: ["believe", "belief", "mind", "mindset", "attitude", "confidence", "confident", "think", "thoughts"],
    actions: [
      "Catch one limiting thought today and rewrite it into a statement you say out loud.",
      "Spend five minutes visualising your next successful presentation before you make it.",
      "Remove one input (news, feed, person) that lowers your belief this week.",
      "Speak about your business today with the confidence of someone already succeeding.",
    ],
  },
  {
    keywords: ["lead", "leader", "leadership", "team", "serve", "service", "help", "helping", "give", "giving", "others", "inspire"],
    actions: [
      "Help one team member hit their goal today before working on your own.",
      "Do a 10-minute coaching call with your newest partner.",
      "Recognise one person publicly for something they did well this week.",
      "Give something valuable away today with nothing attached to it.",
    ],
  },
  {
    keywords: ["fear", "afraid", "courage", "brave", "risk", "comfort zone", "doubt"],
    actions: [
      "Make the call you have been avoiding — today, before lunch.",
      "Do one thing outside your comfort zone and note how it actually felt.",
      "Send the message you have drafted but never sent.",
      "Ask for the sale directly instead of hinting at it.",
    ],
  },
  {
    keywords: ["learn", "learning", "listen", "mentor", "teach", "read", "study", "wisdom", "knowledge", "education"],
    actions: [
      "Spend 15 minutes on training today and apply one takeaway immediately.",
      "Ask your upline one specific question you have been guessing at.",
      "Listen more than you talk in your next prospect conversation.",
      "Teach what you learned this week to one person on your team.",
    ],
  },
  {
    keywords: ["sell", "sales", "selling", "customer", "customers", "client", "clients", "prospect", "market", "marketing", "business"],
    actions: [
      "Present your product or opportunity to at least one new person today.",
      "Follow up with three prospects who went quiet.",
      "Ask one happy customer for a testimonial or referral.",
      "Improve one line of your opening message and use it five times today.",
    ],
  },
  {
    keywords: ["money", "rich", "wealth", "income", "financial", "invest", "profit", "price", "value"],
    actions: [
      "Review today's numbers: sales made, follow-ups due, income produced.",
      "Set aside a fixed percentage of this week's earnings before spending any of it.",
      "Reinvest one small amount into a tool or training that grows your income.",
      "Identify your most profitable activity and do more of it tomorrow.",
    ],
  },
  {
    keywords: ["change", "improve", "improvement", "grow", "growth", "better", "progress"],
    actions: [
      "Improve one part of your routine by 1% today and write down how.",
      "Change one thing in your presentation and measure the response.",
      "Ask one customer what you could do better — then fix it.",
      "Track one metric this week that you have never tracked before.",
    ],
  },
  {
    keywords: ["quit", "give up", "persist", "persistence", "persevere", "keep going", "never", "again"],
    actions: [
      "When you feel like stopping today, make one more call.",
      "Return to the prospect who said 'not now' and check in properly.",
      "Set a minimum daily activity you will hit even on your worst day.",
      "Finish the task you abandoned yesterday.",
    ],
  },
  {
    keywords: ["focus", "priority", "priorities", "important", "essential", "simple", "simplify", "distraction"],
    actions: [
      "Write your single most important task for tomorrow before you sleep tonight.",
      "Say no to one request today that does not move your business forward.",
      "Close every tab except the one that produces income for the next hour.",
      "Cut your to-do list down to three items and finish them.",
    ],
  },
  {
    keywords: ["opportunity", "opportunities", "luck", "chance", "door", "doors"],
    actions: [
      "Start one conversation today with someone not yet on your list.",
      "Follow up on the opportunity you left sitting in your inbox.",
      "Ask one person today who else they know that you should meet.",
      "Create your own opening: invite someone before they ask.",
    ],
  },
  {
    keywords: ["passion", "love", "purpose", "heart", "meaning", "joy", "enjoy"],
    actions: [
      "Reconnect with your 'why' for one minute, then make your next call from that place.",
      "Share the part of your business you genuinely love with one prospect today.",
      "Do one task today purely because it serves the mission, not the money.",
      "Write down who you are building this business for and keep it visible.",
    ],
  },
  {
    keywords: ["quality", "excellence", "excellent", "best", "master", "mastery", "craft", "skill"],
    actions: [
      "Raise the standard of one deliverable today — message, follow-up, or presentation.",
      "Practise your invite out loud three times before using it.",
      "Fix one sloppy detail in your card or profile right now.",
      "Choose one skill to sharpen for 20 minutes today.",
    ],
  },
  {
    keywords: ["start", "begin", "beginning", "first step", "action", "act", "do it", "execute", "move"],
    actions: [
      "Take the first small step on the task you have been postponing — right now.",
      "Stop planning and execute one revenue-producing action in the next 60 minutes.",
      "Send the first message of a conversation you have delayed starting.",
      "Begin the project at 10% quality today; refine it tomorrow.",
    ],
  },
  {
    keywords: ["small", "little", "step", "steps", "journey", "mile", "day by day", "inch"],
    actions: [
      "Take one small step on your biggest goal right now — momentum beats motivation.",
      "Break your goal into a step so small you cannot talk yourself out of it.",
      "Do one tiny follow-up you keep postponing because it feels unimportant.",
      "Add one name, send one message, book one call — today.",
    ],
  },
];

const GENERIC: string[] = [
  "Turn today's message into one concrete business action before the day ends.",
  "Choose one prospect and apply this idea in your next conversation with them.",
  "Write this principle at the top of your list and let it decide your next task.",
  "Share this thought with your team today and act on it together.",
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

const WORD_CACHE = new Map<string, RegExp>();
function matcher(keyword: string): RegExp {
  let re = WORD_CACHE.get(keyword);
  if (!re) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i");
    WORD_CACHE.set(keyword, re);
  }
  return re;
}

export function getQuoteBusinessAction(quoteText: string): string {
  const text = (quoteText || "").toLowerCase();
  const seed = hash(quoteText || "");

  let best: ActionRule | null = null;
  let bestScore = 0;
  for (const rule of RULES) {
    let score = 0;
    for (const k of rule.keywords) if (matcher(k).test(text)) score++;
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }

  const pool = best ? best.actions : GENERIC;
  return pool[seed % pool.length];
}

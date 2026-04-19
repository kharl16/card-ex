// Book recommendations mapped to DISC personalities and Love Languages
// plus a curated "always great" universal list

export interface Book {
  title: string;
  author: string;
  why: string; // why this book fits the reader
  emoji: string;
}

export const universalBooks: Book[] = [
  { title: "Atomic Habits", author: "James Clear", why: "Build life-changing habits 1% at a time.", emoji: "⚛️" },
  { title: "The 7 Habits of Highly Effective People", author: "Stephen Covey", why: "Timeless framework for personal effectiveness.", emoji: "📘" },
  { title: "Mindset", author: "Carol Dweck", why: "Discover the power of a growth mindset.", emoji: "🧠" },
  { title: "How to Win Friends & Influence People", author: "Dale Carnegie", why: "The classic on people skills and connection.", emoji: "🤝" },
];

// Keyed by DISC type (D, I, S, C)
export const discBooks: Record<string, Book[]> = {
  D: [
    { title: "Extreme Ownership", author: "Jocko Willink & Leif Babin", why: "Decisive leadership lessons from Navy SEALs — perfect for action-takers.", emoji: "🎖️" },
    { title: "Good to Great", author: "Jim Collins", why: "Hard-driving frameworks for building enduring greatness.", emoji: "🚀" },
    { title: "Start With Why", author: "Simon Sinek", why: "Sharpen the vision behind your bold action.", emoji: "🎯" },
  ],
  I: [
    { title: "Influence", author: "Robert Cialdini", why: "Master the psychology of persuasion you already love using.", emoji: "🌟" },
    { title: "Talk Like TED", author: "Carmine Gallo", why: "Amplify your natural gift for inspiring people.", emoji: "🎤" },
    { title: "Never Eat Alone", author: "Keith Ferrazzi", why: "Take your networking magic to the next level.", emoji: "🥂" },
  ],
  S: [
    { title: "The 5 Love Languages", author: "Gary Chapman", why: "Deepen the loyal relationships you naturally build.", emoji: "❤️" },
    { title: "Boundaries", author: "Henry Cloud & John Townsend", why: "Protect your peace while still being there for others.", emoji: "🛡️" },
    { title: "The Power of Now", author: "Eckhart Tolle", why: "Anchor yourself in the calm, present awareness you crave.", emoji: "🌿" },
  ],
  C: [
    { title: "Deep Work", author: "Cal Newport", why: "Honor your love of focused, high-quality work.", emoji: "🔍" },
    { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", why: "Sharpen your already-analytical mind.", emoji: "🧩" },
    { title: "Principles", author: "Ray Dalio", why: "A systematic approach to life and work decisions.", emoji: "📐" },
  ],
};

// Keyed by Love Language type
export const loveLanguageBooks: Record<string, Book[]> = {
  WORDS: [
    { title: "The 5 Love Languages", author: "Gary Chapman", why: "The original book that explains your language in depth.", emoji: "💬" },
    { title: "Crucial Conversations", author: "Patterson, Grenny, McMillan, Switzler", why: "Use the words that matter most when stakes are high.", emoji: "🗣️" },
  ],
  ACTS: [
    { title: "The Servant", author: "James Hunter", why: "A beautiful story about leadership through serving others.", emoji: "🤲" },
    { title: "Give and Take", author: "Adam Grant", why: "Learn how generous action creates lasting success.", emoji: "🎁" },
  ],
  GIFTS: [
    { title: "The Gifts of Imperfection", author: "Brené Brown", why: "Embrace the deeper meaning behind giving and receiving.", emoji: "🎀" },
    { title: "The Power of Moments", author: "Chip & Dan Heath", why: "Create unforgettable moments with thoughtful gestures.", emoji: "✨" },
  ],
  TIME: [
    { title: "Essentialism", author: "Greg McKeown", why: "Protect your time so you can give your best to who matters.", emoji: "⏳" },
    { title: "Four Thousand Weeks", author: "Oliver Burkeman", why: "A profound reflection on how to spend your limited time.", emoji: "🕰️" },
  ],
  TOUCH: [
    { title: "Hold Me Tight", author: "Sue Johnson", why: "The science of secure, connected love.", emoji: "🤗" },
    { title: "Attached", author: "Amir Levine & Rachel Heller", why: "Understand attachment styles for deeper connection.", emoji: "💞" },
  ],
};

// Mindset → growth or fixed
export const mindsetBooks: Record<string, Book[]> = {
  growth: [
    { title: "Mindset", author: "Carol Dweck", why: "The book that started the growth-mindset movement — go deeper.", emoji: "🌱" },
    { title: "Grit", author: "Angela Duckworth", why: "The science of passion and perseverance.", emoji: "🔥" },
    { title: "Range", author: "David Epstein", why: "Why generalists thrive in a specialized world.", emoji: "🎨" },
  ],
  fixed: [
    { title: "Mindset", author: "Carol Dweck", why: "Start here — discover how to shift from fixed to growth thinking.", emoji: "🧠" },
    { title: "The Obstacle Is the Way", author: "Ryan Holiday", why: "Reframe challenges as fuel for growth.", emoji: "🪨" },
    { title: "Can't Hurt Me", author: "David Goggins", why: "A raw blueprint for breaking past self-imposed limits.", emoji: "💪" },
  ],
};

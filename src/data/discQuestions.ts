export interface DiscQuestion {
  id: number;
  english: string;
  tagalog: string;
  options: {
    A: { type: 'D'; english: string; tagalog: string };
    B: { type: 'I'; english: string; tagalog: string };
    C: { type: 'S'; english: string; tagalog: string };
    D: { type: 'C'; english: string; tagalog: string };
  };
}

export const discQuestions: DiscQuestion[] = [
  {
    id: 1,
    english: "In group settings, I usually:",
    tagalog: "Sa mga grupo, karaniwang ako ay:",
    options: {
      A: { type: 'D', english: "Take charge and lead", tagalog: "Nangunguna at namamahala" },
      B: { type: 'I', english: "Engage with everyone", tagalog: "Nakikipag-ugnayan sa lahat" },
      C: { type: 'S', english: "Support and help others", tagalog: "Tumutulong at sumusuporta" },
      D: { type: 'C', english: "Analyze and plan", tagalog: "Nag-aanalisa at nagpaplano" }
    }
  },
  {
    id: 2,
    english: "When facing challenges, I tend to:",
    tagalog: "Kapag may hamon, ako ay:",
    options: {
      A: { type: 'D', english: "Tackle them head-on", tagalog: "Direktang humaharap" },
      B: { type: 'I', english: "Stay optimistic and motivate others", tagalog: "Positibo at nag-uudyok sa iba" },
      C: { type: 'S', english: "Remain calm and patient", tagalog: "Kalmado at matiyaga" },
      D: { type: 'C', english: "Think through all details carefully", tagalog: "Mag-isip nang mabuti sa detalye" }
    }
  },
  {
    id: 3,
    english: "I am most comfortable when:",
    tagalog: "Mas komportable ako kapag:",
    options: {
      A: { type: 'D', english: "Making quick decisions", tagalog: "Mabilis na nagdedesisyon" },
      B: { type: 'I', english: "Interacting with people", tagalog: "Nakikipag-ugnayan sa tao" },
      C: { type: 'S', english: "Following a routine", tagalog: "Sumusunod sa takdang gawain" },
      D: { type: 'C', english: "Ensuring accuracy", tagalog: "Sigurado sa katumpakan" }
    }
  },
  {
    id: 4,
    english: "People describe me as:",
    tagalog: "Ang tao ay nagsasabi na ako ay:",
    options: {
      A: { type: 'D', english: "Confident and direct", tagalog: "Tapat at may tiwala" },
      B: { type: 'I', english: "Friendly and enthusiastic", tagalog: "Kaibigan at masigasig" },
      C: { type: 'S', english: "Reliable and patient", tagalog: "Mapagkakatiwalaan at matiyaga" },
      D: { type: 'C', english: "Precise and analytical", tagalog: "Eksakto at matalino" }
    }
  },
  {
    id: 5,
    english: "My approach to work is:",
    tagalog: "Ang aking paraan sa trabaho ay:",
    options: {
      A: { type: 'D', english: "Results-focused", tagalog: "Nakatuon sa resulta" },
      B: { type: 'I', english: "Collaborative and creative", tagalog: "Magtutulungan at malikhain" },
      C: { type: 'S', english: "Steady and supportive", tagalog: "Tuluy-tuloy at tumutulong" },
      D: { type: 'C', english: "Thorough and detailed", tagalog: "Detalyado at maingat" }
    }
  },
  {
    id: 6,
    english: "When communicating, I prefer to:",
    tagalog: "Sa pakikipag-usap, mas gusto kong:",
    options: {
      A: { type: 'D', english: "Be brief and to the point", tagalog: "Maikli at direkta" },
      B: { type: 'I', english: "Be expressive and engaging", tagalog: "Mapagpahayag at nakaka-engganyado" },
      C: { type: 'S', english: "Listen and understand", tagalog: "Makinig at umintindi" },
      D: { type: 'C', english: "Provide facts and data", tagalog: "Magbigay ng katotohanan at datos" }
    }
  },
  {
    id: 7,
    english: "In stressful situations, I:",
    tagalog: "Sa mga stresul na sitwasyon, ako ay:",
    options: {
      A: { type: 'D', english: "Take control immediately", tagalog: "Agad na kumokontrol" },
      B: { type: 'I', english: "Look for the positive side", tagalog: "Humanap ng positibong aspeto" },
      C: { type: 'S', english: "Stay calm and stable", tagalog: "Kalmado at matatag" },
      D: { type: 'C', english: "Analyze what went wrong", tagalog: "Mag-analisa ng mali" }
    }
  },
  {
    id: 8,
    english: "My ideal environment is:",
    tagalog: "Ang aking ideal na kapaligiran ay:",
    options: {
      A: { type: 'D', english: "Fast-paced and challenging", tagalog: "Mabilis at mahamon" },
      B: { type: 'I', english: "Social and dynamic", tagalog: "Sosyal at masigla" },
      C: { type: 'S', english: "Calm and predictable", tagalog: "Tahimik at inaasahan" },
      D: { type: 'C', english: "Organized and structured", tagalog: "Organisado at maayos" }
    }
  },
  {
    id: 9,
    english: "I make decisions based on:",
    tagalog: "Gumagawa ako ng desisyon batay sa:",
    options: {
      A: { type: 'D', english: "Logic and results", tagalog: "Lohika at resulta" },
      B: { type: 'I', english: "Intuition and feelings", tagalog: "Instinto at damdamin" },
      C: { type: 'S', english: "Impact on others", tagalog: "Epekto sa iba" },
      D: { type: 'C', english: "Data and analysis", tagalog: "Datos at pagsusuri" }
    }
  },
  {
    id: 10,
    english: "I prefer to:",
    tagalog: "Mas gusto kong:",
    options: {
      A: { type: 'D', english: "Lead and direct", tagalog: "Mamuno at magturo" },
      B: { type: 'I', english: "Inspire and motivate", tagalog: "Mag-udyok at magbigay-lakas" },
      C: { type: 'S', english: "Cooperate and assist", tagalog: "Makipagtulungan at tumulong" },
      D: { type: 'C', english: "Plan and organize", tagalog: "Magplano at mag-ayos" }
    }
  },
  {
    id: 11,
    english: "My strength is being:",
    tagalog: "Ang aking kalakasan ay pagiging:",
    options: {
      A: { type: 'D', english: "Decisive and bold", tagalog: "Matatag at matapang" },
      B: { type: 'I', english: "Energetic and sociable", tagalog: "Masigla at masayahin" },
      C: { type: 'S', english: "Dependable and loyal", tagalog: "Mapagkakatiwalaan at tapat" },
      D: { type: 'C', english: "Careful and systematic", tagalog: "Maingat at sistematiko" }
    }
  },
  {
    id: 12,
    english: "I am motivated by:",
    tagalog: "Ako ay nag-uudyok ng:",
    options: {
      A: { type: 'D', english: "Challenges and competition", tagalog: "Hamon at kumpetisyon" },
      B: { type: 'I', english: "Recognition and fun", tagalog: "Pagkilala at kasiyahan" },
      C: { type: 'S', english: "Stability and harmony", tagalog: "Katatagan at pagkakaisa" },
      D: { type: 'C', english: "Excellence and precision", tagalog: "Kahusayan at katumpakan" }
    }
  },
  {
    id: 13,
    english: "In teams, my role is to:",
    tagalog: "Sa koponan, ang papel ko ay:",
    options: {
      A: { type: 'D', english: "Drive results", tagalog: "Magpatakbo ng resulta" },
      B: { type: 'I', english: "Build relationships", tagalog: "Bumuo ng relasyon" },
      C: { type: 'S', english: "Provide support", tagalog: "Magbigay ng suporta" },
      D: { type: 'C', english: "Ensure quality", tagalog: "Siguruhing de-kalidad" }
    }
  },
  {
    id: 14,
    english: "I handle conflict by:",
    tagalog: "Hinaharap ko ang alitan sa pamamagitan ng:",
    options: {
      A: { type: 'D', english: "Confronting it directly", tagalog: "Direktang harapan" },
      B: { type: 'I', english: "Finding a positive solution", tagalog: "Paghahanap ng positibong solusyon" },
      C: { type: 'S', english: "Mediating peacefully", tagalog: "Pagpapamanhikan ng mapayapa" },
      D: { type: 'C', english: "Analyzing the situation", tagalog: "Pag-analisa ng sitwasyon" }
    }
  },
  {
    id: 15,
    english: "My communication style is:",
    tagalog: "Ang estilo ko sa pakikipag-usap ay:",
    options: {
      A: { type: 'D', english: "Direct and assertive", tagalog: "Direkta at matatag" },
      B: { type: 'I', english: "Warm and expressive", tagalog: "Mainit at mapagpahayag" },
      C: { type: 'S', english: "Calm and patient", tagalog: "Kalmado at matiyaga" },
      D: { type: 'C', english: "Clear and precise", tagalog: "Malinaw at eksakto" }
    }
  },
  {
    id: 16,
    english: "I value:",
    tagalog: "Binibigyang-halaga ko ang:",
    options: {
      A: { type: 'D', english: "Efficiency and achievement", tagalog: "Kahusayan at tagumpay" },
      B: { type: 'I', english: "Relationships and fun", tagalog: "Relasyon at kasiyahan" },
      C: { type: 'S', english: "Trust and consistency", tagalog: "Tiwala at tuluy-tuloy" },
      D: { type: 'C', english: "Accuracy and standards", tagalog: "Katumpakan at pamantayan" }
    }
  },
  {
    id: 17,
    english: "When learning something new, I:",
    tagalog: "Kapag natututo ng bago, ako ay:",
    options: {
      A: { type: 'D', english: "Jump in and figure it out", tagalog: "Tumalon at alamin ito" },
      B: { type: 'I', english: "Learn with others", tagalog: "Matuto kasama ng iba" },
      C: { type: 'S', english: "Take it step by step", tagalog: "Dahan-dahan at hakbang-hakbang" },
      D: { type: 'C', english: "Research thoroughly first", tagalog: "Magsaliksik nang mabuti muna" }
    }
  },
  {
    id: 18,
    english: "My weakness is being:",
    tagalog: "Ang aking kahinaan ay pagiging:",
    options: {
      A: { type: 'D', english: "Too blunt or impatient", tagalog: "Masyadong tuwid o walang pasensya" },
      B: { type: 'I', english: "Too talkative or scattered", tagalog: "Masyadong madaldal o gulo" },
      C: { type: 'S', english: "Too accommodating or slow", tagalog: "Masyadong pumapayag o mabagal" },
      D: { type: 'C', english: "Too critical or perfectionist", tagalog: "Masyadong mapanuri o perpektista" }
    }
  },
  {
    id: 19,
    english: "I respond to pressure by:",
    tagalog: "Tumutugon ako sa presyon sa pamamagitan ng:",
    options: {
      A: { type: 'D', english: "Taking charge", tagalog: "Pag-asa ng kontrol" },
      B: { type: 'I', english: "Staying upbeat", tagalog: "Manatiling masaya" },
      C: { type: 'S', english: "Staying composed", tagalog: "Manatiling kalmado" },
      D: { type: 'C', english: "Reviewing details", tagalog: "Pagsusuri ng detalye" }
    }
  },
  {
    id: 20,
    english: "In a crisis, I:",
    tagalog: "Sa krisis, ako ay:",
    options: {
      A: { type: 'D', english: "Act quickly and decisively", tagalog: "Mabilis at matatag na kumilos" },
      B: { type: 'I', english: "Rally people together", tagalog: "Pagsamahin ang mga tao" },
      C: { type: 'S', english: "Provide stability", tagalog: "Magbigay ng katatagan" },
      D: { type: 'C', english: "Find the root cause", tagalog: "Hanapin ang pangunahing sanhi" }
    }
  },
  {
    id: 21,
    english: "When working on a project, I focus on:",
    tagalog: "Kapag gumagawa ng proyekto, nakatuon ako sa:",
    options: {
      A: { type: 'D', english: "Getting it done fast", tagalog: "Tapusin ito nang mabilis" },
      B: { type: 'I', english: "Making it exciting", tagalog: "Gawing nakakasabik" },
      C: { type: 'S', english: "Keeping everyone involved", tagalog: "Pagsali ng lahat" },
      D: { type: 'C', english: "Ensuring perfection", tagalog: "Siguruhing perpekto" }
    }
  },
  {
    id: 22,
    english: "My friends would say I am:",
    tagalog: "Ang aking mga kaibigan ay magsasabi na ako ay:",
    options: {
      A: { type: 'D', english: "Strong-willed and independent", tagalog: "Malakas ang loob at independyente" },
      B: { type: 'I', english: "Fun-loving and outgoing", tagalog: "Mahilig sa kasiyahan at bukas" },
      C: { type: 'S', english: "Caring and supportive", tagalog: "Maalaga at sumusuporta" },
      D: { type: 'C', english: "Thoughtful and reserved", tagalog: "Maisip at tahimik" }
    }
  },
  {
    id: 23,
    english: "When giving feedback, I am:",
    tagalog: "Kapag nagbibigay ng feedback, ako ay:",
    options: {
      A: { type: 'D', english: "Straightforward and honest", tagalog: "Tuwid at tapat" },
      B: { type: 'I', english: "Encouraging and positive", tagalog: "Nag-uudyok at positibo" },
      C: { type: 'S', english: "Gentle and considerate", tagalog: "Mahinahon at mapagmalasakit" },
      D: { type: 'C', english: "Detailed and constructive", tagalog: "Detalyado at nakatutulong" }
    }
  },
  {
    id: 24,
    english: "I enjoy activities that are:",
    tagalog: "Nasasaya ako sa mga gawain na:",
    options: {
      A: { type: 'D', english: "Competitive and goal-oriented", tagalog: "Mapagkumpitensya at nakatuon sa layunin" },
      B: { type: 'I', english: "Social and interactive", tagalog: "Sosyal at interaktibo" },
      C: { type: 'S', english: "Relaxing and cooperative", tagalog: "Nakakrelaks at nagtutulungan" },
      D: { type: 'C', english: "Structured and informative", tagalog: "Organisado at mapag-aralan" }
    }
  }
];

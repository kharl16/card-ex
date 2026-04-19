export type LoveLanguageType = "WORDS" | "ACTS" | "GIFTS" | "TIME" | "TOUCH";

export interface LoveLanguageOption {
  english: string;
  tagalog: string;
  type: LoveLanguageType;
}

export interface LoveLanguageQuestion {
  english: string;
  tagalog: string;
  options: {
    A: LoveLanguageOption;
    B: LoveLanguageOption;
  };
}

// 24 paired-choice questions (Chapman-style "forced choice" format).
// Each question pits two love languages against each other.
export const loveLanguageQuestions: LoveLanguageQuestion[] = [
  {
    english: "What makes you feel more loved?",
    tagalog: "Ano ang mas nagpaparamdam sa iyo na minamahal?",
    options: {
      A: { english: "Hearing 'I love you' or sweet words.", tagalog: "Marinig ang 'Mahal kita' o matatamis na salita.", type: "WORDS" },
      B: { english: "Spending uninterrupted time together.", tagalog: "Magkasama nang walang abala.", type: "TIME" },
    },
  },
  {
    english: "Which means more to you?",
    tagalog: "Alin ang mas mahalaga para sa iyo?",
    options: {
      A: { english: "Receiving a thoughtful gift.", tagalog: "Tumanggap ng makahulugang regalo.", type: "GIFTS" },
      B: { english: "Getting a warm hug.", tagalog: "Tumanggap ng mainit na yakap.", type: "TOUCH" },
    },
  },
  {
    english: "I feel most appreciated when...",
    tagalog: "Pinakanaaapreciate ako kapag...",
    options: {
      A: { english: "Someone helps with my chores or tasks.", tagalog: "May tumutulong sa aking mga gawain.", type: "ACTS" },
      B: { english: "Someone tells me I did a great job.", tagalog: "May nagsabi na maganda ang ginawa ko.", type: "WORDS" },
    },
  },
  {
    english: "I love it when my partner...",
    tagalog: "Gustung-gusto ko kapag ang aking partner ay...",
    options: {
      A: { english: "Holds my hand in public.", tagalog: "Hinahawakan ang kamay ko sa publiko.", type: "TOUCH" },
      B: { english: "Plans a date just for us.", tagalog: "Nagpaplano ng date para lang sa atin.", type: "TIME" },
    },
  },
  {
    english: "What touches your heart more?",
    tagalog: "Alin ang mas nakakaantig sa iyong puso?",
    options: {
      A: { english: "Surprise gifts on ordinary days.", tagalog: "Mga sorpresang regalo sa ordinaryong araw.", type: "GIFTS" },
      B: { english: "Words of encouragement.", tagalog: "Mga salitang nagbibigay-lakas.", type: "WORDS" },
    },
  },
  {
    english: "I feel close to others when...",
    tagalog: "Pakiramdam ko malapit ako sa iba kapag...",
    options: {
      A: { english: "We sit and talk for hours.", tagalog: "Magkasama kaming nag-uusap nang matagal.", type: "TIME" },
      B: { english: "They do something kind for me.", tagalog: "May ginagawa silang mabait para sa akin.", type: "ACTS" },
    },
  },
  {
    english: "What makes a birthday memorable?",
    tagalog: "Ano ang nagpapaalala sa iyo ng kaarawan?",
    options: {
      A: { english: "A meaningful, well-chosen gift.", tagalog: "Isang makahulugang regalo.", type: "GIFTS" },
      B: { english: "A heartfelt birthday message.", tagalog: "Isang taos-pusong mensahe.", type: "WORDS" },
    },
  },
  {
    english: "I feel cared for when...",
    tagalog: "Pakiramdam ko inaalagaan ako kapag...",
    options: {
      A: { english: "Someone runs an errand for me.", tagalog: "May naglalakad ng aking mga pakay.", type: "ACTS" },
      B: { english: "Someone gives me a back rub.", tagalog: "May nag-mamasahe sa aking likod.", type: "TOUCH" },
    },
  },
  {
    english: "I love receiving...",
    tagalog: "Gustung-gusto kong tumanggap ng...",
    options: {
      A: { english: "Compliments and praise.", tagalog: "Mga papuri at pagkilala.", type: "WORDS" },
      B: { english: "Little surprise gifts.", tagalog: "Maliliit na sorpresang regalo.", type: "GIFTS" },
    },
  },
  {
    english: "Quality moments mean...",
    tagalog: "Ang quality time ay...",
    options: {
      A: { english: "Doing activities together.", tagalog: "Sama-samang paggawa ng mga bagay.", type: "TIME" },
      B: { english: "Sitting close and cuddling.", tagalog: "Magkalapit na umupo at magyakap.", type: "TOUCH" },
    },
  },
  {
    english: "I feel loved when...",
    tagalog: "Pakiramdam ko mahal ako kapag...",
    options: {
      A: { english: "Someone says they're proud of me.", tagalog: "May nagsabing proud sila sa akin.", type: "WORDS" },
      B: { english: "Someone helps with the dishes.", tagalog: "May tumutulong sa paghuhugas ng pinggan.", type: "ACTS" },
    },
  },
  {
    english: "It makes me happy when...",
    tagalog: "Masaya ako kapag...",
    options: {
      A: { english: "I get a souvenir from a trip.", tagalog: "Tumatanggap ako ng pasalubong.", type: "GIFTS" },
      B: { english: "We spend a whole day together.", tagalog: "Buong araw kaming magkasama.", type: "TIME" },
    },
  },
  {
    english: "I appreciate it most when...",
    tagalog: "Pinaka-naaappreciate ko kapag...",
    options: {
      A: { english: "Someone holds me when I'm sad.", tagalog: "May yumayakap kapag malungkot ako.", type: "TOUCH" },
      B: { english: "Someone takes care of my errands.", tagalog: "May humaharap sa aking mga responsibilidad.", type: "ACTS" },
    },
  },
  {
    english: "My favorite gesture is...",
    tagalog: "Ang paborito kong gestura ay...",
    options: {
      A: { english: "Encouraging text messages.", tagalog: "Mga mensahe na nakakapagpalakas-loob.", type: "WORDS" },
      B: { english: "Holding hands or a kiss.", tagalog: "Paghawak ng kamay o halik.", type: "TOUCH" },
    },
  },
  {
    english: "I value when...",
    tagalog: "Mahalaga sa akin kapag...",
    options: {
      A: { english: "Someone surprises me with a gift.", tagalog: "May nagsosorpresa ng regalo.", type: "GIFTS" },
      B: { english: "Someone listens to me carefully.", tagalog: "May nakikinig nang mabuti.", type: "TIME" },
    },
  },
  {
    english: "Helpful actions feel like love when...",
    tagalog: "Pakiramdam kong love ang tulong kapag...",
    options: {
      A: { english: "Someone lightens my workload.", tagalog: "May nagpapagaan ng aking trabaho.", type: "ACTS" },
      B: { english: "Someone gives me a long hug.", tagalog: "May nag-yayakap ng matagal.", type: "TOUCH" },
    },
  },
  {
    english: "I feel most special when...",
    tagalog: "Pakiramdam kong special ako kapag...",
    options: {
      A: { english: "Someone praises my efforts publicly.", tagalog: "May nagpupuri sa aking pagsisikap sa publiko.", type: "WORDS" },
      B: { english: "Someone gives me their full attention.", tagalog: "May nagbibigay ng buong atensyon sa akin.", type: "TIME" },
    },
  },
  {
    english: "I treasure...",
    tagalog: "Pinapahalagahan ko ang...",
    options: {
      A: { english: "Mementos and keepsakes.", tagalog: "Mga alaala at souvenirs.", type: "GIFTS" },
      B: { english: "Acts of kindness from others.", tagalog: "Mga gawang mabait ng iba.", type: "ACTS" },
    },
  },
  {
    english: "Nothing beats...",
    tagalog: "Walang tatalo sa...",
    options: {
      A: { english: "A long conversation with someone I love.", tagalog: "Mahabang usapan sa minamahal.", type: "TIME" },
      B: { english: "A reassuring touch on the shoulder.", tagalog: "Pagdampi sa balikat na nagpapakalma.", type: "TOUCH" },
    },
  },
  {
    english: "I feel deeply valued when...",
    tagalog: "Pakiramdam kong pinahahalagahan ako kapag...",
    options: {
      A: { english: "Someone notices the little things I do.", tagalog: "May napapansin ng maliliit kong ginagawa.", type: "WORDS" },
      B: { english: "Someone brings me my favorite snack.", tagalog: "May nagdadala ng paborito kong meryenda.", type: "GIFTS" },
    },
  },
  {
    english: "What feels most romantic?",
    tagalog: "Ano ang pinaka-romantic?",
    options: {
      A: { english: "A quiet evening just the two of us.", tagalog: "Isang tahimik na gabi ng dalawa.", type: "TIME" },
      B: { english: "A handwritten love letter.", tagalog: "Isang sulat-kamay na love letter.", type: "WORDS" },
    },
  },
  {
    english: "I feel loved when someone...",
    tagalog: "Pakiramdam ko mahal ako kapag may...",
    options: {
      A: { english: "Cooks my favorite meal.", tagalog: "Nagluluto ng paborito kong pagkain.", type: "ACTS" },
      B: { english: "Brings me flowers or chocolates.", tagalog: "Nagdadala ng bulaklak o chocolate.", type: "GIFTS" },
    },
  },
  {
    english: "I am most reassured by...",
    tagalog: "Pinakanapanatag ako sa...",
    options: {
      A: { english: "A gentle touch or hand-hold.", tagalog: "Isang maingat na haplos o paghawak ng kamay.", type: "TOUCH" },
      B: { english: "Hearing 'You mean so much to me'.", tagalog: "Marinig ang 'Mahalaga ka sa akin'.", type: "WORDS" },
    },
  },
  {
    english: "Love is best shown by...",
    tagalog: "Pinakamabisang ipakita ang pag-ibig sa pamamagitan ng...",
    options: {
      A: { english: "Doing thoughtful things without being asked.", tagalog: "Paggawa ng mabuti nang hindi hinihiling.", type: "ACTS" },
      B: { english: "Being fully present with each other.", tagalog: "Buong-buong nandiyan para sa isa't-isa.", type: "TIME" },
    },
  },
];

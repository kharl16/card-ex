export interface DiscPersonalityResult {
  type: 'D' | 'I' | 'S' | 'C';
  englishTitle: string;
  tagalogTitle: string;
  animalName: string;
  emoji: string;
  englishDescription: string;
  tagalogDescription: string;
  strengths: { english: string[]; tagalog: string[] };
  growthTips: { english: string[]; tagalog: string[] };
  color: string;
  bgColor: string;
}

export const discResults: DiscPersonalityResult[] = [
  {
    type: 'D',
    englishTitle: 'Dominant - The Doer',
    tagalogTitle: 'Dominant - Ang Gumagawa',
    animalName: 'Eagle',
    emoji: '🦅',
    englishDescription: 'You are direct, results-oriented, and confident. You thrive on challenges and like to take charge of situations.',
    tagalogDescription: 'Ikaw ay tuwid, nakatuon sa resulta, at may tiwala sa sarili. Namumukod ka sa mga hamon at gustong mamuno.',
    strengths: {
      english: ['Decisive and action-oriented', 'Strong problem-solving skills', 'Confident in leadership roles', 'Able to make quick decisions', 'Goal-focused and driven'],
      tagalog: ['Mabilis magdesisyon at kumilos', 'Mahusay sa paglutas ng problema', 'May tiwala bilang lider', 'Kayang gumawa ng mabilis na desisyon', 'Nakatuon sa layunin at determinado']
    },
    growthTips: {
      english: ['Practice active listening to others', 'Be mindful of how you communicate', 'Consider the feelings of team members', 'Slow down to appreciate details', 'Develop patience in collaborative settings'],
      tagalog: ['Magsanay sa aktibong pakikinig', 'Mag-ingat sa paraan ng pakikipag-usap', 'Isaalang-alang ang damdamin ng iba', 'Bumilis upang pahalagahan ang detalye', 'Mag-develop ng pasensya sa pakikipagtulungan']
    },
    color: 'hsl(0 72% 51%)',
    bgColor: 'hsl(0 72% 95%)',
  },
  {
    type: 'I',
    englishTitle: 'Influential - The Talker',
    tagalogTitle: 'Influential - Ang Madaldal',
    animalName: 'Rooster',
    emoji: '🐓',
    englishDescription: 'You are enthusiastic, optimistic, and sociable. You love connecting with people and inspiring them.',
    tagalogDescription: 'Ikaw ay masigasig, positibo, at sosyal. Mahilig kang makipag-ugnayan at mag-inspire sa iba.',
    strengths: {
      english: ['Excellent communication skills', 'Natural ability to motivate others', 'Creative and innovative thinker', 'Builds strong relationships easily', 'Brings positive energy to teams'],
      tagalog: ['Mahusay sa pakikipag-usap', 'Natural na nag-uudyok sa iba', 'Malikhain at makabago', 'Madaling makabuo ng malakas na relasyon', 'Nagdadala ng positibong enerhiya']
    },
    growthTips: {
      english: ['Follow through on commitments', 'Focus on completing tasks', 'Pay attention to important details', 'Balance talking with listening', 'Stay organized and manage time well'],
      tagalog: ['Tuparin ang mga pangako', 'Tumuon sa pagtatapos ng gawain', 'Bigyang-pansin ang mahahalagang detalye', 'Balansehin ang pagsasalita at pakikinig', 'Manatiling organisado at pamahalaan ang oras']
    },
    color: 'hsl(45 93% 47%)',
    bgColor: 'hsl(45 93% 94%)',
  },
  {
    type: 'S',
    englishTitle: 'Steady - The Peaceful',
    tagalogTitle: 'Steady - Ang Mapayapa',
    animalName: 'Carabao',
    emoji: '🐃',
    englishDescription: 'You are patient, reliable, and supportive. You value harmony and prefer stable, predictable environments.',
    tagalogDescription: 'Ikaw ay matiyaga, mapagkakatiwalaan, at tumutulong. Pinahahalagahan mo ang pagkakaisa at mas gusto ang matatag na kapaligiran.',
    strengths: {
      english: ['Dependable and consistent', 'Excellent team player', 'Good listener and empathetic', 'Calm under pressure', 'Creates harmonious environments'],
      tagalog: ['Mapagkakatiwalaan at tuluy-tuloy', 'Mahusay na kasama sa team', 'Mabuting tagapakinig at nakakaunawa', 'Kalmado sa presyon', 'Lumilikha ng mapayapang kapaligiran']
    },
    growthTips: {
      english: ['Be open to change and new ideas', 'Learn to say no when needed', 'Speak up about your own needs', 'Take initiative more often', 'Embrace healthy challenges'],
      tagalog: ['Maging bukas sa pagbabago at bagong ideya', 'Matutong tumanggi kung kinakailangan', 'Magsalita tungkol sa sariling pangangailangan', 'Mas madalas na magsimula', 'Tanggapin ang malusog na hamon']
    },
    color: 'hsl(142 71% 45%)',
    bgColor: 'hsl(142 71% 94%)',
  },
  {
    type: 'C',
    englishTitle: 'Conscientious - The Thinker',
    tagalogTitle: 'Conscientious - Ang Mag-isip',
    animalName: 'Tarsier',
    emoji: '🔍',
    englishDescription: 'You are analytical, detail-oriented, and precise. You value accuracy and prefer to work with facts and data.',
    tagalogDescription: 'Ikaw ay analytical, detalyado, at eksakto. Pinahahalagahan mo ang katumpakan at mas gusto ang datos at katotohanan.',
    strengths: {
      english: ['High standards for quality', 'Systematic and organized', 'Thorough and accurate', 'Strong analytical skills', 'Excellent at planning'],
      tagalog: ['Mataas na pamantayan sa kalidad', 'Sistematiko at organisado', 'Masusing at tumpak', 'Mahusay sa pagsusuri', 'Mahusay sa pagpaplano']
    },
    growthTips: {
      english: ['Accept that perfection is not always possible', 'Be more flexible with deadlines', 'Share your thoughts more openly', 'Take calculated risks', 'Focus on progress over perfection'],
      tagalog: ['Tanggapin na hindi laging posible ang perpeksyon', 'Maging mas flexible sa deadline', 'Ibahagi ang iyong mga kaisipan nang mas bukas', 'Kumuha ng mga calculated risk', 'Tumuon sa pag-unlad kaysa perpeksyon']
    },
    color: 'hsl(221 83% 53%)',
    bgColor: 'hsl(221 83% 94%)',
  }
];

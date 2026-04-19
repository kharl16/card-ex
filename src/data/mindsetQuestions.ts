// Carol Dweck-inspired Fixed vs Growth Mindset Quiz
// "growth" = growth-mindset statement, "fixed" = fixed-mindset statement
// User rates agreement on a 1-5 scale (1 = Strongly Disagree, 5 = Strongly Agree)

export type MindsetType = "growth" | "fixed";

export interface MindsetQuestion {
  id: number;
  english: string;
  tagalog: string;
  type: MindsetType; // which mindset agreeing with this statement reflects
}

export const mindsetQuestions: MindsetQuestion[] = [
  { id: 1, english: "My intelligence is something I can't change very much.", tagalog: "Hindi gaanong nababago ang aking talino.", type: "fixed" },
  { id: 2, english: "I can always substantially change how intelligent I am.", tagalog: "Kaya kong palaguin ang aking talino.", type: "growth" },
  { id: 3, english: "When I fail at something, I usually try a new strategy.", tagalog: "Kapag bumagsak ako, sumusubok ako ng bagong paraan.", type: "growth" },
  { id: 4, english: "Talent is something you're born with — you either have it or you don't.", tagalog: "Ang talento ay likas — meron o wala.", type: "fixed" },
  { id: 5, english: "I love taking on challenges that stretch my abilities.", tagalog: "Gusto kong tanggapin ang mga hamon na sumusubok sa kakayahan ko.", type: "growth" },
  { id: 6, english: "I avoid tasks where I might look incompetent.", tagalog: "Iniiwasan ko ang mga gawaing posibleng magmukha akong hindi marunong.", type: "fixed" },
  { id: 7, english: "Effort is what makes you good at something.", tagalog: "Ang sipag ang nagpapahusay sa isang tao.", type: "growth" },
  { id: 8, english: "If I'm not naturally good at something, I'm unlikely to ever be.", tagalog: "Kung hindi ako likas na magaling sa isang bagay, mahirap akong gumaling.", type: "fixed" },
  { id: 9, english: "Criticism helps me improve.", tagalog: "Nakatutulong sa akin ang puna para gumaling.", type: "growth" },
  { id: 10, english: "I get defensive when someone gives me feedback.", tagalog: "Nadi-defensive ako kapag may nagbibigay ng feedback.", type: "fixed" },
  { id: 11, english: "Setbacks motivate me to work harder.", tagalog: "Ang mga pagkabigo ay nagtutulak sa akin na magsumikap pa.", type: "growth" },
  { id: 12, english: "When things get hard, I usually want to give up.", tagalog: "Kapag nahihirapan, kadalasang sumusuko ako.", type: "fixed" },
  { id: 13, english: "I'm inspired when others succeed.", tagalog: "Naiinspire ako kapag ang iba ay nagtatagumpay.", type: "growth" },
  { id: 14, english: "I feel threatened by the success of people around me.", tagalog: "Pakiramdam ko'y nababanta ako sa tagumpay ng iba.", type: "fixed" },
  { id: 15, english: "I believe my basic abilities can be developed through dedication.", tagalog: "Naniniwala ako na napapaunlad ang kakayahan sa pamamagitan ng dedikasyon.", type: "growth" },
  { id: 16, english: "Either you're a 'people person' or you're not — it can't really be learned.", tagalog: "Likas lang ang pakikisama — hindi ito natututunan.", type: "fixed" },
];

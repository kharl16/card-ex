// Bilingual daily affirmations grouped by category

export type AffirmationCategory = "success" | "confidence" | "abundance" | "relationships" | "gratitude" | "resilience";

export interface Affirmation {
  english: string;
  tagalog: string;
}

export const affirmationCategories: Record<AffirmationCategory, { en: string; tl: string; emoji: string; affirmations: Affirmation[] }> = {
  success: {
    en: "Success",
    tl: "Tagumpay",
    emoji: "🏆",
    affirmations: [
      { english: "I attract success by being prepared, focused, and persistent.", tagalog: "Akit ko ang tagumpay sa pamamagitan ng paghahanda at tiyaga." },
      { english: "Every action I take today moves me closer to my biggest goals.", tagalog: "Bawat hakbang ko ngayon ay paglapit sa aking pangarap." },
      { english: "I am worthy of every breakthrough I am about to receive.", tagalog: "Karapat-dapat ako sa bawat tagumpay na paparating." },
      { english: "My potential is limitless and I am unlocking it daily.", tagalog: "Walang hangganan ang aking kakayahan at araw-araw kong binubuksan." },
      { english: "I turn obstacles into stepping stones for greater success.", tagalog: "Ginagawa kong daan ang bawat hadlang patungo sa tagumpay." },
    ],
  },
  confidence: {
    en: "Confidence",
    tl: "Tiwala sa Sarili",
    emoji: "💎",
    affirmations: [
      { english: "I trust my abilities and act with bold confidence.", tagalog: "Pinagkakatiwalaan ko ang aking sarili at kumikilos ako nang may tapang." },
      { english: "I am exactly the person I need to be right now.", tagalog: "Ako mismo ang tao na kailangan ko ngayon." },
      { english: "My voice matters and people benefit from what I share.", tagalog: "Mahalaga ang aking boses at nakikinabang ang iba sa aking ibinabahagi." },
      { english: "I show up fully — fearlessly and unapologetically.", tagalog: "Pinapakita ko ang sarili kong buo — walang takot at walang paumanhin." },
      { english: "I belong in every room I walk into.", tagalog: "Karapat-dapat ako sa bawat lugar na aking pasukin." },
    ],
  },
  abundance: {
    en: "Abundance",
    tl: "Kasaganaan",
    emoji: "✨",
    affirmations: [
      { english: "Money flows to me easily and frequently from multiple sources.", tagalog: "Madali at madalas dumadating ang pera sa akin mula sa iba't ibang pinagmulan." },
      { english: "I am a magnet for opportunities and prosperity.", tagalog: "Ako ay magnet ng oportunidad at kasaganaan." },
      { english: "My income grows because the value I give grows.", tagalog: "Lumalago ang kita ko dahil lumalago rin ang halaga ng aking serbisyo." },
      { english: "There is always more than enough for me and those I love.", tagalog: "Lagi't laging sapat at sobra para sa akin at sa mga mahal ko sa buhay." },
      { english: "I welcome wealth with open hands and a grateful heart.", tagalog: "Tinatanggap ko ang kayamanan nang may bukas na palad at nagpapasalamat na puso." },
    ],
  },
  relationships: {
    en: "Relationships",
    tl: "Mga Relasyon",
    emoji: "❤️",
    affirmations: [
      { english: "I attract people who uplift, support, and inspire me.", tagalog: "Akit ko ang mga taong nagpapataas, sumusuporta, at nagbibigay-inspirasyon sa akin." },
      { english: "I give love freely and receive love deeply.", tagalog: "Malayang nagbibigay ako ng pagmamahal at malalim akong tumatanggap nito." },
      { english: "My presence is a gift to those around me.", tagalog: "Ang aking presensya ay regalo sa mga taong nakapaligid sa akin." },
      { english: "I build relationships rooted in trust, honesty, and respect.", tagalog: "Nagtatayo ako ng relasyong nakaugat sa tiwala, katapatan, at paggalang." },
      { english: "I forgive easily and release what no longer serves me.", tagalog: "Madali akong nagpapatawad at binibitawan ang hindi na para sa akin." },
    ],
  },
  gratitude: {
    en: "Gratitude",
    tl: "Pasasalamat",
    emoji: "🙏",
    affirmations: [
      { english: "I am grateful for every breath, every chance, every blessing.", tagalog: "Nagpapasalamat ako sa bawat hininga, pagkakataon, at biyaya." },
      { english: "Today I notice the small miracles all around me.", tagalog: "Ngayon napapansin ko ang mga maliliit na himala sa paligid." },
      { english: "Gratitude opens the door to even more good in my life.", tagalog: "Ang pasasalamat ang nagbubukas ng pinto sa mas maraming biyaya." },
      { english: "My heart overflows with appreciation for what I already have.", tagalog: "Umaapaw ang aking puso sa pasasalamat sa mga taglay ko na." },
      { english: "Every day I find new reasons to feel thankful.", tagalog: "Araw-araw may bago akong dahilan para magpasalamat." },
    ],
  },
  resilience: {
    en: "Resilience",
    tl: "Katatagan",
    emoji: "🔥",
    affirmations: [
      { english: "I am stronger than any challenge that comes my way.", tagalog: "Mas malakas ako kaysa sa anumang hamong dumarating." },
      { english: "Every setback is preparing me for an even greater comeback.", tagalog: "Bawat pagkabigo ay paghahanda para sa mas malaking pagbalik." },
      { english: "I rise. I learn. I keep moving forward.", tagalog: "Bumabangon ako. Natututo ako. Patuloy akong sumusulong." },
      { english: "My mind is calm, focused, and unshakable.", tagalog: "Ang aking isip ay kalmado, nakatuon, at hindi natitinag." },
      { english: "I have everything within me to overcome this.", tagalog: "Nasa akin na ang lahat ng kailangan ko para malampasan ito." },
    ],
  },
};

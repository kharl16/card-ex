import { LoveLanguageType } from "./loveLanguageQuestions";

export interface LoveLanguageResult {
  type: LoveLanguageType;
  englishTitle: string;
  tagalogTitle: string;
  emoji: string;
  englishDescription: string;
  tagalogDescription: string;
  howToLove: { english: string[]; tagalog: string[] };
  examples: { english: string[]; tagalog: string[] };
  color: string;
  bgColor: string;
}

export const loveLanguageResults: LoveLanguageResult[] = [
  {
    type: "WORDS",
    englishTitle: "Words of Affirmation",
    tagalogTitle: "Mga Salita ng Pagmamahal",
    emoji: "💬",
    englishDescription:
      "You feel most loved when others express their care through spoken or written words — compliments, encouragement, and verbal affection mean the world to you.",
    tagalogDescription:
      "Pinakanaaapreciate mo ang pagmamahal kapag ipinapahayag ito sa pamamagitan ng salita — papuri, pampalakas-loob, at matatamis na salita ang lubos na nagpapasaya sa iyo.",
    howToLove: {
      english: [
        "Give sincere compliments and praise",
        "Send 'thinking of you' messages",
        "Write thoughtful notes or letters",
        "Verbally acknowledge their efforts",
        "Speak words of encouragement during hard times",
      ],
      tagalog: [
        "Magbigay ng taos-pusong papuri",
        "Magpadala ng 'Naiisip kita' na mensahe",
        "Sumulat ng makahulugang note o sulat",
        "Pasalamatan sila nang verbal",
        "Magbigay ng pampalakas-loob sa mahihirap na sandali",
      ],
    },
    examples: {
      english: [
        "'I'm so proud of you'",
        "'You make my day brighter'",
        "Compliment them on something specific",
        "Praise them in front of others",
      ],
      tagalog: [
        "'Proud na proud ako sayo'",
        "'Mas magaan ang araw ko dahil sa iyo'",
        "Purihin sila sa partikular na bagay",
        "Purihin sila sa harap ng iba",
      ],
    },
    color: "hsl(217 91% 60%)",
    bgColor: "hsl(217 91% 95%)",
  },
  {
    type: "ACTS",
    englishTitle: "Acts of Service",
    tagalogTitle: "Mga Gawa ng Tulong",
    emoji: "🛠️",
    englishDescription:
      "Actions speak louder than words for you. When someone helps you with chores, errands, or daily tasks, you feel deeply loved and supported.",
    tagalogDescription:
      "Mas malakas ang ginagawa kaysa sa sinasabi para sa iyo. Pakiramdam mong mahal ka kapag may tumutulong sa mga gawain o responsibilidad mo.",
    howToLove: {
      english: [
        "Help with daily chores or errands",
        "Cook a meal or bring coffee",
        "Take care of a task they've been dreading",
        "Anticipate their needs and act on them",
        "Offer practical help without being asked",
      ],
      tagalog: [
        "Tumulong sa mga gawain sa bahay",
        "Magluto o magdala ng kape",
        "Asikasuhin ang gawain na ayaw nilang gawin",
        "Hulaan ang kanilang pangangailangan",
        "Mag-alok ng tulong nang hindi hinihiling",
      ],
    },
    examples: {
      english: [
        "Wash the dishes after dinner",
        "Run an errand they've been postponing",
        "Help them prepare for an event",
        "Take care of their pet or plants",
      ],
      tagalog: [
        "Maghugas ng pinggan pagkatapos ng hapunan",
        "Asikasuhin ang ipinagpaliban nilang pakay",
        "Tulungan silang maghanda sa event",
        "Alagaan ang kanilang alaga o halaman",
      ],
    },
    color: "hsl(142 71% 45%)",
    bgColor: "hsl(142 71% 95%)",
  },
  {
    type: "GIFTS",
    englishTitle: "Receiving Gifts",
    tagalogTitle: "Pagtanggap ng Regalo",
    emoji: "🎁",
    englishDescription:
      "It's not about the price — it's the thought. Meaningful, well-chosen gifts make you feel cherished and remembered.",
    tagalogDescription:
      "Hindi presyo ang importante — ang nasa isip. Pakiramdam mong pinahahalagahan kapag tumatanggap ka ng makahulugang regalo.",
    howToLove: {
      english: [
        "Give thoughtful, personalized gifts",
        "Bring small surprises 'just because'",
        "Remember special dates with a token",
        "Pay attention to what they admire",
        "Make handmade gifts that show effort",
      ],
      tagalog: [
        "Magbigay ng makahulugan at personal na regalo",
        "Magdala ng maliliit na sorpresa",
        "Tandaan ang special na petsa sa pamamagitan ng regalo",
        "Pansinin kung ano ang gusto nila",
        "Gumawa ng handmade na regalo",
      ],
    },
    examples: {
      english: [
        "Their favorite snack from the store",
        "A souvenir from your trip",
        "A book by their favorite author",
        "Flowers on an ordinary day",
      ],
      tagalog: [
        "Paboritong snack nila mula sa tindahan",
        "Pasalubong mula sa biyahe",
        "Libro ng paborito nilang author",
        "Bulaklak sa ordinaryong araw",
      ],
    },
    color: "hsl(330 81% 60%)",
    bgColor: "hsl(330 81% 95%)",
  },
  {
    type: "TIME",
    englishTitle: "Quality Time",
    tagalogTitle: "Quality Time",
    emoji: "⏰",
    englishDescription:
      "Undivided attention is your love language. You feel most connected when someone sets aside distractions to truly be present with you.",
    tagalogDescription:
      "Buong atensyon ang love language mo. Pakiramdam mong konektado ka kapag may nagbibigay ng oras at presensya nang walang abala.",
    howToLove: {
      english: [
        "Plan one-on-one outings",
        "Put away phones and devices when together",
        "Have deep, meaningful conversations",
        "Try a new hobby or activity together",
        "Make eye contact and listen actively",
      ],
      tagalog: [
        "Magplano ng one-on-one na lakad",
        "Itago ang phone kapag magkasama",
        "Mag-usap nang malalim at makahulugan",
        "Subukan ang bagong hobby nang sabay",
        "Tumingin sa mata at makinig nang mabuti",
      ],
    },
    examples: {
      english: [
        "A walk together without phones",
        "A long, uninterrupted conversation",
        "Cooking a meal side by side",
        "Watching a movie together at home",
      ],
      tagalog: [
        "Magkasamang lakad nang walang phone",
        "Mahaba at walang abalang usapan",
        "Magsabay sa pagluluto",
        "Manood ng sine sa bahay",
      ],
    },
    color: "hsl(38 92% 50%)",
    bgColor: "hsl(38 92% 95%)",
  },
  {
    type: "TOUCH",
    englishTitle: "Physical Touch",
    tagalogTitle: "Pisikal na Haplos",
    emoji: "🤗",
    englishDescription:
      "Hugs, hand-holding, and gentle touches communicate love most clearly to you. Physical closeness creates emotional safety.",
    tagalogDescription:
      "Yakap, paghawak ng kamay, at maingat na haplos ang pinakamalinaw na paraan ng pagpapakita ng pag-ibig sa iyo. Nagbibigay ito ng emosyonal na kapanatagan.",
    howToLove: {
      english: [
        "Give frequent hugs",
        "Hold their hand in public",
        "Sit close on the couch",
        "Give a gentle back rub or shoulder squeeze",
        "Greet them with a kiss or hug",
      ],
      tagalog: [
        "Magbigay ng madalas na yakap",
        "Hawakan ang kamay sa publiko",
        "Umupong magkalapit sa sofa",
        "Mag-mahaba-habang masahe sa likod",
        "Bumati ng halik o yakap",
      ],
    },
    examples: {
      english: [
        "A long hug after a hard day",
        "Cuddling while watching TV",
        "Holding hands during a walk",
        "A reassuring pat on the back",
      ],
      tagalog: [
        "Mahabang yakap pagkatapos ng mahirap na araw",
        "Magkayakap habang nanonood ng TV",
        "Magkahawak-kamay sa paglalakad",
        "Pagdampi sa likod bilang pampalakas-loob",
      ],
    },
    color: "hsl(0 84% 60%)",
    bgColor: "hsl(0 84% 95%)",
  },
];

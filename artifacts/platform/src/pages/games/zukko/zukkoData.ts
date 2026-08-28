export interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number;
  hint: string;
}

export interface LevelData {
  level: number;
  questions: Question[];
}

export const ZUKKO_QUESTIONS: Record<string, LevelData[]> = {
  "5-7": [
    {
      level: 1,
      questions: [
        {
          id: 1,
          question: "O'zbekistonda eng teran va eng yirik suv omborlaridan biri qaysi?",
          options: ["Chorvoq", "Kattaqo'rg'on", "Tuyamo'yin", "Andijon"],
          correct: 0,
          hint: "U Toshkent viloyatida joylashgan bo'lib, tog'lar bilan o'ralgan.",
        },
        {
          id: 2,
          question: "Qaysi gaz o'simliklar fotosintez jarayonida ajratib chiqariladi?",
          options: ["Karbonat angidrid", "Kislorod", "Azot", "Vodorod"],
          correct: 1,
          hint: "Insonlar va hayvonlar nafas olishi uchun o'ta zarur gaz.",
        },
        {
          id: 3,
          question: "Alisher Navoiy qaysi yili tavallud topgan?",
          options: ["1441-yil", "1336-yil", "1219-yil", "1501-yil"],
          correct: 0,
          hint: "XV asrning birinchi yarmida Xirot shahrida tug'ilgan.",
        },
        {
          id: 4,
          question: "Eng kichik tub son qaysi?",
          options: ["1", "2", "3", "0"],
          correct: 1,
          hint: "U yagona juft tub son hisoblanadi.",
        },
        {
          id: 5,
          question: "Quyosh sistemasidagi eng katta planeta qaysi?",
          options: ["Mars", "Yupiter", "Saturn", "Venera"],
          correct: 1,
          hint: "U gaz giganti bo'lib, o'lchami bo'yicha 1-o'rinda turadi.",
        },
      ],
    },
    {
      level: 2,
      questions: [
        {
          id: 1,
          question: "Suvning kimyoviy formulasi qanday?",
          options: ["CO2", "H2O", "O2", "NaCl"],
          correct: 1,
          hint: "Ikkita vodorod va bitta kislorod atomidan iborat.",
        },
        {
          id: 2,
          question: "O'zbekiston Respublikasining Davlat Bayrog'i qachon qabul qilingan?",
          options: ["1991-yil 18-noyabr", "1992-yil 8-dekabr", "1991-yil 1-sentabr", "1992-yil 2-iyul"],
          correct: 0,
          hint: "Mustaqillikning birinchi yilida, kuz oyida.",
        },
        {
          id: 3,
          question: "Uchburchakning ichki burchaklari yig'indisi necha gradusga teng?",
          options: ["90°", "180°", "360°", "270°"],
          correct: 1,
          hint: "To'g'ri chiziqli yoyilma burchak darajasiga teng.",
        },
        {
          id: 4,
          question: "'Sariq devni minib' asari muallifi kim?",
          options: ["Xudoyberdi To'xtaboyev", "G'afur G'ulom", "O'tkir Hoshimov", "Said Ahmad"],
          correct: 0,
          hint: "Bolalar sevgan mashhur o'zbek adibi.",
        },
        {
          id: 5,
          question: "Inson tanasidagi eng katta organ qaysi?",
          options: ["Jigar", "Yurak", "Teri", "O'pka"],
          correct: 2,
          hint: "U butun tanamizni tashqi tomondan qoplab turadi.",
        },
      ],
    },
  ],

  "8-9": [
    {
      level: 1,
      questions: [
        {
          id: 1,
          question: "Pifagor teoremasi qaysi turdagi uchburchaklar uchun o'rinli?",
          options: ["Teng tomonli", "O'tkir burchakli", "To'g'ri burchakli", "Teng yonli"],
          correct: 2,
          hint: "Burchaklaridan biri ayni 90 gradusga teng bo'ladi.",
        },
        {
          id: 2,
          question: "Amir Temur nechanchi yilda tavallud topgan?",
          options: ["1336-yil", "1370-yil", "1405-yil", "1250-yil"],
          correct: 0,
          hint: "XIV asrning 30-yillarida Kesh (Shahrisabz) yaqinida.",
        },
        {
          id: 3,
          question: "Atom yadrosi qanday zarralardan tashkil topgan?",
          options: ["Proton va Neytron", "Proton va Elektron", "Neytron va Elektron", "Faqat Elektronlar"],
          correct: 0,
          hint: "Musbat zaryadli va zaryadsiz zarra birgalikda.",
        },
        {
          id: 4,
          question: "'O'tkan kunlar' romanidagi Kumushning otasining ismi nima?",
          options: ["Mirzakarim qutidor", "Hasanali", "Otabek", "Homid"],
          correct: 0,
          hint: "Marg'ilonlik obro'li savdogar kishi.",
        },
        {
          id: 5,
          question: "Yerning tortishish kuchi tezlanishi (g) taxminan nechaga teng?",
          options: ["9.8 m/s²", "5.5 m/s²", "12.1 m/s²", "3.14 m/s²"],
          correct: 0,
          hint: "Fizikada hisob-kitoblar uchun ko'pincha 10 deb olinadi.",
        },
      ],
    },
    {
      level: 2,
      questions: [
        {
          id: 1,
          question: "Kvadrat tenglamaning diskriminant formulasi qanday?",
          options: ["D = b² - 4ac", "D = a² + b²", "D = 2ab - c", "D = b² + 4ac"],
          correct: 0,
          hint: "Burchak koeffitsienti va ildizlar sonini aniqlashda ishlatiladi.",
        },
        {
          id: 2,
          question: "Dunyo okeanidagi eng chuqur botiq qaysi?",
          options: ["Mariana botiqligi", "Sond botiqligi", "Puerto-Riko", "Yava botiqligi"],
          correct: 0,
          hint: "Tinch okeanida joylashgan, chuqurligi 11 km dan ortiq.",
        },
        {
          id: 3,
          question: "Jaloliddin Manguberdi qaysi sulola vakili edi?",
          options: ["Anushteginiylar (Xorazmshohlar)", "Temuriylar", "Qoraxoniylar", "G'aznaviylar"],
          correct: 0,
          hint: "Mo'g'ullarga qarshi mardona kashfiyot ko'rsatgan buyuk hukmdor.",
        },
        {
          id: 4,
          question: "Davriy sistemadagi eng yengil kimyoviy element qaysi?",
          options: ["Vodorod", "Geliy", "Litiy", "Kislorod"],
          correct: 0,
          hint: "Tartib raqami 1 ga teng va bitta protondan iborat.",
        },
        {
          id: 5,
          question: "Inson yuragi nechta kameradan iborat?",
          options: ["4 ta", "2 ta", "3 ta", "6 ta"],
          correct: 0,
          hint: "Ikkita bo'lmacha va ikkita qorunchadan tashkil topgan.",
        },
      ],
    },
  ],

  "10-11": [
    {
      level: 1,
      questions: [
        {
          id: 1,
          question: "Dmitriy Mendeleyev elementlar davriy sistemasini qaysi yili kashf etgan?",
          options: ["1869-yil", "1905-yil", "1789-yil", "1921-yil"],
          correct: 0,
          hint: "XIX asrning ikkinchi yarmida.",
        },
        {
          id: 2,
          question: "Yorug'likning vakuumdagi tezligi necha km/s ga teng?",
          options: ["300,000 km/s", "150,000 km/s", "1,000,000 km/s", "30,000 km/s"],
          correct: 0,
          hint: "Kainotdagi eng yuqori harakat tezligi.",
        },
        {
          id: 3,
          question: "DNK zanjirida Adeninga qaysi azotli asos komplementar bo'ladi?",
          options: ["Timin", "Guanin", "Sitozin", "Urasil"],
          correct: 0,
          hint: "A-T va G-C juftligi qoidasiga ko'ra.",
        },
        {
          id: 4,
          question: "O'zbekistonning eng baland nuqtasi qaysi cho'qqi?",
          options: ["Hazrati Sulton", "Oqsuv", "Chatqol", "Katta Chimyon"],
          correct: 0,
          hint: "Balandligi 4643 metr bo'lib, Hisor tizmasida joylashgan.",
        },
        {
          id: 5,
          question: "Hosilaning geometrik ma'nosi nimani bildiradi?",
          options: ["Urinmaning burchak koeffitsienti", "Egri chiziq uzunligi", "Yuzani", "Tezlanishni"],
          correct: 0,
          hint: "Urinmaning og'ish burchagi tangensi ($k = \\tan\\alpha$).",
        },
      ],
    },
    {
      level: 2,
      questions: [
        {
          id: 1,
          question: "Nyutonning ikkinchi qonuni formulasi qanday yoziladi?",
          options: ["F = m * a", "F = m * g * h", "E = m * c²", "P = U * I"],
          correct: 0,
          hint: "Kuch massa va tezlanish ko'paytmasiga teng.",
        },
        {
          id: 2,
          question: "O'zbekiston Birlashgan Millatlar Tashkilotiga (BMT) qachon a'zo bo'lgan?",
          options: ["1992-yil 2-mart", "1991-yil 1-sentabr", "1993-yil 10-dekabr", "1995-yil 5-may"],
          correct: 0,
          hint: "Mustaqillikning ikkinchi yilida bahorda.",
        },
        {
          id: 3,
          question: "Logarifm $log_2(32)$ nimaga teng?",
          options: ["5", "4", "6", "8"],
          correct: 0,
          hint: "2 ning nechanchi darajasi 32 ga teng bo'ladi?",
        },
        {
          id: 4,
          question: "O'simlik hujayrasini hayvon hujayrasidan ajratib turuvchi asosiy tuzilma qaysi?",
          options: ["Hujayra devori (Sellyuloza)", "Yadro", "Ribosoma", "Mitoxondriya"],
          correct: 0,
          hint: "Pishiq, mustahkam tashqi qobilt sohibi.",
        },
        {
          id: 5,
          question: "Qaysi xalqaro tashkilotning bosh qarorgohi Jenevada joylashgan?",
          options: ["Jahon Sog'liqni Saqlash Tashkiloti (JSST)", "BMT Bosh Assambleyasi", "YUNESKO", "NATO"],
          correct: 0,
          hint: "Sog'liqni saqlash va tibbiyot bilan shug'ullanadi.",
        },
      ],
    },
  ],
};

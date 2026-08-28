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
          hint: "U Toshkent viloyatida joylashgan va tog'lar bilan o'ralgan.",
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
          hint: "XV asrning birinchi yarmida Xirotda tug'ilgan.",
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
          hint: "Bolalar sevgan mashhur o'zbek adibi va satirigi.",
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
          hint: "Musbat zaryadli zarra va zaryadsiz zarra birgalikda.",
        },
        {
          id: 4,
          question: "'O'tkan kunlar' romanidagi kumushning otasining ismi nima edi?",
          options: ["Mirzakarim qutidor", "Hasanali", "Otabek", "Homid"],
          correct: 0,
          hint: "Marg'ilonlik obro'li savdogar kishi.",
        },
        {
          id: 5,
          question: "Yerning tortishish kuchi tezlanishi (g) taxminan nechaga teng?",
          options: ["9.8 m/s²", "5.5 m/s²", "12.1 m/s²", "3.14 m/s²"],
          correct: 0,
          hint: "Fizikada hisob-kitoblar uchun ko'pincha 10 deb ham olinadi.",
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
          question: "Dmitriy Mendeleyev kimyoviy elementlar davriy sistemasini qaysi yili kashf etgan?",
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
          question: "DNK zanjiridagi komplementarlik qoidasiga ko'ra Adeninga qaysi azotli asos mos keladi?",
          options: ["Timin", "Guanin", "Sitozin", "Urasil"],
          correct: 0,
          hint: "A-T va G-C juftligi.",
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
  ],
};

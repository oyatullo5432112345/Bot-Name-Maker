// ============================================================
//  "BEK VA LOLA: SAYOHAT" — O'YIN MA'LUMOTLARI
// ------------------------------------------------------------
//  Bu fayl o'yinning "miyasi". Barcha viloyatlar va topshiriqlar
//  shu yerda. YANGI TOPSHIRIQ QO'SHISH uchun kod bilishingiz
//  shart emas — pastdagi namunalarga qarab, xuddi shunday yozib
//  qo' shasiz. 3 xil topshiriq turi bor:
//
//   1) "quiz"      — 4 variantli test (to'g'ri variant raqami: 0,1,2,3)
//   2) "truefalse" — To'g'ri / Noto'g'ri
//   3) "input"     — javobni yozib kiritish (so'z yoki son)
//
//  Har bir topshiriqda "level" bo'lishi mumkin:
//   "oson" | "orta" | "qiyin"  — o'quvchi tanlagan darajaga mos
//   topshiriqlargina ko'rsatiladi. "level" yozilmasa — HAMMA
//   darajada ko'rinadi.
// ============================================================

export type Difficulty = "oson" | "orta" | "qiyin";

export type TaskType = "quiz" | "truefalse" | "input";

interface BaseTask {
  id: string;
  type: TaskType;
  level?: Difficulty;
  prompt: string;      // Savol matni
  hint?: string;       // Maslahat (ixtiyoriy)
  explain?: string;    // Javobdan keyingi tushuntirish (ixtiyoriy)
}

export interface QuizTask extends BaseTask {
  type: "quiz";
  options: string[];   // Variantlar (odatda 4 ta)
  correct: number;     // To'g'ri variant indeksi: 0 = birinchi, 1 = ikkinchi ...
}

export interface TrueFalseTask extends BaseTask {
  type: "truefalse";
  answer: boolean;     // true = "To'g'ri", false = "Noto'g'ri"
}

export interface InputTask extends BaseTask {
  type: "input";
  answers: string[];   // Qabul qilinadigan javoblar (bir nechta variant yozsa bo'ladi)
  numeric?: boolean;   // true bo'lsa — raqamli klaviatura va faqat son
}

export type Task = QuizTask | TrueFalseTask | InputTask;

export interface Souvenir {
  id: string;
  emoji: string;
  name: string;
}

export interface Region {
  id: string;                 // Noyob kalit (lotincha, bo'shliqsiz): "fargona"
  name: string;               // Ko'rinadigan nomi: "Farg'ona"
  kind: "shahar" | "viloyat" | "respublika";
  order: number;              // Sayohat tartibi (0 dan boshlanadi)
  emoji: string;              // Viloyat ramzi
  landmark: string;           // Mashhur joy / diqqatga sazovor obida
  color: string;              // Sahna asosiy rangi (hex)
  accent: string;             // Ikkinchi rang (hex)
  x: number;                  // Xaritadagi joylashuv (0..100 %)
  y: number;                  // Xaritadagi joylashuv (0..100 %)
  intro: string;              // Bek/Lola aytadigan kirish — qiziqarli fakt
  souvenir: Souvenir;         // Viloyat yakunlansa olinadigan esdalik
  tasks: Task[];              // Topshiriqlar (bo'sh massiv = "tez kunda")
}

// ------------------------------------------------------------
//  XARAKTERLAR
// ------------------------------------------------------------
export interface Character {
  id: "bek" | "lola";
  defaultName: string;
  emoji: string;
  color: string;
  greeting: string;
}

export const CHARACTERS: Character[] = [
  {
    id: "bek",
    defaultName: "Bek",
    emoji: "👦",
    color: "#2563EB",
    greeting: "Salom! Men Bek. Yur, O'zbekistonni birga kashf qilamiz!",
  },
  {
    id: "lola",
    defaultName: "Lola",
    emoji: "👧",
    color: "#DB2777",
    greeting: "Assalomu alaykum! Men Lola. Sayohatni boshladikmi?",
  },
];

// ------------------------------------------------------------
//  QIYINLIK DARAJALARI (o'quvchi o'zi tanlaydi)
// ------------------------------------------------------------
export const DIFFICULTIES: { id: Difficulty; title: string; emoji: string; desc: string; color: string }[] = [
  { id: "oson",  title: "Oson",   emoji: "🌱", desc: "Boshlovchilar uchun — sokin sur'at", color: "#10B981" },
  { id: "orta",  title: "O'rta",  emoji: "⚡", desc: "O'rtacha — fikrlashni talab qiladi", color: "#F59E0B" },
  { id: "qiyin", title: "Qiyin",  emoji: "🔥", desc: "Chempionlar uchun — jiddiy sinov",   color: "#EF4444" },
];

// ============================================================
//  1-SAYOHAT: O'ZBEKISTON (14 manzil)
//  Tartib: Farg'ona vodiysidan boshlab, g'arbga — Orol dengizigacha.
// ============================================================
export const REGIONS: Region[] = [
  // ====== 0. FARG'ONA (uy — namuna sifatida to'liq to'ldirilgan) ======
  {
    id: "fargona",
    name: "Farg'ona",
    kind: "viloyat",
    order: 0,
    emoji: "🌾",
    landmark: "Farg'ona vodiysi, Marg'ilon atlasi",
    color: "#059669",
    accent: "#34D399",
    x: 88, y: 44,
    intro:
      "Bizning sayohat uyimizdan — go'zal Farg'ona vodiysidan boshlanadi! Bu yer serhosil tuprog'i, atlas-adrasi va mehmondo'st odamlari bilan mashhur.",
    souvenir: { id: "atlas", emoji: "🧣", name: "Marg'ilon atlasi" },
    tasks: [
      {
        id: "fr1",
        type: "quiz",
        level: "oson",
        prompt: "Marg'ilon shahri qaysi hunarmandchilik mahsuloti bilan butun dunyoga mashhur?",
        options: ["Atlas va adras", "Kulolchilik", "Gilamdo'zlik", "Misgarlik"],
        correct: 0,
        hint: "Rang-barang, ipakdan to'qiladigan mato.",
        explain: "Marg'ilon — O'zbekiston ipakchiligi va atlas-adras markazi.",
      },
      {
        id: "fr2",
        type: "truefalse",
        level: "oson",
        prompt: "Farg'ona vodiysi O'zbekistonning eng sertuproq va aholisi zich hududlaridan biri.",
        answer: true,
        explain: "To'g'ri — vodiy serhosil va aholisi juda zich joylashgan.",
      },
      {
        id: "fr3",
        type: "input",
        level: "orta",
        prompt: "Farg'ona vodiysida joylashgan 3 ta viloyatdan birini yozing (Farg'ona, Andijon, ...).",
        answers: ["namangan", "andijon", "fargona", "farg'ona", "fargʻona"],
        hint: "Bobur tavallud topgan viloyat ham shu yerda.",
        explain: "Vodiyda Farg'ona, Andijon va Namangan viloyatlari bor.",
      },
      {
        id: "fr4",
        type: "quiz",
        level: "qiyin",
        prompt: "Mantiqiy savol: Atlas to'qishda ip avval bo'yaladi, keyin to'qiladi. Agar 1 ta naqsh 5 rangdan iborat bo'lsa va har rang 2 daqiqada bo'yalsa, 3 ta bir xil naqsh uchun necha daqiqa bo'yash kerak? (ranglar takrorlanmaydi deb hisoblang)",
        options: ["10 daqiqa", "30 daqiqa", "15 daqiqa", "6 daqiqa"],
        correct: 0,
        hint: "Naqsh bir xil — ranglar bir marta bo'yalib, hammasiga yetadi.",
        explain: "5 rang × 2 daqiqa = 10 daqiqa. Naqsh bir xil bo'lgani uchun bo'yalgan ip 3 tasiga ham yetadi.",
      },
      {
        id: "fr5",
        type: "input",
        level: "orta",
        numeric: true,
        prompt: "Vodiydagi viloyatlar soni nechta?",
        answers: ["3"],
        explain: "Farg'ona, Andijon, Namangan — jami 3 ta.",
      },
    ],
  },

  // ====== 1. ANDIJON (ikkinchi namuna) ======
  {
    id: "andijon",
    name: "Andijon",
    kind: "viloyat",
    order: 1,
    emoji: "📖",
    landmark: "Bobur bog'i",
    color: "#7C3AED",
    accent: "#A78BFA",
    x: 93, y: 38,
    intro:
      "Mana biz Andijondamiz! Bu yer buyuk shoh va shoir Zahiriddin Muhammad Bobur vatani. U 'Boburnoma' asarini yozib, jahon adabiyotiga ulkan hissa qo'shgan.",
    souvenir: { id: "boburnoma", emoji: "📜", name: "Boburnoma kitobi" },
    tasks: [
      {
        id: "an1",
        type: "quiz",
        level: "oson",
        prompt: "Andijonda tug'ilgan buyuk shoh va shoir kim?",
        options: ["Bobur", "Amir Temur", "Ulug'bek", "Navoiy"],
        correct: 0,
        hint: "U 'Boburnoma' asari muallifi.",
        explain: "Zahiriddin Muhammad Bobur — Boburiylar saltanati asoschisi.",
      },
      {
        id: "an2",
        type: "input",
        level: "orta",
        prompt: "Bobur yozgan mashhur tarixiy-memuar asar nomi?",
        answers: ["boburnoma", "bobur noma"],
        hint: "Uning nomi bilan ataladi.",
        explain: "'Boburnoma' — jahonga mashhur tarixiy asar.",
      },
      {
        id: "an3",
        type: "truefalse",
        level: "qiyin",
        prompt: "Bobur Hindistonda Boburiylar (Mug'allar) saltanatiga asos solgan.",
        answer: true,
        explain: "To'g'ri — Bobur 1526-yilda Hindistonda ulkan saltanatga asos solgan.",
      },
    ],
  },

  // ====== 2-13: TEZ KUNDA (xaritada ko'rinadi, topshiriqlar keyin qo'shiladi) ======
  {
    id: "namangan", name: "Namangan", kind: "viloyat", order: 2, emoji: "🌷",
    landmark: "Bobur nomli bog', gullar shahri", color: "#DB2777", accent: "#F472B6",
    x: 86, y: 30,
    intro: "Namangan — 'gullar shahri' nomi bilan mashhur, go'zal bog'lari bilan ko'rkam vodiy shahri.",
    souvenir: { id: "lola_gul", emoji: "🌷", name: "Namangan lolasi" },
    tasks: [],
  },
  {
    id: "toshkent_shahri", name: "Toshkent shahri", kind: "shahar", order: 3, emoji: "🏙️",
    landmark: "Amir Temur xiyoboni, Minor masjidi", color: "#2563EB", accent: "#60A5FA",
    x: 76, y: 29,
    intro: "Poytaxt Toshkent — mamlakatning yuragi. Zamonaviy binolar, metro va tarixiy obidalar uyg'unlashgan ulkan shahar.",
    souvenir: { id: "metro", emoji: "🚇", name: "Toshkent metro jetoni" },
    tasks: [],
  },
  {
    id: "toshkent_viloyati", name: "Toshkent viloyati", kind: "viloyat", order: 4, emoji: "⛰️",
    landmark: "Chorvoq suv ombori, Chimyon tog'lari", color: "#0891B2", accent: "#22D3EE",
    x: 71, y: 35,
    intro: "Toshkent viloyati — tog'lari, Chorvoq suv ombori va chang'i kurortlari bilan mashhur dam olish maskani.",
    souvenir: { id: "chorvoq", emoji: "🏔️", name: "Chorvoq toshchasi" },
    tasks: [],
  },
  {
    id: "sirdaryo", name: "Sirdaryo", kind: "viloyat", order: 5, emoji: "🌊",
    landmark: "Sirdaryo daryosi", color: "#0284C7", accent: "#38BDF8",
    x: 64, y: 46,
    intro: "Sirdaryo viloyati nomini O'rta Osiyodagi ikkinchi yirik daryo — Sirdaryodan olgan. Paxtachilik rivojlangan.",
    souvenir: { id: "paxta", emoji: "🤍", name: "Paxta chanog'i" },
    tasks: [],
  },
  {
    id: "jizzax", name: "Jizzax", kind: "viloyat", order: 6, emoji: "🌲",
    landmark: "Zomin milliy bog'i", color: "#16A34A", accent: "#4ADE80",
    x: 56, y: 46,
    intro: "Jizzax — Zomin tog'lari va archa o'rmonlari bilan mashhur. Zomin — 'O'zbekiston Shveytsariyasi' deyiladi.",
    souvenir: { id: "archa", emoji: "🌲", name: "Zomin archasi" },
    tasks: [],
  },
  {
    id: "samarqand", name: "Samarqand", kind: "viloyat", order: 7, emoji: "🕌",
    landmark: "Registon maydoni, Amir Temur maqbarasi", color: "#0D9488", accent: "#2DD4BF",
    x: 46, y: 55,
    intro: "Samarqand — 2750 yillik qadimiy shahar, Amir Temur poytaxti. Registon maydoni butun dunyoga mashhur.",
    souvenir: { id: "registon", emoji: "🏛️", name: "Registon maketi" },
    tasks: [],
  },
  {
    id: "qashqadaryo", name: "Qashqadaryo", kind: "viloyat", order: 8, emoji: "🏰",
    landmark: "Shahrisabz, Oqsaroy", color: "#CA8A04", accent: "#FACC15",
    x: 50, y: 70,
    intro: "Qashqadaryo — Amir Temur vatani Shahrisabz shu yerda. Oqsaroy qoldiqlari saltanat ulug'vorligidan darak beradi.",
    souvenir: { id: "oqsaroy", emoji: "🏰", name: "Oqsaroy toshi" },
    tasks: [],
  },
  {
    id: "surxondaryo", name: "Surxondaryo", kind: "viloyat", order: 9, emoji: "☀️",
    landmark: "Termiz, qadimiy buddaviylik yodgorliklari", color: "#EA580C", accent: "#FB923C",
    x: 58, y: 85,
    intro: "Surxondaryo — mamlakatning eng janubi, eng issiq hududi. Termiz qadimiy sivilizatsiyalar chorrahasi bo'lgan.",
    souvenir: { id: "termiz", emoji: "🪷", name: "Termiz yodgorligi" },
    tasks: [],
  },
  {
    id: "buxoro", name: "Buxoro", kind: "viloyat", order: 10, emoji: "🕌",
    landmark: "Minorai Kalon, Labi Hovuz", color: "#B45309", accent: "#F59E0B",
    x: 28, y: 55,
    intro: "Buxoro — 'muqaddas shahar', 2300 yildan ortiq tarixga ega. Minorai Kalon shaharning ramzi.",
    souvenir: { id: "minora", emoji: "🗼", name: "Minorai Kalon maketi" },
    tasks: [],
  },
  {
    id: "navoiy", name: "Navoiy", kind: "viloyat", order: 11, emoji: "⛏️",
    landmark: "Qizilqum, Sarmishsoy qoyatosh rasmlari", color: "#9333EA", accent: "#C084FC",
    x: 34, y: 40,
    intro: "Navoiy — sanoat va kon viloyati. Qizilqum cho'li va Sarmishsoydagi qadimiy qoyatosh rasmlari shu yerda.",
    souvenir: { id: "qoyatosh", emoji: "🪨", name: "Sarmishsoy toshi" },
    tasks: [],
  },
  {
    id: "xorazm", name: "Xorazm", kind: "viloyat", order: 12, emoji: "🏯",
    landmark: "Xiva, Ichan Qal'a", color: "#0369A1", accent: "#38BDF8",
    x: 16, y: 42,
    intro: "Xorazm — Xiva shahridagi Ichan Qal'a butunligicha saqlangan ochiq osmon ostidagi muzey. Al-Xorazmiy vatani.",
    souvenir: { id: "ichanqala", emoji: "🏯", name: "Ichan Qal'a darvozasi" },
    tasks: [],
  },
  {
    id: "qoraqalpogiston", name: "Qoraqalpog'iston", kind: "respublika", order: 13, emoji: "🐪",
    landmark: "Mo'ynoq, Orol dengizi", color: "#64748B", accent: "#94A3B8",
    x: 12, y: 22,
    intro: "Sayohatimizning so'nggi manzili — Qoraqalpog'iston. Mo'ynoqdagi 'kemalar qabristoni' Orol dengizi fojiasini eslatadi. Tabiatni asraylik!",
    souvenir: { id: "kema", emoji: "⚓", name: "Mo'ynoq langari" },
    tasks: [],
  },
];

// ------------------------------------------------------------
//  YORDAMCHI FUNKSIYALAR
// ------------------------------------------------------------
export function getRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

/** Tanlangan darajaga mos topshiriqlar (level yozilmagan — hammasida ko'rinadi) */
export function tasksForLevel(region: Region, level: Difficulty): Task[] {
  return region.tasks.filter((t) => !t.level || t.level === level);
}

/** Viloyatda shu daraja uchun o'ynasa bo'ladimi? (topshiriq bormi) */
export function isPlayable(region: Region, level: Difficulty): boolean {
  return tasksForLevel(region, level).length > 0;
}

/** input javobini solishtirishdan oldin tozalaydi */
export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/ʼ|'|`|ʻ/g, "'")   // turli apostroflar → bitta ko'rinish
    .replace(/\s+/g, " ");
}

// ============================================================
//  O'YINNI QULFLASH (butun Sayohat o'yini)
// ------------------------------------------------------------
//  true  = o'yin qulflangan (o'quvchilar kira olmaydi, "tez kunda" ko'rinadi)
//  false = o'yin ochiq (hamma o'ynaydi)
//  Ochish uchun: shu qiymatni false qiling va qayta deploy qiling.
// ============================================================
export const SAYOHAT_LOCKED = true;

// Qulf bo'lsa ham kira oladiganlar (sinab ko'rish / demo uchun — rahbariyat)
const SAYOHAT_BYPASS = ["admin", "director", "zam_direktor", "zavuch"];

/** Shu rol uchun o'yin ochiqmi? */
export function isSayohatOpen(role: string | undefined | null): boolean {
  if (!SAYOHAT_LOCKED) return true;
  return !!role && SAYOHAT_BYPASS.includes(role);
}

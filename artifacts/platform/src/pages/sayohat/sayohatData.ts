// ============================================================
//  "BEK VA LOLA: SAYOHAT v2" — XARITA METASI
// ------------------------------------------------------------
//  Bu faylda endi SAVOLLAR yo'q — savollar BAZADA saqlanadi va
//  admin paneldan qo'shiladi/tahrirlanadi, server ularni baholaydi.
//  Bu faylda faqat xaritaning KO'RINISHI turadi: viloyat nomi,
//  koordinatasi, rangi, emoji, kirish matni va esdaligi.
//
//  Yangi savol qo'shish: ilovada «Sayohat → Savollar» (admin) sahifasidan.
// ============================================================

export type Difficulty = "oson" | "orta" | "qiyin";

export interface Souvenir {
  id: string;
  emoji: string;
  name: string;
}

export interface Region {
  id: string;                 // Noyob kalit (lotincha): "fargona" — baza bilan bir xil
  name: string;               // Ko'rinadigan nomi: "Farg'ona"
  kind: "shahar" | "viloyat" | "respublika";
  order: number;              // Sayohat tartibi (0 dan)
  emoji: string;
  landmark: string;
  color: string;              // Sahna asosiy rangi (hex)
  accent: string;             // Ikkinchi rang (hex)
  x: number;                  // Xaritadagi joylashuv (0..100 %)
  y: number;
  intro: string;              // Bek/Lola aytadigan kirish — qiziqarli fakt
  souvenir: Souvenir;         // Viloyat yakunlansa olinadigan esdalik
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
  { id: "bek",  defaultName: "Bek",  emoji: "👦", color: "#2563EB", greeting: "Salom! Men Bek. Yur, O'zbekistonni birga kashf qilamiz!" },
  { id: "lola", defaultName: "Lola", emoji: "👧", color: "#DB2777", greeting: "Assalomu alaykum! Men Lola. Sayohatni boshladikmi?" },
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
//  1-SAYOHAT: O'ZBEKISTON (14 manzil) — faqat xarita ko'rinishi.
//  id lar migrations/017_sayohat_v2.sql dagi viloyat id lari bilan bir xil.
// ============================================================
export const REGIONS: Region[] = [
  { id: "fargona", name: "Farg'ona", kind: "viloyat", order: 0, emoji: "🌾",
    landmark: "Farg'ona vodiysi, Marg'ilon atlasi", color: "#059669", accent: "#34D399", x: 88, y: 44,
    intro: "Bizning sayohat uyimizdan — go'zal Farg'ona vodiysidan boshlanadi! Bu yer serhosil tuprog'i, atlas-adrasi va mehmondo'st odamlari bilan mashhur.",
    souvenir: { id: "atlas", emoji: "🧣", name: "Marg'ilon atlasi" } },

  { id: "andijon", name: "Andijon", kind: "viloyat", order: 1, emoji: "📖",
    landmark: "Bobur bog'i", color: "#7C3AED", accent: "#A78BFA", x: 93, y: 38,
    intro: "Mana biz Andijondamiz! Bu yer buyuk shoh va shoir Zahiriddin Muhammad Bobur vatani. U 'Boburnoma' asarini yozib, jahon adabiyotiga ulkan hissa qo'shgan.",
    souvenir: { id: "boburnoma", emoji: "📜", name: "Boburnoma kitobi" } },

  { id: "namangan", name: "Namangan", kind: "viloyat", order: 2, emoji: "🌷",
    landmark: "Bobur nomli bog', gullar shahri", color: "#DB2777", accent: "#F472B6", x: 86, y: 30,
    intro: "Namangan — 'gullar shahri' nomi bilan mashhur, go'zal bog'lari bilan ko'rkam vodiy shahri.",
    souvenir: { id: "lola_gul", emoji: "🌷", name: "Namangan lolasi" } },

  { id: "toshkent_shahri", name: "Toshkent shahri", kind: "shahar", order: 3, emoji: "🏙️",
    landmark: "Amir Temur xiyoboni, Minor masjidi", color: "#2563EB", accent: "#60A5FA", x: 76, y: 29,
    intro: "Poytaxt Toshkent — mamlakatning yuragi. Zamonaviy binolar, metro va tarixiy obidalar uyg'unlashgan ulkan shahar.",
    souvenir: { id: "metro", emoji: "🚇", name: "Toshkent metro jetoni" } },

  { id: "toshkent_viloyati", name: "Toshkent viloyati", kind: "viloyat", order: 4, emoji: "⛰️",
    landmark: "Chorvoq suv ombori, Chimyon tog'lari", color: "#0891B2", accent: "#22D3EE", x: 71, y: 35,
    intro: "Toshkent viloyati — tog'lari, Chorvoq suv ombori va chang'i kurortlari bilan mashhur dam olish maskani.",
    souvenir: { id: "chorvoq", emoji: "🏔️", name: "Chorvoq toshchasi" } },

  { id: "sirdaryo", name: "Sirdaryo", kind: "viloyat", order: 5, emoji: "🌊",
    landmark: "Sirdaryo daryosi", color: "#0284C7", accent: "#38BDF8", x: 64, y: 46,
    intro: "Sirdaryo viloyati nomini O'rta Osiyodagi ikkinchi yirik daryo — Sirdaryodan olgan. Paxtachilik rivojlangan.",
    souvenir: { id: "paxta", emoji: "🤍", name: "Paxta chanog'i" } },

  { id: "jizzax", name: "Jizzax", kind: "viloyat", order: 6, emoji: "🌲",
    landmark: "Zomin milliy bog'i", color: "#16A34A", accent: "#4ADE80", x: 56, y: 46,
    intro: "Jizzax — Zomin tog'lari va archa o'rmonlari bilan mashhur. Zomin — 'O'zbekiston Shveytsariyasi' deyiladi.",
    souvenir: { id: "archa", emoji: "🌲", name: "Zomin archasi" } },

  { id: "samarqand", name: "Samarqand", kind: "viloyat", order: 7, emoji: "🕌",
    landmark: "Registon maydoni, Amir Temur maqbarasi", color: "#0D9488", accent: "#2DD4BF", x: 46, y: 55,
    intro: "Samarqand — 2750 yillik qadimiy shahar, Amir Temur poytaxti. Registon maydoni butun dunyoga mashhur.",
    souvenir: { id: "registon", emoji: "🏛️", name: "Registon maketi" } },

  { id: "qashqadaryo", name: "Qashqadaryo", kind: "viloyat", order: 8, emoji: "🏰",
    landmark: "Shahrisabz, Oqsaroy", color: "#CA8A04", accent: "#FACC15", x: 50, y: 70,
    intro: "Qashqadaryo — Amir Temur vatani Shahrisabz shu yerda. Oqsaroy qoldiqlari saltanat ulug'vorligidan darak beradi.",
    souvenir: { id: "oqsaroy", emoji: "🏰", name: "Oqsaroy toshi" } },

  { id: "surxondaryo", name: "Surxondaryo", kind: "viloyat", order: 9, emoji: "☀️",
    landmark: "Termiz, qadimiy buddaviylik yodgorliklari", color: "#EA580C", accent: "#FB923C", x: 58, y: 85,
    intro: "Surxondaryo — mamlakatning eng janubi, eng issiq hududi. Termiz qadimiy sivilizatsiyalar chorrahasi bo'lgan.",
    souvenir: { id: "termiz", emoji: "🪷", name: "Termiz yodgorligi" } },

  { id: "buxoro", name: "Buxoro", kind: "viloyat", order: 10, emoji: "🕌",
    landmark: "Minorai Kalon, Labi Hovuz", color: "#B45309", accent: "#F59E0B", x: 28, y: 55,
    intro: "Buxoro — 'muqaddas shahar', 2300 yildan ortiq tarixga ega. Minorai Kalon shaharning ramzi.",
    souvenir: { id: "minora", emoji: "🗼", name: "Minorai Kalon maketi" } },

  { id: "navoiy", name: "Navoiy", kind: "viloyat", order: 11, emoji: "⛏️",
    landmark: "Qizilqum, Sarmishsoy qoyatosh rasmlari", color: "#9333EA", accent: "#C084FC", x: 34, y: 40,
    intro: "Navoiy — sanoat va kon viloyati. Qizilqum cho'li va Sarmishsoydagi qadimiy qoyatosh rasmlari shu yerda.",
    souvenir: { id: "qoyatosh", emoji: "🪨", name: "Sarmishsoy toshi" } },

  { id: "xorazm", name: "Xorazm", kind: "viloyat", order: 12, emoji: "🏯",
    landmark: "Xiva, Ichan Qal'a", color: "#0369A1", accent: "#38BDF8", x: 16, y: 42,
    intro: "Xorazm — Xiva shahridagi Ichan Qal'a butunligicha saqlangan ochiq osmon ostidagi muzey. Al-Xorazmiy vatani.",
    souvenir: { id: "ichanqala", emoji: "🏯", name: "Ichan Qal'a darvozasi" } },

  { id: "qoraqalpogiston", name: "Qoraqalpog'iston", kind: "respublika", order: 13, emoji: "🐪",
    landmark: "Mo'ynoq, Orol dengizi", color: "#64748B", accent: "#94A3B8", x: 12, y: 22,
    intro: "Sayohatimizning so'nggi manzili — Qoraqalpog'iston. Mo'ynoqdagi 'kemalar qabristoni' Orol dengizi fojiasini eslatadi. Tabiatni asraylik!",
    souvenir: { id: "kema", emoji: "⚓", name: "Mo'ynoq langari" } },
];

// ------------------------------------------------------------
//  YORDAMCHI
// ------------------------------------------------------------
export function getRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

// ============================================================
//  O'YINNI QULFLASH (butun Sayohat o'yini)
// ------------------------------------------------------------
//  true  = o'yin qulflangan (o'quvchilar kira olmaydi, "tez kunda")
//  false = o'yin ochiq (hamma o'ynaydi)
// ============================================================
export const SAYOHAT_LOCKED = true;

const SAYOHAT_BYPASS = ["admin", "director", "zam_direktor", "zavuch"];

/** Shu rol uchun o'yin ochiqmi? */
export function isSayohatOpen(role: string | undefined | null): boolean {
  if (!SAYOHAT_LOCKED) return true;
  return !!role && SAYOHAT_BYPASS.includes(role);
}

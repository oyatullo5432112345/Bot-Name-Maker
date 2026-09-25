// "Bilimlar jangi" uchun savol manbalari:
//  • Tez hisob — tayyorgarliksiz, avtomatik yaratiladigan misollar (3 daraja)
//  • O'qituvchi yozgan savollar — oddiy matn formatidan o'qiladi
// Bu fayl bazaga ham, Telegramga ham bog'liq emas (sof funksiyalar).

export interface GQ {
  q: string;          // savol matni
  options: string[];  // 2–10 ta javob
  correct: number;    // to'g'ri javob indeksi
  explain?: string;   // noto'g'ri javob berganda ko'rinadigan izoh (≤200)
}

export type MathLevel = 1 | 2 | 3;

export const MATH_LEVEL_LABEL: Record<MathLevel, string> = {
  1: "1–4 sinf",
  2: "5–7 sinf",
  3: "8–11 sinf",
};

// ─── Yordamchilar ────────────────────────────────────────────────────────────

function rnd(a: number, b: number): number {
  return a + Math.floor(Math.random() * (b - a + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Savolning javob variantlarini aralashtiradi (to'g'ri javob indeksini saqlagan holda) */
export function shuffleOptions(g: GQ): GQ {
  const order = shuffle(g.options.map((_, i) => i));
  return { ...g, options: order.map((i) => g.options[i]!), correct: order.indexOf(g.correct) };
}

function fmt(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : String(n);
}

/** To'g'ri javob + ishonarli noto'g'ri variantlar (jami 4 ta) */
function numQuestion(q: string, answer: number, deltas: number[], allowNeg = false, explain?: string): GQ {
  const set = new Set<number>([answer]);
  for (const d of shuffle(deltas)) {
    if (set.size >= 4) break;
    const v = answer + d;
    if (!Number.isInteger(v) || (!allowNeg && v < 0) || d === 0) continue;
    set.add(v);
  }
  let k = 1;
  while (set.size < 4) {
    const v = answer + (k % 2 === 1 ? 1 : -1) * (Math.ceil(k / 2) * 10 + 1);
    if (allowNeg || v >= 0) set.add(v);
    k++;
  }
  const opts = shuffle([...set]);
  return { q, options: opts.map(fmt), correct: opts.indexOf(answer), explain };
}

// ─── Tez hisob generatori ───────────────────────────────────────────────────

type Gen = () => GQ;

const LEVEL1: Gen[] = [
  () => {
    const a = rnd(12, 69), b = rnd(8, 29);
    return numQuestion(`${a} + ${b} = ?`, a + b, [1, -1, 10, -10, 2, -2]);
  },
  () => {
    const a = rnd(35, 99), b = rnd(6, a - 10);
    return numQuestion(`${a} − ${b} = ?`, a - b, [1, -1, 10, -10, 2]);
  },
  () => {
    const a = rnd(3, 10), b = rnd(3, 10);
    return numQuestion(`${a} × ${b} = ?`, a * b, [a, -a, b, -b, 1, -1], false, `${a} × ${b} = ${a * b}`);
  },
  () => {
    const b = rnd(2, 10), ans = rnd(2, 10);
    return numQuestion(`${b * ans} : ${b} = ?`, ans, [1, -1, 2, -2, 3]);
  },
  () => {
    const a = rnd(2, 9), b = rnd(2, 9), c = rnd(2, 9);
    return numQuestion(`${a} + ${b} + ${c} + ${a} = ?`, 2 * a + b + c, [1, -1, a, -a, 2]);
  },
];

const LEVEL2: Gen[] = [
  () => {
    const a = rnd(12, 29), b = rnd(3, 9);
    return numQuestion(`${a} × ${b} = ?`, a * b, [b, -b, 10, -10, 1]);
  },
  () => {
    const a = rnd(2, 20), b = rnd(2, 9), c = rnd(2, 9);
    const ans = a + b * c;
    const wrong = (a + b) * c;
    return numQuestion(`${a} + ${b} × ${c} = ?`, ans, [wrong - ans, 1, -1, c, -c], false, `Avval ko'paytirish: ${b} × ${c} = ${b * c}, keyin ${a} + ${b * c} = ${ans}`);
  },
  () => {
    const p = pick([10, 20, 25, 50]);
    const base = rnd(1, 15) * 20;
    const ans = (base * p) / 100;
    return numQuestion(`${base} ning ${p}% i = ?`, ans, [ans, -Math.floor(ans / 2), 5, -5, 10], false);
  },
  () => {
    const a = rnd(-20, 20), b = rnd(-20, -1);
    return numQuestion(`${fmt(a)} + (${fmt(b)}) = ?`, a + b, [-2 * b, 1, -1, 2, -2], true, `${fmt(a)} + (${fmt(b)}) = ${fmt(a)} − ${Math.abs(b)} = ${fmt(a + b)}`);
  },
  () => {
    const b = rnd(3, 12), ans = rnd(11, 30);
    return numQuestion(`${b * ans} : ${b} = ?`, ans, [1, -1, 2, -2, 10]);
  },
  () => {
    const a = rnd(2, 9), b = rnd(2, 9);
    return numQuestion(`(${a} + ${b}) × ${a} = ?`, (a + b) * a, [a, -a, b, 1, -1], false);
  },
];

const LEVEL3: Gen[] = [
  () => {
    const a = rnd(11, 25);
    return numQuestion(`${a}² = ?`, a * a, [10, -10, 2 * a, -2 * a, 1, a], false, `${a} × ${a} = ${a * a}`);
  },
  () => {
    const a = rnd(11, 30);
    return numQuestion(`√${a * a} = ?`, a, [1, -1, 2, -2, 10]);
  },
  () => {
    const x = rnd(-9, 12), a = rnd(2, 9), b = rnd(-20, 20);
    const c = a * x + b;
    const q = `${a}x ${b >= 0 ? "+" : "−"} ${Math.abs(b)} = ${fmt(c)}.  x = ?`;
    return numQuestion(q, x, [1, -1, 2, -2, -2 * x || 3], true, `${a}x = ${fmt(c)} ${b >= 0 ? "−" : "+"} ${Math.abs(b)} = ${fmt(a * x)}, x = ${fmt(x)}`);
  },
  () => {
    const base = pick([2, 3]);
    const n = base === 2 ? rnd(5, 10) : rnd(2, 6);
    const ans = base ** n;
    const sup = String(n).split("").map((d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]).join("");
    return numQuestion(`${base}${sup} = ?`, ans, [ans, -Math.floor(ans / base), base, -base], false);
  },
  () => {
    const price = rnd(2, 20) * 1000, p = pick([10, 20, 25, 50]);
    const ans = price + (price * p) / 100;
    return numQuestion(`Narx ${price} so'm edi, ${p}% oshdi. Yangi narx?`, ans, [-(price * p) / 200, 1000, -1000, (price * p) / 100], false);
  },
  () => {
    const a = rnd(5, 12);
    const b = rnd(3, a - 1);
    return numQuestion(`${a}² − ${b}² = ?`, a * a - b * b, [2, -2, a - b, b - a, 10], true, `(${a} − ${b})(${a} + ${b}) = ${a * a - b * b}`);
  },
];

const LEVELS: Record<MathLevel, Gen[]> = { 1: LEVEL1, 2: LEVEL2, 3: LEVEL3 };

export function generateMath(level: MathLevel, count: number): GQ[] {
  const gens = LEVELS[level];
  const out: GQ[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < count && guard++ < count * 20) {
    const g = pick(gens)();
    if (seen.has(g.q)) continue;
    seen.add(g.q);
    out.push({ ...g, q: `🧮 ${g.q}` });
  }
  return out;
}

/** Sinf nomidan (masalan "7-A") tavsiya etiladigan daraja */
export function suggestLevel(className: string): MathLevel {
  const n = parseInt(className, 10);
  if (!Number.isFinite(n)) return 2;
  if (n <= 4) return 1;
  if (n <= 7) return 2;
  return 3;
}

// ─── O'qituvchi yozgan savollarni o'qish ────────────────────────────────────
//
//  Format (har savol orasida bo'sh qator — shart emas):
//
//    # To'plam nomi            ← ixtiyoriy
//    O'zbekiston poytaxti?
//    + Toshkent                ← to'g'ri javob (+ yoki ✅)
//    - Samarqand               ← noto'g'ri (- yoki ❌)
//    - Buxoro

const OPT_RE = /^(\+|✅|-|❌|–)/;
const CORRECT_RE = /^(\+|✅)/;

export function parseQuestions(text: string): { title: string | null; questions: GQ[]; errors: string[] } {
  const lines = text.replace(/\r/g, "").split("\n");
  let title: string | null = null;
  const blocks: string[][] = [];
  let cur: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (cur.length) { blocks.push(cur); cur = []; }
      continue;
    }
    if (title === null && blocks.length === 0 && cur.length === 0 && line.startsWith("#")) {
      title = line.replace(/^#+\s*/, "").slice(0, 60) || null;
      continue;
    }
    const isOpt = OPT_RE.test(line);
    // Javoblardan keyin oddiy qator kelsa — yangi savol boshlandi
    if (!isOpt && cur.some((l) => OPT_RE.test(l))) {
      blocks.push(cur);
      cur = [];
    }
    cur.push(line);
  }
  if (cur.length) blocks.push(cur);

  const questions: GQ[] = [];
  const errors: string[] = [];
  blocks.slice(0, 60).forEach((b, i) => {
    const n = i + 1;
    const qText = b.filter((l) => !OPT_RE.test(l)).join(" ").replace(/^\d+\s*[.)]\s*/, "").trim();
    const opts = b.filter((l) => OPT_RE.test(l));
    const options = opts.map((o) => o.replace(OPT_RE, "").trim().slice(0, 100)).filter(Boolean);
    const correctCount = opts.filter((o) => CORRECT_RE.test(o)).length;
    const correct = opts.findIndex((o) => CORRECT_RE.test(o));

    if (!qText) { errors.push(`${n}-savol: savol matni yo'q`); return; }
    if (options.length < 2) { errors.push(`${n}-savol: kamida 2 ta javob kerak`); return; }
    if (options.length > 10) { errors.push(`${n}-savol: ko'pi bilan 10 ta javob bo'lishi mumkin`); return; }
    if (correctCount !== 1) {
      errors.push(`${n}-savol: bitta to'g'ri javobni "+" bilan belgilang (hozir ${correctCount} ta)`);
      return;
    }
    questions.push({ q: qText.slice(0, 280), options, correct });
  });

  return { title, questions, errors };
}

export const QUESTION_FORMAT_EXAMPLE =
  "# Geografiya — 5-sinf\n" +
  "O'zbekiston poytaxti qaysi shahar?\n" +
  "+ Toshkent\n" +
  "- Samarqand\n" +
  "- Buxoro\n" +
  "\n" +
  "Eng uzun daryo?\n" +
  "- Amudaryo\n" +
  "+ Nil\n" +
  "- Volga";

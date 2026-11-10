// Fayl o'qish va lotin alifbosiga o'tkazish.
// Ikki formatni qabul qiladi: asl ro'yxat (rus sarlavhalar) va tayyor shablon (Sinf / F.I.O).

import * as XLSX from "xlsx";

export interface ImportRow {
  class_name: string;
  full_name: string;
  birth_date: string;
  gender: string;
}

const CYR: Record<string, string> = {
  А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ё: "YO", Ж: "J", З: "Z", И: "I", Й: "Y",
  К: "K", Л: "L", М: "M", Н: "N", О: "O", П: "P", Р: "R", С: "S", Т: "T", У: "U", Ф: "F",
  Х: "X", Ҳ: "H", Ц: "TS", Ч: "CH", Ш: "SH", Ъ: "'", Ы: "I", Ь: "", Э: "E", Ю: "YU", Я: "YA",
  Ў: "O'", Қ: "Q", Ғ: "G'",
};
// So'z boshida kelganda
const INITIAL: Record<string, string> = { Е: "YE", Ё: "YO", Ю: "YU", Я: "YA" };

export function translit(s: string): string {
  const chars = Array.from(s);
  return chars
    .map((ch, i) => {
      const up = ch.toUpperCase();
      if (!(up in CYR)) return ch;
      const atStart = i === 0 || chars[i - 1] === " ";
      if (atStart && up in INITIAL) return INITIAL[up]!;
      return CYR[up]!;
    })
    .join("");
}

export function cleanName(s: string): string {
  return translit(String(s ?? ""))
    .replace(/[`ʻʼ’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function normalizeClass(s: string): string {
  return translit(String(s ?? ""))
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "")
    .toUpperCase();
}

const pad = (n: number) => String(n).padStart(2, "0");

function formatBirth(v: unknown): string {
  if (v instanceof Date && !isNaN(v.getTime())) return `${pad(v.getDate())}.${pad(v.getMonth() + 1)}.${v.getFullYear()}`;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${pad(d.d)}.${pad(d.m)}.${d.y}`;
  }
  return String(v ?? "").trim();
}

function normGender(v: unknown): string {
  const s = String(v ?? "").toLowerCase();
  if (/муж|erkak|male|^m$/.test(s)) return "Erkak";
  if (/жен|ayol|female|^f$/.test(s)) return "Ayol";
  return "";
}

export async function parseImportFile(file: File): Promise<ImportRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]!]!;
  const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: true });

  const hi = data.findIndex(
    (r) =>
      r.some((c) => /класс|sinf/i.test(String(c))) &&
      r.some((c) => /фио|f\.?\s*i\.?\s*o|ism/i.test(String(c))),
  );
  if (hi < 0) throw new Error("Sarlavha topilmadi. Faylda 'Sinf' va 'F.I.O' ustunlari bo'lishi kerak.");

  const header = (data[hi] as unknown[]).map((c) => String(c).toLowerCase());
  const col = (re: RegExp) => header.findIndex((h) => re.test(h));
  const cClass = col(/класс|sinf/);
  const cName = col(/фио|f\.?\s*i\.?\s*o|ism/);
  const cBirth = col(/рожд|tug|sana/);
  const cGender = col(/пол|jins/);

  const out: ImportRow[] = [];
  for (const raw of data.slice(hi + 1)) {
    const r = raw as unknown[];
    const cls = normalizeClass(String(r[cClass] ?? ""));
    const name = cleanName(String(r[cName] ?? ""));
    if (!cls || !name) continue;
    out.push({
      class_name: cls,
      full_name: name,
      birth_date: cBirth >= 0 ? formatBirth(r[cBirth]) : "",
      gender: cGender >= 0 ? normGender(r[cGender]) : "",
    });
  }
  return out;
}

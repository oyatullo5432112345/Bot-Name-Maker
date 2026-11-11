// Dars jadvali faylini o'qish. Ikki format qabul qilinadi:
//  1) Grid (asl jadval): sinflar ustun, kunlar va darslar qator bo'lib joylashgan.
//  2) Shablon: Sinf | Kun | Dars raqami | Fan | O'qituvchi | Izoh.

import * as XLSX from "xlsx";

export interface TimetableRow {
  class_name: string;
  day: string;
  period: number;
  subject: string;
  teacher: string;
  note: string;
}

const DAY_CODES: Record<string, string> = {
  Du: "Dushanba",
  Se: "Seshanba",
  Ch: "Chorshanba",
  Pa: "Payshanba",
  Ju: "Juma",
  Sh: "Shanba",
};

const str = (v: unknown) => String(v ?? "");

function normSpace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function cleanTeacher(s: string): string {
  return normSpace(s.replace(/[`ʻʼ’‘]/g, "'"));
}

function capFirst(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}

// "5A" / "5-A" / "5 A" → "5-A"
function normClassLabel(v: string): string {
  const s = v.trim();
  const m = /^(\d{1,2})\s*-?\s*([A-Za-z])$/.exec(s);
  if (!m) return s.replace(/\s+/g, "");
  return `${m[1]}-${m[2]!.toUpperCase()}`;
}

function parseGrid(data: unknown[][], hi: number): TimetableRow[] {
  const header = data[hi] ?? [];

  // Sinflar: sarlavhada har ikki ustundan birinchisida nomi bor (3, 5, 7, ...)
  const classes: { col: number; name: string }[] = [];
  for (let c = 3; c < header.length; c += 2) {
    const v = str(header[c]).trim();
    if (v) classes.push({ col: c, name: normClassLabel(v) });
  }

  const out: TimetableRow[] = [];
  let curDay: string | null = null;

  for (const raw of data.slice(hi + 1)) {
    const r = (raw ?? []) as unknown[];
    const code = str(r[0]).trim();
    if (DAY_CODES[code]) curDay = DAY_CODES[code]!;

    // Kun belgisi faqat birinchi qatorda — keyingi qatorlar o'sha kunga tegishli
    const period = r[1];
    if (!curDay || typeof period !== "number" || !Number.isInteger(period)) continue;

    for (const { col, name } of classes) {
      const text = str(r[col]).replace(/_x000[0-9A-Fa-f]_/g, "\n");
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && l !== "|" && l !== "/");
      if (lines.length === 0) continue;

      const note: string[] = [];
      let subj = lines[0]!;
      const teacherLine = lines[1] ?? "";

      // "Geografiya / Iqtisodiyot asoslari" — muqobil fan
      if (subj.includes(" / ")) {
        const parts = subj.split(" / ").map((x) => x.trim());
        note.push(`Muqobil fan: ${parts[1] ?? ""}`);
        subj = parts[0]!;
      }

      // "O'qituvchi1 | O'qituvchi2" — guruhlarga bo'lingan dars
      const groups = teacherLine
        ? teacherLine.split("|").map(cleanTeacher).filter(Boolean)
        : [];
      let main = "";
      if (groups.length > 0) {
        const first = groups[0]!;
        if (first.includes(" / ")) {
          const ps = first.split(" / ").map(cleanTeacher);
          main = ps[0] ?? "";
          if (ps[1] && ps[1] !== ps[0]) note.push(`Muqobil o'qituvchi: ${ps[1]}`);
        } else {
          main = first;
        }
        if (groups.length > 1) note.push(`2-guruh o'qituvchisi: ${groups[1]}`);
      }

      let subject = capFirst(normSpace(subj));
      if (subject.toLowerCase().startsWith("kelajak")) subject = "Kelajak soat";

      out.push({
        class_name: name,
        day: curDay,
        period,
        subject,
        teacher: main,
        note: note.join("; "),
      });
    }
  }
  return out;
}

function parseFlat(data: unknown[][], hi: number): TimetableRow[] {
  const h = (data[hi] ?? []).map((c) => str(c).toLowerCase().trim());
  const col = (re: RegExp) => h.findIndex((x) => re.test(x));
  const cClass = col(/^sinf/);
  const cDay = col(/^kun/);
  const cPeriod = col(/raqam|period/);
  const cSubject = col(/^fan/);
  const cTeacher = col(/o.qituvchi/);
  const cNote = col(/izoh/);

  const out: TimetableRow[] = [];
  for (const raw of data.slice(hi + 1)) {
    const r = (raw ?? []) as unknown[];
    const cls = str(r[cClass]).replace(/\s+/g, "").toUpperCase();
    const subject = normSpace(str(r[cSubject]));
    if (!cls || !subject) continue;
    out.push({
      class_name: cls,
      day: normSpace(str(r[cDay])),
      period: Number(r[cPeriod]),
      subject,
      teacher: cTeacher >= 0 ? normSpace(str(r[cTeacher])) : "",
      note: cNote >= 0 ? normSpace(str(r[cNote])) : "",
    });
  }
  return out;
}

export async function parseTimetableWorkbook(file: File): Promise<TimetableRow[]> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]!]!;
  const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: true });

  // 1) Grid format: "Kun" sarlavhali qator
  const gridHi = data.findIndex((r) => str(r?.[0]).trim() === "Kun");
  if (gridHi >= 0) {
    const rows = parseGrid(data, gridHi);
    if (rows.length === 0) throw new Error("Jadvalda dars topilmadi");
    return rows;
  }

  // 2) Shablon format: "Sinf" va "Fan" ustunlari
  const flatHi = data.findIndex(
    (r) =>
      (r ?? []).some((c) => /^sinf$/i.test(str(c).trim())) &&
      (r ?? []).some((c) => /^fan/i.test(str(c).trim())),
  );
  if (flatHi < 0) {
    throw new Error("Fayl formati tanilmadi. Asl jadval (Kun, sinflar) yoki shablon (Sinf, Kun, Fan) bo'lishi kerak.");
  }
  const rows = parseFlat(data, flatHi);
  if (rows.length === 0) throw new Error("Faylda dars topilmadi");
  return rows;
}

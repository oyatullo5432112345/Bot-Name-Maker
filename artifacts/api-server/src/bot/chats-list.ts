// Bot: "Ulangan guruh va kanallar" ro'yxati.
// - Maktablar bo'yicha guruhlanadi (har maktab alohida bo'lim)
// - Ulanmagan sinflar alohida ko'rsatiladi (chalkashmaydi)
// - Sinflar raqam bo'yicha tartiblanadi (5-A, 5-B … 11-B)
// - Faqat shaxsiy chatda chiqadi — guruhga hech narsa yuborilmaydi

import { Context, InlineKeyboard } from "grammy";
import { query } from "../lib/db.js";

interface ChatRow {
  chat_id: number;
  title: string;
  purpose: string;
  class_id: string | null;
  class_name: string | null;
  maktab_id: number | null;
  school: string | null;
}
interface ClassRow {
  id: string;
  name: string;
  maktab_id: number | null;
  school: string | null;
}

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const gradeNum = (c: string): number => {
  const m = c.match(/^\s*(\d{1,2})/);
  return m ? parseInt(m[1]!, 10) : 999;
};
const cmpClass = (a: string, b: string): number => {
  const g = gradeNum(a) - gradeNum(b);
  return g !== 0 ? g : a.localeCompare(b, "uz", { numeric: true });
};

const PURPOSE_ICON: Record<string, string> = { school: "🏫", teachers: "👨‍🏫", tuman: "🏙", class: "👥" };
const PURPOSE_NAME: Record<string, string> = {
  school: "maktab guruhi",
  teachers: "ustozlar guruhi",
  tuman: "tuman davomat guruhi",
};

const GENERAL = -1; // maktabga bog'lanmagan umumiy guruhlar
const UNKNOWN = 0;  // maktabi belgilanmagan sinf

interface Section {
  name: string;
  linked: ChatRow[];
  free: ClassRow[];
}

export async function showChatsGrouped(ctx: Context): Promise<void> {
  // Guruhda ro'yxat chiqmaydi — faqat rahbar shaxsiy chatda ko'radi
  if (ctx.chat?.type !== "private") return;

  const chats = await query<ChatRow>(
    `SELECT t.chat_id, t.title, t.purpose, t.class_id,
            c.name AS class_name, c.maktab_id, COALESCE(m.nom, '') AS school
       FROM tg_chats t
       LEFT JOIN classes c ON c.id = t.class_id
       LEFT JOIN maktablar m ON m.id = c.maktab_id`
  );
  const free = await query<ClassRow>(
    `SELECT c.id, c.name, c.maktab_id, COALESCE(m.nom, '') AS school
       FROM classes c
       LEFT JOIN maktablar m ON m.id = c.maktab_id
      WHERE c.name <> ''
        AND NOT EXISTS (SELECT 1 FROM tg_chats t WHERE t.class_id = c.id)`
  );

  const sections = new Map<number, Section>();
  const section = (key: number, name: string): Section => {
    let s = sections.get(key);
    if (!s) {
      s = { name, linked: [], free: [] };
      sections.set(key, s);
    }
    return s;
  };

  for (const r of chats) {
    if (r.class_id) {
      if (r.maktab_id != null) section(r.maktab_id, r.school || `${r.maktab_id}-maktab`).linked.push(r);
      else section(UNKNOWN, "Maktabi belgilanmagan").linked.push(r);
    } else {
      section(GENERAL, "Umumiy guruhlar").linked.push(r);
    }
  }
  for (const c of free) {
    const key = c.maktab_id ?? UNKNOWN;
    const name = key === UNKNOWN ? "Maktabi belgilanmagan" : c.school || `${key}-maktab`;
    section(key, name).free.push(c);
  }

  // Umumiy → maktablar (id bo'yicha) → maktabi belgilanmagan
  const keys = [...sections.keys()].sort((a, b) => {
    const rank = (k: number) => (k === GENERAL ? -2 : k === UNKNOWN ? 1e9 : k);
    return rank(a) - rank(b);
  });

  const lines: string[] = [];
  const unlinkable: ChatRow[] = [];

  lines.push(
    `🔗 <b>Ulangan guruh va kanallar</b> (${chats.length})` +
      (free.length ? ` · ⚪ ulanmagan sinf: ${free.length}` : "")
  );

  for (const key of keys) {
    const s = sections.get(key)!;
    const icon = key === GENERAL ? "🌐" : "🏫";
    const linkedCount = s.linked.length;
    const freeCount = s.free.length;
    lines.push("", `${icon} <b>${esc(s.name)}</b> — ulangan: ${linkedCount}, ulanmagan: ${freeCount}`);

    s.linked.sort((a, b) => cmpClass(a.class_name ?? "", b.class_name ?? "") || a.title.localeCompare(b.title));
    for (const r of s.linked) {
      unlinkable.push(r);
      if (r.class_id) {
        lines.push(`  ✅ <b>${esc(r.class_name ?? "")}</b> → ${esc(r.title)}`);
      } else {
        const icon2 = PURPOSE_ICON[r.purpose] ?? "•";
        lines.push(`  ${icon2} ${esc(r.title)} — ${PURPOSE_NAME[r.purpose] ?? esc(r.purpose)}`);
      }
    }

    s.free.sort((a, b) => cmpClass(a.name, b.name));
    if (s.free.length) {
      lines.push(`  ⚪ Ulanmagan: ${s.free.map((c) => esc(c.name)).join(", ")}`);
    }
  }

  if (!chats.length && !free.length) {
    lines.push("", "Hozircha sinf ham, guruh ham yo'q.");
  }

  lines.push(
    "",
    "<b>Qanday ulanadi?</b>",
    "🏫 Kanal: botni kanalga admin qiling (bot sizga tugma yuboradi) yoki <code>/kanal @nomi</code>",
    "👥 Sinf guruhi: botni guruhga qo'shing → guruhda <code>/boglash 7-A</code>",
    "👨‍🏫 Ustozlar guruhi: guruhda <code>/boglash ustozlar</code>"
  );

  // Uzish tugmalari — har bir ulangan guruh uchun (sinf nomi + guruh nomi, takrorlanmasin)
  const kb = new InlineKeyboard();
  unlinkable.slice(0, 30).forEach((r) => {
    const label = r.class_id
      ? `✖️ ${r.class_name ?? ""} · ${r.title}`
      : `✖️ ${r.title}`;
    kb.text(label.slice(0, 40), `f:unl:${r.chat_id}`).row();
  });

  // Telegram xabar hajmi cheklangan — uzun ro'yxatni bo'lib yuboramiz
  const LIMIT = 3600;
  const chunks: string[] = [];
  let cur = "";
  for (const line of lines) {
    if (cur.length + line.length + 1 > LIMIT) {
      chunks.push(cur);
      cur = "";
    }
    cur += (cur ? "\n" : "") + line;
  }
  if (cur) chunks.push(cur);

  for (let i = 0; i < chunks.length; i++) {
    const last = i === chunks.length - 1;
    await ctx.reply(chunks[i]!, {
      parse_mode: "HTML",
      reply_markup: last && unlinkable.length ? kb : undefined,
    });
  }
}

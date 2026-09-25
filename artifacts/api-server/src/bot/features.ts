// ═══════════════════════════════════════════════════════════════════════════
//  TELEGRAM FUNKSIYALARI — o'quvchi / o'qituvchi / rahbar menyulari,
//  sinf guruhlari va maktab kanali bilan ishlash, avtomatik postlar.
//
//  bot.ts ichida `registerTelegramFeatures(bot, ...)` eng boshida chaqiriladi:
//   • guruh/kanal update'lari shu yerda to'liq ushlanadi (bot.ts dagi
//     "Boshlash uchun /start yuboring" javobi guruhlarga tushmaydi);
//   • shaxsiy chatdagi yangi tugma/buyruqlar shu yerda, qolganlari
//     bot.ts dagi eski handlerlarga o'tadi (next()).
// ═══════════════════════════════════════════════════════════════════════════

import { Bot, Composer, Context, InlineKeyboard, Keyboard } from "grammy";
import { query, queryOne } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { notifyUser, attendanceNotificationText } from "../lib/notify.js";
import {
  esc, sleep, isRealTelegramId,
  uzDay, uzHourMin, uzDateStr, PERIOD_TIMES, DAY_NAMES_UZ, nextSchoolDay,
  getLinkedChat, getChatsByPurpose, getClassChats, linkChat, unlinkChat, updateChatSettings,
  sendToChat, claimJob,
  type ChatPurpose, type LinkedChat,
} from "../lib/tg-shared.js";
import { createSessionStore } from "./session-store.js";
import { registerGames, resetGameSetup } from "./games.js";

// ─── Sozlamalar ──────────────────────────────────────────────────────────────

let WEBSITE_URL = "";
let ADMIN_ID = 0;

const MANAGEMENT_ROLES = new Set(["admin", "director", "zam_direktor", "zavuch", "mudir"]);

// Menyu tugmalari (reply keyboard)
const B = {
  lessons: "📅 Darslarim",
  grades: "📊 Baholarim",
  att: "📋 Davomatim",
  rating: "🏆 Reyting",
  news: "📢 E'lonlar",
  help: "❓ Yordam",
  app: "📱 Platforma",
  tSchedule: "📅 Jadvalim",
  tAttendance: "✅ Davomat qilish",
  tMessage: "✉️ Sinfga xabar",
  tClass: "👥 Sinfim",
  mToday: "📊 Maktab bugun",
  mPost: "📣 Kanalga e'lon",
  mChats: "🔗 Guruh va kanallar",
  game: "🎮 Sinf o'yini",
} as const;
const ALL_BUTTONS = new Set<string>(Object.values(B));

// ─── Kim yozyapti? ───────────────────────────────────────────────────────────

type Who =
  | { kind: "student"; tgId: number; login: string; full_name: string; class_name: string; class_id: string | null }
  | { kind: "staff"; tgId: number; id: string; login: string; full_name: string; role: string; class_id: string | null }
  | { kind: "admin"; tgId: number };

async function whoIs(tgId: number): Promise<Who | null> {
  const staff = await queryOne<{ id: string; login: string; full_name: string; role: string; class_id: string | null }>(
    "SELECT id, login, full_name, role, class_id FROM staff WHERE telegram_id = $1 LIMIT 1",
    [tgId]
  );
  if (staff) return { kind: "staff", tgId, ...staff };
  if (ADMIN_ID > 0 && tgId === ADMIN_ID) return { kind: "admin", tgId };

  const user = await queryOne<{ login: string; full_name: string; class_name: string }>(
    "SELECT login, full_name, class_name FROM users WHERE telegram_id = $1 LIMIT 1",
    [tgId]
  );
  if (!user) return null;
  const cls = user.class_name
    ? await queryOne<{ id: string }>("SELECT id FROM classes WHERE name = $1", [user.class_name])
    : null;
  return { kind: "student", tgId, ...user, class_id: cls?.id ?? null };
}

function isManagement(who: Who | null): boolean {
  if (!who) return false;
  if (who.kind === "admin") return true;
  return who.kind === "staff" && MANAGEMENT_ROLES.has(who.role);
}

function isStaffLike(who: Who | null): who is Extract<Who, { kind: "staff" | "admin" }> {
  return !!who && (who.kind === "staff" || who.kind === "admin");
}

function staffName(who: Who): string {
  if (who.kind === "admin") return "Administrator";
  return who.full_name;
}

function staffLogin(who: Who): string {
  if (who.kind === "admin") return "admin";
  return who.login;
}

// ─── Shaxsiy chat holati (bazada saqlanadi) ──────────────────────────────────

type FState =
  | { type: "idle" }
  | {
      type: "att";
      classId: string;
      className: string;
      date: string;
      logins: string[];
      names: string[];
      marks: Record<string, "a" | "l" | "e">;
      messageId?: number;
    }
  | { type: "cmsg"; classId: string; className: string }
  | { type: "cmsg_confirm"; classId: string; className: string; messageId: number }
  | { type: "cpost" }
  | { type: "cpost_confirm"; messageId: number };

const fstates = createSessionStore<FState>("bot_features", { type: "idle" });
void fstates.loadAll();

function getF(userId: number): FState {
  return fstates.get(userId) ?? { type: "idle" };
}
function setF(userId: number, s: FState): void {
  fstates.set(userId, s);
}

// ─── Ma'lumot so'rovlari ─────────────────────────────────────────────────────

function sortClasses<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "uz", { numeric: true }));
}

async function getAllClasses(): Promise<{ id: string; name: string }[]> {
  return sortClasses(await query<{ id: string; name: string }>("SELECT id, name FROM classes"));
}

/** O'qituvchi ishlaydigan sinflar (rahbar bo'lsa — hammasi) */
async function classesFor(who: Who): Promise<{ id: string; name: string }[]> {
  if (isManagement(who)) return getAllClasses();
  if (who.kind !== "staff") return [];
  const rows = await query<{ id: string; name: string }>(
    `SELECT DISTINCT c.id, c.name FROM classes c
      WHERE c.id::text = $2
         OR c.teacher_id = $1
         OR c.id IN (SELECT class_id FROM timetable WHERE teacher_id = $1)
         OR c.id IN (SELECT class_id FROM teacher_subjects WHERE teacher_id = $1 AND class_id IS NOT NULL)`,
    [who.id, who.class_id ?? ""]
  );
  return sortClasses(rows);
}

async function canUseClass(who: Who, classId: string): Promise<boolean> {
  if (isManagement(who)) return true;
  const list = await classesFor(who);
  return list.some((c) => c.id === classId);
}

async function classTimetableText(classId: string, className: string, day: number): Promise<string> {
  if (day === 0) return `🎉 Bugun <b>Yakshanba</b> — dam olish kuni!`;
  const rows = await query<{ period: number; subject: string; teacher: string | null }>(
    `SELECT t.period, t.subject, s.full_name AS teacher
       FROM timetable t LEFT JOIN staff s ON s.id = t.teacher_id
      WHERE t.class_id = $1 AND t.day_of_week = $2
      ORDER BY t.period`,
    [classId, day]
  );
  if (rows.length === 0) return `📭 <b>${esc(className)}</b> — ${DAY_NAMES_UZ[day]} kuni dars jadvali kiritilmagan.`;
  const lines = rows.map(
    (r) =>
      `<b>${r.period}.</b> ${esc(r.subject)}  <i>${PERIOD_TIMES[r.period] ?? ""}</i>` +
      (r.teacher ? `\n     👤 ${esc(r.teacher)}` : "")
  );
  return `📅 <b>${esc(className)} — ${DAY_NAMES_UZ[day]}</b>\n\n${lines.join("\n")}`;
}

async function teacherTimetableText(staffId: string, day: number): Promise<string> {
  if (day === 0) return `🎉 Bugun <b>Yakshanba</b> — dam olish kuni!`;
  const rows = await query<{ period: number; subject: string; class_name: string | null }>(
    `SELECT t.period, t.subject, c.name AS class_name
       FROM timetable t LEFT JOIN classes c ON c.id = t.class_id
      WHERE t.teacher_id = $1 AND t.day_of_week = $2
      ORDER BY t.period`,
    [staffId, day]
  );
  if (rows.length === 0) return `📭 <b>${DAY_NAMES_UZ[day]}</b> kuni sizga dars belgilanmagan.`;
  const lines = rows.map(
    (r) => `<b>${r.period}.</b> ${esc(r.subject)} — <b>${esc(r.class_name ?? "—")}</b>  <i>${PERIOD_TIMES[r.period] ?? ""}</i>`
  );
  return `📅 <b>${DAY_NAMES_UZ[day]} — dars jadvalingiz</b>\n\n${lines.join("\n")}`;
}

interface TopRow {
  student_login: string;
  student_name: string;
  class_name: string;
  points: number;
  avg: string;
  cnt: number;
}

// Haftalik ball: 5 → 3 ball, 4 → 2, 3 → 1 (oxirgi 7 kun)
async function weeklyTop(className: string | null, limit: number): Promise<TopRow[]> {
  const params: unknown[] = [limit];
  let where = "created_at >= NOW() - INTERVAL '7 days'";
  if (className) {
    params.push(className);
    where += " AND class_name = $2";
  }
  return query<TopRow>(
    `SELECT student_login,
            MAX(student_name) AS student_name,
            MAX(class_name)   AS class_name,
            SUM(CASE WHEN grade = 5 THEN 3 WHEN grade = 4 THEN 2 WHEN grade = 3 THEN 1 ELSE 0 END)::int AS points,
            ROUND(AVG(grade)::numeric, 2)::text AS avg,
            COUNT(*)::int AS cnt
       FROM grades
      WHERE ${where}
      GROUP BY student_login
      ORDER BY points DESC, AVG(grade) DESC
      LIMIT $1`,
    params
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];
function rankIcon(i: number): string {
  return MEDALS[i] ?? `${i + 1}.`;
}

function topListText(rows: TopRow[], withClass: boolean): string {
  return rows
    .map(
      (r, i) =>
        `${rankIcon(i)} ${esc(r.student_name)}${withClass ? ` <i>(${esc(r.class_name)})</i>` : ""} — <b>${r.points}</b> ball · ⭐${r.avg}`
    )
    .join("\n");
}

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  const s = parts.slice(0, 2).join(" ");
  return s.length > 22 ? s.slice(0, 21) + "…" : s;
}

// ─── Menyular ────────────────────────────────────────────────────────────────

function appButton(kb: Keyboard): Keyboard {
  if (WEBSITE_URL.startsWith("https://")) return kb.webApp(B.app, WEBSITE_URL);
  return kb.text(B.app);
}

function menuFor(who: Who): Keyboard {
  const kb = new Keyboard();
  if (who.kind === "student") {
    kb.text(B.lessons).text(B.grades).row()
      .text(B.att).text(B.rating).row()
      .text(B.news).text(B.help).row();
  } else if (isManagement(who)) {
    kb.text(B.mToday).text(B.tAttendance).row()
      .text(B.mPost).text(B.tMessage).row()
      .text(B.game).text(B.mChats).row()
      .text(B.tSchedule).text(B.news).row()
      .text(B.help);
  } else {
    kb.text(B.tSchedule).text(B.tAttendance).row()
      .text(B.tMessage).text(B.tClass).row()
      .text(B.game).text(B.news).row()
      .text(B.help);
  }
  return appButton(kb).resized().persistent();
}

/** Asosiy menyuni ko'rsatish — bot.ts dan ham chaqiriladi (akkaunt ulangandan keyin). */
export async function sendMainMenu(ctx: Context, tgId: number): Promise<void> {
  const who = await whoIs(tgId);
  if (!who) {
    await ctx.reply("Menyudan foydalanish uchun avval akkauntingizni ulang: /start");
    return;
  }
  const title =
    who.kind === "student"
      ? `👨‍🎓 <b>${esc(who.full_name)}</b> · ${esc(who.class_name)} sinf`
      : `👨‍🏫 <b>${esc(staffName(who))}</b>`;
  await ctx.reply(`${title}\n\nQuyidagi menyudan kerakli bo'limni tanlang 👇`, {
    parse_mode: "HTML",
    reply_markup: menuFor(who),
  });
}

function helpText(who: Who | null): string {
  const common =
    `\n\n<b>Umumiy buyruqlar</b>\n` +
    `/menu — asosiy menyu\n/sertifikat — sertifikat olish\n/yordam — adminga savol yozish`;
  if (!who) return "Avval /start orqali akkauntingizni ulang." + common;
  if (who.kind === "student") {
    return (
      `❓ <b>O'quvchi uchun qo'llanma</b>\n\n` +
      `${B.lessons} — bugungi va ertangi darslar\n` +
      `${B.grades} — oxirgi baholar va fanlar bo'yicha o'rtacha\n` +
      `${B.att} — shu oydagi davomatingiz\n` +
      `${B.rating} — sinfdagi haftalik o'rningiz\n` +
      `${B.news} — maktab e'lonlari\n` +
      `${B.app} — to'liq platforma (Telegram ichida ochiladi)\n\n` +
      `🎮 O'qituvchi sinf guruhida "Bilimlar jangi" boshlasa — tez va to'g'ri javob bering, g'oliblar tanga oladi!\n` +
      `🔔 Baho qo'yilsa yoki darsga kelmagan deb belgilansangiz, bot darhol xabar beradi.` +
      common
    );
  }
  return (
    `❓ <b>O'qituvchi uchun qo'llanma</b>\n\n` +
    `${B.tAttendance} — sinf davomatini 1 daqiqada belgilash (o'quvchilarga avtomatik xabar boradi)\n` +
    `${B.tMessage} — uy vazifasi, rasm, fayl yoki ovozli xabarni sinf guruhiga va har bir o'quvchiga yuborish\n` +
    `${B.tClass} — o'quvchilar ro'yxati, o'rtacha baho, qoldirilgan darslar\n` +
    `${B.tSchedule} — bugungi/ertangi darslaringiz (har kuni 7:00 da o'zi keladi)\n` +
    `${B.game} — "Bilimlar jangi": sinf guruhida jonli bellashuv. Savollarni bot o'zi tuzadi (Tez hisob) yoki o'zingiz yozasiz. G'oliblarga tanga 🪙\n\n` +
    `<b>Sinf guruhini ulash</b>\n` +
    `1. Botni sinf guruhiga qo'shing\n` +
    `2. Guruhda <code>/boglash</code> yozing (yoki <code>/boglash 7-A</code>)\n` +
    `Shundan keyin guruhga har kuni ertalab dars jadvali, tug'ilgan kun tabriklari va haftalik reyting chiqadi.\n` +
    `Guruhdagi buyruqlar: /jadval, /reyting, /oyin, /natija, /sozlamalar, /uzish` +
    (isManagement(who)
      ? `\n\n<b>Maktab kanali</b>\nBotni kanalga admin qiling — bot sizga "ulash" tugmasini yuboradi. Yoki: <code>/kanal @kanal_nomi</code>`
      : "") +
    common
  );
}

// ─── Davomat klaviaturasi ────────────────────────────────────────────────────

const MARK_ICON: Record<string, string> = { p: "✅", a: "❌", l: "⏰", e: "📝" };
const MARK_STATUS: Record<string, string> = { p: "present", a: "absent", l: "late", e: "excused" };

function attText(s: Extract<FState, { type: "att" }>): string {
  const total = s.logins.length;
  const marks = Object.values(s.marks);
  const absent = marks.filter((m) => m === "a").length;
  const late = marks.filter((m) => m === "l").length;
  const excused = marks.filter((m) => m === "e").length;
  return (
    `✅ <b>${esc(s.className)} — davomat</b> (${s.date})\n\n` +
    `Ismni bosib holatni almashtiring:\n✅ keldi → ❌ kelmadi → ⏰ kechikdi → 📝 sababli\n\n` +
    `👥 Jami: <b>${total}</b> · ✅ ${total - absent - late - excused} · ❌ ${absent} · ⏰ ${late} · 📝 ${excused}`
  );
}

function attKeyboard(s: Extract<FState, { type: "att" }>): InlineKeyboard {
  const kb = new InlineKeyboard();
  s.names.forEach((name, i) => {
    const m = s.marks[String(i)] ?? "p";
    kb.text(`${MARK_ICON[m]} ${shortName(name)}`, `f:at:${i}`);
    if (i % 2 === 1) kb.row();
  });
  if (s.names.length % 2 === 1) kb.row();
  kb.text("♻️ Hammasi keldi", "f:atall").text("💾 Saqlash", "f:atsave").row();
  kb.text("❌ Bekor qilish", "f:cancel");
  return kb;
}

// ─── Ro'yxatdan o'tish ───────────────────────────────────────────────────────

export function registerTelegramFeatures(bot: Bot, opts: { websiteUrl: string; adminId: number }): void {
  WEBSITE_URL = opts.websiteUrl.replace(/\/$/, "");
  ADMIN_ID = opts.adminId;

  const priv = new Composer<Context>();
  const group = new Composer<Context>();

  // Guruh / kanal update'larini alohida qayta ishlaymiz va bot.ts ga o'tkazmaymiz.
  bot.use(async (ctx, next) => {
    const type = ctx.chat?.type;
    if (type && type !== "private") {
      try {
        await group.middleware()(ctx, async () => {});
      } catch (err) {
        logger.error({ err }, "Guruh handler xatosi");
      }
      return;
    }
    await next();
  });

  bot.use(priv);
  registerPrivate(priv);
  registerGroup(group);
  registerGames(priv, group, {
    whoIs: (id) => whoIs(id),
    canUseClass: (w, classId) => canUseClass(w as Who, classId),
    isManagement: (w) => isManagement(w as Who | null),
    menuButtons: ALL_BUTTONS,
    gameButton: B.game,
  });
  startScheduler();

  // Buyruqlar ro'yxati va Mini App tugmasi (xato bo'lsa — jim)
  void (async () => {
    try {
      await bot.api.setMyCommands(
        [
          { command: "start", description: "Boshlash / platformaga kirish" },
          { command: "menu", description: "Asosiy menyu" },
          { command: "jadval", description: "Bugungi dars jadvali" },
          { command: "baholar", description: "Baholarim" },
          { command: "davomat", description: "Davomat" },
          { command: "reyting", description: "Haftalik reyting" },
          { command: "oyin", description: "Bilimlar jangi — sinf o'yini (o'qituvchi)" },
          { command: "sertifikat", description: "Sertifikat olish" },
          { command: "yordam", description: "Adminga savol yozish" },
        ],
        { scope: { type: "all_private_chats" } }
      );
      await bot.api.setMyCommands(
        [
          { command: "jadval", description: "Sinfning bugungi dars jadvali" },
          { command: "reyting", description: "Haftalik reyting" },
          { command: "oyin", description: "🎮 Bilimlar jangi (o'qituvchi boshlaydi)" },
          { command: "natija", description: "O'yindagi joriy hisob" },
          { command: "boglash", description: "Guruhni sinfga ulash (o'qituvchi)" },
          { command: "sozlamalar", description: "Avto-xabarlar sozlamasi (o'qituvchi)" },
          { command: "uzish", description: "Guruhni uzish (o'qituvchi)" },
        ],
        { scope: { type: "all_group_chats" } }
      );
      if (WEBSITE_URL.startsWith("https://")) {
        await bot.api.setChatMenuButton({
          menu_button: { type: "web_app", text: "Platforma", web_app: { url: WEBSITE_URL } },
        });
      }
    } catch (err) {
      logger.warn({ err }, "Bot buyruqlari / menu tugmasini o'rnatib bo'lmadi");
    }
  })();
}

// ═══════════════════════════════════════════════════════════════════════════
//  SHAXSIY CHAT
// ═══════════════════════════════════════════════════════════════════════════

function registerPrivate(priv: Composer<Context>): void {
  // Istalgan buyruq yuborilsa — kutish holatini bekor qilamiz.
  priv.on("message", async (ctx, next) => {
    const text = ctx.message.text ?? "";
    if (text.startsWith("/") || ALL_BUTTONS.has(text)) {
      if (getF(ctx.from.id).type !== "idle") setF(ctx.from.id, { type: "idle" });
      if (text !== B.game && !text.startsWith("/oyin")) resetGameSetup(ctx.from.id);
    }
    await next();
  });

  priv.command("menu", async (ctx) => {
    if (!ctx.from) return;
    await sendMainMenu(ctx, ctx.from.id);
  });

  priv.hears(B.help, async (ctx) => {
    if (!ctx.from) return;
    setF(ctx.from.id, { type: "idle" });
    const who = await whoIs(ctx.from.id);
    await ctx.reply(helpText(who), { parse_mode: "HTML" });
  });

  priv.hears(B.app, async (ctx) => {
    await ctx.reply("🌐 Platformani ochish:", {
      reply_markup: new InlineKeyboard().url("🌐 Platforma", WEBSITE_URL || "https://t.me"),
    });
  });

  // ── O'quvchi: darslar ──────────────────────────────────────────────────────
  const lessons = async (ctx: Context, day?: number) => {
    if (!ctx.from) return;
    const who = await whoIs(ctx.from.id);
    if (!who) { await ctx.reply("Avval /start orqali akkauntingizni ulang."); return; }
    if (who.kind !== "student") { await showTeacherSchedule(ctx, who, day); return; }
    if (!who.class_id) { await ctx.reply("Sinfingiz tizimda topilmadi. Sinf rahbaringizga murojaat qiling."); return; }
    const d = day ?? uzDay();
    const text = await classTimetableText(who.class_id, who.class_name, d);
    await ctx.reply(text, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text(`➡️ ${DAY_NAMES_UZ[nextSchoolDay(d)]}`, `f:les:${nextSchoolDay(d)}`),
    });
  };
  priv.hears([B.lessons, B.tSchedule], (ctx) => lessons(ctx));
  priv.command("jadval", async (ctx, next) => {
    // O'qituvchilar uchun bot.ts dagi eski /jadval ishlayveradi
    const who = ctx.from ? await whoIs(ctx.from.id) : null;
    if (who?.kind === "student") {
      await lessons(ctx);
      return;
    }
    await next();
  });
  priv.callbackQuery(/^f:les:(\d)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await lessons(ctx, Number(ctx.match[1]));
  });

  // ── O'quvchi: baholar ──────────────────────────────────────────────────────
  const grades = async (ctx: Context) => {
    if (!ctx.from) return;
    const who = await whoIs(ctx.from.id);
    if (who?.kind !== "student") {
      await ctx.reply(who ? `Sinf baholarini ko'rish uchun "${B.tClass}" tugmasini bosing.` : "Avval /start orqali akkauntingizni ulang.");
      return;
    }
    const [recent, bySubject] = await Promise.all([
      query<{ subject: string; grade: number; teacher_name: string; created_at: string }>(
        `SELECT subject, grade, teacher_name, created_at FROM grades
          WHERE student_login = $1 ORDER BY created_at DESC LIMIT 10`,
        [who.login]
      ),
      query<{ subject: string; avg: string; cnt: number }>(
        `SELECT subject, ROUND(AVG(grade)::numeric, 1)::text AS avg, COUNT(*)::int AS cnt
           FROM grades WHERE student_login = $1 AND created_at >= NOW() - INTERVAL '30 days'
          GROUP BY subject ORDER BY AVG(grade) DESC`,
        [who.login]
      ),
    ]);
    if (recent.length === 0) {
      await ctx.reply("📊 Hozircha baholaringiz yo'q.");
      return;
    }
    const gi = (g: number) => (g >= 5 ? "🌟" : g >= 4 ? "✅" : g >= 3 ? "📘" : "⚠️");
    let text = `📊 <b>Oxirgi baholaringiz</b>\n\n`;
    text += recent
      .map((r) => `${gi(r.grade)} <b>${r.grade}</b> — ${esc(r.subject)} <i>(${String(r.created_at).slice(5, 10).split("-").reverse().join(".")})</i>`)
      .join("\n");
    if (bySubject.length) {
      text += `\n\n📈 <b>30 kunlik o'rtacha</b>\n`;
      text += bySubject.map((s) => `• ${esc(s.subject)}: <b>${s.avg}</b> (${s.cnt} ta)`).join("\n");
    }
    await ctx.reply(text, { parse_mode: "HTML" });
  };
  priv.hears(B.grades, grades);
  priv.command("baholar", grades);

  // ── O'quvchi: davomat ──────────────────────────────────────────────────────
  const myAttendance = async (ctx: Context) => {
    if (!ctx.from) return;
    const who = await whoIs(ctx.from.id);
    if (!who) { await ctx.reply("Avval /start orqali akkauntingizni ulang."); return; }
    if (who.kind !== "student") { await startAttendance(ctx, who); return; }
    const monthStart = uzDateStr().slice(0, 8) + "01";
    const stats = await queryOne<{ p: number; a: number; l: number; e: number }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'present')::int AS p,
              COUNT(*) FILTER (WHERE status = 'absent')::int  AS a,
              COUNT(*) FILTER (WHERE status = 'late')::int    AS l,
              COUNT(*) FILTER (WHERE status = 'excused')::int AS e
         FROM attendance WHERE student_login = $1 AND date >= $2::date`,
      [who.login, monthStart]
    );
    const misses = await query<{ date: string; status: string }>(
      `SELECT date::text AS date, status FROM attendance
        WHERE student_login = $1 AND status <> 'present' ORDER BY date DESC LIMIT 5`,
      [who.login]
    );
    const s = stats ?? { p: 0, a: 0, l: 0, e: 0 };
    const total = s.p + s.a + s.l + s.e;
    const pct = total ? Math.round(((s.p + s.l) / total) * 100) : 100;
    let text =
      `📋 <b>Shu oydagi davomatingiz</b>\n\n` +
      `✅ Keldi: <b>${s.p}</b>\n❌ Kelmadi: <b>${s.a}</b>\n⏰ Kechikdi: <b>${s.l}</b>\n📝 Sababli: <b>${s.e}</b>\n\n` +
      `📈 Qatnashish: <b>${pct}%</b>`;
    if (misses.length) {
      const lbl: Record<string, string> = { absent: "❌ kelmagan", late: "⏰ kechikkan", excused: "📝 sababli" };
      text += `\n\n<b>Oxirgi qoldirilganlar:</b>\n` + misses.map((m) => `• ${m.date.split("-").reverse().join(".")} — ${lbl[m.status] ?? m.status}`).join("\n");
    }
    await ctx.reply(text, { parse_mode: "HTML" });
  };
  priv.hears(B.att, myAttendance);
  priv.command("davomat", myAttendance);

  // ── Reyting ────────────────────────────────────────────────────────────────
  const rating = async (ctx: Context) => {
    if (!ctx.from) return;
    const who = await whoIs(ctx.from.id);
    if (who?.kind === "student") {
      const rows = await weeklyTop(who.class_name, 200);
      const pos = rows.findIndex((r) => r.student_login === who.login);
      let text = `🏆 <b>${esc(who.class_name)} — haftalik reyting</b>\n<i>(5 → 3 ball, 4 → 2, 3 → 1; oxirgi 7 kun)</i>\n\n`;
      text += rows.length ? topListText(rows.slice(0, 10), false) : "Bu hafta hali baho qo'yilmagan.";
      text += pos >= 0
        ? `\n\n📍 Sizning o'rningiz: <b>${pos + 1}</b> / ${rows.length} (${rows[pos]!.points} ball)`
        : `\n\n📍 Bu hafta sizda hali baho yo'q — birinchi bahoni oling! 💪`;
      await ctx.reply(text, { parse_mode: "HTML" });
      return;
    }
    const rows = await weeklyTop(null, 15);
    await ctx.reply(
      `🏆 <b>Maktab bo'yicha haftalik TOP-15</b>\n\n` + (rows.length ? topListText(rows, true) : "Bu hafta hali baho qo'yilmagan."),
      { parse_mode: "HTML" }
    );
  };
  priv.hears(B.rating, rating);
  priv.command("reyting", rating);

  // ── E'lonlar ───────────────────────────────────────────────────────────────
  priv.hears(B.news, async (ctx) => {
    const who = await whoIs(ctx.from!.id);
    const role = who?.kind === "student" ? "student" : who?.kind === "staff" ? who.role : "admin";
    const rows = await query<{ title: string; content: string; author_name: string; created_at: string }>(
      `SELECT title, COALESCE(NULLIF(content, ''), body, '') AS content, author_name, created_at
         FROM announcements
        WHERE role_filter IS NULL OR role_filter = 'all' OR role_filter = $1
        ORDER BY pinned DESC, created_at DESC LIMIT 5`,
      [role]
    ).catch(() => []);
    if (rows.length === 0) { await ctx.reply("📢 Hozircha e'lonlar yo'q."); return; }
    const text = rows
      .map((a) => {
        const body = a.content.length > 350 ? a.content.slice(0, 350) + "…" : a.content;
        return `📌 <b>${esc(a.title)}</b>\n${esc(body)}\n<i>— ${esc(a.author_name)}, ${String(a.created_at).slice(0, 10).split("-").reverse().join(".")}</i>`;
      })
      .join("\n\n");
    await ctx.reply(`📢 <b>So'nggi e'lonlar</b>\n\n${text}`, {
      parse_mode: "HTML",
      reply_markup: WEBSITE_URL ? new InlineKeyboard().url("Barchasi →", `${WEBSITE_URL}/announcements`) : undefined,
    });
  });

  // ── Sinf tanlash (davomat / xabar / sinfim) ────────────────────────────────
  const pickClass = async (ctx: Context, action: "att" | "msg" | "cls", title: string) => {
    if (!ctx.from) return;
    const who = await whoIs(ctx.from.id);
    if (!isStaffLike(who)) { await ctx.reply("Bu bo'lim faqat o'qituvchilar uchun."); return; }
    setF(ctx.from.id, { type: "idle" });
    const classes = await classesFor(who);
    if (classes.length === 0) {
      await ctx.reply("Sizga hali sinf biriktirilmagan (dars jadvali yoki sinf rahbarligi). Admin bilan bog'laning.");
      return;
    }
    // Sinf rahbari bo'lsa va faqat bitta sinf bo'lsa — to'g'ridan-to'g'ri
    if (classes.length === 1) {
      await runClassAction(ctx, who, action, classes[0]!.id);
      return;
    }
    const kb = new InlineKeyboard();
    const own = who.kind === "staff" ? who.class_id : null;
    classes.forEach((c, i) => {
      kb.text(`${c.id === own ? "⭐ " : ""}${c.name}`, `f:pick:${action}:${c.id}`);
      if (i % 3 === 2) kb.row();
    });
    await ctx.reply(title, { reply_markup: kb });
  };

  priv.hears(B.tAttendance, (ctx) => pickClass(ctx, "att", "✅ Qaysi sinf davomatini belgilaysiz?"));
  priv.hears(B.tMessage, (ctx) => pickClass(ctx, "msg", "✉️ Qaysi sinfga xabar yuborasiz?"));
  priv.hears(B.tClass, (ctx) => pickClass(ctx, "cls", "👥 Qaysi sinfni ko'rasiz?"));

  priv.callbackQuery(/^f:pick:(att|msg|cls):(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const who = await whoIs(ctx.from.id);
    if (!isStaffLike(who)) return;
    const action = ctx.match[1] as "att" | "msg" | "cls";
    const classId = ctx.match[2]!;
    if (!(await canUseClass(who, classId))) {
      await ctx.reply("⛔ Bu sinf sizga biriktirilmagan.");
      return;
    }
    await ctx.deleteMessage().catch(() => {});
    await runClassAction(ctx, who, action, classId);
  });

  // ── Davomat belgilash ──────────────────────────────────────────────────────
  priv.callbackQuery(/^f:at:(\d+)$/, async (ctx) => {
    const s = getF(ctx.from.id);
    if (s.type !== "att") { await ctx.answerCallbackQuery("Sessiya tugagan, qaytadan boshlang."); return; }
    const i = ctx.match[1]!;
    const cur = (s.marks[i] ?? "p") as "p" | "a" | "l" | "e";
    const next = cur === "p" ? "a" : cur === "a" ? "l" : cur === "l" ? "e" : "p";
    const marks = { ...s.marks };
    if (next === "p") delete marks[i];
    else marks[i] = next;
    const ns = { ...s, marks };
    setF(ctx.from.id, ns);
    await ctx.answerCallbackQuery(`${MARK_ICON[next]} ${shortName(s.names[Number(i)] ?? "")}`);
    await ctx.editMessageText(attText(ns), { parse_mode: "HTML", reply_markup: attKeyboard(ns) }).catch(() => {});
  });

  priv.callbackQuery("f:atall", async (ctx) => {
    const s = getF(ctx.from.id);
    if (s.type !== "att") { await ctx.answerCallbackQuery("Sessiya tugagan."); return; }
    const ns = { ...s, marks: {} };
    setF(ctx.from.id, ns);
    await ctx.answerCallbackQuery("Hammasi ✅");
    await ctx.editMessageText(attText(ns), { parse_mode: "HTML", reply_markup: attKeyboard(ns) }).catch(() => {});
  });

  priv.callbackQuery("f:atsave", async (ctx) => {
    const s = getF(ctx.from.id);
    if (s.type !== "att") { await ctx.answerCallbackQuery("Sessiya tugagan."); return; }
    const who = await whoIs(ctx.from.id);
    if (!isStaffLike(who)) { await ctx.answerCallbackQuery("⛔"); return; }
    await ctx.answerCallbackQuery("Saqlanmoqda...");
    setF(ctx.from.id, { type: "idle" });

    const login = staffLogin(who);
    for (let i = 0; i < s.logins.length; i++) {
      const status = MARK_STATUS[s.marks[String(i)] ?? "p"]!;
      await query(
        `INSERT INTO attendance (class_id, class_name, student_login, student_name, date, status, note, teacher_login)
         VALUES ($1, $2, $3, $4, $5, $6, '', $7)
         ON CONFLICT (student_login, date)
         DO UPDATE SET status = $6, teacher_login = $7, class_id = $1, class_name = $2`,
        [s.classId, s.className, s.logins[i], s.names[i], s.date, status, login]
      );
    }

    const missing = s.names
      .map((n, i) => ({ n, m: s.marks[String(i)] }))
      .filter((x) => x.m);
    const present = s.logins.length - missing.filter((x) => x.m === "a").length;
    const lbl: Record<string, string> = { a: "❌", l: "⏰", e: "📝" };
    const summary =
      `✅ <b>${esc(s.className)}</b> davomati saqlandi (${s.date})\n\n` +
      `👥 ${present} / ${s.logins.length} o'quvchi darsda` +
      (missing.length ? `\n\n` + missing.map((x) => `${lbl[x.m!]} ${esc(x.n)}`).join("\n") : "\n\n🎉 Hammasi keldi!");
    await ctx.editMessageText(summary, { parse_mode: "HTML" }).catch(async () => {
      await ctx.reply(summary, { parse_mode: "HTML" });
    });

    // O'quvchilarga xabar (kelmagan/kechikkan/sababli)
    void (async () => {
      for (let i = 0; i < s.logins.length; i++) {
        const m = s.marks[String(i)];
        if (!m) continue;
        const u = await queryOne<{ telegram_id: number }>("SELECT telegram_id FROM users WHERE login = $1", [s.logins[i]]);
        if (u && isRealTelegramId(u.telegram_id)) {
          await notifyUser(u.telegram_id, attendanceNotificationText(s.className, MARK_STATUS[m]!, s.date));
          await sleep(50);
        }
      }
      // Sinf rahbariga (agar davomatni boshqa o'qituvchi qilgan bo'lsa)
      const heads = await query<{ telegram_id: number }>(
        "SELECT telegram_id FROM staff WHERE class_id = $1 AND telegram_id IS NOT NULL AND telegram_id <> $2",
        [s.classId, ctx.from.id]
      );
      for (const h of heads) {
        await sendToChat(h.telegram_id, `ℹ️ ${esc(staffName(who))} davomat belgiladi:\n\n${summary}`);
      }
    })().catch((err) => logger.warn({ err }, "Davomat xabarlarida xato"));
  });

  priv.callbackQuery("f:cancel", async (ctx) => {
    setF(ctx.from.id, { type: "idle" });
    await ctx.answerCallbackQuery("Bekor qilindi");
    await ctx.editMessageText("❌ Bekor qilindi.").catch(() => {});
  });

  // ── Sinfga xabar: tasdiqlash ───────────────────────────────────────────────
  priv.callbackQuery(/^f:cm:(both|grp|dm)$/, async (ctx) => {
    const s = getF(ctx.from.id);
    if (s.type !== "cmsg_confirm") { await ctx.answerCallbackQuery("Sessiya tugagan."); return; }
    const who = await whoIs(ctx.from.id);
    if (!isStaffLike(who)) { await ctx.answerCallbackQuery("⛔"); return; }
    const mode = ctx.match[1]!;
    setF(ctx.from.id, { type: "idle" });
    await ctx.answerCallbackQuery("Yuborilmoqda...");
    await ctx.editMessageText("⏳ Yuborilmoqda...").catch(() => {});

    const header = `✉️ <b>${esc(s.className)} sinfi uchun xabar</b>\n👤 ${esc(staffName(who))}`;
    let groupsSent = 0;
    let dmSent = 0;
    let dmTotal = 0;

    if (mode !== "dm") {
      for (const chat of await getClassChats(s.classId)) {
        try {
          await ctx.api.sendMessage(chat.chat_id, header, { parse_mode: "HTML" });
          await ctx.api.copyMessage(chat.chat_id, ctx.from.id, s.messageId);
          groupsSent++;
        } catch (err) {
          logger.warn({ err, chat: chat.chat_id }, "Sinf guruhiga yuborilmadi");
        }
      }
    }
    if (mode !== "grp") {
      const students = await query<{ telegram_id: number }>("SELECT telegram_id FROM users WHERE class_name = $1", [s.className]);
      for (const st of students) {
        if (!isRealTelegramId(st.telegram_id)) continue;
        dmTotal++;
        try {
          await ctx.api.sendMessage(st.telegram_id, header, { parse_mode: "HTML" });
          await ctx.api.copyMessage(st.telegram_id, ctx.from.id, s.messageId);
          dmSent++;
        } catch { /* bloklagan bo'lishi mumkin */ }
        await sleep(70);
      }
    }
    await ctx.editMessageText(
      `✅ <b>Xabar yuborildi — ${esc(s.className)}</b>\n\n` +
        (mode !== "dm" ? `👥 Guruhlar: ${groupsSent}\n` : "") +
        (mode !== "grp" ? `👤 O'quvchilar: ${dmSent} / ${dmTotal} (botga ulanganlar)` : ""),
      { parse_mode: "HTML" }
    ).catch(() => {});
  });

  // ── Rahbar: maktab bugun ───────────────────────────────────────────────────
  priv.hears(B.mToday, async (ctx) => {
    const who = await whoIs(ctx.from!.id);
    if (!isManagement(who)) { await ctx.reply("Bu bo'lim faqat maktab rahbariyati uchun."); return; }
    const today = uzDateStr();
    const rows = await query<{ name: string; total: number; marked: number; present: number }>(
      `SELECT c.name,
              (SELECT COUNT(*) FROM users u WHERE u.class_name = c.name)::int AS total,
              (SELECT COUNT(*) FROM attendance a WHERE a.class_id::text = c.id::text AND a.date = $1::date)::int AS marked,
              (SELECT COUNT(*) FROM attendance a WHERE a.class_id::text = c.id::text AND a.date = $1::date
                                                  AND a.status IN ('present','late'))::int AS present
         FROM classes c`,
      [today]
    );
    const gradesToday = await queryOne<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM grades WHERE (created_at AT TIME ZONE 'Asia/Tashkent')::date = $1::date",
      [today]
    );
    const sorted = sortClasses(rows);
    const marked = sorted.filter((r) => r.marked > 0);
    const notMarked = sorted.filter((r) => r.marked === 0 && r.total > 0);
    const totalMarked = marked.reduce((a, r) => a + r.marked, 0);
    const totalPresent = marked.reduce((a, r) => a + r.present, 0);
    const pct = totalMarked ? Math.round((totalPresent / totalMarked) * 100) : 0;

    let text =
      `📊 <b>Maktab bugun</b> — ${today.split("-").reverse().join(".")}\n\n` +
      `✅ Davomat belgilangan sinflar: <b>${marked.length}</b> / ${sorted.length}\n` +
      `👥 Darsda: <b>${totalPresent}</b> / ${totalMarked} (${pct}%)\n` +
      `📝 Bugun qo'yilgan baholar: <b>${gradesToday?.n ?? 0}</b>`;
    if (marked.length) {
      text += `\n\n<b>Sinflar:</b>\n` + marked.map((r) => `• ${esc(r.name)}: ${r.present}/${r.marked}`).join("\n");
    }
    if (notMarked.length) {
      text += `\n\n⚠️ <b>Davomat belgilanmagan:</b> ` + notMarked.map((r) => esc(r.name)).join(", ");
    }
    await ctx.reply(text, { parse_mode: "HTML" });
  });

  // ── Rahbar: kanalga e'lon ──────────────────────────────────────────────────
  priv.hears(B.mPost, async (ctx) => {
    const who = await whoIs(ctx.from!.id);
    if (!isManagement(who)) { await ctx.reply("Bu bo'lim faqat maktab rahbariyati uchun."); return; }
    const [schools, classes, teachers] = await Promise.all([
      getChatsByPurpose("school"), getChatsByPurpose("class"), getChatsByPurpose("teachers"),
    ]);
    if (schools.length + classes.length + teachers.length === 0) {
      await ctx.reply(
        "Hali birorta kanal yoki guruh ulanmagan.\n\n" +
          "• Kanal: botni kanalga admin qiling yoki /kanal @kanal_nomi yuboring\n" +
          "• Sinf guruhi: botni guruhga qo'shib, u yerda /boglash yozing"
      );
      return;
    }
    setF(ctx.from!.id, { type: "cpost" });
    await ctx.reply(
      `📣 <b>E'lon yuborish</b>\n\nE'lonni shu yerga yuboring — matn, rasm, video, fayl yoki ovozli xabar bo'lishi mumkin.\n\n` +
        `Ulangan: 🏫 kanal ${schools.length} · 👥 sinf guruhi ${classes.length} · 👨‍🏫 ustozlar guruhi ${teachers.length}`,
      { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("❌ Bekor qilish", "f:cancel") }
    );
  });

  priv.callbackQuery(/^f:cp:(school|all|teachers)$/, async (ctx) => {
    const s = getF(ctx.from.id);
    if (s.type !== "cpost_confirm") { await ctx.answerCallbackQuery("Sessiya tugagan."); return; }
    const who = await whoIs(ctx.from.id);
    if (!isManagement(who)) { await ctx.answerCallbackQuery("⛔"); return; }
    setF(ctx.from.id, { type: "idle" });
    await ctx.answerCallbackQuery("Yuborilmoqda...");
    const mode = ctx.match[1]!;
    const targets: LinkedChat[] = [];
    if (mode === "school" || mode === "all") targets.push(...(await getChatsByPurpose("school")));
    if (mode === "all") targets.push(...(await getChatsByPurpose("class")));
    if (mode === "teachers" || mode === "all") targets.push(...(await getChatsByPurpose("teachers")));
    let ok = 0;
    for (const t of targets) {
      try {
        await ctx.api.copyMessage(t.chat_id, ctx.from.id, s.messageId);
        ok++;
      } catch (err) {
        logger.warn({ err, chat: t.chat_id }, "E'lon yuborilmadi");
      }
      await sleep(60);
    }
    await ctx.editMessageText(`✅ E'lon ${ok} / ${targets.length} ta chatga yuborildi.`).catch(() => {});
  });

  // ── Rahbar: guruh va kanallar ro'yxati ─────────────────────────────────────
  priv.hears(B.mChats, async (ctx) => {
    const who = await whoIs(ctx.from!.id);
    if (!isManagement(who)) { await ctx.reply("Bu bo'lim faqat maktab rahbariyati uchun."); return; }
    await showChats(ctx);
  });

  priv.callbackQuery(/^f:unl:(-?\d+)$/, async (ctx) => {
    const who = await whoIs(ctx.from.id);
    if (!isManagement(who)) { await ctx.answerCallbackQuery("⛔"); return; }
    await unlinkChat(Number(ctx.match[1]));
    await ctx.answerCallbackQuery("Uzildi");
    await ctx.deleteMessage().catch(() => {});
    await showChats(ctx);
  });

  // Bot kanalga qo'shilganda yuborilgan "ulash" tugmasi
  priv.callbackQuery(/^f:lnk:(school|teachers):(-?\d+)$/, async (ctx) => {
    const who = await whoIs(ctx.from.id);
    if (!isManagement(who)) { await ctx.answerCallbackQuery("⛔ Faqat rahbariyat"); return; }
    const purpose = ctx.match[1] as ChatPurpose;
    const chatId = Number(ctx.match[2]);
    try {
      const chat = await ctx.api.getChat(chatId);
      const title = "title" in chat && chat.title ? chat.title : String(chatId);
      await linkChat({ chatId, chatType: chat.type, title, purpose, linkedBy: ctx.from.id });
      await ctx.answerCallbackQuery("✅ Ulandi");
      await ctx.editMessageText(`✅ <b>${esc(title)}</b> ${purpose === "school" ? "maktab kanali" : "ustozlar guruhi"} sifatida ulandi.`, { parse_mode: "HTML" });
    } catch {
      await ctx.answerCallbackQuery("❌ Chat topilmadi");
    }
  });

  priv.callbackQuery("f:noop", (ctx) => ctx.answerCallbackQuery());

  // /kanal @username — maktab kanalini qo'lda ulash
  priv.command("kanal", async (ctx) => {
    const who = await whoIs(ctx.from!.id);
    if (!isManagement(who)) { await ctx.reply("⛔ Faqat maktab rahbariyati uchun."); return; }
    const arg = (typeof ctx.match === "string" ? ctx.match : "").trim();
    if (!arg) {
      await ctx.reply("Foydalanish: <code>/kanal @kanal_nomi</code> yoki <code>/kanal -100123...</code>\nBot kanalda admin bo'lishi kerak.", { parse_mode: "HTML" });
      return;
    }
    const id = arg.startsWith("@") || arg.startsWith("-") ? arg : `@${arg}`;
    try {
      const chat = await ctx.api.getChat(id);
      const me = await ctx.api.getChatMember(chat.id, ctx.me.id);
      if (me.status !== "administrator") {
        await ctx.reply("❌ Bot bu kanalda admin emas. Avval botni kanalga admin qilib qo'shing.");
        return;
      }
      const title = "title" in chat && chat.title ? chat.title : id;
      await linkChat({ chatId: chat.id, chatType: chat.type, title, purpose: "school", linkedBy: ctx.from!.id });
      await ctx.reply(`✅ <b>${esc(title)}</b> maktab kanali sifatida ulandi.\nEndi saytdagi e'lonlar ham shu yerga avtomatik chiqadi.`, { parse_mode: "HTML" });
    } catch {
      await ctx.reply("❌ Kanal topilmadi. Username to'g'riligini va bot admin ekanini tekshiring.");
    }
  });

  // ── Kutish holatidagi xabarlar (sinfga xabar / kanalga e'lon) ──────────────
  priv.on("message", async (ctx, next) => {
    const s = getF(ctx.from.id);
    const text = ctx.message.text ?? "";
    if (s.type === "idle" || s.type === "att" || text.startsWith("/") || ALL_BUTTONS.has(text)) {
      await next();
      return;
    }
    if (s.type === "cmsg" || s.type === "cmsg_confirm") {
      setF(ctx.from.id, { type: "cmsg_confirm", classId: s.classId, className: s.className, messageId: ctx.message.message_id });
      const groups = await getClassChats(s.classId);
      const students = await query<{ telegram_id: number }>("SELECT telegram_id FROM users WHERE class_name = $1", [s.className]);
      const linked = students.filter((x) => isRealTelegramId(x.telegram_id)).length;
      const kb = new InlineKeyboard();
      if (groups.length) kb.text("👥+👤 Guruh va o'quvchilarga", "f:cm:both").row().text("👥 Faqat guruhga", "f:cm:grp").row();
      kb.text("👤 Faqat o'quvchilarga", "f:cm:dm").row().text("❌ Bekor qilish", "f:cancel");
      await ctx.reply(
        `📨 <b>${esc(s.className)}</b> — xabar tayyor.\n\n` +
          `👥 Ulangan guruh: ${groups.length}\n👤 Botga ulangan o'quvchilar: ${linked} / ${students.length}\n\nQayerga yuboramiz?`,
        { parse_mode: "HTML", reply_markup: kb, reply_parameters: { message_id: ctx.message.message_id } }
      );
      return;
    }
    if (s.type === "cpost" || s.type === "cpost_confirm") {
      setF(ctx.from.id, { type: "cpost_confirm", messageId: ctx.message.message_id });
      await ctx.reply("📣 Qayerga yuboramiz?", {
        reply_parameters: { message_id: ctx.message.message_id },
        reply_markup: new InlineKeyboard()
          .text("🏫 Maktab kanali", "f:cp:school").row()
          .text("🏫+👥 Kanal + barcha sinf guruhlari", "f:cp:all").row()
          .text("👨‍🏫 Faqat ustozlar guruhi", "f:cp:teachers").row()
          .text("❌ Bekor qilish", "f:cancel"),
      });
      return;
    }
    await next();
  });
}

async function showTeacherSchedule(ctx: Context, who: Who, day?: number): Promise<void> {
  if (who.kind !== "staff") {
    await ctx.reply("Sizga shaxsiy dars jadvali biriktirilmagan.");
    return;
  }
  const d = day ?? uzDay();
  const text = await teacherTimetableText(who.id, d);
  await ctx.reply(text, {
    parse_mode: "HTML",
    reply_markup: new InlineKeyboard().text(`➡️ ${DAY_NAMES_UZ[nextSchoolDay(d)]}`, `f:les:${nextSchoolDay(d)}`),
  });
}

async function startAttendance(ctx: Context, who: Who): Promise<void> {
  // /davomat o'qituvchi yozsa — sinf tanlash
  if (!isStaffLike(who)) return;
  const classes = await classesFor(who);
  if (classes.length === 0) { await ctx.reply("Sizga hali sinf biriktirilmagan."); return; }
  if (classes.length === 1) { await runClassAction(ctx, who, "att", classes[0]!.id); return; }
  const kb = new InlineKeyboard();
  classes.forEach((c, i) => {
    kb.text(c.name, `f:pick:att:${c.id}`);
    if (i % 3 === 2) kb.row();
  });
  await ctx.reply("✅ Qaysi sinf davomatini belgilaysiz?", { reply_markup: kb });
}

async function runClassAction(ctx: Context, who: Who, action: "att" | "msg" | "cls", classId: string): Promise<void> {
  const tgId = ctx.from!.id;
  const cls = await queryOne<{ id: string; name: string }>("SELECT id, name FROM classes WHERE id = $1", [classId]);
  if (!cls) { await ctx.reply("Sinf topilmadi."); return; }

  if (action === "att") {
    const students = await query<{ login: string; full_name: string }>(
      "SELECT login, full_name FROM users WHERE class_name = $1 ORDER BY full_name",
      [cls.name]
    );
    if (students.length === 0) { await ctx.reply(`${cls.name} sinfida o'quvchi yo'q.`); return; }
    const date = uzDateStr();
    const existing = await query<{ student_login: string; status: string }>(
      "SELECT student_login, status FROM attendance WHERE class_id::text = $1 AND date = $2::date",
      [cls.id, date]
    );
    const exMap = new Map(existing.map((e) => [e.student_login, e.status]));
    const rev: Record<string, "a" | "l" | "e"> = { absent: "a", late: "l", excused: "e" };
    const marks: Record<string, "a" | "l" | "e"> = {};
    students.forEach((s, i) => {
      const st = exMap.get(s.login);
      if (st && rev[st]) marks[String(i)] = rev[st]!;
    });
    const state: Extract<FState, { type: "att" }> = {
      type: "att",
      classId: cls.id,
      className: cls.name,
      date,
      logins: students.map((s) => s.login),
      names: students.map((s) => s.full_name),
      marks,
    };
    setF(tgId, state);
    await ctx.reply(attText(state) + (existing.length ? "\n\n<i>ℹ️ Bugungi davomat avval kiritilgan — tahrirlayapsiz.</i>" : ""), {
      parse_mode: "HTML",
      reply_markup: attKeyboard(state),
    });
    return;
  }

  if (action === "msg") {
    setF(tgId, { type: "cmsg", classId: cls.id, className: cls.name });
    await ctx.reply(
      `✉️ <b>${esc(cls.name)}</b> sinfiga xabar\n\n` +
        `Xabarni yuboring: matn, rasm, fayl (PDF, Word), video yoki ovozli xabar.\n` +
        `Masalan: uy vazifasi, test fayli, ota-onalar majlisi haqida e'lon.`,
      { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("❌ Bekor qilish", "f:cancel") }
    );
    return;
  }

  // action === "cls" — sinf holati
  const rows = await query<{ full_name: string; telegram_id: number; avg: string | null; absent: number }>(
    `SELECT u.full_name, u.telegram_id,
            (SELECT ROUND(AVG(g.grade)::numeric, 1)::text FROM grades g
              WHERE g.student_login = u.login AND g.created_at >= NOW() - INTERVAL '30 days') AS avg,
            (SELECT COUNT(*) FROM attendance a
              WHERE a.student_login = u.login AND a.status = 'absent'
                AND a.date >= (NOW() - INTERVAL '30 days')::date)::int AS absent
       FROM users u WHERE u.class_name = $1 ORDER BY u.full_name`,
    [cls.name]
  );
  if (rows.length === 0) { await ctx.reply(`${cls.name} sinfida o'quvchi yo'q.`); return; }
  const linked = rows.filter((r) => isRealTelegramId(r.telegram_id)).length;
  const lines = rows.map(
    (r, i) =>
      `${i + 1}. ${isRealTelegramId(r.telegram_id) ? "🤖" : "⚪"} ${esc(r.full_name)} — ⭐${r.avg ?? "—"}${r.absent ? ` · ❌${r.absent}` : ""}`
  );
  const head =
    `👥 <b>${esc(cls.name)}</b> — ${rows.length} o'quvchi\n` +
    `🤖 Botga ulangan: ${linked} / ${rows.length}\n` +
    `<i>⭐ 30 kunlik o'rtacha baho · ❌ kelmagan kunlar</i>\n\n`;
  const botLink = `https://t.me/${ctx.me.username}`;
  const kb = new InlineKeyboard()
    .url("📤 Botni o'quvchilarga ulashish", `https://t.me/share/url?url=${encodeURIComponent(botLink)}&text=${encodeURIComponent("Maktab botiga ulaning — baholar, davomat va dars jadvali shu yerda!")}`)
    .row()
    .text("✅ Davomat qilish", `f:pick:att:${cls.id}`)
    .text("✉️ Xabar yuborish", `f:pick:msg:${cls.id}`);
  let chunk = head;
  for (const line of lines) {
    if (chunk.length + line.length > 3800) {
      await ctx.reply(chunk, { parse_mode: "HTML" });
      chunk = "";
    }
    chunk += line + "\n";
  }
  await ctx.reply(chunk, { parse_mode: "HTML", reply_markup: kb });
}

async function showChats(ctx: Context): Promise<void> {
  const rows = await query<{ chat_id: number; title: string; purpose: string; class_name: string | null }>(
    `SELECT t.chat_id, t.title, t.purpose, c.name AS class_name
       FROM tg_chats t LEFT JOIN classes c ON c.id = t.class_id
      ORDER BY t.purpose, c.name NULLS LAST, t.title`
  );
  const icon: Record<string, string> = { school: "🏫", teachers: "👨‍🏫", class: "👥" };
  let text = `🔗 <b>Ulangan guruh va kanallar</b> (${rows.length})\n\n`;
  text += rows.length
    ? rows.map((r) => `${icon[r.purpose] ?? "•"} ${esc(r.title)}${r.class_name ? ` → <b>${esc(r.class_name)}</b>` : ""}`).join("\n")
    : "Hozircha hech narsa ulanmagan.";
  text +=
    `\n\n<b>Qanday ulanadi?</b>\n` +
    `🏫 Kanal: botni kanalga admin qiling (bot sizga tugma yuboradi) yoki <code>/kanal @nomi</code>\n` +
    `👥 Sinf guruhi: botni guruhga qo'shing → guruhda <code>/boglash 7-A</code>\n` +
    `👨‍🏫 Ustozlar guruhi: guruhda <code>/boglash ustozlar</code>`;
  const kb = new InlineKeyboard();
  rows.slice(0, 30).forEach((r) => kb.text(`✖️ ${r.class_name ?? r.title}`.slice(0, 40), `f:unl:${r.chat_id}`).row());
  await ctx.reply(text, { parse_mode: "HTML", reply_markup: rows.length ? kb : undefined });
}

// ═══════════════════════════════════════════════════════════════════════════
//  GURUH VA KANALLAR
// ═══════════════════════════════════════════════════════════════════════════

function normClass(s: string): string {
  return s.toLowerCase().replace(/[\s\-–_"'«».]/g, "").replace(/sinf$/, "");
}

function registerGroup(group: Composer<Context>): void {
  // Bot guruh/kanalga qo'shildi yoki chiqarildi
  group.on("my_chat_member", async (ctx) => {
    const upd = ctx.myChatMember;
    const chat = upd.chat;
    const newStatus = upd.new_chat_member.status;
    const oldStatus = upd.old_chat_member.status;
    const title = "title" in chat && chat.title ? chat.title : String(chat.id);

    if (newStatus === "left" || newStatus === "kicked") {
      await unlinkChat(chat.id).catch(() => {});
      return;
    }
    const wasOut = oldStatus === "left" || oldStatus === "kicked";

    if (chat.type === "channel") {
      if (newStatus !== "administrator") return;
      const adder = upd.from.id;
      const who = await whoIs(adder);
      const target = isManagement(who) ? adder : ADMIN_ID;
      if (!target) return;
      await ctx.api
        .sendMessage(
          target,
          `📢 Bot <b>${esc(title)}</b> kanaliga admin qilindi.\n\nUni maktab kanali sifatida ulaymi? Ulansa, saytdagi e'lonlar, haftalik reyting va "📣 Kanalga e'lon" shu kanalga chiqadi.`,
          {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard().text("🏫 Ha, maktab kanali", `f:lnk:school:${chat.id}`).row().text("❌ Yo'q", "f:noop"),
          }
        )
        .catch(() => {});
      return;
    }

    if (wasOut) {
      await ctx.reply(
        `👋 Assalomu alaykum! Men maktab platformasi botiman.\n\n` +
          `Sinf rahbari yoki o'qituvchi guruhni ulash uchun yozsin:\n` +
          `<code>/boglash</code> — o'z sinfingizga\n<code>/boglash 7-A</code> — aniq sinfga\n<code>/boglash ustozlar</code> — o'qituvchilar guruhi\n\n` +
          `Ulangandan keyin: har kuni ertalab dars jadvali 📅, tug'ilgan kun tabriklari 🎂, haftalik reyting 🏆 va o'qituvchi xabarlari shu yerga keladi.`,
        { parse_mode: "HTML" }
      ).catch(() => {});
    }
  });

  // Supergroup'ga aylanganda chat ID o'zgaradi
  group.on("message:migrate_to_chat_id", async (ctx) => {
    const newId = ctx.message.migrate_to_chat_id;
    await query("UPDATE tg_chats SET chat_id = $2, chat_type = 'supergroup' WHERE chat_id = $1", [ctx.chat.id, newId]).catch(() => {});
  });

  // Guruhga yangi a'zo qo'shildi — botga ulanish havolasi
  group.on("message:new_chat_members", async (ctx) => {
    const linked = await getLinkedChat(ctx.chat.id);
    if (!linked || linked.purpose !== "class") return;
    const people = ctx.message.new_chat_members.filter((m) => !m.is_bot);
    if (people.length === 0) return;
    const names = people.map((p) => esc(p.first_name)).join(", ");
    await ctx.reply(
      `👋 Xush kelibsiz, ${names}!\n\nBaholaringiz, davomat va dars jadvalini shaxsiy xabarda olish uchun botga ulaning 👇`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard().url("🤖 Botga ulanish", `https://t.me/${ctx.me.username}?start=sinf`),
      }
    ).catch(() => {});
  });

  group.command(["start", "yordam", "help"], async (ctx) => {
    const linked = await getLinkedChat(ctx.chat.id);
    const status = linked
      ? `✅ Bu guruh ulangan: <b>${linked.purpose === "class" ? "sinf guruhi" : linked.purpose === "school" ? "maktab guruhi" : "ustozlar guruhi"}</b>`
      : "⚪ Bu guruh hali ulanmagan. O'qituvchi /boglash yozsin.";
    await ctx.reply(
      `${status}\n\n/jadval — bugungi darslar\n/reyting — haftalik reyting\n/natija — o'yindagi hisob\n/oyin, /boglash, /uzish, /sozlamalar — o'qituvchilar uchun`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard().url("🤖 Shaxsiy botga o'tish", `https://t.me/${ctx.me.username}?start=grp`),
      }
    );
  });

  group.command("boglash", async (ctx) => {
    if (!ctx.from) return;
    const who = await whoIs(ctx.from.id);
    if (!isStaffLike(who)) {
      await ctx.reply("⛔ Guruhni faqat botga ulangan o'qituvchi yoki rahbar ulay oladi. Avval botga shaxsiy /start yozing.", {
        reply_markup: new InlineKeyboard().url("🤖 Botga o'tish", `https://t.me/${ctx.me.username}?start=grp`),
      });
      return;
    }
    const title = "title" in ctx.chat && ctx.chat.title ? ctx.chat.title : String(ctx.chat.id);
    const arg = (typeof ctx.match === "string" ? ctx.match : "").trim();
    const a = normClass(arg);

    if (a === "maktab") {
      if (!isManagement(who)) { await ctx.reply("⛔ Maktab guruhini faqat rahbariyat ulay oladi."); return; }
      await linkChat({ chatId: ctx.chat.id, chatType: ctx.chat.type, title, purpose: "school", linkedBy: ctx.from.id });
      await ctx.reply("✅ Guruh <b>maktab umumiy guruhi</b> sifatida ulandi.", { parse_mode: "HTML" });
      return;
    }
    if (a === "ustozlar" || a === "oqituvchilar" || a === "o'qituvchilar") {
      await linkChat({ chatId: ctx.chat.id, chatType: ctx.chat.type, title, purpose: "teachers", linkedBy: ctx.from.id });
      await ctx.reply("✅ Guruh <b>ustozlar guruhi</b> sifatida ulandi. Rahbariyat e'lonlari shu yerga keladi.", { parse_mode: "HTML" });
      return;
    }

    let classId: string | null = null;
    if (a) {
      const all = await getAllClasses();
      const found = all.find((c) => normClass(c.name) === a);
      if (!found) {
        await ctx.reply(`❌ "${esc(arg)}" sinfi topilmadi. Mavjud sinflar: ${all.map((c) => esc(c.name)).join(", ")}`, { parse_mode: "HTML" });
        return;
      }
      classId = found.id;
    } else if (who.kind === "staff" && who.class_id) {
      classId = who.class_id;
    }

    if (!classId) {
      const classes = await classesFor(who);
      if (classes.length === 0) { await ctx.reply("Sizga sinf biriktirilmagan. Masalan: /boglash 7-A"); return; }
      const kb = new InlineKeyboard();
      classes.forEach((c, i) => {
        kb.text(c.name, `g:bind:${c.id}`);
        if (i % 3 === 2) kb.row();
      });
      await ctx.reply("Bu guruh qaysi sinfniki?", { reply_markup: kb });
      return;
    }
    if (!(await canUseClass(who, classId))) { await ctx.reply("⛔ Bu sinf sizga biriktirilmagan."); return; }
    await bindClass(ctx, classId, title);
  });

  group.callbackQuery(/^g:bind:(.+)$/, async (ctx) => {
    const who = await whoIs(ctx.from.id);
    const classId = ctx.match[1]!;
    if (!isStaffLike(who) || !(await canUseClass(who, classId))) {
      await ctx.answerCallbackQuery({ text: "⛔ Faqat shu sinf o'qituvchisi", show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery();
    await ctx.deleteMessage().catch(() => {});
    const title = ctx.chat && "title" in ctx.chat && ctx.chat.title ? ctx.chat.title : "";
    await bindClass(ctx, classId, title);
  });

  group.command("uzish", async (ctx) => {
    const who = ctx.from ? await whoIs(ctx.from.id) : null;
    if (!isStaffLike(who)) { await ctx.reply("⛔ Faqat o'qituvchilar."); return; }
    await unlinkChat(ctx.chat.id);
    await ctx.reply("✅ Guruh platformadan uzildi. Avtomatik xabarlar endi kelmaydi.");
  });

  group.command("jadval", async (ctx) => {
    const linked = await getLinkedChat(ctx.chat.id);
    if (!linked?.class_id) { await ctx.reply("Bu guruh sinfga ulanmagan. O'qituvchi /boglash yozsin."); return; }
    const cls = await queryOne<{ name: string }>("SELECT name FROM classes WHERE id = $1", [linked.class_id]);
    const d = uzDay();
    const text = await classTimetableText(linked.class_id, cls?.name ?? "", d);
    await ctx.reply(text, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text(`➡️ ${DAY_NAMES_UZ[nextSchoolDay(d)]}`, `g:tt:${nextSchoolDay(d)}`),
    });
  });

  group.callbackQuery(/^g:tt:(\d)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!ctx.chat) return;
    const linked = await getLinkedChat(ctx.chat.id);
    if (!linked?.class_id) return;
    const cls = await queryOne<{ name: string }>("SELECT name FROM classes WHERE id = $1", [linked.class_id]);
    const d = Number(ctx.match[1]);
    const text = await classTimetableText(linked.class_id, cls?.name ?? "", d);
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text(`➡️ ${DAY_NAMES_UZ[nextSchoolDay(d)]}`, `g:tt:${nextSchoolDay(d)}`),
    }).catch(() => {});
  });

  group.command("reyting", async (ctx) => {
    const linked = await getLinkedChat(ctx.chat.id);
    if (linked?.class_id) {
      const cls = await queryOne<{ name: string }>("SELECT name FROM classes WHERE id = $1", [linked.class_id]);
      const rows = await weeklyTop(cls?.name ?? "", 10);
      await ctx.reply(
        `🏆 <b>${esc(cls?.name ?? "")} — haftalik TOP-10</b>\n\n` + (rows.length ? topListText(rows, false) : "Bu hafta hali baho qo'yilmagan."),
        { parse_mode: "HTML" }
      );
      return;
    }
    const rows = await weeklyTop(null, 10);
    await ctx.reply(`🏆 <b>Maktab — haftalik TOP-10</b>\n\n` + (rows.length ? topListText(rows, true) : "Bu hafta hali baho qo'yilmagan."), {
      parse_mode: "HTML",
    });
  });

  const settingsKb = (s: LinkedChat["settings"]) => {
    const on = (v: boolean | undefined) => (v === false ? "⚪" : "✅");
    return new InlineKeyboard()
      .text(`${on(s.morning_schedule)} Ertalabki dars jadvali`, "g:set:morning_schedule").row()
      .text(`${on(s.birthdays)} Tug'ilgan kun tabriklari`, "g:set:birthdays").row()
      .text(`${on(s.weekly_top)} Haftalik reyting (shanba)`, "g:set:weekly_top");
  };

  group.command("sozlamalar", async (ctx) => {
    const who = ctx.from ? await whoIs(ctx.from.id) : null;
    if (!isStaffLike(who)) { await ctx.reply("⛔ Faqat o'qituvchilar."); return; }
    const linked = await getLinkedChat(ctx.chat.id);
    if (!linked) { await ctx.reply("Avval guruhni ulang: /boglash"); return; }
    await ctx.reply("⚙️ <b>Avtomatik xabarlar</b>\nYoqish/o'chirish uchun bosing:", { parse_mode: "HTML", reply_markup: settingsKb(linked.settings ?? {}) });
  });

  group.callbackQuery(/^g:set:(morning_schedule|birthdays|weekly_top)$/, async (ctx) => {
    const who = await whoIs(ctx.from.id);
    if (!isStaffLike(who) || !ctx.chat) { await ctx.answerCallbackQuery({ text: "⛔ Faqat o'qituvchilar", show_alert: true }); return; }
    const linked = await getLinkedChat(ctx.chat.id);
    if (!linked) { await ctx.answerCallbackQuery(); return; }
    const key = ctx.match[1] as "morning_schedule" | "birthdays" | "weekly_top";
    const cur = (linked.settings ?? {})[key] !== false;
    await updateChatSettings(ctx.chat.id, { [key]: !cur });
    await ctx.answerCallbackQuery(cur ? "O'chirildi" : "Yoqildi");
    await ctx.editMessageReplyMarkup({ reply_markup: settingsKb({ ...(linked.settings ?? {}), [key]: !cur }) }).catch(() => {});
  });

  // Qolgan barcha guruh xabarlari — e'tiborsiz (spam qilmaymiz)
}

async function bindClass(ctx: Context, classId: string, title: string): Promise<void> {
  const cls = await queryOne<{ name: string }>("SELECT name FROM classes WHERE id = $1", [classId]);
  if (!cls || !ctx.chat) return;
  await linkChat({ chatId: ctx.chat.id, chatType: ctx.chat.type, title, purpose: "class", classId, linkedBy: ctx.from?.id ?? null });
  await ctx.reply(
    `✅ Guruh <b>${esc(cls.name)}</b> sinfiga ulandi!\n\n` +
      `Endi bu yerga avtomatik keladi:\n📅 har kuni 7:05 da dars jadvali\n🎂 tug'ilgan kun tabriklari\n🏆 shanba kuni haftalik reyting\n✉️ o'qituvchilar xabarlari\n\n` +
      `🎮 O'qituvchi <b>/oyin</b> yozsa — "Bilimlar jangi" boshlanadi!\n` +
      `Sozlash: /sozlamalar`,
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().url("🤖 O'quvchilar: botga ulaning", `https://t.me/${ctx.me.username}?start=sinf`),
    }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  REJALASHTIRILGAN XABARLAR (O'zbekiston vaqti)
// ═══════════════════════════════════════════════════════════════════════════

function inWindow(hour: number, min: number, h: number, m: number, width = 15): boolean {
  const now = hour * 60 + min;
  const start = h * 60 + m;
  return now >= start && now < start + width;
}

function startScheduler(): void {
  let running = false;
  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const { hour, min } = uzHourMin();
      const day = uzDay();
      const date = uzDateStr();
      const schoolDay = day >= 1 && day <= 6;

      if (schoolDay && inWindow(hour, min, 7, 5) && (await claimJob(`cls-morning:${date}`))) {
        await jobMorningSchedules(day);
      }
      if (inWindow(hour, min, 8, 0) && (await claimJob(`bday:${date}`))) {
        await jobBirthdays();
      }
      if (schoolDay && inWindow(hour, min, 15, 30) && (await claimJob(`att-remind:${date}`))) {
        await jobAttendanceReminder(date);
      }
      if (day === 6 && inWindow(hour, min, 16, 0) && (await claimJob(`weekly:${date}`))) {
        await jobWeeklyTop();
      }
    } catch (err) {
      logger.error({ err }, "Rejalashtirilgan Telegram xabarida xato");
    } finally {
      running = false;
    }
  }, 60 * 1000);
}

async function jobMorningSchedules(day: number): Promise<void> {
  const chats = await getChatsByPurpose("class");
  for (const chat of chats) {
    if (!chat.class_id || chat.settings?.morning_schedule === false) continue;
    const cls = await queryOne<{ name: string }>("SELECT name FROM classes WHERE id = $1", [chat.class_id]);
    if (!cls) continue;
    const text = await classTimetableText(chat.class_id, cls.name, day);
    await sendToChat(chat.chat_id, `☀️ <b>Xayrli tong!</b>\n\n${text}\n\nBugun ham omad! 💪`);
    await sleep(80);
  }
  logger.info({ count: chats.length }, "Sinf guruhlariga ertalabki jadval yuborildi");
}

async function jobBirthdays(): Promise<void> {
  const md = uzDateStr().slice(5); // MM-DD
  const students = await query<{ full_name: string; class_name: string; telegram_id: number }>(
    "SELECT full_name, class_name, telegram_id FROM users WHERE birthday IS NOT NULL AND to_char(birthday, 'MM-DD') = $1",
    [md]
  );
  const staff = await query<{ full_name: string; telegram_id: number | null }>(
    "SELECT full_name, telegram_id FROM staff WHERE birthday IS NOT NULL AND to_char(birthday, 'MM-DD') = $1",
    [md]
  );
  if (students.length === 0 && staff.length === 0) return;

  // O'quvchilar → sinf guruhi + shaxsiy tabrik
  const byClass = new Map<string, string[]>();
  for (const s of students) {
    byClass.set(s.class_name, [...(byClass.get(s.class_name) ?? []), s.full_name]);
    if (isRealTelegramId(s.telegram_id)) {
      await sendToChat(s.telegram_id, `🎂 <b>Tug'ilgan kuningiz bilan, ${esc(s.full_name.split(" ")[1] ?? s.full_name)}!</b>\n\nMaktabingiz sizni chin dildan tabriklaydi. Bilim, omad va quvonch tilaymiz! 🎉`);
    }
  }
  const classChats = await getChatsByPurpose("class");
  for (const chat of classChats) {
    if (!chat.class_id || chat.settings?.birthdays === false) continue;
    const cls = await queryOne<{ name: string }>("SELECT name FROM classes WHERE id = $1", [chat.class_id]);
    const names = cls ? byClass.get(cls.name) : undefined;
    if (!names?.length) continue;
    await sendToChat(
      chat.chat_id,
      `🎉 <b>Bugun tug'ilgan kun!</b>\n\n${names.map((n) => `🎂 ${esc(n)}`).join("\n")}\n\nSinfdoshlar, tabriklashni unutmang! 🥳`
    );
    await sleep(80);
  }

  // Xodimlar → ustozlar guruhi
  if (staff.length) {
    for (const chat of await getChatsByPurpose("teachers")) {
      await sendToChat(chat.chat_id, `🎉 <b>Bugun hamkasbimizning tug'ilgan kuni!</b>\n\n${staff.map((s) => `💐 ${esc(s.full_name)}`).join("\n")}`);
    }
    for (const s of staff) {
      if (s.telegram_id) await sendToChat(s.telegram_id, `💐 <b>Tug'ilgan kuningiz muborak, ${esc(s.full_name)}!</b>\n\nJamoamiz sizga sog'lik va zafarlar tilaydi.`);
    }
  }
}

async function jobAttendanceReminder(date: string): Promise<void> {
  const heads = await query<{ telegram_id: number; class_id: string; class_name: string; full_name: string }>(
    `SELECT s.telegram_id, s.class_id, c.name AS class_name, s.full_name
       FROM staff s JOIN classes c ON c.id = s.class_id
      WHERE s.telegram_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.class_id::text = s.class_id::text AND a.date = $1::date)
        AND EXISTS (SELECT 1 FROM users u WHERE u.class_name = c.name)`,
    [date]
  );
  for (const h of heads) {
    await sendToChat(h.telegram_id, `⏰ <b>${esc(h.class_name)}</b> sinfining bugungi davomati hali belgilanmagan.\n\n1 daqiqada belgilab qo'yasizmi?`, {
      reply_markup: { inline_keyboard: [[{ text: "✅ Davomat qilish", callback_data: `f:pick:att:${h.class_id}` }]] },
    });
    await sleep(60);
  }
}

async function jobWeeklyTop(): Promise<void> {
  const top = await weeklyTop(null, 10);
  if (top.length === 0) return;
  const bestClasses = await query<{ class_name: string; avg: string }>(
    `SELECT class_name, ROUND(AVG(grade)::numeric, 2)::text AS avg
       FROM grades WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY class_name HAVING COUNT(*) >= 10
      ORDER BY AVG(grade) DESC LIMIT 3`
  );
  const schoolText =
    `🏆 <b>Haftaning eng yaxshi o'quvchilari</b>\n\n${topListText(top, true)}` +
    (bestClasses.length
      ? `\n\n🏫 <b>Eng kuchli sinflar</b> (o'rtacha baho)\n` + bestClasses.map((c, i) => `${rankIcon(i)} ${esc(c.class_name)} — ⭐${c.avg}`).join("\n")
      : "") +
    `\n\n<i>Ball: 5 → 3, 4 → 2, 3 → 1. Yangi hafta — yangi imkoniyat!</i>`;
  for (const chat of await getChatsByPurpose("school")) {
    await sendToChat(chat.chat_id, schoolText);
    await sleep(80);
  }
  for (const chat of await getChatsByPurpose("class")) {
    if (!chat.class_id || chat.settings?.weekly_top === false) continue;
    const cls = await queryOne<{ name: string }>("SELECT name FROM classes WHERE id = $1", [chat.class_id]);
    if (!cls) continue;
    const rows = await weeklyTop(cls.name, 5);
    if (rows.length === 0) continue;
    await sendToChat(chat.chat_id, `🏆 <b>${esc(cls.name)} — haftaning TOP-5</b>\n\n${topListText(rows, false)}\n\nTabriklaymiz! 👏`);
    await sleep(80);
  }
}

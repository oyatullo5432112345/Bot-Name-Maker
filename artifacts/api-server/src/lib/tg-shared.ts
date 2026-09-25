// Telegram integratsiyasi uchun umumiy yordamchilar.
// Bu fayl bot.ts ga bog'liq emas — routes/ ichidan ham xavfsiz import qilinadi
// (aylanma import bo'lmaydi). Xabar yuborish grammy `Api` orqali.

import { Api } from "grammy";
import { query, queryOne } from "./db.js";
import { logger } from "./logger.js";

const BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
export const tgApi = BOT_TOKEN ? new Api(BOT_TOKEN) : null;

// index.ts va bot.ts dagi mantiq bilan bir xil: production'da REPLIT_DOMAINS,
// bo'lmasa WEBSITE_URL (Render'da shu ishlatiladi).
export function getWebsiteUrl(): string {
  const replitDomain = process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim();
  const envUrl = process.env["WEBSITE_URL"]?.trim() ?? "";
  const url = replitDomain && process.env["NODE_ENV"] === "production" ? `https://${replitDomain}` : envUrl || (replitDomain ? `https://${replitDomain}` : "");
  return url.replace(/\/$/, "");
}

// ─── Matn ────────────────────────────────────────────────────────────────────

export function esc(text: unknown): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Haqiqiy Telegram ID mi yoki sayt orqali yaratilgan "soxta" ID mi
// (students.ts yangi o'quvchiga Date.now() ni telegram_id qilib beradi).
export function isRealTelegramId(id: number | string | null | undefined): boolean {
  const n = Number(id);
  return Number.isFinite(n) && n > 0 && n < 100_000_000_000;
}

// ─── O'zbekiston vaqti (UTC+5) ───────────────────────────────────────────────

export function uzNow(): Date {
  return new Date(Date.now() + 5 * 60 * 60 * 1000);
}

/** 0=Yakshanba, 1=Dushanba ... 6=Shanba */
export function uzDay(): number {
  return uzNow().getUTCDay();
}

export function uzHourMin(): { hour: number; min: number } {
  const d = uzNow();
  return { hour: d.getUTCHours(), min: d.getUTCMinutes() };
}

/** YYYY-MM-DD (O'zbekiston sanasi) */
export function uzDateStr(offsetDays = 0): string {
  const d = new Date(uzNow().getTime() + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

export const PERIOD_TIMES: Record<number, string> = {
  1: "08:00–08:45", 2: "08:55–09:40", 3: "09:50–10:35",
  4: "10:55–11:40", 5: "11:50–12:35", 6: "12:45–13:30",
  7: "13:40–14:25", 8: "14:35–15:20",
};

export const DAY_NAMES_UZ: Record<number, string> = {
  0: "Yakshanba", 1: "Dushanba", 2: "Seshanba", 3: "Chorshanba",
  4: "Payshanba", 5: "Juma", 6: "Shanba",
};

export function nextSchoolDay(day: number): number {
  const n = day + 1;
  return n > 6 ? 1 : n; // Shanbadan keyin → Dushanba
}

// ─── Ulangan guruh / kanallar ────────────────────────────────────────────────

export type ChatPurpose = "class" | "school" | "teachers";

export interface ChatSettings {
  morning_schedule?: boolean;
  birthdays?: boolean;
  weekly_top?: boolean;
}

export interface LinkedChat {
  chat_id: number;
  chat_type: string;
  title: string;
  purpose: ChatPurpose;
  class_id: string | null;
  settings: ChatSettings;
}

export async function getLinkedChat(chatId: number): Promise<LinkedChat | null> {
  return queryOne<LinkedChat>(
    "SELECT chat_id, chat_type, title, purpose, class_id, settings FROM tg_chats WHERE chat_id = $1",
    [chatId]
  );
}

export async function getChatsByPurpose(purpose: ChatPurpose): Promise<LinkedChat[]> {
  return query<LinkedChat>(
    "SELECT chat_id, chat_type, title, purpose, class_id, settings FROM tg_chats WHERE purpose = $1",
    [purpose]
  );
}

export async function getClassChats(classId: string): Promise<LinkedChat[]> {
  return query<LinkedChat>(
    "SELECT chat_id, chat_type, title, purpose, class_id, settings FROM tg_chats WHERE purpose = 'class' AND class_id = $1",
    [classId]
  );
}

export async function linkChat(input: {
  chatId: number;
  chatType: string;
  title: string;
  purpose: ChatPurpose;
  classId?: string | null;
  linkedBy?: number | null;
}): Promise<void> {
  await query(
    `INSERT INTO tg_chats (chat_id, chat_type, title, purpose, class_id, linked_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (chat_id) DO UPDATE
       SET chat_type = EXCLUDED.chat_type, title = EXCLUDED.title,
           purpose = EXCLUDED.purpose, class_id = EXCLUDED.class_id,
           linked_by = EXCLUDED.linked_by`,
    [input.chatId, input.chatType, input.title, input.purpose, input.classId ?? null, input.linkedBy ?? null]
  );
}

export async function unlinkChat(chatId: number): Promise<void> {
  await query("DELETE FROM tg_chats WHERE chat_id = $1", [chatId]);
}

export async function updateChatSettings(chatId: number, patch: ChatSettings): Promise<void> {
  await query("UPDATE tg_chats SET settings = settings || $2::jsonb WHERE chat_id = $1", [
    chatId,
    JSON.stringify(patch),
  ]);
}

// Chat ID o'zgarsa (guruh supergroup'ga aylansa) yoki bot chiqarib yuborilsa
// — bazani tozalaymiz, qolgan chatlarga yuborish davom etadi.
async function handleSendError(chatId: number, err: unknown): Promise<void> {
  const e = err as { error_code?: number; description?: string; parameters?: { migrate_to_chat_id?: number } };
  const newId = e.parameters?.migrate_to_chat_id;
  if (newId) {
    await query("UPDATE tg_chats SET chat_id = $2, chat_type = 'supergroup' WHERE chat_id = $1", [chatId, newId]).catch(() => {});
    return;
  }
  if (e.error_code === 403 || /chat not found|kicked|not a member/i.test(e.description ?? "")) {
    await unlinkChat(chatId).catch(() => {});
    logger.warn({ chatId }, "Bot chatdan chiqarilgan — tg_chats dan o'chirildi");
    return;
  }
  logger.warn({ err, chatId }, "Telegram chatga yuborishda xato");
}

export async function sendToChat(
  chatId: number,
  html: string,
  extra: Record<string, unknown> = {}
): Promise<boolean> {
  if (!tgApi) return false;
  try {
    await tgApi.sendMessage(chatId, html, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      ...extra,
    });
    return true;
  } catch (err) {
    await handleSendError(chatId, err);
    return false;
  }
}

/** Faqat bir marta bajariladigan ish (kun/hafta kaliti bilan). true → hozir bajarish kerak. */
export async function claimJob(jobKey: string): Promise<boolean> {
  try {
    const row = await queryOne<{ job_key: string }>(
      "INSERT INTO tg_job_runs (job_key) VALUES ($1) ON CONFLICT DO NOTHING RETURNING job_key",
      [jobKey]
    );
    return Boolean(row);
  } catch (err) {
    logger.warn({ err, jobKey }, "claimJob xatosi");
    return false;
  }
}

// ─── E'lonni Telegramga chiqarish (routes/announcements.ts dan) ─────────────

const STAFF_FILTERS = new Set(["teacher", "sinf_rahbari", "director", "zam_direktor", "zavuch", "kutubxonachi", "staff"]);

export async function publishAnnouncement(a: {
  title: string;
  content: string;
  authorName: string;
  roleFilter: string | null;
  websiteUrl?: string;
}): Promise<number> {
  if (!tgApi) return 0;
  const filter = a.roleFilter && a.roleFilter !== "all" ? a.roleFilter : null;

  const targets: LinkedChat[] = [];
  if (!filter || filter === "student") targets.push(...(await getChatsByPurpose("school")));
  if (!filter || STAFF_FILTERS.has(filter)) targets.push(...(await getChatsByPurpose("teachers")));
  if (filter === "student") targets.push(...(await getChatsByPurpose("class")));

  const text =
    `📢 <b>${esc(a.title)}</b>\n\n` +
    `${esc(a.content)}\n\n` +
    `— <i>${esc(a.authorName)}</i>`;
  const extra = a.websiteUrl
    ? { reply_markup: { inline_keyboard: [[{ text: "🌐 Platformada ochish", url: `${a.websiteUrl}/announcements` }]] } }
    : {};

  let sent = 0;
  const seen = new Set<number>();
  for (const chat of targets) {
    if (seen.has(chat.chat_id)) continue;
    seen.add(chat.chat_id);
    if (await sendToChat(chat.chat_id, text, extra)) sent++;
    await sleep(60);
  }
  return sent;
}

// ─── Sxema (server ishga tushganda) ─────────────────────────────────────────
// Render free tarifida preDeployCommand ishlamaydi, shuning uchun
// migrations/011_telegram_integration.sql ning nusxasi bu yerda ham bor —
// barcha buyruqlar IF NOT EXISTS, qayta ishlatish xavfsiz.
const TELEGRAM_SCHEMA_SQL = `
-- ============================================================
-- 011 — TELEGRAM INTEGRATSIYASI (guruhlar, kanallar, rejalashtirilgan postlar)
-- ============================================================

-- Bot ulangan guruh va kanallar.
--   purpose = 'class'    → sinf guruhi (class_id majburiy)
--   purpose = 'school'   → maktab rasmiy kanali / umumiy guruh
--   purpose = 'teachers' → o'qituvchilar guruhi
CREATE TABLE IF NOT EXISTS tg_chats (
  chat_id     BIGINT PRIMARY KEY,
  chat_type   TEXT NOT NULL DEFAULT 'group',
  title       TEXT NOT NULL DEFAULT '',
  purpose     TEXT NOT NULL DEFAULT 'class'
                CHECK (purpose IN ('class', 'school', 'teachers')),
  class_id    UUID REFERENCES classes(id) ON DELETE SET NULL,
  settings    JSONB NOT NULL DEFAULT '{"morning_schedule": true, "birthdays": true, "weekly_top": true}'::jsonb,
  linked_by   BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tg_chats_class_id ON tg_chats(class_id);
CREATE INDEX IF NOT EXISTS idx_tg_chats_purpose  ON tg_chats(purpose);

-- Rejalashtirilgan ishlar bir kunda ikki marta ishlamasligi uchun
-- (server qayta ishga tushsa ham). job_key misol: "morning:2026-09-25".
CREATE TABLE IF NOT EXISTS tg_job_runs (
  job_key    TEXT PRIMARY KEY,
  ran_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Davomat jadvali — routes/attendance.ts ishlatadi, lekin migratsiyalarda
-- yaratilmagan edi (yangi bazada davomat 500 xato berardi).
CREATE TABLE IF NOT EXISTS attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      UUID,
  class_name    TEXT NOT NULL DEFAULT '',
  student_login TEXT NOT NULL,
  student_name  TEXT NOT NULL DEFAULT '',
  date          DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'present',
  note          TEXT NOT NULL DEFAULT '',
  teacher_login TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_login, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, date);

-- E'lonlar — routes/announcements.ts ishlatadigan ustunlar
-- (migrate.mjs dagi eski jadvalda faqat title/body bor edi).
CREATE TABLE IF NOT EXISTS announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  author_id  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS content      TEXT NOT NULL DEFAULT '';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_name  TEXT NOT NULL DEFAULT '';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_login TEXT NOT NULL DEFAULT '';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS role_filter  TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS pinned       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS priority     TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS tg_published BOOLEAN NOT NULL DEFAULT FALSE;

-- Tug'ilgan kun ustunlari (migrate.mjs EXTRA_SQL da ham bor — bu yerda
-- ham qo'yamiz, chunki bu fayl undan oldin ishlaydi).
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS birthday DATE;

CREATE INDEX IF NOT EXISTS idx_grades_student_login ON grades(student_login);
CREATE INDEX IF NOT EXISTS idx_grades_created_at    ON grades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id    ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_staff_telegram_id    ON staff(telegram_id);

-- ─── 🎮 BILIMLAR JANGI ───────────────────────────────────────────────────────
-- O'qituvchi bot orqali yozgan savollar to'plami (qayta ishlatish uchun)
CREATE TABLE IF NOT EXISTS tg_quiz_sets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_tg    BIGINT NOT NULL,
  owner_login TEXT NOT NULL DEFAULT '',
  title       TEXT NOT NULL,
  questions   JSONB NOT NULL,          -- [{q, options[], correct}]
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tg_quiz_sets_owner ON tg_quiz_sets(owner_tg);

-- O'tkazilgan o'yinlar tarixi
CREATE TABLE IF NOT EXISTS tg_games (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id        BIGINT NOT NULL,
  class_name     TEXT NOT NULL DEFAULT '',
  teacher_login  TEXT NOT NULL DEFAULT '',
  title          TEXT NOT NULL DEFAULT '',
  question_count INTEGER NOT NULL DEFAULT 0,
  player_count   INTEGER NOT NULL DEFAULT 0,
  results        JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tg_games_chat ON tg_games(chat_id, created_at DESC);

-- O'yinchilar reytingi va ligasi (Bronza → Kumush → Oltin → Platina → Olmos → Afsona)
CREATE TABLE IF NOT EXISTS tg_player_stats (
  tg_id        BIGINT PRIMARY KEY,
  name         TEXT NOT NULL DEFAULT '',
  login        TEXT,
  class_name   TEXT NOT NULL DEFAULT '',
  rating       INTEGER NOT NULL DEFAULT 0,
  games        INTEGER NOT NULL DEFAULT 0,
  wins         INTEGER NOT NULL DEFAULT 0,
  podiums      INTEGER NOT NULL DEFAULT 0,
  correct      INTEGER NOT NULL DEFAULT 0,
  answered     INTEGER NOT NULL DEFAULT 0,
  best_streak  INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tg_player_stats_class ON tg_player_stats(class_name, rating DESC);

`;

export async function ensureTelegramSchema(): Promise<void> {
  try {
    await query(TELEGRAM_SCHEMA_SQL);
    logger.info("Telegram integratsiyasi jadvallari tayyor ✅");
  } catch (err) {
    logger.error({ err }, "Telegram sxemasini yaratishda xato");
  }
}

import { Bot, InlineKeyboard, InputFile, Keyboard } from "grammy";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../lib/logger.js";
import { supabase } from "../lib/supabase.js";
import {
  loadSettings,
  addChannel,
  removeChannel,
  setWelcomeMessage,
  setOnboardingVideo,
  linkPhoneToChatId,
  getPhoneByChatId,
  normalizePhone,
  setStaffRegCode,
  getStaffRegCode,
  getRoleVideoUrls,
  getRoleRegCodes,
  setRoleRegCode,
  findRoleByCode,
  type RoleRegCodes,
} from "./settings.js";
import { createMagicToken } from "../routes/auth.js";
import { generateCertificatePNG, todayUzDate } from "../lib/certificate-generator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, "logo.png");

const replitDevDomain = process.env["REPLIT_DEV_DOMAIN"]?.trim();
const replitDomain = process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim();
const isProductionBot = process.env["NODE_ENV"] === "production";
// Production da REPLIT_DOMAINS ishlatiladi (to'g'ri production URL)
const WEBSITE_URL = isProductionBot
  ? (replitDomain ? `https://${replitDomain}` : process.env["WEBSITE_URL"] ?? "https://talim-platform.replit.app")
  : (replitDevDomain ? `https://${replitDevDomain}` : process.env["WEBSITE_URL"] ?? (replitDomain ? `https://${replitDomain}` : "https://talim-platform.replit.app"));

const ADMIN_ID = Number(process.env["ADMIN_ID"] ?? "0");

type ManagementRole = "director" | "zavuch" | "zam_direktor" | "kutubxonachi";
type RegRoleGroup = "student" | "teacher" | "sinf_rahbari" | "management";

type UserState =
  | { type: "idle" }
  | { type: "awaiting_channel" }
  | { type: "awaiting_message" }
  | { type: "awaiting_support" }
  | { type: "awaiting_support_reply"; ticketId: string }
  | { type: "awaiting_video_file" }
  | { type: "awaiting_reg_code"; roleGroup: RegRoleGroup }
  | { type: "awaiting_personal_code"; roleGroup: RegRoleGroup | "management" }
  | { type: "awaiting_management_code" }
  | { type: "awaiting_new_reg_code" }
  | { type: "awaiting_set_role_code"; role: keyof RoleRegCodes }
  | { type: "awaiting_login_input" }
  | { type: "awaiting_password_input"; login: string };

const userStates = new Map<number, UserState>();

interface SupportTicket {
  fromUserId: number;
  fromName: string;
}
const supportTickets = new Map<string, SupportTicket>();

function isAdmin(userId: number): boolean {
  return ADMIN_ID > 0 && userId === ADMIN_ID;
}

async function checkAllChannels(bot: Bot, userId: number): Promise<{ allJoined: boolean; missing: string[] }> {
  const settings = loadSettings();
  if (settings.channels.length === 0) return { allJoined: true, missing: [] };

  const missing: string[] = [];
  for (const channel of settings.channels) {
    try {
      const member = await bot.api.getChatMember(channel.id, userId);
      if (!["member", "administrator", "creator"].includes(member.status)) {
        missing.push(channel.id);
      }
    } catch {
      missing.push(channel.id);
    }
  }
  return { allJoined: missing.length === 0, missing };
}

function buildSubscribeKeyboard(missingChannels: string[]): InlineKeyboard {
  const settings = loadSettings();
  const kb = new InlineKeyboard();
  for (const chId of missingChannels) {
    const ch = settings.channels.find((c) => c.id === chId);
    const label = ch?.name ?? chId;
    const link = chId.startsWith("@")
      ? `https://t.me/${chId.slice(1)}`
      : `https://t.me/c/${chId.replace("-100", "")}`;
    kb.url(`📢 ${label}`, link).row();
  }
  kb.text("A'zo bo'ldim ✅", "check_membership");
  return kb;
}

function buildWelcomeKeyboard(): InlineKeyboard {
  return new InlineKeyboard().url("🌐 Platformaga kirish", `${WEBSITE_URL}/login`);
}

function buildContactKeyboard(): Keyboard {
  return new Keyboard()
    .requestContact("📱 Telefon raqamini ulashish")
    .resized()
    .oneTime();
}

async function findStudentByPhone(phone: string) {
  const normalized = normalizePhone(phone);
  const { data } = await supabase
    .from("users")
    .select("full_name, class_name, login, password")
    .eq("phone_number", normalized)
    .limit(1)
    .maybeSingle();
  return data;
}

async function sendWelcome(ctx: { replyWithPhoto: Function; reply: Function }, adminExtra = false): Promise<void> {
  const settings = loadSettings();
  const kb = buildWelcomeKeyboard();
  if (adminExtra) {
    kb.row().text("⚙️ Admin panel", "admin_panel");
  }
  try {
    await ctx.replyWithPhoto(new InputFile(LOGO_PATH), {
      caption: settings.welcomeMessage,
      parse_mode: "Markdown",
      reply_markup: kb,
    });
  } catch {
    await ctx.reply(settings.welcomeMessage, {
      parse_mode: "Markdown",
      reply_markup: kb,
    });
  }
}

function buildAdminMenu(): InlineKeyboard {
  return new InlineKeyboard()
    .text("📋 Kanallar sozlamasi", "admin_channels").row()
    .text("✏️ Xabar matnini tahrirlash", "admin_edit_msg").row()
    .text("🔐 Maxfiy kodlar (rol bo'yicha)", "admin_reg_codes").row()
    .text("👁 Xabarni ko'rish", "admin_preview").row()
    .text("🔙 Yopish", "admin_close");
}

function buildRegCodesMenu(): InlineKeyboard {
  const codes = getRoleRegCodes();
  const fmt = (c?: string) => (c ? `✅ ${c}` : "❌ Yo'q");
  return new InlineKeyboard()
    .text(`👨‍🏫 O'qituvchi: ${fmt(codes.teacher)}`, "admin_set_code:teacher").row()
    .text(`👩‍🏫 Sinf rahbari: ${fmt(codes.sinfRahbari)}`, "admin_set_code:sinfRahbari").row()
    .text(`🏛 Direktor: ${fmt(codes.director)}`, "admin_set_code:director").row()
    .text(`📚 Zavuch: ${fmt(codes.zavuch)}`, "admin_set_code:zavuch").row()
    .text(`👔 Zam.direktor: ${fmt(codes.zamDirector)}`, "admin_set_code:zamDirector").row()
    .text(`📖 Kutubxonachi: ${fmt(codes.kutubxonachi)}`, "admin_set_code:kutubxonachi").row()
    .text("🔙 Orqaga", "admin_panel");
}

function buildChannelsMenu(): InlineKeyboard {
  const settings = loadSettings();
  const kb = new InlineKeyboard();
  if (settings.channels.length === 0) {
    kb.text("— Kanallar yo'q —", "noop").row();
  } else {
    for (const ch of settings.channels) {
      kb.text(`❌ ${ch.name} (${ch.id})`, `del_channel:${ch.id}`).row();
    }
  }
  kb.text("➕ Kanal qo'shish", "add_channel").row();
  kb.text("🔙 Orqaga", "admin_panel");
  return kb;
}

// ─── Dars vaqtlari ──────────────────────────────────────────────────────────
const PERIOD_TIMES: Record<number, string> = {
  1: "08:00–08:45", 2: "08:55–09:40", 3: "09:50–10:35",
  4: "10:55–11:40", 5: "11:50–12:35", 6: "12:45–13:30",
  7: "13:40–14:25", 8: "14:35–15:20",
};

const DAY_NAMES_UZ: Record<number, string> = {
  0: "Yakshanba", 1: "Dushanba", 2: "Seshanba", 3: "Chorshanba",
  4: "Payshanba", 5: "Juma", 6: "Shanba",
};

// O'zbekiston vaqti bo'yicha bugungi kun (1=Dushanba..6=Shanba, 0=Yakshanba)
function getTodayUzDay(): number {
  const now = new Date();
  // UTC+5 (O'zbekiston)
  const uzTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  return uzTime.getUTCDay(); // 0=Yakshanba, 1=Dushanba, ...
}

function getTodayUzHourMin(): { hour: number; min: number } {
  const now = new Date();
  const uzTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  return { hour: uzTime.getUTCHours(), min: uzTime.getUTCMinutes() };
}

// Staff uchun bugungi dars jadvalini matn sifatida olish
async function getTodayScheduleText(staffId: string, dayOverride?: number): Promise<string> {
  const day = dayOverride ?? getTodayUzDay();

  if (day === 0) return "🎉 Bugun *Yakshanba* — dam olish kuni!";

  const { data: entries } = await supabase
    .from("timetable")
    .select("period, subject, class_id")
    .eq("teacher_id", staffId)
    .eq("day_of_week", day)
    .order("period");

  if (!entries || entries.length === 0) {
    return `📭 *${DAY_NAMES_UZ[day]}* kuni sizga dars belgilanmagan.`;
  }

  // Sinf nomlarini olish
  const classIds = [...new Set(entries.map((e: { class_id: string }) => e.class_id))];
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .in("id", classIds);

  const classMap: Record<string, string> = {};
  for (const c of (classes ?? []) as { id: string; name: string }[]) {
    classMap[c.id] = c.name;
  }

  const lines = (entries as { period: number; subject: string; class_id: string }[]).map(e => {
    const time = PERIOD_TIMES[e.period] ?? "";
    const cls = classMap[e.class_id] ?? "—";
    return `${e.period}\\. *${e.subject}* — ${cls}\n    🕐 ${time}`;
  });

  return `📅 *${DAY_NAMES_UZ[day]} — Dars jadvalingiz:*\n\n${lines.join("\n\n")}`;
}

// ─── Onboarding helpers ───────────────────────────────────────────────────────
const OB_PAGE_SIZE = 8;

const STAFF_ROLE_LABELS: Record<string, string> = {
  teacher: "O'qituvchi",
  sinf_rahbari: "Sinf rahbari",
  director: "Direktor",
  zam_direktor: "Direktor o'rinbosari",
  zavuch: "Zavuch",
  kutubxonachi: "Kutubxonachi",
  admin: "Administrator",
};

async function getOnboardUserList(
  roleGroup: RegRoleGroup | ManagementRole,
  page: number
): Promise<{
  rows: { id: string; full_name: string; extra: string }[];
  table: "users" | "staff";
  hasMore: boolean;
}> {
  const offset = page * OB_PAGE_SIZE;
  const limit = OB_PAGE_SIZE;

  if (roleGroup === "student") {
    const { data } = await supabase
      .from("users")
      .select("id, full_name, class_name")
      .eq("role", "student")
      .order("full_name")
      .range(offset, offset + limit - 1);
    const rows = ((data ?? []) as { id: string; full_name: string; class_name?: string }[]).map(
      (r) => ({ id: r.id, full_name: r.full_name, extra: r.class_name ?? "" })
    );
    return { rows, table: "users", hasMore: rows.length === limit };
  }

  if (roleGroup === "teacher") {
    const { data } = await supabase
      .from("staff")
      .select("id, full_name, role")
      .eq("role", "teacher")
      .order("full_name")
      .range(offset, offset + limit - 1);
    const rows = ((data ?? []) as { id: string; full_name: string; role: string }[]).map((r) => ({
      id: r.id,
      full_name: r.full_name,
      extra: STAFF_ROLE_LABELS[r.role] ?? r.role,
    }));
    return { rows, table: "staff", hasMore: rows.length === limit };
  }

  if (roleGroup === "sinf_rahbari") {
    const { data } = await supabase
      .from("staff")
      .select("id, full_name, role")
      .eq("role", "sinf_rahbari")
      .order("full_name")
      .range(offset, offset + limit - 1);
    const rows = ((data ?? []) as { id: string; full_name: string; role: string }[]).map((r) => ({
      id: r.id,
      full_name: r.full_name,
      extra: STAFF_ROLE_LABELS[r.role] ?? r.role,
    }));
    return { rows, table: "staff", hasMore: rows.length === limit };
  }

  // management or specific role (director/zavuch/zam_direktor)
  const mgmtRoles = roleGroup === "management"
    ? ["director", "zam_direktor", "zavuch", "kutubxonachi", "admin"]
    : [roleGroup];

  const { data } = await supabase
    .from("staff")
    .select("id, full_name, role")
    .in("role", mgmtRoles)
    .order("full_name")
    .range(offset, offset + limit - 1);
  const rows = ((data ?? []) as { id: string; full_name: string; role: string }[]).map((r) => ({
    id: r.id,
    full_name: r.full_name,
    extra: STAFF_ROLE_LABELS[r.role] ?? r.role,
  }));
  return { rows, table: "staff", hasMore: rows.length === limit };
}

function buildOnboardUserKb(
  rows: { id: string; full_name: string; extra: string }[],
  table: "users" | "staff",
  roleGroup: RegRoleGroup,
  page: number,
  hasMore: boolean
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const r of rows) {
    const label = r.extra ? `${r.full_name} (${r.extra})` : r.full_name;
    kb.text(label.slice(0, 60), `reg_pick:${table}:${r.id}`).row();
  }
  if (page > 0 && hasMore) {
    kb.text("⬅️ Oldingi", `reg_page:${roleGroup}:${page - 1}`)
      .text("Keyingi ➡️", `reg_page:${roleGroup}:${page + 1}`)
      .row();
  } else if (page > 0) {
    kb.text("⬅️ Oldingi", `reg_page:${roleGroup}:${page - 1}`).row();
  } else if (hasMore) {
    kb.text("Keyingi ➡️", `reg_page:${roleGroup}:${page + 1}`).row();
  }
  kb.text("🔙 Orqaga", "reg_back");
  return kb;
}

async function sendAccountInfo(
  ctx: { reply: Function },
  table: "users" | "staff",
  dbId: string,
  tgId: number
): Promise<void> {
  // Akkauntni bog'lash
  await supabase.from(table).update({ telegram_id: tgId }).eq("id", dbId);

  // Ma'lumotlarni olish
  if (table === "users") {
    const { data } = await supabase
      .from("users")
      .select("full_name, login, password, class_name")
      .eq("id", dbId)
      .maybeSingle();
    if (!data) return;
    const u = data as { full_name: string; login: string; password: string; class_name?: string };

    const payload = {
      id: dbId,
      role: "student",
      full_name: u.full_name,
      login: u.login,
      class_name: u.class_name ?? "",
      class_id: null as null,
      telegram_id: tgId,
    };

    // class_id ni ham topamiz
    if (u.class_name) {
      const { data: cls } = await supabase
        .from("classes")
        .select("id")
        .eq("name", u.class_name)
        .maybeSingle();
      if (cls) payload.class_id = (cls as { id: string }).id as unknown as null;
    }

    const magicToken = createMagicToken(payload);
    const loginUrl = `${WEBSITE_URL}/login?token=${magicToken}`;
    const kb = new InlineKeyboard()
      .url("🚀 Platformaga kirish (bir bosish)", loginUrl)
      .row()
      .url("🌐 Oddiy kirish", `${WEBSITE_URL}/login`);

    await ctx.reply(
      `🎉 *Akkauntingiz muvaffaqiyatli bog'landi\\!*\n\n` +
      `👤 *${u.full_name.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&")}*\n` +
      `🏫 Sinf: ${(u.class_name ?? "—").replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&")}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🔑 *Kirish ma'lumotlari:*\n` +
      `👤 Login: \`${u.login}\`\n` +
      `🔒 Parol: \`${u.password}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📌 *"Bir bosish"* tugmasi 15 daqiqa amal qiladi\\.`,
      { parse_mode: "MarkdownV2", reply_markup: kb }
    );
  } else {
    // staff
    const { data } = await supabase
      .from("staff")
      .select("full_name, login, role, subjects")
      .eq("id", dbId)
      .maybeSingle();
    if (!data) return;
    const s = data as { full_name: string; login: string; role: string; subjects?: string[] };

    const roleLabel = STAFF_ROLE_LABELS[s.role] ?? s.role;
    const payload = {
      id: dbId,
      role: s.role,
      full_name: s.full_name,
      login: s.login,
      telegram_id: tgId,
      subjects: s.subjects ?? [],
    };
    const magicToken = createMagicToken(payload);
    const loginUrl = `${WEBSITE_URL}/login?token=${magicToken}`;
    const kb = new InlineKeyboard()
      .url("🚀 Platformaga kirish (bir bosish)", loginUrl)
      .row()
      .url("🌐 Oddiy kirish", `${WEBSITE_URL}/login`);

    await ctx.reply(
      `🎉 *Akkauntingiz muvaffaqiyatli bog'landi\\!*\n\n` +
      `👤 *${s.full_name.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&")}*\n` +
      `💼 Lavozim: ${roleLabel.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&")}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🔑 Login: \`${s.login}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📌 *"Bir bosish"* tugmasi 15 daqiqa amal qiladi\\.`,
      { parse_mode: "MarkdownV2", reply_markup: kb }
    );
  }
}

function buildRoleSelectionKb(): InlineKeyboard {
  return new InlineKeyboard()
    .text("👨‍🎓 O'quvchi", "reg_role:student").row()
    .text("👨‍🏫 O'qituvchi", "reg_role:teacher").row()
    .text("👩‍🏫 Sinf rahbari + O'qituvchi", "reg_role:sinf_rahbari").row()
    .text("👔 Rahbar (Direktor / Zavuch / Zam.dir)", "reg_role:management");
}

export function createBot(): Bot {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN kerak");

  const bot = new Bot(token);

  // ─── /start ────────────────────────────────────────────────────────────────
  bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    userStates.set(userId, { type: "idle" });

    // ─── Admin uchun avto-login (kanal tekshiruvisiz) ─────────────────────────
    if (isAdmin(userId)) {
      const adminPayload = {
        id: String(userId),
        role: "admin",
        full_name: "Admin",
        login: "admin",
        telegram_id: userId,
      };
      const magicToken = createMagicToken(adminPayload);
      const loginUrl = `${WEBSITE_URL}/login?token=${magicToken}`;
      const adminKb = new InlineKeyboard()
        .url("🚀 Platformaga kirish (1 bosish)", loginUrl)
        .row()
        .url("🌐 Oddiy kirish", `${WEBSITE_URL}/login`);
      await ctx.reply(
        "👨‍💼 *Administrator paneli*\n\n" +
        "Quyidagi tugma orqali avtomatik kiring.\n" +
        "_(Havola 15 daqiqa amal qiladi)_",
        { parse_mode: "Markdown", reply_markup: adminKb }
      );
      return;
    }

    const { allJoined, missing } = await checkAllChannels(bot, userId);

    if (!allJoined) {
      const settings = loadSettings();
      const kb = buildSubscribeKeyboard(missing);
      const names = settings.channels
        .filter((c) => missing.includes(c.id))
        .map((c) => `• ${c.name}`)
        .join("\n");
      try {
        await ctx.replyWithPhoto(new InputFile(LOGO_PATH), {
          caption:
            "🌟 *Birlashgan Maktab Platformasiga xush kelibsiz!*\n\n" +
            "Toshloq tuman 3-maktab — *TALIM PLATFORM*\n\n" +
            "Botdan foydalanish uchun avval quyidagi kanallarga a'zo bo'ling 👇\n\n" +
            names,
          parse_mode: "Markdown",
          reply_markup: kb,
        });
      } catch {
        await ctx.reply(
          "🌟 *TALIM PLATFORM*\n\nKanallarga a'zo bo'ling 👇\n\n" + names,
          { parse_mode: "Markdown", reply_markup: kb }
        );
      }
      return;
    }

    // DB da bog'langanligini tekshirish (String konversiyasi - type xatosidan saqlanish uchun)
    const { data: staffLinked } = await supabase
      .from("staff").select("id").eq("telegram_id", userId).maybeSingle();
    const { data: userLinked } = await supabase
      .from("users").select("id").eq("telegram_id", userId).maybeSingle();

    if (staffLinked || userLinked) {
      // Allaqachon bog'langan — bevosita kirish
      const magicPayload = staffLinked
        ? await (async () => {
            const { data: s } = await supabase
              .from("staff")
              .select("id, full_name, login, role, subjects")
              .eq("id", (staffLinked as { id: string }).id)
              .maybeSingle();
            if (!s) return null;
            const st = s as { id: string; full_name: string; login: string; role: string; subjects?: string[] };
            return { id: st.id, role: st.role, full_name: st.full_name, login: st.login, telegram_id: userId, subjects: st.subjects ?? [] };
          })()
        : await (async () => {
            const { data: u } = await supabase
              .from("users")
              .select("id, full_name, login, class_name")
              .eq("id", (userLinked as { id: string }).id)
              .maybeSingle();
            if (!u) return null;
            const us = u as { id: string; full_name: string; login: string; class_name?: string };
            return { id: us.id, role: "student", full_name: us.full_name, login: us.login, telegram_id: userId, class_name: us.class_name };
          })();

      if (magicPayload) {
        const magicToken = createMagicToken(magicPayload);
        const loginUrl = `${WEBSITE_URL}/login?token=${magicToken}`;
        const kb = new InlineKeyboard()
          .url("🚀 Platformaga kirish (1 bosish)", loginUrl)
          .row()
          .text("🔑 Login+parol bilan kirish", "login_with_creds");
        await ctx.reply(
          `👋 *Xush kelibsiz!*\n\n` +
          `👤 *${magicPayload.full_name}*\n` +
          `📌 Platformaga kirish tugmasini bosing.\n` +
          `_(Havola 15 daqiqa amal qiladi)_`,
          { parse_mode: "Markdown", reply_markup: kb }
        );
      } else {
        await sendWelcome(ctx, false);
      }
      return;
    }

    // Bog'lanmagan → platforma linki + admin bildirishnomasi
    const regKb = new InlineKeyboard()
      .url("📝 Ro'yxatdan o'tish", `${WEBSITE_URL}/register`);
    await ctx.reply(
      "📱 *TALIM Platform*\n\n" +
      "Platformaga kirish uchun *mahfiy kod* kerak bo'ladi\\.\n" +
      "Kodni admindan oling va quyidagi tugma orqali ro'yxatdan o'ting 👇",
      { parse_mode: "MarkdownV2", reply_markup: regKb }
    );

    // Admin bildirishnomasi
    const adminTgId = Number(process.env["ADMIN_ID"] ?? "0");
    if (adminTgId && adminTgId !== userId) {
      const fName = ctx.from?.first_name ?? "";
      const lName = ctx.from?.last_name ?? "";
      const uname = ctx.from?.username ? ` (@${ctx.from.username})` : "";
      try {
        await bot.api.sendMessage(
          adminTgId,
          `🆕 Yangi foydalanuvchi botni ishga tushirdi!\n\n` +
          `👤 ${fName} ${lName}${uname}\n` +
          `🆔 Telegram ID: ${userId}\n` +
          `📡 Kanal a'zosi: ✅\n` +
          `💡 Hali platformaga ro'yxatdan o'tmagan.\n\n` +
          `🔗 Platform: ${WEBSITE_URL}/register`
        );
      } catch { /* bildirishnoma xato bo'lsa davom etamiz */ }
    }
  });

  // ─── /jadval ────────────────────────────────────────────────────────────────
  bot.command("jadval", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const { data: staff } = await supabase
      .from("staff")
      .select("id, full_name, role")
      .eq("telegram_id", userId)
      .in("role", ["teacher", "sinf_rahbari", "director", "zam_direktor", "zavuch"])
      .maybeSingle();

    if (!staff) {
      await ctx.reply(
        "❌ Siz o'qituvchi sifatida tizimda topilmadingiz.\n\n" +
        "Telefon raqamingizni /start orqali bog'lang yoki admin bilan bog'laning.",
        { parse_mode: "Markdown" }
      );
      return;
    }

    const s = staff as { id: string; full_name: string; role: string };
    const text = await getTodayScheduleText(s.id);
    const kb = new InlineKeyboard()
      .text("📆 Ertangi jadval", `schedule_tomorrow:${s.id}`)
      .row()
      .url("🌐 To'liq jadval", `${WEBSITE_URL}/dars-jadvali`);

    await ctx.reply(text, { parse_mode: "Markdown", reply_markup: kb });
  });

  // ─── /sertifikat ────────────────────────────────────────────────────────────
  bot.command("sertifikat", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const waitMsg = await ctx.reply("⏳ Sertifikat tayyorlanmoqda...");

    // Avval staff dan qidirish
    const { data: staffData } = await supabase
      .from("staff")
      .select("full_name, role, subjects")
      .eq("telegram_id", userId)
      .maybeSingle();

    let fullName: string | null = null;
    let role: string | null = null;
    let className: string | undefined;
    let subjects: string[] | undefined;

    if (staffData) {
      const s = staffData as { full_name: string; role: string; subjects?: string[] | null };
      fullName = s.full_name;
      role = s.role;
      subjects = s.subjects ?? [];
    } else {
      const { data: userData } = await supabase
        .from("users")
        .select("full_name, role, class_name")
        .eq("telegram_id", userId)
        .maybeSingle();
      if (userData) {
        const u = userData as { full_name: string; role: string; class_name?: string };
        fullName = u.full_name;
        role = u.role;
        className = u.class_name;
      }
    }

    if (!fullName || !role) {
      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
      await ctx.reply(
        "❌ Akkauntingiz topilmadi.\n\n" +
        "Telefon raqamingizni /start orqali bog'lang yoki platformaga ro'yxatdan o'ting."
      );
      return;
    }

    try {
      const date = todayUzDate();
      const pngBuffer = await generateCertificatePNG({ fullName, role, className, subjects, date });
      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
      await ctx.replyWithPhoto(
        new InputFile(pngBuffer, `sertifikat.png`),
        {
          caption:
            `🎓 *${fullName}* — Sertifikat\n\n` +
            `🏫 Toshloq tumani 3-maktab\n` +
            `📅 ${date}`,
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard().url("🌐 Platforma", `${WEBSITE_URL}/certificate`),
        }
      );
    } catch (err) {
      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
      await ctx.reply("❌ Sertifikat yaratishda xatolik. Qayta urinib ko'ring.");
      logger.error({ err }, "Sertifikat yaratishda xatolik");
    }
  });

  // ─── Callback: schedule_tomorrow:staffId ────────────────────────────────────
  bot.callbackQuery(/^schedule_tomorrow:(.+)$/, async (ctx) => {
    const staffId = ctx.match[1];
    if (!staffId) { await ctx.answerCallbackQuery(); return; }

    const today = getTodayUzDay();
    let tomorrow = today + 1;
    if (tomorrow > 6) tomorrow = 1; // Yakshanba o'tib ketsa — Dushanba

    const text = await getTodayScheduleText(staffId, tomorrow);
    await ctx.answerCallbackQuery();
    await ctx.reply(text, { parse_mode: "Markdown" });
  });

  // ─── /yordam ────────────────────────────────────────────────────────────────
  bot.command("yordam", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    userStates.set(userId, { type: "awaiting_support" });
    await ctx.reply(
      "📩 *Qo'llab-quvvatlash*\n\nSavolingiz yoki muammongizni yozing — admin imkon qadar javob beradi.",
      { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("❌ Bekor qilish", "support_cancel") }
    );
  });

  // ─── Callback: support_cancel ────────────────────────────────────────────────
  bot.callbackQuery("support_cancel", async (ctx) => {
    const userId = ctx.from.id;
    userStates.set(userId, { type: "idle" });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText("❌ Bekor qilindi.");
  });

  // ─── Callback: reply_support:ticketId ────────────────────────────────────────
  bot.callbackQuery(/^reply_support:(.+)$/, async (ctx) => {
    if (!isAdmin(ctx.from.id)) { await ctx.answerCallbackQuery("⛔ Ruxsat yo'q"); return; }
    const ticketId = ctx.match[1];
    if (!ticketId || !supportTickets.has(ticketId)) {
      await ctx.answerCallbackQuery("❌ Murojaat topilmadi");
      return;
    }
    userStates.set(ctx.from.id, { type: "awaiting_support_reply", ticketId });
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "✏️ Javobingizni yozing:",
      { reply_markup: new InlineKeyboard().text("❌ Bekor qilish", "support_cancel") }
    );
  });

  // ─── /admin ────────────────────────────────────────────────────────────────
  bot.command("admin", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply("⛔ Ruxsat yo'q.");
      return;
    }
    userStates.set(userId, { type: "idle" });
    await ctx.reply("⚙️ *Admin panel*\n\nNimani sozlamoqchisiz?", {
      parse_mode: "Markdown",
      reply_markup: buildAdminMenu(),
    });
  });

  // ─── Contact handler ────────────────────────────────────────────────────────
  bot.on("message:contact", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const contact = ctx.message.contact;
    const phone = contact.phone_number;
    const normalized = normalizePhone(phone);

    // Faqat o'z telefon raqamini ulash mumkin
    if (contact.user_id && contact.user_id !== userId) {
      await ctx.reply(
        "⛔ Faqat *o'z* telefon raqamingizni ulashingiz mumkin.",
        { parse_mode: "Markdown", reply_markup: { remove_keyboard: true } }
      );
      return;
    }

    // Avval bog'langan bo'lsa
    const alreadyLinked = getPhoneByChatId(userId);
    if (alreadyLinked === normalized) {
      await ctx.reply(
        "✅ Telefon raqamingiz allaqachon bog'langan!",
        { reply_markup: { remove_keyboard: true } }
      );
      return;
    }

    // Bazadan topish (users jadvali)
    const student = await findStudentByPhone(normalized);

    if (student) {
      // Supabase'da telegram_id ni haqiqiy Telegram ID ga yangilash
      await supabase
        .from("users")
        .update({ telegram_id: userId })
        .eq("phone_number", normalized);

      linkPhoneToChatId(normalized, userId);

      // Sinf ID sini topish
      const { data: clsData } = await supabase
        .from("classes")
        .select("id")
        .eq("name", student.class_name)
        .single();

      // Magic token yaratish — bir marta bosib kirish uchun
      const payload = {
        id: String(userId),
        role: "student",
        full_name: student.full_name,
        login: student.login,
        class_name: student.class_name,
        class_id: clsData?.id ?? null,
        telegram_id: userId,
      };
      const magicToken = createMagicToken(payload);
      const loginUrl = `${WEBSITE_URL}/login?token=${magicToken}`;

      const kb = new InlineKeyboard()
        .url("🚀 Platformaga kirish (bir bosish)", loginUrl)
        .row()
        .url("🌐 Oddiy kirish sahifasi", `${WEBSITE_URL}/login`);

      await ctx.reply(
        `✅ *Muvaffaqiyatli bog'landi\\!*\n\n` +
        `👤 *${student.full_name}*\n` +
        `🏫 Sinf: ${student.class_name}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🔑 *Kirish ma'lumotlaringiz:*\n` +
        `👤 Login: \`${student.login}\`\n` +
        `🔒 Parol: \`${student.password}\`\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📌 *"Bir bosish"* tugmasi 15 daqiqa amal qiladi\\.\n` +
        `Muddati o'tsa — oddiy kirish sahifasidan login va parol bilan kiring\\.`,
        {
          parse_mode: "MarkdownV2",
          reply_markup: kb,
        }
      );
    } else {
      // Saytda hali ro'yxatdan o'tmagan — faylga saqlab qo'yamiz
      linkPhoneToChatId(normalized, userId);
      await ctx.reply(
        "📱 *Telefon raqamingiz saqlandi.*\n\n" +
        "Agar veb saytda shu raqam bilan ro'yxatdan o'tsangiz, akkauntingiz avtomatik bog'lanadi. 🔗",
        {
          parse_mode: "Markdown",
          reply_markup: { remove_keyboard: true },
        }
      );
    }
  });

  // ─── Callback: admin_panel ──────────────────────────────────────────────────
  bot.callbackQuery("admin_panel", async (ctx) => {
    if (!isAdmin(ctx.from.id)) { await ctx.answerCallbackQuery("⛔ Ruxsat yo'q"); return; }
    userStates.set(ctx.from.id, { type: "idle" });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText("⚙️ *Admin panel*\n\nNimani sozlamoqchisiz?", {
      parse_mode: "Markdown",
      reply_markup: buildAdminMenu(),
    });
  });

  // ─── Callback: admin_channels ───────────────────────────────────────────────
  bot.callbackQuery("admin_channels", async (ctx) => {
    if (!isAdmin(ctx.from.id)) { await ctx.answerCallbackQuery("⛔ Ruxsat yo'q"); return; }
    await ctx.answerCallbackQuery();
    const settings = loadSettings();
    const count = settings.channels.length;
    await ctx.editMessageText(
      `📋 *Majburiy kanallar* (${count} ta)\n\nO'chirish uchun kanal nomini bosing:`,
      { parse_mode: "Markdown", reply_markup: buildChannelsMenu() }
    );
  });

  // ─── Callback: add_channel ──────────────────────────────────────────────────
  bot.callbackQuery("add_channel", async (ctx) => {
    if (!isAdmin(ctx.from.id)) { await ctx.answerCallbackQuery("⛔ Ruxsat yo'q"); return; }
    userStates.set(ctx.from.id, { type: "awaiting_channel" });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      "➕ *Kanal qo'shish*\n\nKanal username yoki ID sini yuboring:\n\n" +
      "Misol: `@MyChannel` yoki `-1001234567890`\n\n" +
      "Bot shu kanalda admin bo'lishi kerak!",
      { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("❌ Bekor qilish", "admin_channels") }
    );
  });

  // ─── Callback: del_channel:id ──────────────────────────────────────────────
  bot.callbackQuery(/^del_channel:(.+)$/, async (ctx) => {
    if (!isAdmin(ctx.from.id)) { await ctx.answerCallbackQuery("⛔ Ruxsat yo'q"); return; }
    const channelId = ctx.match[1];
    if (!channelId) { await ctx.answerCallbackQuery(); return; }
    removeChannel(channelId);
    await ctx.answerCallbackQuery(`✅ ${channelId} o'chirildi`);
    const settings = loadSettings();
    const count = settings.channels.length;
    await ctx.editMessageText(
      `📋 *Majburiy kanallar* (${count} ta)\n\nO'chirish uchun kanal nomini bosing:`,
      { parse_mode: "Markdown", reply_markup: buildChannelsMenu() }
    );
  });

  // ─── Callback: admin_edit_msg ───────────────────────────────────────────────
  bot.callbackQuery("admin_edit_msg", async (ctx) => {
    if (!isAdmin(ctx.from.id)) { await ctx.answerCallbackQuery("⛔ Ruxsat yo'q"); return; }
    const settings = loadSettings();
    userStates.set(ctx.from.id, { type: "awaiting_message" });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      "✏️ *Xabar matnini tahrirlash*\n\n" +
      "Hozirgi matn:\n```\n" + settings.welcomeMessage + "\n```\n\n" +
      "Yangi xabar matnini yuboring.\n" +
      "_Eslatma: `*qalin*`, `_kursiv_` yozishingiz mumkin._\n\n" +
      "⚠️ *Platformaga kirish* tugmasi doim qo'shiladi.",
      { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("❌ Bekor qilish", "admin_panel") }
    );
  });

  // ─── Callback: admin_preview ────────────────────────────────────────────────
  bot.callbackQuery("admin_preview", async (ctx) => {
    if (!isAdmin(ctx.from.id)) { await ctx.answerCallbackQuery("⛔ Ruxsat yo'q"); return; }
    await ctx.answerCallbackQuery();
    const settings = loadSettings();
    await ctx.reply(settings.welcomeMessage, {
      parse_mode: "Markdown",
      reply_markup: buildWelcomeKeyboard(),
    });
  });

  // ─── Callback: admin_close ──────────────────────────────────────────────────
  bot.callbackQuery("admin_close", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.deleteMessage().catch(() => null);
  });

  // ─── Callback: admin_reg_codes ──────────────────────────────────────────────
  bot.callbackQuery("admin_reg_codes", async (ctx) => {
    if (!isAdmin(ctx.from.id)) { await ctx.answerCallbackQuery("⛔ Ruxsat yo'q"); return; }
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      "🔐 *Maxfiy kodlar (rol bo'yicha)*\n\n" +
      "Har bir rol uchun alohida maxfiy kod o'rnating.\n" +
      "Kodni bosing → yangi kod kiriting.\n" +
      "Kodni o'chirish uchun: `-` yuboring.",
      { parse_mode: "Markdown", reply_markup: buildRegCodesMenu() }
    );
  });

  // ─── Callback: admin_set_code:role ──────────────────────────────────────────
  bot.callbackQuery(/^admin_set_code:(teacher|sinfRahbari|director|zavuch|zamDirector|kutubxonachi)$/, async (ctx) => {
    if (!isAdmin(ctx.from.id)) { await ctx.answerCallbackQuery("⛔ Ruxsat yo'q"); return; }
    const role = ctx.match[1] as keyof RoleRegCodes;
    const roleNames: Record<string, string> = {
      teacher: "O'qituvchi",
      sinfRahbari: "Sinf rahbari",
      director: "Direktor",
      zavuch: "Zavuch",
      zamDirector: "Zam.direktor",
      kutubxonachi: "Kutubxonachi",
    };
    const codes = getRoleRegCodes();
    const current = codes[role];
    userStates.set(ctx.from.id, { type: "awaiting_set_role_code", role });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `🔐 *${roleNames[role] ?? role} uchun maxfiy kod*\n\n` +
      (current ? `Hozirgi kod: \`${current}\`\n\n` : "Kod o'rnatilmagan.\n\n") +
      "Yangi kodni yuboring.\n" +
      "Kodni o'chirish uchun: `-` yuboring.",
      { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("❌ Bekor qilish", "admin_reg_codes") }
    );
  });

  // ─── Callback: check_membership ─────────────────────────────────────────────
  bot.callbackQuery("check_membership", async (ctx) => {
    const userId = ctx.from.id;
    await ctx.answerCallbackQuery();

    const { allJoined, missing } = await checkAllChannels(bot, userId);

    if (!allJoined) {
      const settings = loadSettings();
      const names = settings.channels
        .filter((c) => missing.includes(c.id))
        .map((c) => `• ${c.name}`)
        .join("\n");
      const kb = buildSubscribeKeyboard(missing);
      await ctx.reply(
        "❌ Siz hali barcha kanallarga a'zo bo'lmagansiz.\n\n" + names,
        { reply_markup: kb }
      );
      return;
    }

    // DB da bog'langanligini tekshirish
    const { data: slk } = await supabase
      .from("staff").select("id").eq("telegram_id", userId).maybeSingle();
    const { data: ulk } = await supabase
      .from("users").select("id").eq("telegram_id", userId).maybeSingle();

    if (slk || ulk) {
      await ctx.reply(loadSettings().welcomeMessage, {
        parse_mode: "Markdown",
        reply_markup: buildWelcomeKeyboard(),
      });
    } else {
      await ctx.reply(
        "🎓 *Toshloq tumani 3-maktab — TALIM PLATFORM*\n\n" +
        "Platformaga kirish uchun avval o'z toifangizni tanlang 👇",
        { parse_mode: "Markdown", reply_markup: buildRoleSelectionKb() }
      );
    }
  });

  // ─── Callback: noop ─────────────────────────────────────────────────────────
  bot.callbackQuery("noop", async (ctx) => {
    await ctx.answerCallbackQuery();
  });

  // ─── Login with credentials callback ─────────────────────────────────────────
  bot.callbackQuery("login_with_creds", async (ctx) => {
    const userId = ctx.from.id;
    await ctx.answerCallbackQuery();
    userStates.set(userId, { type: "awaiting_login_input" });
    await ctx.reply(
      "🔑 *Login orqali kirish*\n\nLoginингizni kiriting:",
      { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("❌ Bekor qilish", "cancel_login") }
    );
  });

  bot.callbackQuery("cancel_login", async (ctx) => {
    const userId = ctx.from.id;
    userStates.set(userId, { type: "idle" });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText("❌ Bekor qilindi.");
  });

  // ─── Onboarding: rol tanlash → shaxsiy mahfiy kod so'rash ───────────────────
  bot.callbackQuery(/^reg_role:(student|teacher|sinf_rahbari|management)$/, async (ctx) => {
    const roleGroup = ctx.match[1] as RegRoleGroup;
    const userId = ctx.from.id;
    await ctx.answerCallbackQuery();

    const roleLabels: Record<string, string> = {
      student: "O'quvchi",
      teacher: "O'qituvchi",
      sinf_rahbari: "Sinf rahbari",
      management: "Maktab rahbari",
    };
    const roleLabel = roleLabels[roleGroup] ?? roleGroup;

    userStates.set(userId, { type: "awaiting_personal_code", roleGroup });
    await ctx.editMessageText(
      `🔐 *${roleLabel} sifatida kirish*\n\n` +
      `Sizga berilgan *shaxsiy mahfiy kodingizni* kiriting:\n\n` +
      `_(Kod admin tomonidan sizga alohida berilgan)_`,
      { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("🔙 Orqaga", "reg_back") }
    );
  });

  // ─── Onboarding: videoni ko'rgach yoki video yo'q → davom etish ──────────────
  bot.callbackQuery(/^reg_proceed:(student|teacher|sinf_rahbari)$/, async (ctx) => {
    const roleGroup = ctx.match[1] as "student" | "teacher" | "sinf_rahbari";
    const userId = ctx.from.id;
    await ctx.answerCallbackQuery();

    const codes = getRoleRegCodes();
    const codeMap: Record<string, string | undefined> = {
      teacher: codes.teacher ?? getStaffRegCode(),
      sinf_rahbari: codes.sinfRahbari ?? getStaffRegCode(),
    };
    const requiredCode = roleGroup !== "student" ? codeMap[roleGroup] : undefined;

    if (requiredCode) {
      userStates.set(userId, { type: "awaiting_reg_code", roleGroup });
      await ctx.editMessageText(
        "🔐 *Maxfiy kod*\n\n" +
        "Admin tomonidan berilgan *maxfiy kodni* kiriting:",
        { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("🔙 Orqaga", "reg_back") }
      );
      return;
    }

    // Kod kerak emas — to'g'ridan ro'yxat
    const { rows, table, hasMore } = await getOnboardUserList(roleGroup, 0);
    const labels: Record<string, string> = {
      student: "O'quvchilar",
      teacher: "O'qituvchilar",
      sinf_rahbari: "Sinf rahbarlari",
    };
    if (rows.length === 0) {
      await ctx.editMessageText(
        `ℹ️ ${labels[roleGroup] ?? roleGroup} ro'yxati hozircha bo'sh.\n\nAdmin bilan bog'laning.`,
        { reply_markup: new InlineKeyboard().text("🔙 Orqaga", "reg_back") }
      );
      return;
    }
    const kb = buildOnboardUserKb(rows, table, roleGroup, 0, hasMore);
    await ctx.editMessageText(
      `👤 *${labels[roleGroup] ?? roleGroup} ro'yxati*\n\nRo'yxatdan o'z ismingizni toping va tanlang:`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  });

  // ─── Onboarding: sahifalash ───────────────────────────────────────────────────
  bot.callbackQuery(/^reg_page:(student|teacher|sinf_rahbari|management|director|zavuch|zam_direktor):(\d+)$/, async (ctx) => {
    const roleGroup = ctx.match[1] as RegRoleGroup | ManagementRole;
    const page = parseInt(ctx.match[2] ?? "0", 10);
    await ctx.answerCallbackQuery();
    const { rows, table, hasMore } = await getOnboardUserList(roleGroup, page);
    const kb = buildOnboardUserKb(rows, table, roleGroup, page, hasMore);
    const labels: Record<string, string> = {
      student: "O'quvchilar",
      teacher: "O'qituvchilar",
      sinf_rahbari: "Sinf rahbarlari",
      management: "Rahbarlar",
      director: "Direktorlar",
      zavuch: "Zavuchlar",
      zam_direktor: "Zam.direktorlar",
    };
    await ctx.editMessageText(
      `👤 *${labels[roleGroup] ?? roleGroup} ro'yxati*\n\nRo'yxatdan o'z ismingizni toping va tanlang:`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  });

  // ─── Onboarding: orqaga ───────────────────────────────────────────────────────
  bot.callbackQuery("reg_back", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      "🎓 *Toshloq tumani 3-maktab — TALIM PLATFORM*\n\nPlatformaga kirish uchun avval o'z toifangizni tanlang 👇",
      { parse_mode: "Markdown", reply_markup: buildRoleSelectionKb() }
    );
  });

  // ─── Onboarding: foydalanuvchi tanlandi ──────────────────────────────────────
  bot.callbackQuery(/^reg_pick:(users|staff):(.+)$/, async (ctx) => {
    const table = ctx.match[1] as "users" | "staff";
    const dbId = ctx.match[2];
    if (!dbId) { await ctx.answerCallbackQuery(); return; }
    await ctx.answerCallbackQuery();

    // Ma'lumotni olish
    const { data } = await supabase
      .from(table)
      .select("full_name, role, class_name")
      .eq("id", dbId)
      .maybeSingle();

    if (!data) {
      await ctx.editMessageText("❌ Foydalanuvchi topilmadi. Qaytadan urinib ko'ring.", {
        reply_markup: new InlineKeyboard().text("🔙 Orqaga", "reg_back"),
      });
      return;
    }

    const d = data as { full_name: string; role?: string; class_name?: string };
    const roleLabel = d.role ? (STAFF_ROLE_LABELS[d.role] ?? d.role) : "";
    const extra = d.class_name ? `${d.class_name} sinf` : roleLabel;

    const kb = new InlineKeyboard()
      .text("✅ Ha, bu men!", `reg_yes:${table}:${dbId}`)
      .text("❌ Yo'q", "reg_back");

    await ctx.editMessageText(
      `👤 *Siz tanlagan shaxs:*\n\n` +
      `*${d.full_name}*` +
      (extra ? `\n${extra}` : "") +
      `\n\nBu sizmisiz?`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  });

  // ─── Onboarding: tasdiqlash (Ha, bu men) ─────────────────────────────────────
  bot.callbackQuery(/^reg_yes:(users|staff):(.+)$/, async (ctx) => {
    const table = ctx.match[1] as "users" | "staff";
    const dbId = ctx.match[2];
    if (!dbId) { await ctx.answerCallbackQuery(); return; }
    await ctx.answerCallbackQuery("✅ Ajoyib!");

    const settings = loadSettings();
    const videoFileId = settings.onboardingVideoFileId;

    if (videoFileId) {
      // Yoriqnoma videoni yuborish
      const kb = new InlineKeyboard().text(
        "✅ Ko'rdim, tasdiqlash",
        `reg_watched:${table}:${dbId}`
      );
      await ctx.editMessageText(
        "📹 *Quyida platformadan foydalanish bo'yicha qisqa yoriqnoma video kelmoqda...*\n\n" +
        "Videoni ko'rgach, *\"Ko'rdim, tasdiqlash\"* tugmasini bosing 👇",
        { parse_mode: "Markdown" }
      );
      await ctx.replyWithVideo(videoFileId, {
        caption: "🎓 Toshloq tumani 3-maktab — TALIM PLATFORM\n\nYoriqnoma videosini tomosha qiling va tasdiqlang.",
        reply_markup: kb,
      });
    } else {
      // Video yo'q — to'g'ridan akkaunt bog'lash
      await ctx.editMessageText("⏳ Akkauntingiz bog'lanmoqda...");
      await sendAccountInfo(ctx, table, dbId, ctx.from.id);
    }
  });

  // ─── Onboarding: video ko'rildi → akkaunt bog'lash ───────────────────────────
  bot.callbackQuery(/^reg_watched:(users|staff):(.+)$/, async (ctx) => {
    const table = ctx.match[1] as "users" | "staff";
    const dbId = ctx.match[2];
    if (!dbId) { await ctx.answerCallbackQuery(); return; }
    await ctx.answerCallbackQuery("✅ Barakalla!");
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
    await sendAccountInfo(ctx, table, dbId, ctx.from.id);
  });

  // ─── /setvideo (admin) ────────────────────────────────────────────────────────
  bot.command("setvideo", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply("⛔ Ruxsat yo'q.");
      return;
    }
    userStates.set(userId, { type: "awaiting_video_file" });
    await ctx.reply(
      "📹 *Onboarding yoriqnoma videosini yuklash*\n\n" +
      "Endi video faylni shu chatga yuboring (forward qilmang, to'g'ridan yuklang).\n\n" +
      "Video saqlangandan keyin barcha yangi foydalanuvchilarga avtomatik yuboriladi.",
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().text("❌ Bekor qilish", "admin_panel"),
      }
    );
  });

  // ─── Video message handler (admin video yuklash) ──────────────────────────────
  bot.on("message:video", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const state = userStates.get(userId) ?? { type: "idle" };
    if (state.type === "awaiting_video_file" && isAdmin(userId)) {
      const fileId = ctx.message.video.file_id;
      setOnboardingVideo(fileId);
      userStates.set(userId, { type: "idle" });
      await ctx.reply(
        "✅ *Yoriqnoma video saqlandi!*\n\n" +
        "Endi yangi foydalanuvchilar ro'yxatdan o'tishda shu video ko'rsatiladi.\n\n" +
        `📌 File ID: \`${fileId}\``,
        { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("⚙️ Admin panel", "admin_panel") }
      );
    }
  });

  // ─── Message handler ─────────────────────────────────────────────────────────
  bot.on("message:text", async (ctx) => {
    const userId = ctx.from.id;
    const state = userStates.get(userId) ?? { type: "idle" };

    // ── Admin: kanal qo'shish ──────────────────────────────────────────────
    if (state.type === "awaiting_channel" && isAdmin(userId)) {
      const input = ctx.message.text.trim();
      const channelId = input.startsWith("@") || input.startsWith("-") ? input : `@${input}`;

      try {
        const chat = await bot.api.getChat(channelId);
        const name: string =
          ("title" in chat && chat.title)
            ? chat.title
            : ("username" in chat && chat.username)
              ? chat.username
              : channelId;

        const added = addChannel({ id: channelId, name });
        userStates.set(userId, { type: "idle" });

        if (added) {
          await ctx.reply(
            `✅ Kanal qo'shildi: *${name}* (${channelId})`,
            {
              parse_mode: "Markdown",
              reply_markup: new InlineKeyboard()
                .text("📋 Kanallar ro'yxati", "admin_channels").row()
                .text("⚙️ Admin panel", "admin_panel"),
            }
          );
        } else {
          await ctx.reply(`⚠️ Bu kanal allaqachon mavjud: ${channelId}`, {
            reply_markup: new InlineKeyboard().text("📋 Kanallar ro'yxati", "admin_channels"),
          });
        }
      } catch {
        await ctx.reply(
          "❌ Kanal topilmadi yoki bot kanalda admin emas.\n\nBotni kanalga admin qilib qo'ying va qayta urinib ko'ring.",
          {
            reply_markup: new InlineKeyboard()
              .text("🔄 Qayta urinish", "add_channel").row()
              .text("❌ Bekor qilish", "admin_channels"),
          }
        );
      }
      return;
    }

    // ── Login: login kirish ───────────────────────────────────────────────
    if (state.type === "awaiting_login_input") {
      const login = ctx.message.text.trim();
      userStates.set(userId, { type: "awaiting_password_input", login });
      await ctx.reply(
        `🔑 Login: \`${login}\`\n\nEndi *parolni* kiriting:`,
        { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("❌ Bekor qilish", "cancel_login") }
      );
      return;
    }

    // ── Login: parol kirish va tekshirish ─────────────────────────────────
    if (state.type === "awaiting_password_input") {
      const { login } = state;
      const password = ctx.message.text.trim();
      userStates.set(userId, { type: "idle" });

      // Staff da qidirish
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, full_name, login, role, subjects")
        .eq("login", login)
        .maybeSingle();

      // Users da qidirish
      const { data: userData } = await supabase
        .from("users")
        .select("id, full_name, login, password, class_name")
        .eq("login", login)
        .maybeSingle();

      let found = false;

      if (staffData) {
        const s = staffData as { id: string; full_name: string; login: string; role: string; subjects?: string[] };
        const { data: spass } = await supabase
          .from("staff")
          .select("password")
          .eq("id", s.id)
          .maybeSingle();
        const realPass = (spass as { password?: string } | null)?.password ?? "";
        if (realPass && password === realPass) {
          found = true;
          await supabase.from("staff").update({ telegram_id: userId }).eq("id", s.id);
          const payload = { id: s.id, role: s.role, full_name: s.full_name, login: s.login, telegram_id: userId, subjects: s.subjects ?? [] };
          const magicToken = createMagicToken(payload);
          const loginUrl = `${WEBSITE_URL}/login?token=${magicToken}`;
          const kb = new InlineKeyboard()
            .url("🚀 Platformaga kirish (1 bosish)", loginUrl)
            .row()
            .url("🌐 Oddiy kirish", `${WEBSITE_URL}/login`);
          await ctx.reply(
            `✅ *Muvaffaqiyatli kirdingiz!*\n\n👤 *${s.full_name}*\n💼 ${STAFF_ROLE_LABELS[s.role] ?? s.role}\n\n📌 Havola 15 daqiqa amal qiladi\\.`,
            { parse_mode: "MarkdownV2", reply_markup: kb }
          );
        }
      } else if (userData) {
        const u = userData as { id: string; full_name: string; login: string; password: string; class_name?: string };
        if (password === u.password) {
          found = true;
          await supabase.from("users").update({ telegram_id: userId }).eq("id", u.id);
          const { data: cls } = await supabase.from("classes").select("id").eq("name", u.class_name ?? "").maybeSingle();
          const payload = { id: u.id, role: "student", full_name: u.full_name, login: u.login, class_name: u.class_name, class_id: (cls as { id?: string } | null)?.id ?? null, telegram_id: userId };
          const magicToken = createMagicToken(payload);
          const loginUrl = `${WEBSITE_URL}/login?token=${magicToken}`;
          const kb = new InlineKeyboard()
            .url("🚀 Platformaga kirish (1 bosish)", loginUrl)
            .row()
            .url("🌐 Oddiy kirish", `${WEBSITE_URL}/login`);
          await ctx.reply(
            `✅ *Muvaffaqiyatli kirdingiz\\!*\n\n👤 *${u.full_name}*\n🏫 ${(u.class_name ?? "—").replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&")} sinf\n\n📌 Havola 15 daqiqa amal qiladi\\.`,
            { parse_mode: "MarkdownV2", reply_markup: kb }
          );
        }
      }

      if (!found) {
        await ctx.reply(
          "❌ *Login yoki parol noto'g'ri!*\n\nQaytadan urinib ko'ring.",
          {
            parse_mode: "Markdown",
            reply_markup: new InlineKeyboard()
              .text("🔄 Qayta urinish", "login_with_creds").row()
              .text("🔙 Bosh sahifa", "cancel_login"),
          }
        );
      }
      return;
    }

    // ── Shaxsiy mahfiy kod tekshirish (barcha rollar) ─────────────────────
    if (state.type === "awaiting_personal_code") {
      const entered = ctx.message.text.trim();
      const roleGroup = state.roleGroup;

      if (roleGroup === "student") {
        // O'quvchilar jadvalidan password bo'yicha qidirish
        const { data } = await supabase
          .from("users")
          .select("id, full_name, login, password, class_name")
          .eq("password", entered)
          .maybeSingle();

        if (!data) {
          await ctx.reply(
            "❌ *Mahfiy kod noto'g'ri!*\n\nKodingizni qaytadan tekshiring yoki admin bilan bog'laning.",
            { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("🔙 Orqaga", "reg_back") }
          );
          return;
        }
        const u = data as { id: string; full_name: string; login: string; password: string; class_name?: string };
        userStates.set(userId, { type: "idle" });
        const waitMsg1 = await ctx.reply("⏳ Akkauntingiz bog'lanmoqda...");
        await sendAccountInfo(ctx, "users", u.id, userId);
        await ctx.api.deleteMessage(ctx.chat.id, waitMsg1.message_id).catch(() => {});
        return;
      }

      if (roleGroup === "teacher" || roleGroup === "sinf_rahbari") {
        const roleFilter = roleGroup === "teacher" ? ["teacher"] : ["sinf_rahbari"];
        const { data } = await supabase
          .from("staff")
          .select("id, full_name, login, role, subjects")
          .eq("password", entered)
          .in("role", roleFilter)
          .maybeSingle();

        if (!data) {
          await ctx.reply(
            "❌ *Mahfiy kod noto'g'ri!*\n\nKodingizni qaytadan tekshiring yoki admin bilan bog'laning.",
            { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("🔙 Orqaga", "reg_back") }
          );
          return;
        }
        userStates.set(userId, { type: "idle" });
        const waitMsg2 = await ctx.reply("⏳ Akkauntingiz bog'lanmoqda...");
        await sendAccountInfo(ctx, "staff", (data as { id: string }).id, userId);
        await ctx.api.deleteMessage(ctx.chat.id, waitMsg2.message_id).catch(() => {});
        return;
      }

      if (roleGroup === "management") {
        const mgmtRoles = ["director", "zam_direktor", "zavuch", "kutubxonachi"];
        const { data } = await supabase
          .from("staff")
          .select("id, full_name, login, role, subjects")
          .eq("password", entered)
          .in("role", mgmtRoles)
          .maybeSingle();

        if (!data) {
          await ctx.reply(
            "❌ *Mahfiy kod noto'g'ri!*\n\nKodingizni qaytadan tekshiring yoki admin bilan bog'laning.",
            { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("🔙 Orqaga", "reg_back") }
          );
          return;
        }
        userStates.set(userId, { type: "idle" });
        const waitMsg3 = await ctx.reply("⏳ Akkauntingiz bog'lanmoqda...");
        await sendAccountInfo(ctx, "staff", (data as { id: string }).id, userId);
        await ctx.api.deleteMessage(ctx.chat.id, waitMsg3.message_id).catch(() => {});
        return;
      }
    }

    // ── Management kod tekshirish ──────────────────────────────────────────
    if (state.type === "awaiting_management_code") {
      const entered = ctx.message.text.trim();
      const result = findRoleByCode(entered);
      if (!result || result.group !== "management") {
        await ctx.reply(
          "❌ *Noto'g'ri maxfiy kod!*\n\nAdmin bilan bog'laning va to'g'ri kodni oling.",
          { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("🔙 Orqaga", "reg_back") }
        );
        return;
      }
      userStates.set(userId, { type: "idle" });
      const specificRole = result.role as ManagementRole;
      const { rows, table, hasMore } = await getOnboardUserList(specificRole, 0);
      const roleLabel = STAFF_ROLE_LABELS[specificRole] ?? specificRole;
      if (rows.length === 0) {
        await ctx.reply(
          `ℹ️ ${roleLabel}lar ro'yxati hozircha bo'sh.\n\nAdmin bilan bog'laning.`,
          { reply_markup: new InlineKeyboard().text("🔙 Orqaga", "reg_back") }
        );
        return;
      }
      const kb = buildOnboardUserKb(rows, table, specificRole, 0, hasMore);
      await ctx.reply(
        `✅ *Kod to'g'ri! ${roleLabel}* sifatida aniqlandingiz.\n\n👤 *${roleLabel}lar ro'yxati*\n\nO'z ismingizni toping va tanlang:`,
        { parse_mode: "Markdown", reply_markup: kb }
      );
      return;
    }

    // ── Maxfiy kod tekshirish (o'qituvchi/sinf rahbari) ──────────────────
    if (state.type === "awaiting_reg_code") {
      const entered = ctx.message.text.trim();
      const roleGroup = state.roleGroup as "teacher" | "sinf_rahbari";
      const result = findRoleByCode(entered);

      const isValid = result && (result.group === roleGroup ||
        (roleGroup === "teacher" && result.role === "teacher") ||
        (roleGroup === "sinf_rahbari" && result.role === "sinf_rahbari"));

      if (!isValid) {
        await ctx.reply(
          "❌ *Noto'g'ri kod!*\n\nAdmin bilan bog'laning va to'g'ri kodni oling.",
          { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("🔙 Orqaga", "reg_back") }
        );
        return;
      }
      // Kod to'g'ri — ro'yxatni ko'rsatish
      userStates.set(userId, { type: "idle" });
      const { rows, table, hasMore } = await getOnboardUserList(roleGroup, 0);
      const labels: Record<string, string> = {
        teacher: "O'qituvchilar",
        sinf_rahbari: "Sinf rahbarlari",
      };
      if (rows.length === 0) {
        await ctx.reply(
          `ℹ️ ${labels[roleGroup] ?? roleGroup} ro'yxati hozircha bo'sh.\n\nAdmin bilan bog'laning.`
        );
        return;
      }
      const kb = buildOnboardUserKb(rows, table, roleGroup, 0, hasMore);
      await ctx.reply(
        `✅ *Kod to'g'ri!*\n\n👤 *${labels[roleGroup] ?? roleGroup} ro'yxati*\n\nO'z ismingizni toping va tanlang:`,
        { parse_mode: "Markdown", reply_markup: kb }
      );
      return;
    }

    // ── Admin: rol uchun yangi maxfiy kod o'rnatish ────────────────────────
    if (state.type === "awaiting_set_role_code" && isAdmin(userId)) {
      const newCode = ctx.message.text.trim();
      const role = state.role;
      userStates.set(userId, { type: "idle" });
      const roleNames: Record<string, string> = {
        teacher: "O'qituvchi",
        sinfRahbari: "Sinf rahbari",
        director: "Direktor",
        zavuch: "Zavuch",
        zamDirector: "Zam.direktor",
        kutubxonachi: "Kutubxonachi",
      };
      if (newCode === "-") {
        setRoleRegCode(role, "");
        await ctx.reply(
          `✅ *${roleNames[role] ?? role}* kodi o'chirildi.`,
          { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("🔐 Kodlar", "admin_reg_codes") }
        );
      } else {
        setRoleRegCode(role, newCode);
        await ctx.reply(
          `✅ *${roleNames[role] ?? role}* uchun kod o'rnatildi: \`${newCode}\``,
          { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("🔐 Kodlar", "admin_reg_codes") }
        );
      }
      return;
    }

    // ── Admin: yangi maxfiy kod o'rnatish (eski, compat) ──────────────────
    if (state.type === "awaiting_new_reg_code" && isAdmin(userId)) {
      const newCode = ctx.message.text.trim();
      userStates.set(userId, { type: "idle" });
      if (newCode === "-") {
        setStaffRegCode("");
        await ctx.reply(
          "✅ Umumiy maxfiy kod o'chirildi.",
          { reply_markup: new InlineKeyboard().text("⚙️ Admin panel", "admin_panel") }
        );
      } else {
        setStaffRegCode(newCode);
        await ctx.reply(
          `✅ *Umumiy maxfiy kod o'rnatildi:* \`${newCode}\``,
          { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("⚙️ Admin panel", "admin_panel") }
        );
      }
      return;
    }

    // ── Admin: xabar tahrirlash ────────────────────────────────────────────
    if (state.type === "awaiting_message" && isAdmin(userId)) {
      const newMessage = ctx.message.text.trim();
      setWelcomeMessage(newMessage);
      userStates.set(userId, { type: "idle" });

      await ctx.reply(
        "✅ *Xabar matni yangilandi!*\n\nPreview:",
        { parse_mode: "Markdown" }
      );
      await ctx.reply(newMessage, {
        parse_mode: "Markdown",
        reply_markup: buildWelcomeKeyboard(),
      });
      await ctx.reply("Endi barcha foydalanuvchilarga shu matn ko'rsatiladi.", {
        reply_markup: new InlineKeyboard().text("⚙️ Admin panel", "admin_panel"),
      });
      return;
    }

    // ── Qo'llab-quvvatlash xabari ─────────────────────────────────────────
    if (state.type === "awaiting_support") {
      const text = ctx.message.text.trim();
      const fromName = ctx.from.first_name + (ctx.from.last_name ? " " + ctx.from.last_name : "");
      const ticketId = `${userId}_${Date.now()}`;
      supportTickets.set(ticketId, { fromUserId: userId, fromName });
      userStates.set(userId, { type: "idle" });

      await ctx.reply("✅ Xabaringiz adminga yuborildi. Tez orada javob beriladi!", { reply_markup: { remove_keyboard: true } });

      if (ADMIN_ID > 0) {
        const kb = new InlineKeyboard().text("💬 Javob berish", `reply_support:${ticketId}`);
        await bot.api.sendMessage(
          ADMIN_ID,
          `📩 *Yangi murojaat (bot)*\n\n👤 *${fromName}* (ID: \`${userId}\`)\n\n💬 *Xabar:*\n${text}`,
          { parse_mode: "Markdown", reply_markup: kb }
        );
      }
      return;
    }

    // ── Admin: support javob yozish ───────────────────────────────────────
    if (state.type === "awaiting_support_reply" && isAdmin(userId)) {
      const reply = ctx.message.text.trim();
      const ticket = supportTickets.get(state.ticketId);
      userStates.set(userId, { type: "idle" });

      if (ticket) {
        supportTickets.delete(state.ticketId);
        await bot.api.sendMessage(
          ticket.fromUserId,
          `📬 *Admin javobi:*\n\n${reply}`,
          { parse_mode: "Markdown" }
        );
        await ctx.reply(`✅ Javob *${ticket.fromName}* ga yuborildi!`, { parse_mode: "Markdown" });
      } else {
        await ctx.reply("❌ Murojaat topilmadi yoki muddati o'tgan.");
      }
      return;
    }

    // ── Oddiy foydalanuvchi ───────────────────────────────────────────────
    await ctx.reply("Boshlash uchun /start yuboring.");
  });

  // ─── /mahfiykod — admin ro'yxat kodini o'rnatadi ───────────────────────────
  bot.command("mahfiykod", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      await ctx.reply("⛔ Bu buyruq faqat admin uchun.");
      return;
    }
    const current = getStaffRegCode();
    userStates.set(userId, { type: "awaiting_new_reg_code" });
    await ctx.reply(
      "🔐 *Maxfiy kodni o'rnatish*\n\n" +
      (current
        ? `Hozirgi kod: \`${current}\`\n\n`
        : "Hozirda kod o'rnatilmagan (hamma ro'yxatdan o'ta oladi).\n\n") +
      "Yangi kodni yuboring.\n" +
      "Kodni o'chirish uchun: `-` yuboring.",
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().text("❌ Bekor qilish", "admin_panel"),
      }
    );
  });

  bot.catch((err) => {
    logger.error({ err: err.error }, "Bot xatoligi");
  });

  // ─── Kundalik ertalab 7:00 (O'zbekiston UTC+5) jadval xabari ────────────────
  // Har daqiqa soat tekshiriladi — soat 7:00 da barcha o'qituvchilarga xabar yuboriladi
  let lastMorningNotifDay = -1;
  setInterval(async () => {
    try {
      const { hour, min } = getTodayUzHourMin();
      const day = getTodayUzDay();
      // Faqat soat 7:00 da, dam olish kuni emas, va bugun hali yuborilmagan bo'lsa
      if (hour === 7 && min === 0 && day >= 1 && day <= 6 && lastMorningNotifDay !== day) {
        lastMorningNotifDay = day;
        logger.info({ day }, "Kundalik jadval xabarlari yuborilmoqda...");

        // Telegram_id bog'langan barcha o'qituvchilarni olish
        const { data: teachers } = await supabase
          .from("staff")
          .select("id, full_name, telegram_id, role")
          .not("telegram_id", "is", null)
          .in("role", ["teacher", "sinf_rahbari", "director", "zam_direktor", "zavuch"]);

        for (const t of (teachers ?? []) as { id: string; full_name: string; telegram_id: number; role: string }[]) {
          if (!t.telegram_id) continue;
          try {
            const text = await getTodayScheduleText(t.id);
            const greeting = `☀️ *Xayrli tong, ${t.full_name.split(" ")[1] ?? t.full_name}!*\n\n`;
            const kb = new InlineKeyboard()
              .text("📆 Ertangi jadval", `schedule_tomorrow:${t.id}`)
              .row()
              .url("🌐 Platforma", `${WEBSITE_URL}/dars-jadvali`);
            await bot.api.sendMessage(t.telegram_id, greeting + text, {
              parse_mode: "Markdown",
              reply_markup: kb,
            });
          } catch {
            // Xabar yubormasa — davom etaveradi
          }
        }
        logger.info("Kundalik jadval xabarlari yuborildi ✅");
      }
    } catch (err) {
      logger.error({ err }, "Kundalik xabar yuborishda xatolik");
    }
  }, 60 * 1000); // har 1 daqiqada tekshiriladi

  return bot;
}

import { Bot, Context, InlineKeyboard, InputFile } from "grammy";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../lib/logger.js";
import {
  getUserById,
  createUser,
  generateCredentials,
  getDaysUntilSeptember,
  getUsersByClass as getStudentsByClass,
} from "./database.js";
import { getState, setState, clearState } from "./states.js";
import {
  registerAdminCommands,
  registerStaffCreationCallbacks,
  isAdmin,
  showAdminMenu,
  handleAdminText,
} from "./admin.js";
import {
  getStaffByTelegramId,
  getStaffByLogin,
  linkStaffTelegram,
  getAllStaff,
  getClassById,
} from "./staff-db.js";
import {
  showManagementMenu,
  showTeacherMenu,
  viewAllClasses,
  viewAllStudents,
  viewMyClass,
  showStats,
} from "./menus.js";
import { ROLE_NAMES, getPermissions, type Role } from "./roles.js";

const CHANNEL_ID = "@TalimPlatform";

// Logo fayl yo'li
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, "logo.png");

// ─── Sinflar klaviaturasi (bazadan dinamik olinadi) ──────────────────────────

async function getClassKeyboard(): Promise<InlineKeyboard> {
  const { getAllClasses } = await import("./staff-db.js");
  const classes = await getAllClasses();
  const kb = new InlineKeyboard();
  if (classes.length === 0) {
    // Fallback: statik sinflar
    const STATIC = ["1-A","1-B","2-A","2-B","3-A","3-B","4-A","4-B",
                    "5-A","5-B","6-A","6-B","7-A","7-B","8-A","8-B",
                    "9-A","9-B","10-A","10-B","11-A","11-B"];
    STATIC.forEach((cls, i) => {
      kb.text(cls, `reg_class_${cls}`);
      if ((i + 1) % 3 === 0) kb.row();
    });
  } else {
    classes.forEach((cls, i) => {
      kb.text(cls.name, `reg_class_${cls.name}`);
      if ((i + 1) % 3 === 0) kb.row();
    });
  }
  return kb;
}

// ─── Logotip bilan xush kelibsiz xabari ─────────────────────────────────────

async function sendWelcomeLogo(ctx: Context, caption: string): Promise<void> {
  try {
    await ctx.replyWithPhoto(new InputFile(LOGO_PATH), {
      caption,
      parse_mode: "Markdown",
    });
  } catch {
    await ctx.reply(caption, { parse_mode: "Markdown" });
  }
}

// ─── Kanal a'zoligini tekshirish ──────────────────────────────────────────────

async function checkChannelMembership(bot: Bot, userId: number): Promise<boolean> {
  try {
    const member = await bot.api.getChatMember(CHANNEL_ID, userId);
    return ["member", "administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

// ─── O'quvchi asosiy menyu ────────────────────────────────────────────────────

async function showStudentMenu(ctx: Context): Promise<void> {
  const kb = new InlineKeyboard()
    .text("ℹ️ Platforma ma'lumotlari", "platform_info").row()
    .text("👤 Mening ma'lumotlarim", "my_info");
  await ctx.reply("📋 Asosiy menyu:", { reply_markup: kb });
}

// ─── Staff menyu (rol bo'yicha) ───────────────────────────────────────────────

async function showStaffMenu(ctx: Context, staff: Awaited<ReturnType<typeof getStaffByTelegramId>>): Promise<void> {
  if (!staff) return;
  const role = staff.role as Role;
  const perm = getPermissions(role);

  if (role === "teacher") {
    await showTeacherMenu(ctx, staff);
  } else {
    await showManagementMenu(ctx, staff);
  }
}

// ─── Staff login oqimi ────────────────────────────────────────────────────────

async function startStaffLogin(ctx: Context): Promise<void> {
  setState(ctx.from!.id, { step: "staff_wait_login" });
  await ctx.reply(
    "🔐 Xodim sifatida kirish uchun Login va Parolingizni kiriting.\n\n" +
    "Login kiriting:"
  );
}

// ─── BOT YARATISH ─────────────────────────────────────────────────────────────

export function createBot(): Bot {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN kerak");

  const bot = new Bot(token);

  // Admin va staff yaratish callback'larini ro'yxatdan o'tkazish
  registerAdminCommands(bot);
  registerStaffCreationCallbacks(bot);

  // ── /start ─────────────────────────────────────────────────────────────────

  bot.command("start", async (ctx) => {
    const userId = ctx.from!.id;

    // 1. Admin
    if (isAdmin(ctx)) {
      await sendWelcomeLogo(ctx,
        "👑 *Admin paneli*\nToshloq tuman 3-maktab — Birlashgan Maktab Platformasi"
      );
      await showAdminMenu(ctx);
      return;
    }

    // 2. Staff (xodim) — avval bazadan tekshiramiz
    const staff = await getStaffByTelegramId(userId);
    if (staff) {
      const roleName = ROLE_NAMES[staff.role as Role] ?? staff.role;
      await sendWelcomeLogo(ctx,
        `${roleName}\nXush kelibsiz, *${staff.full_name}*!`
      );
      await showStaffMenu(ctx, staff);
      return;
    }

    // 3. O'quvchi — allaqachon ro'yxatdan o'tganmi?
    const existingUser = await getUserById(userId);
    if (existingUser) {
      await sendWelcomeLogo(ctx,
        `🎓 Xush kelibsiz, *${existingUser.full_name}*!\nSiz ro'yxatdan o'tgansiz. ✅`
      );
      await showStudentMenu(ctx);
      return;
    }

    // 4. Yangi foydalanuvchi
    clearState(userId);
    await sendWelcomeLogo(ctx,
      "🌟 *Birlashgan Maktab Platformasiga xush kelibsiz!*\n\n" +
      "Botdan to'liq foydalanish uchun rasmiy kanalimizga a'zo bo'ling:"
    );
    const kb = new InlineKeyboard()
      .url("📢 Kanalga o'tish", "https://t.me/TalimPlatform").row()
      .text("A'zo bo'ldim ✅", "check_membership").row()
      .text("👔 Xodim sifatida kirish", "staff_login");
    await ctx.reply("https://t.me/TalimPlatform", { reply_markup: kb });
  });

  // ── Kanal a'zoligini tekshirish ────────────────────────────────────────────

  bot.callbackQuery("check_membership", async (ctx) => {
    const userId = ctx.from.id;
    await ctx.answerCallbackQuery();

    const isMember = await checkChannelMembership(bot, userId);
    if (!isMember) {
      const kb = new InlineKeyboard().text("A'zo bo'ldim ✅", "check_membership");
      await ctx.reply(
        "❌ Siz hali kanalga a'zo bo'lmagansiz.\nIltimos, avval kanalga a'zo bo'ling:\nhttps://t.me/TalimPlatform",
        { reply_markup: kb }
      );
      return;
    }

    const kb = new InlineKeyboard()
      .url("📋 Ro'yxatdan o'tish havola", "https://t.me/TalimPlatform").row()
      .text("Davom etish ➡️", "start_registration");
    await ctx.reply(
      "✅ Kanal a'zoligingiz tasdiqlandi!\n\nToshloq tuman 3-maktab platformasidan foydalanish uchun ro'yxatdan o'ting.",
      { reply_markup: kb }
    );
  });

  // ── O'quvchi ro'yxatdan o'tish ─────────────────────────────────────────────

  bot.callbackQuery("start_registration", async (ctx) => {
    await ctx.answerCallbackQuery();
    setState(ctx.from.id, { step: "wait_phone" });
    await ctx.reply("📞 Telefon raqamingizni kiriting (masalan, +998901234567):");
  });

  // Sinf tanlash (ro'yxatdan o'tishda)
  bot.callbackQuery(/^reg_class_(.+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const className = ctx.match[1];
    await ctx.answerCallbackQuery();

    const state = getState(userId);
    if (state.step !== "wait_class" || !state.phone || !state.name) {
      await ctx.reply("Xatolik yuz berdi. /start bosing.");
      return;
    }

    const { login, password } = generateCredentials(userId);
    const saved = await createUser({
      telegram_id: userId,
      full_name: state.name,
      phone_number: state.phone,
      class_name: className,
      login,
      password,
      registration_date: new Date().toISOString(),
    });

    if (!saved) {
      await ctx.reply("❌ Ma'lumotlarni saqlashda xatolik. Qaytadan urinib ko'ring.");
      return;
    }

    clearState(userId);
    await ctx.reply(
      `🎉 *Muvaffaqiyatli ro'yxatdan o'tdingiz!*\n\n` +
      `Platformaga kirish uchun:\n` +
      `🔑 Login: \`${login}\`\n` +
      `🔒 Parol: \`${password}\`\n\n` +
      `⚠️ Bu ma'lumotlarni eslab qoling!`,
      { parse_mode: "Markdown" }
    );
    await showStudentMenu(ctx);
  });

  // ── O'quvchi menyulari ─────────────────────────────────────────────────────

  bot.callbackQuery("platform_info", async (ctx) => {
    await ctx.answerCallbackQuery();
    const days = getDaysUntilSeptember();
    await ctx.reply(
      `🏫 *Toshloq tuman 3-maktab platformasi*\n\n` +
      `📅 Platforma 5-sentabrdan ishga tushadi!\n` +
      `⏳ Hozircha: *${days}* kun qoldi.\n\n` +
      `💡 Platformaga kirganingizda login va parolingizni kiriting.`,
      { parse_mode: "Markdown" }
    );
  });

  bot.callbackQuery("my_info", async (ctx) => {
    const userId = ctx.from.id;
    await ctx.answerCallbackQuery();
    const user = await getUserById(userId);
    if (!user) { await ctx.reply("Ma'lumotlaringiz topilmadi. /start bosing."); return; }
    await ctx.reply(
      `👤 *Sizning ma'lumotlaringiz:*\n\n` +
      `📛 Ism Familiya: ${user.full_name}\n` +
      `📞 Telefon: ${user.phone_number}\n` +
      `🏫 Sinf: ${user.class_name}\n` +
      `🔑 Login: \`${user.login}\`\n` +
      `🔒 Parol: \`${user.password}\`\n\n` +
      `⚠️ Platformaga kirganingizda yuqoridagi ma'lumotlarni ishlating.`,
      { parse_mode: "Markdown" }
    );
  });

  // ── Staff login ─────────────────────────────────────────────────────────────

  bot.callbackQuery("staff_login", async (ctx) => {
    await ctx.answerCallbackQuery();
    await startStaffLogin(ctx);
  });

  // Staff profili
  bot.callbackQuery("staff_profile", async (ctx) => {
    const userId = ctx.from.id;
    await ctx.answerCallbackQuery();
    const staff = await getStaffByTelegramId(userId);
    if (!staff) { await ctx.reply("Profil topilmadi."); return; }
    const roleName = ROLE_NAMES[staff.role as Role] ?? staff.role;
    await ctx.reply(
      `👔 *Profil ma'lumotlari*\n\n` +
      `📛 Ism: ${staff.full_name}\n` +
      `🎭 Rol: ${roleName}\n` +
      `🔑 Login: \`${staff.login}\`\n` +
      `🔒 Parol: \`${staff.password}\``,
      { parse_mode: "Markdown" }
    );
  });

  // ── Management (Direktor/Zavuch/Zam) menyulari ────────────────────────────

  bot.callbackQuery("view_all_classes", viewAllClasses);
  bot.callbackQuery("view_all_staff", async (ctx) => {
    await ctx.answerCallbackQuery();
    const staff = await getAllStaff();
    if (staff.length === 0) { await ctx.reply("Hozircha xodimlar yo'q."); return; }
    let text = "👔 *Xodimlar ro'yxati:*\n\n";
    for (const s of staff) {
      const roleName = ROLE_NAMES[s.role as Role] ?? s.role;
      text += `${roleName}: *${s.full_name}*\n`;
      if (s.telegram_id) text += `📱 Telegram ulangan ✅\n`;
      text += "──────────\n";
    }
    await ctx.reply(text, { parse_mode: "Markdown" });
  });

  // O'qituvchi: o'z sinfi
  bot.callbackQuery("view_my_class", async (ctx) => {
    const userId = ctx.from.id;
    await ctx.answerCallbackQuery();
    const staff = await getStaffByTelegramId(userId);
    if (!staff) { await ctx.reply("Profil topilmadi."); return; }
    await viewMyClass(ctx, staff);
  });

  // ── Matnli xabarlar (state machine) ──────────────────────────────────────

  bot.on("message:text", async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    if (text.startsWith("/")) return;

    // Admin text handler
    const handledByAdmin = await handleAdminText(ctx, bot);
    if (handledByAdmin) return;

    const state = getState(userId);

    // ── O'quvchi ro'yxatdan o'tish ──────────────────────────────────────────

    if (state.step === "wait_phone") {
      const phoneRegex = /^\+?[0-9]{9,13}$/;
      if (!phoneRegex.test(text.replace(/[\s-]/g, ""))) {
        await ctx.reply("❌ Noto'g'ri format. Masalan: +998901234567");
        return;
      }
      setState(userId, { step: "wait_name", phone: text });
      await ctx.reply("👤 Ism Familiyangizni kiriting (masalan, Ali Valiyev):");
      return;
    }

    if (state.step === "wait_name") {
      if (text.length < 3 || !text.includes(" ")) {
        await ctx.reply("❌ Ism va Familiyani to'liq kiriting (masalan, Ali Valiyev):");
        return;
      }
      setState(userId, { ...state, step: "wait_class", name: text });
      await ctx.reply("🏫 Sinfingizni tanlang:", { reply_markup: await getClassKeyboard() });
      return;
    }

    // ── Staff login ──────────────────────────────────────────────────────────

    if (state.step === "staff_wait_login") {
      setState(userId, { step: "staff_wait_password", staffLogin: text });
      await ctx.reply("🔒 Parolni kiriting:");
      return;
    }

    if (state.step === "staff_wait_password") {
      const login = state.staffLogin;
      if (!login) { clearState(userId); await ctx.reply("Xatolik. /start bosing."); return; }

      const staff = await getStaffByLogin(login);
      if (!staff || staff.password !== text) {
        clearState(userId);
        await ctx.reply("❌ Login yoki parol noto'g'ri. /start bosib qaytadan urinib ko'ring.");
        return;
      }

      // Telegram ID ni xodimga biriktirish
      await linkStaffTelegram(staff.id, userId);
      clearState(userId);

      const roleName = ROLE_NAMES[staff.role as Role] ?? staff.role;
      await sendWelcomeLogo(ctx, `${roleName}\n✅ Tizimga muvaffaqiyatli kirdingiz!\n\n*${staff.full_name}*`);
      await showStaffMenu(ctx, { ...staff, telegram_id: userId });
      return;
    }

    // ── Default ──────────────────────────────────────────────────────────────

    const staffUser = await getStaffByTelegramId(userId);
    if (staffUser) {
      await showStaffMenu(ctx, staffUser);
      return;
    }
    const student = await getUserById(userId);
    if (student) {
      await showStudentMenu(ctx);
    } else {
      await ctx.reply("Botdan foydalanish uchun /start bosing.");
    }
  });

  bot.catch((err) => {
    logger.error({ err: err.error }, "Bot xatoligi");
  });

  return bot;
}

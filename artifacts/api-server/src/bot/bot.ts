import { Bot, Context, InlineKeyboard } from "grammy";
import { logger } from "../lib/logger.js";
import {
  getUserById,
  createUser,
  generateCredentials,
  getDaysUntilSeptember,
} from "./database.js";
import { getState, setState, clearState } from "./states.js";
import { registerAdminCommands, isAdmin, showAdminMenu } from "./admin.js";

const CHANNEL_ID = "@TalimPlatform";

// Barcha sinflar ro'yxati
const CLASSES = [
  "1-A", "1-B", "2-A", "2-B", "3-A", "3-B",
  "4-A", "4-B", "5-A", "5-B", "6-A", "6-B",
  "7-A", "7-B", "8-A", "8-B", "9-A", "9-B",
  "10-A", "10-B", "11-A", "11-B",
];

// Sinflarni 3 ustunlik inline klaviaturaga aylantirish
function getClassKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  CLASSES.forEach((cls, i) => {
    kb.text(cls, `class_${cls}`);
    if ((i + 1) % 3 === 0) kb.row();
  });
  return kb;
}

// Foydalanuvchini kanalga a'zoligini tekshirish
async function checkChannelMembership(
  bot: Bot,
  userId: number
): Promise<boolean> {
  try {
    const member = await bot.api.getChatMember(CHANNEL_ID, userId);
    return ["member", "administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

// Asosiy menyu
async function showMainMenu(ctx: Context): Promise<void> {
  const kb = new InlineKeyboard()
    .text("ℹ️ Platforma ma'lumotlari", "platform_info").row()
    .text("👤 Mening ma'lumotlarim", "my_info");
  await ctx.reply("📋 Asosiy menyu:", { reply_markup: kb });
}

export function createBot(): Bot {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN kerak");

  const bot = new Bot(token);

  // Admin buyruqlarini ro'yxatdan o'tkazish
  registerAdminCommands(bot);

  // /start buyrug'i
  bot.command("start", async (ctx) => {
    const userId = ctx.from!.id;

    if (isAdmin(ctx)) {
      await ctx.reply("Salom, Admin! 👨‍💼");
      await showAdminMenu(ctx);
      return;
    }

    const existingUser = await getUserById(userId);
    if (existingUser) {
      await ctx.reply(
        `Xush kelibsiz, *${existingUser.full_name}*! Siz allaqachon ro'yxatdan o'tgansiz. ✅`,
        { parse_mode: "Markdown" }
      );
      await showMainMenu(ctx);
      return;
    }

    clearState(userId);
    const kb = new InlineKeyboard().text("A'zo bo'ldim ✅", "check_membership");
    await ctx.reply(
      "Xurmatli foydalanuvchi! Botdan to'liq foydalanish uchun rasmiy kanalimizga a'zo bo'ling:\nhttps://t.me/TalimPlatform",
      { reply_markup: kb }
    );
  });

  // "A'zo bo'ldim" tugmasi
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
      .url("Ro'yxatdan o'tish havola", "https://t.me/TalimPlatform").row()
      .text("Davom etish ➡️", "start_registration");
    await ctx.reply(
      "Xurmatli foydalanuvchi! Toshloq tuman 3-maktab platformasidan foydalanish uchun ro'yxatdan o'ting.",
      { reply_markup: kb }
    );
  });

  // Ro'yxatdan o'tishni boshlash
  bot.callbackQuery("start_registration", async (ctx) => {
    const userId = ctx.from.id;
    await ctx.answerCallbackQuery();
    setState(userId, { step: "wait_phone" });
    await ctx.reply("📞 Telefon raqamingizni kiriting (masalan, +998901234567):");
  });

  // Platforma ma'lumotlari
  bot.callbackQuery("platform_info", async (ctx) => {
    await ctx.answerCallbackQuery();
    const days = getDaysUntilSeptember();
    // TODO: Kelajakda sinf rahbari ma'lumotlari bazadan olinadi
    const classTeacher = "Ma'lumot kelajakda qo'shiladi";
    await ctx.reply(
      `🏫 *Toshloq tuman 3-maktab platformasi*\n\n` +
      `📅 Platforma 5-sentabrdan ishga tushadi!\n` +
      `⏳ Hozircha: *${days}* kun qoldi.\n\n` +
      `👨‍🏫 Sinf rahbari: ${classTeacher}\n\n` +
      `💡 Platformaga kirganingizda login va parolingizni kiriting.`,
      { parse_mode: "Markdown" }
    );
  });

  // Mening ma'lumotlarim
  bot.callbackQuery("my_info", async (ctx) => {
    const userId = ctx.from.id;
    await ctx.answerCallbackQuery();
    const user = await getUserById(userId);
    if (!user) {
      await ctx.reply("Ma'lumotlaringiz topilmadi. /start bosing.");
      return;
    }
    await ctx.reply(
      `👤 *Sizning ma'lumotlaringiz:*\n\n` +
      `📛 Ism Familiya: ${user.full_name}\n` +
      `📞 Telefon: ${user.phone_number}\n` +
      `🏫 Sinf: ${user.class_name}\n` +
      `🔑 Login: \`${user.login}\`\n` +
      `🔒 Parol: \`${user.password}\`\n\n` +
      `⚠️ Platformaga kirganingizda yuqoridagi login va parolni ishlating.`,
      { parse_mode: "Markdown" }
    );
  });

  // Sinf tanlash
  bot.callbackQuery(/^class_(.+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const className = ctx.match[1];
    await ctx.answerCallbackQuery();

    const state = getState(userId);
    if (state.step !== "wait_class" || !state.phone || !state.name) {
      await ctx.reply("Xatolik yuz berdi. /start bosing.");
      return;
    }

    const { login, password } = generateCredentials(userId);
    const newUser = {
      telegram_id: userId,
      full_name: state.name,
      phone_number: state.phone,
      class_name: className,
      login,
      password,
      registration_date: new Date().toISOString(),
    };

    const saved = await createUser(newUser);
    if (!saved) {
      await ctx.reply("❌ Ma'lumotlarni saqlashda xatolik. Iltimos, qaytadan urinib ko'ring.");
      return;
    }

    clearState(userId);
    await ctx.reply(
      `🎉 Siz muvaffaqiyatli ro'yxatdan o'tdingiz!\n\n` +
      `Platformaga kirish uchun:\n` +
      `🔑 Login: \`${login}\`\n` +
      `🔒 Parol: \`${password}\`\n\n` +
      `⚠️ Ushbu ma'lumotlarni eslab qoling! Platformaga kirganingizda kerak bo'ladi.`,
      { parse_mode: "Markdown" }
    );
    await showMainMenu(ctx);
  });

  // Matnli xabarlar (state machine)
  bot.on("message:text", async (ctx) => {
    const userId = ctx.from.id;
    if (isAdmin(ctx) && ctx.message.text.startsWith("/")) return;

    const state = getState(userId);
    const text = ctx.message.text.trim();

    if (state.step === "wait_phone") {
      const phoneRegex = /^\+?[0-9]{9,13}$/;
      if (!phoneRegex.test(text.replace(/[\s-]/g, ""))) {
        await ctx.reply("❌ Noto'g'ri format. Iltimos, raqamni to'g'ri kiriting (masalan, +998901234567):");
        return;
      }
      setState(userId, { step: "wait_name", phone: text });
      await ctx.reply("👤 Ism Familiyangizni kiriting (masalan, Ali Valiyev):");

    } else if (state.step === "wait_name") {
      if (text.length < 3 || !text.includes(" ")) {
        await ctx.reply("❌ Iltimos, Ism va Familiyangizni to'liq kiriting (masalan, Ali Valiyev):");
        return;
      }
      setState(userId, { ...state, step: "wait_class", name: text });
      await ctx.reply("🏫 Sinfingizni tanlang:", { reply_markup: getClassKeyboard() });

    } else {
      const user = await getUserById(userId);
      if (user) {
        await showMainMenu(ctx);
      } else {
        await ctx.reply("Botdan foydalanish uchun /start bosing.");
      }
    }
  });

  bot.catch((err) => {
    logger.error({ err: err.error }, "Bot xatoligi");
  });

  return bot;
}

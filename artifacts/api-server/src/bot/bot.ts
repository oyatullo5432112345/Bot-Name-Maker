import { Bot, InlineKeyboard, InputFile } from "grammy";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../lib/logger.js";

const CHANNEL_ID = "@TalimPlatform";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, "logo.png");

// Veb-sayt manzili — REPLIT_DOMAINS dan avtomatik olinadi
const replitDomain = process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim();
const WEBSITE_URL = process.env["WEBSITE_URL"] ?? (replitDomain ? `https://${replitDomain}` : "https://talim-platform.replit.app");

async function checkChannelMembership(bot: Bot, userId: number): Promise<boolean> {
  try {
    const member = await bot.api.getChatMember(CHANNEL_ID, userId);
    return ["member", "administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

export function createBot(): Bot {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN kerak");

  const bot = new Bot(token);

  // /start — foydalanuvchini kanal a'zoligiga yo'naltirish
  bot.command("start", async (ctx) => {
    const kb = new InlineKeyboard()
      .url("📢 Kanalga a'zo bo'lish", `https://t.me/${CHANNEL_ID.replace("@", "")}`).row()
      .text("A'zo bo'ldim ✅", "check_membership");

    try {
      await ctx.replyWithPhoto(new InputFile(LOGO_PATH), {
        caption:
          "🌟 *Birlashgan Maktab Platformasiga xush kelibsiz!*\n\n" +
          "Toshloq tuman 3-maktab — *TALIM PLATFORM*\n\n" +
          "Botdan foydalanish uchun avval rasmiy kanalimizga a'zo bo'ling 👇",
        parse_mode: "Markdown",
        reply_markup: kb,
      });
    } catch {
      await ctx.reply(
        "🌟 *TALIM PLATFORM*\n\nKanalga a'zo bo'ling 👇",
        { parse_mode: "Markdown", reply_markup: kb }
      );
    }
  });

  // A'zolikni tekshirish
  bot.callbackQuery("check_membership", async (ctx) => {
    const userId = ctx.from.id;
    await ctx.answerCallbackQuery();

    const isMember = await checkChannelMembership(bot, userId);

    if (!isMember) {
      const kb = new InlineKeyboard()
        .url("📢 Kanalga o'tish", `https://t.me/${CHANNEL_ID.replace("@", "")}`).row()
        .text("A'zo bo'ldim ✅", "check_membership");
      await ctx.reply(
        "❌ Siz hali kanalga a'zo bo'lmagansiz.\nIltimos, avval kanalga a'zo bo'ling:",
        { reply_markup: kb }
      );
      return;
    }

    // A'zo — veb-sayt havolasini berish
    const kb = new InlineKeyboard()
      .url("🌐 Platformaga kirish", WEBSITE_URL);

    await ctx.reply(
      "✅ *Kanal a'zosi ekansiz!*\n\n" +
      "Endi platformaga kiring va ro'yxatdan o'ting:\n\n" +
      `🔗 ${WEBSITE_URL}`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  });

  // Boshqa har qanday xabar — /start ga yo'naltirish
  bot.on("message", async (ctx) => {
    await ctx.reply("Boshlash uchun /start yuboring.");
  });

  bot.catch((err) => {
    logger.error({ err: err.error }, "Bot xatoligi");
  });

  return bot;
}

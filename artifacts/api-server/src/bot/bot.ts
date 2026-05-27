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
  linkPhoneToChatId,
  getPhoneByChatId,
  normalizePhone,
} from "./settings.js";
import { createMagicToken } from "../routes/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, "logo.png");

const replitDevDomain = process.env["REPLIT_DEV_DOMAIN"]?.trim();
const replitDomain = process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim();
const isProductionBot = process.env["NODE_ENV"] === "production";
// Production da REPLIT_DOMAINS ishlatiladi (to'g'ri production URL)
const WEBSITE_URL = isProductionBot
  ? (replitDomain ? `https://${replitDomain}` : process.env["WEBSITE_URL"] ?? "https://talim-platform.replit.app")
  : (process.env["WEBSITE_URL"] ?? (replitDevDomain ? `https://${replitDevDomain}` : null) ?? (replitDomain ? `https://${replitDomain}` : "https://talim-platform.replit.app"));

const ADMIN_ID = Number(process.env["ADMIN_ID"] ?? "0");

type UserState =
  | { type: "idle" }
  | { type: "awaiting_channel" }
  | { type: "awaiting_message" }
  | { type: "awaiting_support" }
  | { type: "awaiting_support_reply"; ticketId: string };

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
    .select("full_name, class_name, login")
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
    .text("👁 Xabarni ko'rish", "admin_preview").row()
    .text("🔙 Yopish", "admin_close");
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

export function createBot(): Bot {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN kerak");

  const bot = new Bot(token);

  // ─── /start ────────────────────────────────────────────────────────────────
  bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    userStates.set(userId, { type: "idle" });

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

    await sendWelcome(ctx, isAdmin(userId));

    // Telefon raqami bog'lanmagan bo'lsa — so'rash
    const alreadyLinked = getPhoneByChatId(userId);
    if (!alreadyLinked) {
      await ctx.reply(
        "📱 *Platformadagi akkauntingizni bog'lash uchun telefon raqamingizni ulashing.*\n\n" +
        "_Shu orqali sizga xabarlar yuborilishi mumkin bo'ladi._",
        {
          parse_mode: "Markdown",
          reply_markup: buildContactKeyboard(),
        }
      );
    }
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
        .url("🚀 Platformaga kirish", loginUrl);

      await ctx.reply(
        `✅ *Muvaffaqiyatli bog'landi!*\n\n` +
        `👤 *${student.full_name}*\n` +
        `🏫 Sinf: ${student.class_name}\n\n` +
        `Quyidagi tugma orqali *avtomatik* platformaga kirishingiz mumkin 👇`,
        {
          parse_mode: "Markdown",
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

    await ctx.reply(
      loadSettings().welcomeMessage,
      { parse_mode: "Markdown", reply_markup: buildWelcomeKeyboard() }
    );
  });

  // ─── Callback: noop ─────────────────────────────────────────────────────────
  bot.callbackQuery("noop", async (ctx) => {
    await ctx.answerCallbackQuery();
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

  bot.catch((err) => {
    logger.error({ err: err.error }, "Bot xatoligi");
  });

  return bot;
}

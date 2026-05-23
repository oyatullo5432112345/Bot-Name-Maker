import { Bot, Context, InlineKeyboard } from "grammy";
import {
  getAllUsers,
  getUsersCount,
  updateUser,
  deleteUser,
  getUsersByClass,
  User,
} from "./database.js";

const ADMIN_ID = Number(process.env["ADMIN_ID"] ?? "0");

export function isAdmin(ctx: Context): boolean {
  return ctx.from?.id === ADMIN_ID;
}

export async function showAdminMenu(ctx: Context): Promise<void> {
  const kb = new InlineKeyboard()
    .text("👥 Foydalanuvchilar soni", "admin_count").row()
    .text("📋 Barcha ma'lumotlar", "admin_all").row()
    .text("✏️ Foydalanuvchini tahrirlash", "admin_edit").row()
    .text("📢 Xabar yuborish", "admin_broadcast");
  await ctx.reply("👨‍💼 Admin paneli", { reply_markup: kb });
}

export function registerAdminCommands(bot: Bot): void {
  bot.command("admin", async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.reply("❌ Siz admin emassiz.");
      return;
    }
    await showAdminMenu(ctx);
  });

  // Foydalanuvchini o'chirish
  bot.command("del", async (ctx) => {
    if (!isAdmin(ctx)) return;
    const args = (ctx.message?.text ?? "").split(" ");
    const targetId = Number(args[1]);
    if (!targetId) { await ctx.reply("Format: /del 123456789"); return; }
    const ok = await deleteUser(targetId);
    await ctx.reply(ok ? `✅ Foydalanuvchi (${targetId}) o'chirildi.` : "❌ Xatolik yuz berdi.");
  });

  // Sinf o'zgartirish
  bot.command("setclass", async (ctx) => {
    if (!isAdmin(ctx)) return;
    const args = (ctx.message?.text ?? "").split(" ");
    const targetId = Number(args[1]);
    const newClass = args[2];
    if (!targetId || !newClass) { await ctx.reply("Format: /setclass 123456789 5-A"); return; }
    const ok = await updateUser(targetId, { class_name: newClass });
    await ctx.reply(ok ? `✅ Foydalanuvchi (${targetId}) sinfi → ${newClass}` : "❌ Xatolik.");
  });

  // Parol o'zgartirish
  bot.command("setpass", async (ctx) => {
    if (!isAdmin(ctx)) return;
    const args = (ctx.message?.text ?? "").split(" ");
    const targetId = Number(args[1]);
    const newPass = args[2];
    if (!targetId || !newPass) { await ctx.reply("Format: /setpass 123456789 yangiparol"); return; }
    const ok = await updateUser(targetId, { password: newPass });
    await ctx.reply(ok ? `✅ Foydalanuvchi (${targetId}) paroli yangilandi.` : "❌ Xatolik.");
  });

  // Hammaga xabar yuborish
  bot.command("broadcast", async (ctx) => {
    if (!isAdmin(ctx)) return;
    const text = (ctx.message?.text ?? "").replace("/broadcast", "").trim();
    if (!text) { await ctx.reply("Format: /broadcast Xabar matni"); return; }
    const users = await getAllUsers();
    let sent = 0;
    for (const user of users) {
      try {
        await bot.api.sendMessage(user.telegram_id, `📢 ${text}`);
        sent++;
      } catch { /* foydalanuvchi botni bloklagan */ }
    }
    await ctx.reply(`✅ ${sent}/${users.length} foydalanuvchiga xabar yuborildi.`);
  });

  // Sinfga xabar yuborish
  bot.command("broadcastclass", async (ctx) => {
    if (!isAdmin(ctx)) return;
    const parts = (ctx.message?.text ?? "").replace("/broadcastclass", "").trim().split(" ");
    const className = parts[0];
    const text = parts.slice(1).join(" ");
    if (!className || !text) { await ctx.reply("Format: /broadcastclass 5-A Xabar matni"); return; }
    const users = await getUsersByClass(className);
    let sent = 0;
    for (const user of users) {
      try {
        await bot.api.sendMessage(user.telegram_id, `📢 [${className}] ${text}`);
        sent++;
      } catch { /* ignore */ }
    }
    await ctx.reply(`✅ ${sent}/${users.length} foydalanuvchiga (${className}) xabar yuborildi.`);
  });

  // Callback query'lar
  bot.callbackQuery("admin_count", async (ctx) => {
    await ctx.answerCallbackQuery();
    const count = await getUsersCount();
    await ctx.reply(`👥 Jami ro'yxatdan o'tganlar: *${count}* nafar`, { parse_mode: "Markdown" });
  });

  bot.callbackQuery("admin_all", async (ctx) => {
    await ctx.answerCallbackQuery();
    const users = await getAllUsers();
    if (users.length === 0) {
      await ctx.reply("Hozircha ro'yxatdan o'tgan foydalanuvchi yo'q.");
      return;
    }
    const chunks: User[][] = [];
    for (let i = 0; i < users.length; i += 20) chunks.push(users.slice(i, i + 20));
    for (const chunk of chunks) {
      let text = "📋 *Foydalanuvchilar ro'yxati:*\n\n";
      for (const u of chunk) {
        text += `🆔 \`${u.telegram_id}\`\n👤 ${u.full_name}\n📞 ${u.phone_number}\n🏫 ${u.class_name}\n🔑 \`${u.login}\` / \`${u.password}\`\n📅 ${new Date(u.registration_date).toLocaleDateString("uz-UZ")}\n──────────\n`;
      }
      await ctx.reply(text, { parse_mode: "Markdown" });
    }
  });

  bot.callbackQuery("admin_edit", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "✏️ Tahrirlash buyruqlari:\n\n" +
      "• `/del 123456789` — o'chirish\n" +
      "• `/setclass 123456789 5-A` — sinf o'zgartirish\n" +
      "• `/setpass 123456789 yangiparol` — parol o'zgartirish",
      { parse_mode: "Markdown" }
    );
  });

  bot.callbackQuery("admin_broadcast", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "📢 Xabar yuborish:\n\n" +
      "• `/broadcast Xabar matni` — hammaga\n" +
      "• `/broadcastclass 5-A Xabar matni` — sinfga",
      { parse_mode: "Markdown" }
    );
  });
}

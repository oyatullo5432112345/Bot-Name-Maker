// Rol bo'yicha menyular

import { Context, InlineKeyboard } from "grammy";
import type { Staff } from "./staff-db.js";
import type { Role } from "./roles.js";
import { ROLE_NAMES, getPermissions } from "./roles.js";
import { getDaysUntilSeptember } from "./database.js";
import {
  getAllClasses,
  getClassById,
} from "./staff-db.js";
import { getAllUsers, getUsersByClass as getStudentsByClass } from "./database.js";

// ─── Admin menyu ─────────────────────────────────────────────────────────────

export async function showAdminPanel(ctx: Context): Promise<void> {
  const kb = new InlineKeyboard()
    .text("🏫 Sinflarni boshqarish", "mgr_classes").row()
    .text("👥 Xodimlarni boshqarish", "mgr_staff").row()
    .text("📊 O'quvchilar statistikasi", "admin_stats").row()
    .text("📢 Xabar yuborish", "admin_broadcast_menu").row()
    .text("⚙️ O'quvchi tahrirlash", "admin_edit");
  await ctx.reply("👑 *Admin paneli* — Toshloq 3-maktab", {
    parse_mode: "Markdown",
    reply_markup: kb,
  });
}

// ─── Direktor / Zavuch / Zam menyu ───────────────────────────────────────────

export async function showManagementMenu(ctx: Context, staff: Staff): Promise<void> {
  const roleName = ROLE_NAMES[staff.role as Role];
  const kb = new InlineKeyboard()
    .text("📋 Sinflar ro'yxati", "view_all_classes").row()
    .text("👥 Barcha o'quvchilar", "view_all_students").row()
    .text("👔 Xodimlar ro'yxati", "view_all_staff");
  await ctx.reply(`${roleName} — *Boshqaruv paneli*`, {
    parse_mode: "Markdown",
    reply_markup: kb,
  });
}

// ─── O'qituvchi menyu ────────────────────────────────────────────────────────

export async function showTeacherMenu(ctx: Context, staff: Staff): Promise<void> {
  const kb = new InlineKeyboard()
    .text("📋 Mening sinfim", "view_my_class").row()
    .text("👤 Mening profilim", "staff_profile");
  await ctx.reply(`👨‍🏫 *O'qituvchi paneli*\nXush kelibsiz, ${staff.full_name}!`, {
    parse_mode: "Markdown",
    reply_markup: kb,
  });
}

// ─── O'z sinfini ko'rish ─────────────────────────────────────────────────────

export async function viewMyClass(ctx: Context, staff: Staff): Promise<void> {
  await ctx.answerCallbackQuery?.();

  if (!staff.class_id) {
    await ctx.reply("Sizga hali sinf biriktirilmagan. Admin bilan bog'laning.");
    return;
  }

  const cls = await getClassById(staff.class_id);
  if (!cls) {
    await ctx.reply("Sinf topilmadi.");
    return;
  }

  const students = await getStudentsByClass(cls.name);
  if (students.length === 0) {
    await ctx.reply(`📋 *${cls.name}* sinfi — hozircha o'quvchi yo'q.`, { parse_mode: "Markdown" });
    return;
  }

  let text = `📋 *${cls.name} sinfi o'quvchilari (${students.length} nafar):*\n\n`;
  students.forEach((s, i) => {
    text += `${i + 1}. ${s.full_name} — 📞 ${s.phone_number}\n`;
  });
  await ctx.reply(text, { parse_mode: "Markdown" });
}

// ─── Barcha sinflarni ko'rish ────────────────────────────────────────────────

export async function viewAllClasses(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery?.();
  const classes = await getAllClasses();
  if (classes.length === 0) {
    await ctx.reply("Hozircha sinflar yaratilmagan.");
    return;
  }
  let text = "🏫 *Sinflar ro'yxati:*\n\n";
  const kb = new InlineKeyboard();
  for (const cls of classes) {
    const students = await getStudentsByClass(cls.name);
    text += `• *${cls.name}* — ${students.length} o'quvchi\n`;
    kb.text(`📋 ${cls.name}`, `view_class_${cls.id}`).row();
  }
  await ctx.reply(text, { parse_mode: "Markdown", reply_markup: kb });
}

// ─── Barcha o'quvchilarni ko'rish ────────────────────────────────────────────

export async function viewAllStudents(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery?.();
  const students = await getAllUsers();
  if (students.length === 0) {
    await ctx.reply("Hozircha ro'yxatdan o'tgan o'quvchi yo'q.");
    return;
  }
  const chunks = [];
  for (let i = 0; i < students.length; i += 25) {
    chunks.push(students.slice(i, i + 25));
  }
  for (const chunk of chunks) {
    let text = "👥 *O'quvchilar ro'yxati:*\n\n";
    chunk.forEach((s, i) => {
      text += `${i + 1}. *${s.full_name}* (${s.class_name})\n    📞 ${s.phone_number}\n`;
    });
    await ctx.reply(text, { parse_mode: "Markdown" });
  }
}

// ─── Statistika ─────────────────────────────────────────────────────────────

export async function showStats(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery?.();
  const students = await getAllUsers();
  const classes = await getAllClasses();
  const days = getDaysUntilSeptember();

  // Sinf bo'yicha statistika
  const byClass: Record<string, number> = {};
  for (const s of students) {
    byClass[s.class_name] = (byClass[s.class_name] ?? 0) + 1;
  }
  const topClasses = Object.entries(byClass)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  let text =
    `📊 *Platforma statistikasi*\n\n` +
    `👥 Jami o'quvchilar: *${students.length}* nafar\n` +
    `🏫 Yaratilgan sinflar: *${classes.length}* ta\n` +
    `⏳ Sentabrgacha: *${days}* kun\n\n`;

  if (topClasses.length > 0) {
    text += `🏆 *Eng ko'p o'quvchi bo'lgan sinflar:*\n`;
    topClasses.forEach(([cls, count], i) => {
      text += `${i + 1}. ${cls} — ${count} nafar\n`;
    });
  }

  await ctx.reply(text, { parse_mode: "Markdown" });
}

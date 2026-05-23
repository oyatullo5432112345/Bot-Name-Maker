import { Bot, Context, InlineKeyboard } from "grammy";
import {
  getAllUsers,
  getUsersCount,
  updateUser,
  deleteUser,
  getUsersByClass as getStudentsByClass,
} from "./database.js";
import {
  createClass,
  getAllClasses,
  deleteClass,
  createStaff,
  getAllStaff,
  deleteStaff,
  updateStaff,
  assignTeacher,
  getTeachers,
  getClassById,
  getStaffByLogin,
} from "./staff-db.js";
import { ROLE_NAMES, ROLE_BUTTONS, type Role } from "./roles.js";
import { getState, setState, clearState } from "./states.js";
import { showAdminPanel, showStats, viewAllStudents } from "./menus.js";

const ADMIN_ID = Number(process.env["ADMIN_ID"] ?? "0");

export function isAdmin(ctx: Context): boolean {
  return ctx.from?.id === ADMIN_ID;
}

export async function showAdminMenu(ctx: Context): Promise<void> {
  await showAdminPanel(ctx);
}

// ─── Admin callback'larini ro'yxatdan o'tkazish ───────────────────────────────

export function registerAdminCommands(bot: Bot): void {

  // /admin buyrug'i
  bot.command("admin", async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.reply("❌ Siz admin emassiz.");
      return;
    }
    await showAdminPanel(ctx);
  });

  // ── SINFLARNI BOSHQARISH ──────────────────────────────────────────────────

  bot.callbackQuery("mgr_classes", async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.answerCallbackQuery("❌ Ruxsat yo'q"); return; }
    await ctx.answerCallbackQuery();
    const classes = await getAllClasses();
    const kb = new InlineKeyboard()
      .text("➕ Yangi sinf yaratish", "admin_create_class").row()
      .text("🗑️ Sinf o'chirish", "admin_delete_class").row()
      .text("👨‍🏫 Sinf rahbari tayinlash", "admin_assign_teacher").row()
      .text("🔙 Orqaga", "back_admin");

    let text = "🏫 *Sinflarni boshqarish*\n\n";
    if (classes.length === 0) {
      text += "Hozircha sinflar yo'q.";
    } else {
      for (const cls of classes) {
        const students = await getStudentsByClass(cls.name);
        text += `• *${cls.name}* — ${students.length} o'quvchi\n`;
      }
    }
    await ctx.reply(text, { parse_mode: "Markdown", reply_markup: kb });
  });

  // Yangi sinf yaratish
  bot.callbackQuery("admin_create_class", async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.answerCallbackQuery("❌"); return; }
    await ctx.answerCallbackQuery();
    setState(ctx.from.id, { step: "admin_wait_class_name" });
    await ctx.reply("🏫 Yangi sinf nomini kiriting (masalan: *9-A*, *10-B*):", {
      parse_mode: "Markdown",
    });
  });

  // Sinf o'chirish
  bot.callbackQuery("admin_delete_class", async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.answerCallbackQuery("❌"); return; }
    await ctx.answerCallbackQuery();
    const classes = await getAllClasses();
    if (classes.length === 0) {
      await ctx.reply("O'chiradigan sinf yo'q.");
      return;
    }
    const kb = new InlineKeyboard();
    for (const cls of classes) {
      kb.text(`🗑️ ${cls.name}`, `del_class_${cls.id}`).row();
    }
    await ctx.reply("Qaysi sinfni o'chirmoqchisiz?", { reply_markup: kb });
  });

  bot.callbackQuery(/^del_class_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.answerCallbackQuery("❌"); return; }
    await ctx.answerCallbackQuery();
    const classId = ctx.match[1];
    const cls = await getClassById(classId);
    const ok = await deleteClass(classId);
    await ctx.reply(ok ? `✅ "${cls?.name}" sinfi o'chirildi.` : "❌ Xatolik.");
  });

  // Sinf rahbari tayinlash — 1-qadam: sinf tanlash
  bot.callbackQuery("admin_assign_teacher", async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.answerCallbackQuery("❌"); return; }
    await ctx.answerCallbackQuery();
    const classes = await getAllClasses();
    if (classes.length === 0) {
      await ctx.reply("Avval sinf yarating.");
      return;
    }
    const kb = new InlineKeyboard();
    for (const cls of classes) {
      kb.text(`🏫 ${cls.name}`, `assign_pick_class_${cls.id}`).row();
    }
    await ctx.reply("👨‍🏫 Qaysi sinfga rahbar tayinlaysiz?", { reply_markup: kb });
  });

  // Sinf rahbari tayinlash — 2-qadam: o'qituvchi tanlash
  bot.callbackQuery(/^assign_pick_class_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.answerCallbackQuery("❌"); return; }
    await ctx.answerCallbackQuery();
    const classId = ctx.match[1];
    const teachers = await getTeachers();
    if (teachers.length === 0) {
      await ctx.reply("Avval o'qituvchi qo'shing.");
      return;
    }
    setState(ctx.from.id, { step: "admin_assign_teacher", assignClassId: classId });
    const kb = new InlineKeyboard();
    for (const t of teachers) {
      kb.text(`👨‍🏫 ${t.full_name}`, `assign_pick_teacher_${t.id}`).row();
    }
    await ctx.reply("Sinf rahbari bo'ladigan o'qituvchini tanlang:", { reply_markup: kb });
  });

  // Sinf rahbari tayinlash — 3-qadam: tasdiqlash
  bot.callbackQuery(/^assign_pick_teacher_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.answerCallbackQuery("❌"); return; }
    await ctx.answerCallbackQuery();
    const teacherId = ctx.match[1];
    const state = getState(ctx.from.id);
    if (!state.assignClassId) {
      await ctx.reply("Xatolik. Qaytadan bosing.");
      return;
    }
    const cls = await getClassById(state.assignClassId);
    const ok = await assignTeacher(state.assignClassId, teacherId);
    clearState(ctx.from.id);

    if (ok && cls) {
      await ctx.reply(`✅ O'qituvchi *${cls.name}* sinfiga rahbar sifatida tayinlandi.`, {
        parse_mode: "Markdown",
      });
      // O'qituvchiga xabar yuborish (telegram_id bo'lsa)
      const staff = await getStaffByLogin(`staff_${teacherId}`);
      if (staff?.telegram_id) {
        try {
          await bot.api.sendMessage(
            staff.telegram_id,
            `📣 Siz *${cls.name}* sinfining rahbari etib tayinlandingiz!`,
            { parse_mode: "Markdown" }
          );
        } catch { /* foydalanuvchi bot bilan aloqa qilmagan */ }
      }
    } else {
      await ctx.reply("❌ Tayinlashda xatolik.");
    }
  });

  // ── XODIMLARNI BOSHQARISH ────────────────────────────────────────────────

  bot.callbackQuery("mgr_staff", async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.answerCallbackQuery("❌"); return; }
    await ctx.answerCallbackQuery();
    const kb = new InlineKeyboard()
      .text("➕ Yangi xodim qo'shish", "admin_add_staff").row()
      .text("📋 Barcha xodimlar", "admin_list_staff").row()
      .text("🗑️ Xodimni o'chirish", "admin_del_staff").row()
      .text("🔙 Orqaga", "back_admin");
    await ctx.reply("👥 *Xodimlarni boshqarish*", {
      parse_mode: "Markdown",
      reply_markup: kb,
    });
  });

  // Yangi xodim qo'shish — 1-qadam: ism
  bot.callbackQuery("admin_add_staff", async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.answerCallbackQuery("❌"); return; }
    await ctx.answerCallbackQuery();
    setState(ctx.from.id, { step: "admin_staff_name" });
    await ctx.reply("👤 Xodimning Ism Familiyasini kiriting:");
  });

  // Barcha xodimlar ro'yxati
  bot.callbackQuery("admin_list_staff", async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.answerCallbackQuery("❌"); return; }
    await ctx.answerCallbackQuery();
    const staff = await getAllStaff();
    if (staff.length === 0) {
      await ctx.reply("Hozircha xodimlar yo'q.");
      return;
    }
    let text = "👔 *Xodimlar ro'yxati:*\n\n";
    for (const s of staff) {
      const roleName = ROLE_NAMES[s.role as Role] ?? s.role;
      text += `${roleName}: *${s.full_name}*\n`;
      text += `🔑 Login: \`${s.login}\` | 🔒 Parol: \`${s.password}\`\n`;
      if (s.telegram_id) text += `📱 TG: \`${s.telegram_id}\`\n`;
      text += "──────────\n";
    }
    await ctx.reply(text, { parse_mode: "Markdown" });
  });

  // Xodimni o'chirish
  bot.callbackQuery("admin_del_staff", async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.answerCallbackQuery("❌"); return; }
    await ctx.answerCallbackQuery();
    const staff = await getAllStaff();
    if (staff.length === 0) {
      await ctx.reply("O'chiradigan xodim yo'q.");
      return;
    }
    const kb = new InlineKeyboard();
    for (const s of staff) {
      kb.text(`🗑️ ${s.full_name} (${s.role})`, `del_staff_${s.id}`).row();
    }
    await ctx.reply("Qaysi xodimni o'chirmoqchisiz?", { reply_markup: kb });
  });

  bot.callbackQuery(/^del_staff_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.answerCallbackQuery("❌"); return; }
    await ctx.answerCallbackQuery();
    const staffId = ctx.match[1];
    const ok = await deleteStaff(staffId);
    await ctx.reply(ok ? "✅ Xodim o'chirildi." : "❌ Xatolik.");
  });

  // ── BOSHQA ADMIN CALLBACK'LAR ─────────────────────────────────────────────

  bot.callbackQuery("admin_stats", showStats);

  bot.callbackQuery("admin_broadcast_menu", async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.answerCallbackQuery("❌"); return; }
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "📢 *Xabar yuborish:*\n\n" +
      "• `/broadcast Xabar matni` — barcha o'quvchilarga\n" +
      "• `/broadcastclass 5-A Xabar matni` — sinfga\n" +
      "• `/broadcaststaff Xabar matni` — barcha xodimlarga",
      { parse_mode: "Markdown" }
    );
  });

  bot.callbackQuery("admin_edit", async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.answerCallbackQuery("❌"); return; }
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "⚙️ *O'quvchi tahrirlash buyruqlari:*\n\n" +
      "• `/del 123456789` — o'chirish\n" +
      "• `/setclass 123456789 5-A` — sinf o'zgartirish\n" +
      "• `/setpass 123456789 yangiparol` — parol o'zgartirish",
      { parse_mode: "Markdown" }
    );
  });

  bot.callbackQuery("back_admin", async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.answerCallbackQuery("❌"); return; }
    await ctx.answerCallbackQuery();
    await showAdminPanel(ctx);
  });

  // Barcha o'quvchilarni ko'rish (admin uchun)
  bot.callbackQuery("view_all_students", viewAllStudents);

  // Sinf tafsilotlari
  bot.callbackQuery(/^view_class_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const classId = ctx.match[1];
    const cls = await getClassById(classId);
    if (!cls) {
      await ctx.reply("Sinf topilmadi.");
      return;
    }
    const students = await getStudentsByClass(cls.name);
    if (students.length === 0) {
      await ctx.reply(`📋 *${cls.name}* — hozircha o'quvchi yo'q.`, { parse_mode: "Markdown" });
      return;
    }
    let text = `📋 *${cls.name} sinfi (${students.length} nafar):*\n\n`;
    students.forEach((s, i) => {
      text += `${i + 1}. ${s.full_name} — 📞 ${s.phone_number}\n`;
    });
    await ctx.reply(text, { parse_mode: "Markdown" });
  });

  // ── BUYRUqLAR ─────────────────────────────────────────────────────────────

  bot.command("del", async (ctx) => {
    if (!isAdmin(ctx)) return;
    const args = (ctx.message?.text ?? "").split(" ");
    const targetId = Number(args[1]);
    if (!targetId) { await ctx.reply("Format: /del 123456789"); return; }
    const ok = await deleteUser(targetId);
    await ctx.reply(ok ? `✅ O'quvchi (${targetId}) o'chirildi.` : "❌ Xatolik.");
  });

  bot.command("setclass", async (ctx) => {
    if (!isAdmin(ctx)) return;
    const args = (ctx.message?.text ?? "").split(" ");
    const targetId = Number(args[1]);
    const newClass = args[2];
    if (!targetId || !newClass) { await ctx.reply("Format: /setclass 123456789 5-A"); return; }
    const ok = await updateUser(targetId, { class_name: newClass });
    await ctx.reply(ok ? `✅ O'quvchi (${targetId}) sinfi → ${newClass}` : "❌ Xatolik.");
  });

  bot.command("setpass", async (ctx) => {
    if (!isAdmin(ctx)) return;
    const args = (ctx.message?.text ?? "").split(" ");
    const targetId = Number(args[1]);
    const newPass = args[2];
    if (!targetId || !newPass) { await ctx.reply("Format: /setpass 123456789 yangiparol"); return; }
    const ok = await updateUser(targetId, { password: newPass });
    await ctx.reply(ok ? `✅ O'quvchi (${targetId}) paroli yangilandi.` : "❌ Xatolik.");
  });

  bot.command("broadcast", async (ctx) => {
    if (!isAdmin(ctx)) return;
    const text = (ctx.message?.text ?? "").replace("/broadcast", "").trim();
    if (!text) { await ctx.reply("Format: /broadcast Xabar matni"); return; }
    const users = await getAllUsers();
    let sent = 0;
    for (const user of users) {
      try { await bot.api.sendMessage(user.telegram_id, `📢 ${text}`); sent++; } catch { /**/ }
    }
    await ctx.reply(`✅ ${sent}/${users.length} o'quvchiga xabar yuborildi.`);
  });

  bot.command("broadcastclass", async (ctx) => {
    if (!isAdmin(ctx)) return;
    const parts = (ctx.message?.text ?? "").replace("/broadcastclass", "").trim().split(" ");
    const className = parts[0];
    const text = parts.slice(1).join(" ");
    if (!className || !text) { await ctx.reply("Format: /broadcastclass 5-A Xabar"); return; }
    const users = await getStudentsByClass(className);
    let sent = 0;
    for (const user of users) {
      try { await bot.api.sendMessage(user.telegram_id, `📢 [${className}] ${text}`); sent++; } catch { /**/ }
    }
    await ctx.reply(`✅ ${sent}/${users.length} o'quvchiga (${className}) xabar yuborildi.`);
  });

  bot.command("broadcaststaff", async (ctx) => {
    if (!isAdmin(ctx)) return;
    const text = (ctx.message?.text ?? "").replace("/broadcaststaff", "").trim();
    if (!text) { await ctx.reply("Format: /broadcaststaff Xabar matni"); return; }
    const staff = await getAllStaff();
    let sent = 0;
    for (const s of staff) {
      if (!s.telegram_id) continue;
      try { await bot.api.sendMessage(s.telegram_id, `📢 ${text}`); sent++; } catch { /**/ }
    }
    await ctx.reply(`✅ ${sent}/${staff.length} xodimga xabar yuborildi.`);
  });
}

// ─── Text state handler (admin uchun) ────────────────────────────────────────

export async function handleAdminText(
  ctx: Context,
  bot: Bot
): Promise<boolean> {
  if (!isAdmin(ctx)) return false;
  const userId = ctx.from!.id;
  const state = getState(userId);
  const text = (ctx as any).message?.text?.trim() ?? "";
  if (!text || text.startsWith("/")) return false;

  // Sinf yaratish
  if (state.step === "admin_wait_class_name") {
    const existing = (await getAllClasses()).find(
      (c) => c.name.toLowerCase() === text.toLowerCase()
    );
    if (existing) {
      await ctx.reply(`⚠️ "${text}" sinfi allaqachon mavjud.`);
      clearState(userId);
      return true;
    }
    const cls = await createClass(text);
    clearState(userId);
    if (cls) {
      await ctx.reply(`✅ *${cls.name}* sinfi muvaffaqiyatli yaratildi!`, {
        parse_mode: "Markdown",
      });
    } else {
      await ctx.reply("❌ Sinf yaratishda xatolik.");
    }
    return true;
  }

  // Xodim qo'shish — ism
  if (state.step === "admin_staff_name") {
    if (text.length < 3) {
      await ctx.reply("❌ Ism juda qisqa. Qaytadan kiriting:");
      return true;
    }
    setState(userId, { step: "admin_staff_role", staffName: text });
    const kb = new InlineKeyboard();
    for (const btn of ROLE_BUTTONS) {
      kb.text(btn.label, `pick_role_${btn.value}`).row();
    }
    await ctx.reply(
      `👤 *${text}* uchun rolni tanlang:`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
    return true;
  }

  return false;
}

// Rol tanlash callback (bot.ts ichida ham kerak bo'ladi)
export function registerStaffCreationCallbacks(bot: Bot): void {
  bot.callbackQuery(/^pick_role_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.answerCallbackQuery("❌"); return; }
    await ctx.answerCallbackQuery();
    const userId = ctx.from.id;
    const role = ctx.match[1] as Role;
    const state = getState(userId);
    if (!state.staffName) {
      await ctx.reply("Xatolik. Qaytadan boshlang.");
      return;
    }

    // O'qituvchi bo'lsa sinf tanlash, aks holda yaratish
    if (role === "teacher") {
      setState(userId, { step: "admin_staff_class", staffName: state.staffName, staffRole: role });
      const classes = await getAllClasses();
      if (classes.length === 0) {
        // Sinfsiz o'qituvchi qo'shish
        const staff = await createStaff({ full_name: state.staffName, role });
        clearState(userId);
        if (staff) {
          await ctx.reply(
            `✅ O'qituvchi qo'shildi!\n\n👤 ${staff.full_name}\n🔑 Login: \`${staff.login}\`\n🔒 Parol: \`${staff.password}\`\n\n_(Kelajakda sinfga tayinlang)_`,
            { parse_mode: "Markdown" }
          );
        }
        return;
      }
      const kb = new InlineKeyboard();
      kb.text("Hozircha sinfsiz", "pick_class_none").row();
      for (const cls of classes) {
        kb.text(`🏫 ${cls.name}`, `pick_class_${cls.id}`).row();
      }
      await ctx.reply("Qaysi sinfga biriktirasiz? (Hozircha tayinlamasangiz ham bo'ladi):", {
        reply_markup: kb,
      });
    } else {
      // Direktor, Zavuch, Zam
      const staff = await createStaff({ full_name: state.staffName, role });
      clearState(userId);
      if (staff) {
        const roleName = ROLE_NAMES[role];
        await ctx.reply(
          `✅ Xodim qo'shildi!\n\n${roleName}: *${staff.full_name}*\n🔑 Login: \`${staff.login}\`\n🔒 Parol: \`${staff.password}\`\n\n_Ushbu ma'lumotlarni xodimga yuboring._`,
          { parse_mode: "Markdown" }
        );
      } else {
        await ctx.reply("❌ Xodim qo'shishda xatolik.");
      }
    }
  });

  // O'qituvchini sinfga biriktirish
  bot.callbackQuery(/^pick_class_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) { await ctx.answerCallbackQuery("❌"); return; }
    await ctx.answerCallbackQuery();
    const userId = ctx.from.id;
    const classIdOrNone = ctx.match[1];
    const state = getState(userId);
    if (!state.staffName || !state.staffRole) {
      await ctx.reply("Xatolik. Qaytadan boshlang.");
      return;
    }

    const classId = classIdOrNone === "none" ? null : classIdOrNone;
    const staff = await createStaff({
      full_name: state.staffName,
      role: state.staffRole as Role,
      class_id: classId,
    });
    clearState(userId);

    if (staff) {
      const roleName = ROLE_NAMES[staff.role as Role];
      let msg =
        `✅ O'qituvchi qo'shildi!\n\n` +
        `${roleName}: *${staff.full_name}*\n` +
        `🔑 Login: \`${staff.login}\`\n` +
        `🔒 Parol: \`${staff.password}\`\n\n` +
        `_Ushbu ma'lumotlarni o'qituvchiga yuboring._`;

      if (classId) {
        const cls = await getClassById(classId);
        if (cls) {
          await assignTeacher(classId, staff.id);
          msg += `\n\n✅ *${cls.name}* sinfiga rahbar sifatida tayinlandi.`;
        }
      }
      await ctx.reply(msg, { parse_mode: "Markdown" });
    } else {
      await ctx.reply("❌ O'qituvchi qo'shishda xatolik.");
    }
  });
}

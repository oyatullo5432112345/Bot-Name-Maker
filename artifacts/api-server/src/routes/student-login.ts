import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { sendToChat, esc, uzDateStr } from "../lib/tg-shared.js";
import { getClassChats } from "../lib/tg-shared.js";
import { signToken } from "./auth.js";

const router: IRouter = Router();

// ─── Sxema ───
const SCHEMA = `
CREATE TABLE IF NOT EXISTS student_login_codes (
  student_login TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS student_confirm_tokens (
  token TEXT PRIMARY KEY,
  student_login TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used BOOLEAN NOT NULL DEFAULT FALSE
);
`;
void query(SCHEMA).catch(() => {});

// ─── 1. O'quvchi "Tasdiqlash" bosganda → botga xabar ───
router.post("/auth/student/request-code", async (req, res) => {
  try {
    const { student_login, class_name, maktab_id } = req.body;
    if (!student_login || !class_name || !maktab_id) {
      res.status(400).json({ error: "Ma'lumotlar to'liq emas" });
      return;
    }

    // O'quvchi bazada bormi?
    const student = await queryOne<{ login: string; full_name: string; class_name: string; maktab_id: number }>(
      "SELECT login, full_name, class_name, maktab_id FROM users WHERE login = $1 AND class_name = $2 AND maktab_id = $3",
      [student_login, class_name, maktab_id]
    );
    if (!student) {
      res.status(404).json({ error: "O'quvchi topilmadi" });
      return;
    }

    // Sinf guruhini topish
    const cls = await queryOne<{ id: string }>(
      "SELECT id FROM classes WHERE name = $1 AND maktab_id = $2",
      [class_name, maktab_id]
    );
    if (!cls) {
      res.status(404).json({ error: "Sinf topilmadi" });
      return;
    }
    const chats = await getClassChats(cls.id);
    if (chats.length === 0) {
      res.status(400).json({ error: "Sinf guruhi botga ulanmagan" });
      return;
    }

    // Tasdiqlash tokeni yaratish
    const token = crypto.randomUUID();
    await query(
      `INSERT INTO student_confirm_tokens (token, student_login) VALUES ($1, $2)`,
      [token, student.login]
    );

    // Botga xabar
    const confirmText =
      `🎓 <b>${esc(student.full_name)}</b> (${esc(student.class_name)}) platformaga kirmoqchi.\n\n` +
      `Agar bu siz bo'lsangiz — tasdiqlang.`;
    const replyMarkup = {
      inline_keyboard: [[
        { text: "✅ Tasdiqlash", callback_data: `confirm_student:${token}` },
        { text: "❌ Bekor qilish", callback_data: `cancel_student:${token}` },
      ]],
    };

    let sent = 0;
    for (const chat of chats) {
      try {
        await sendToChat(chat.chat_id, confirmText, { reply_markup: replyMarkup });
        sent++;
      } catch (e) {
        logger.warn({ err: e, chat: chat.chat_id }, "Bot xabar yuborishda xato");
      }
    }
    if (sent === 0) {
      res.status(500).json({ error: "Xabar yuborilmadi" });
      return;
    }

    res.json({ ok: true, sent });
  } catch (err) {
    logger.error({ err }, "student/request-code");
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── 2. Bot "Tasdiqlash" bosilganda → 4 xonali kod yaratish ───
router.post("/auth/student/confirm", async (req, res) => {
  try {
    const { token } = req.body;
    const row = await queryOne<{ student_login: string; used: boolean }>(
      "SELECT student_login, used FROM student_confirm_tokens WHERE token = $1",
      [token]
    );
    if (!row || row.used) {
      res.status(400).json({ error: "Havola yaroqsiz yoki allaqachon ishlatilgan" });
      return;
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    await query(
      `INSERT INTO student_login_codes (student_login, code, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '5 minutes')
       ON CONFLICT (student_login) DO UPDATE SET code = $2, expires_at = NOW() + INTERVAL '5 minutes'`,
      [row.student_login, code]
    );
    await query("UPDATE student_confirm_tokens SET used = TRUE WHERE token = $1", [token]);

    const student = await queryOne<{ full_name: string; class_name: string }>(
      "SELECT full_name, class_name FROM users WHERE login = $1",
      [row.student_login]
    );
    res.json({
      ok: true,
      code,
      name: student?.full_name,
      class_name: student?.class_name,
    });
  } catch (err) {
    logger.error({ err }, "student/confirm");
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── 3. O'quvchi 4 xonali kodni kiritganda → kirish ───
router.post("/auth/student/verify-code", async (req, res) => {
  try {
    const { student_login, code } = req.body;
    if (!student_login || !code) {
      res.status(400).json({ error: "Ma'lumotlar to'liq emas" });
      return;
    }
    const row = await queryOne<{ code: string; expires_at: string }>(
      "SELECT code, expires_at::text FROM student_login_codes WHERE student_login = $1",
      [student_login]
    );
    if (!row || row.code !== code) {
      res.status(401).json({ error: "Kod noto'g'ri" });
      return;
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      res.status(401).json({ error: "Kod muddati o'tgan. Qaytadan tasdiqlang." });
      return;
    }
    await query("DELETE FROM student_login_codes WHERE student_login = $1", [student_login]);

    const student = await queryOne<{ login: string; full_name: string; role: string; class_name: string; maktab_id: number }>(
      "SELECT login, full_name, role, class_name, maktab_id FROM users WHERE login = $1",
      [student_login]
    );
    if (!student) {
      res.status(404).json({ error: "O'quvchi topilmadi" });
      return;
    }
    const authToken = signToken({
      login: student.login,
      role: student.role || "student",
      full_name: student.full_name,
      class_name: student.class_name,
      maktab_id: student.maktab_id,
    });
    res.json({
      token: authToken,
      role: student.role || "student",
      full_name: student.full_name,
      class_name: student.class_name,
      maktab_id: student.maktab_id,
    });
  } catch (err) {
    logger.error({ err }, "student/verify-code");
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── 4. O'qituvchi 5 xonali ID bilan kirish ───
router.post("/auth/staff/login", async (req, res) => {
  try {
    const { login_id } = req.body;
    if (!login_id) { res.status(400).json({ error: "ID kerak" }); return; }
    const staff = await queryOne<{
      login: string; full_name: string; role: string; maktab_id: number; class_name: string | null;
    }>(
      "SELECT login, full_name, role, maktab_id, class_name FROM staff WHERE login_id = $1",
      [login_id]
    );
    if (!staff) {
      res.status(401).json({ error: "Bunday ID topilmadi. Maktab ma'muriyatiga murojaat qiling." });
      return;
    }
    const authToken = signToken({
      login: staff.login,
      role: staff.role,
      full_name: staff.full_name,
      class_name: staff.class_name,
      maktab_id: staff.maktab_id,
    });
    res.json({
      token: authToken,
      role: staff.role,
      full_name: staff.full_name,
      class_name: staff.class_name,
      maktab_id: staff.maktab_id,
    });
  } catch (err) {
    logger.error({ err }, "staff/login");
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

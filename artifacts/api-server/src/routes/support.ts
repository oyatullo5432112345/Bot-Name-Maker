import { Router, type IRouter } from "express";
import { getAuthUser } from "./auth.js";
import { query, queryOne } from "../lib/db.js";

const router: IRouter = Router();

// ─── Foydalanuvchi: o'z xabarlarini olish ────────────────────────────────────
router.get("/support/messages", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Ruxsat yo'q" }); return; }

  const userId = String(user["id"]);
  const rows = await query<{
    id: string; user_id: string; user_name: string; user_role: string;
    message: string; is_from_admin: boolean; is_read: boolean; created_at: string;
  }>(
    "SELECT id, user_id, user_name, user_role, message, is_from_admin, is_read, created_at FROM support_messages WHERE user_id = $1 ORDER BY created_at ASC",
    [userId]
  );

  // Admin tomonidan yuborilgan xabarlarni o'qilgan deb belgilash
  await query(
    "UPDATE support_messages SET is_read = TRUE WHERE user_id = $1 AND is_from_admin = TRUE AND is_read = FALSE",
    [userId]
  );

  res.json(rows);
});

// ─── Foydalanuvchi: xabar yuborish ───────────────────────────────────────────
router.post("/support/messages", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Ruxsat yo'q" }); return; }

  const { message } = req.body as { message?: string };
  if (!message || message.trim().length < 1) {
    res.status(400).json({ error: "Xabar bo'sh bo'lmasligi kerak" });
    return;
  }

  const userId = String(user["id"]);
  const userName = String(user["full_name"] ?? "Foydalanuvchi");
  const userRole = String(user["role"] ?? "student");

  const row = await queryOne<{ id: string; created_at: string }>(
    `INSERT INTO support_messages (user_id, user_name, user_role, message, is_from_admin)
     VALUES ($1, $2, $3, $4, FALSE)
     RETURNING id, created_at`,
    [userId, userName, userRole, message.trim()]
  );

  res.json({ ok: true, id: row?.id, created_at: row?.created_at });
});

// ─── Foydalanuvchi: o'qilmagan xabarlar soni ─────────────────────────────────
router.get("/support/unread", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.json({ count: 0 }); return; }

  const userId = String(user["id"]);
  const role = String(user["role"] ?? "");

  if (role === "admin") {
    const row = await queryOne<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM support_messages WHERE is_from_admin = FALSE AND is_read = FALSE"
    );
    res.json({ count: Number(row?.count ?? 0) });
  } else {
    const row = await queryOne<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM support_messages WHERE user_id = $1 AND is_from_admin = TRUE AND is_read = FALSE",
      [userId]
    );
    res.json({ count: Number(row?.count ?? 0) });
  }
});

// ─── Admin: barcha foydalanuvchilar chatlari ──────────────────────────────────
router.get("/support/chats", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || user["role"] !== "admin") {
    res.status(403).json({ error: "Faqat admin uchun" });
    return;
  }

  const rows = await query<{
    user_id: string; user_name: string; user_role: string;
    last_message: string; last_time: string; unread_count: string;
  }>(
    `SELECT
       user_id,
       user_name,
       user_role,
       (SELECT message FROM support_messages m2 WHERE m2.user_id = m1.user_id ORDER BY created_at DESC LIMIT 1) AS last_message,
       (SELECT created_at FROM support_messages m3 WHERE m3.user_id = m1.user_id ORDER BY created_at DESC LIMIT 1) AS last_time,
       (SELECT COUNT(*)::text FROM support_messages m4 WHERE m4.user_id = m1.user_id AND is_from_admin = FALSE AND is_read = FALSE) AS unread_count
     FROM (SELECT DISTINCT user_id, user_name, user_role FROM support_messages) m1
     ORDER BY last_time DESC`
  );

  res.json(rows.map(r => ({
    ...r,
    unread_count: Number(r.unread_count),
  })));
});

// ─── Admin: muayyan foydalanuvchi xabarlarini olish ──────────────────────────
router.get("/support/chats/:userId", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || user["role"] !== "admin") {
    res.status(403).json({ error: "Faqat admin uchun" });
    return;
  }

  const { userId } = req.params;
  const rows = await query<{
    id: string; user_id: string; user_name: string; user_role: string;
    message: string; is_from_admin: boolean; is_read: boolean; created_at: string;
  }>(
    "SELECT id, user_id, user_name, user_role, message, is_from_admin, is_read, created_at FROM support_messages WHERE user_id = $1 ORDER BY created_at ASC",
    [userId]
  );

  // Admin o'qidi — foydalanuvchi xabarlarini o'qilgan deb belgilash
  await query(
    "UPDATE support_messages SET is_read = TRUE WHERE user_id = $1 AND is_from_admin = FALSE AND is_read = FALSE",
    [userId]
  );

  res.json(rows);
});

// ─── Admin: foydalanuvchiga javob berish ──────────────────────────────────────
router.post("/support/chats/:userId/reply", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || user["role"] !== "admin") {
    res.status(403).json({ error: "Faqat admin uchun" });
    return;
  }

  const { userId } = req.params;
  const { message } = req.body as { message?: string };
  if (!message || message.trim().length < 1) {
    res.status(400).json({ error: "Xabar bo'sh bo'lmasligi kerak" });
    return;
  }

  // Foydalanuvchi ma'lumotlarini olish
  const userInfo = await queryOne<{ user_name: string; user_role: string }>(
    "SELECT user_name, user_role FROM support_messages WHERE user_id = $1 LIMIT 1",
    [userId]
  );
  if (!userInfo) {
    res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    return;
  }

  const row = await queryOne<{ id: string; created_at: string }>(
    `INSERT INTO support_messages (user_id, user_name, user_role, message, is_from_admin, is_read)
     VALUES ($1, $2, $3, $4, TRUE, FALSE)
     RETURNING id, created_at`,
    [userId, userInfo.user_name, userInfo.user_role, message.trim()]
  );

  res.json({ ok: true, id: row?.id, created_at: row?.created_at });
});

export default router;

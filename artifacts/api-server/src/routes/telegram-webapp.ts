// Telegram Mini App orqali avtomatik kirish.
//
// Platforma Telegram ichida (bot menyusidagi "Platforma" tugmasi yoki
// "📱 Platforma" klaviatura tugmasi) ochilganda, Telegram sahifaga `initData`
// beradi. Uni bot tokeni bilan HMAC orqali tekshiramiz — soxtalashtirib
// bo'lmaydi — va foydalanuvchini login/parolsiz tizimga kiritamiz.
//
// Hujjat: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { LoginResponse } from "@workspace/api-zod";
import { query, queryOne } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { createSessionToken, getAuthUser } from "./auth.js";

const router: IRouter = Router();

const BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"] ?? "";
const ADMIN_ID = Number(process.env["ADMIN_ID"] ?? "0");
const MAX_AGE_SEC = 24 * 60 * 60; // initData 24 soatdan eski bo'lmasin

interface TgUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

function verifyInitData(initData: string): TgUser | null {
  if (!BOT_TOKEN || !initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const expected = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const authDate = Number(params.get("auth_date") ?? "0");
  if (!authDate || Date.now() / 1000 - authDate > MAX_AGE_SEC) return null;

  try {
    const user = JSON.parse(params.get("user") ?? "null") as TgUser | null;
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

async function buildPayloadByTelegramId(tgId: number): Promise<Record<string, unknown> | null> {
  const staff = await queryOne<{
    id: string; full_name: string; role: string; class_id: string | null; login: string;
    subjects: string[] | null; can_teach: boolean | null; pro_expires_at: string | null;
  }>(
    "SELECT id, full_name, role, class_id, login, subjects, can_teach, pro_expires_at FROM staff WHERE telegram_id = $1 LIMIT 1",
    [tgId]
  );
  if (staff) {
    let class_name: string | null = null;
    if (staff.class_id) {
      const cls = await queryOne<{ name: string }>("SELECT name FROM classes WHERE id = $1", [staff.class_id]);
      class_name = cls?.name ?? null;
    }
    const isTeachingRole = ["teacher", "sinf_rahbari"].includes(staff.role);
    return {
      id: staff.id,
      role: staff.role,
      full_name: staff.full_name,
      login: staff.login,
      class_name,
      class_id: staff.class_id,
      telegram_id: tgId,
      subjects: isTeachingRole ? (staff.subjects ?? []) : undefined,
      can_teach: staff.can_teach ?? false,
      pro_expires_at: staff.pro_expires_at ?? null,
    };
  }

  if (ADMIN_ID > 0 && tgId === ADMIN_ID) {
    return {
      id: "admin", role: "admin", full_name: "Administrator", login: "admin",
      class_name: null, class_id: null, telegram_id: tgId,
    };
  }

  const student = await queryOne<{ id: string | null; telegram_id: number; full_name: string; class_name: string; login: string; pro_expires_at: string | null }>(
    "SELECT id, telegram_id, full_name, class_name, login, pro_expires_at FROM users WHERE telegram_id = $1 LIMIT 1",
    [tgId]
  );
  if (student) {
    const cls = await queryOne<{ id: string }>("SELECT id FROM classes WHERE name = $1", [student.class_name]);
    return {
      id: student.id ?? String(student.telegram_id),
      role: "student",
      full_name: student.full_name,
      login: student.login,
      class_name: student.class_name,
      class_id: cls?.id ?? null,
      telegram_id: student.telegram_id,
      pro_expires_at: student.pro_expires_at ?? null,
    };
  }
  return null;
}

// POST /api/auth/telegram-webapp  { initData }
router.post("/auth/telegram-webapp", async (req, res): Promise<void> => {
  const initData = String((req.body as { initData?: string })?.initData ?? "");
  const tgUser = verifyInitData(initData);
  if (!tgUser) {
    res.status(401).json({ error: "Telegram ma'lumotlari tasdiqlanmadi" });
    return;
  }
  try {
    const payload = await buildPayloadByTelegramId(tgUser.id);
    if (!payload) {
      // Akkaunt hali bog'lanmagan — frontend oddiy login formasini ko'rsatadi,
      // kirgandan keyin /auth/telegram-link orqali avtomatik bog'lanadi.
      res.status(404).json({ error: "Akkaunt Telegramga bog'lanmagan", need_link: true });
      return;
    }
    const token = createSessionToken(payload);
    res.json(LoginResponse.parse({ ...payload, token }));
  } catch (err) {
    logger.error({ err }, "Telegram WebApp login xatosi");
    res.status(500).json({ error: "Server xatosi" });
  }
});

// POST /api/auth/telegram-link  { initData } + Authorization: Bearer <token>
// Mini App ichida login/parol bilan kirilganda — Telegram akkauntini bog'laymiz,
// keyingi safar avtomatik kiradi va bot bildirishnomalari keladi.
router.post("/auth/telegram-link", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }
  const tgUser = verifyInitData(String((req.body as { initData?: string })?.initData ?? ""));
  if (!tgUser) {
    res.status(401).json({ error: "Telegram ma'lumotlari tasdiqlanmadi" });
    return;
  }
  try {
    const role = String(user["role"] ?? "");
    const login = String(user["login"] ?? "");
    if (role === "student") {
      // Boshqa akkauntda shu Telegram ID bo'lsa — to'qnashuv bo'lmasin
      const taken = await queryOne<{ login: string }>("SELECT login FROM users WHERE telegram_id = $1", [tgUser.id]);
      if (taken && taken.login !== login) {
        res.status(409).json({ error: "Bu Telegram akkaunt boshqa o'quvchiga bog'langan" });
        return;
      }
      await query("UPDATE users SET telegram_id = $1 WHERE login = $2", [tgUser.id, login]);
    } else if (role !== "admin" || login !== "admin") {
      await query("UPDATE staff SET telegram_id = $1 WHERE login = $2", [tgUser.id, login]);
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Telegram link xatosi");
    res.status(500).json({ error: "Server xatosi" });
  }
});

export default router;

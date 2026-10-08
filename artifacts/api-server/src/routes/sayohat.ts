import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { getAuthUser } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

// ============================================================
// "BEK VA LOLA: SAYOHAT" — server tomoni
//   GET  /api/sayohat/progress   — o'yin holatini olish
//   POST /api/sayohat/progress   — o'yin holatini saqlash
//   POST /api/sayohat/reward     — viloyat yakunlanganda tanga berish
// ============================================================

// Viloyat uchun yulduzga qarab beriladigan tanga (server tomonda cheklangan —
// mijoz nechta so'rasa ham bundan oshmaydi, shuning uchun firibgarlik bo'lmaydi)
const TANGA_BY_STARS: Record<number, number> = { 1: 5, 2: 10, 3: 15 };

// ------------------------------------------------------------
// GET /api/sayohat/progress
// ------------------------------------------------------------
router.get("/sayohat/progress", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }
  const login = user["login"] as string;

  try {
    const row = await queryOne<{ data: unknown }>(
      "SELECT data FROM sayohat_progress WHERE user_login = $1",
      [login]
    );
    res.json({ data: row?.data ?? null });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ------------------------------------------------------------
// POST /api/sayohat/progress   { data: {...} }
// ------------------------------------------------------------
const ProgressBody = z.object({
  data: z.record(z.string(), z.unknown()),
});

router.post("/sayohat/progress", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }
  const login = user["login"] as string;

  const parsed = ProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    await query(
      `INSERT INTO sayohat_progress (user_login, data, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_login)
       DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [login, JSON.stringify(parsed.data.data)]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ------------------------------------------------------------
// POST /api/sayohat/reward   { region_id, stars }
//   Viloyat yakunlanganda chaqiriladi. Tanga faqat bir marta beriladi;
//   yulduz yaxshilansa — faqat farqi beriladi. Qaytaradi: { awarded }.
// ------------------------------------------------------------
const RewardBody = z.object({
  region_id: z.string().min(1).max(64),
  stars: z.number().int().min(1).max(3),
});

router.post("/sayohat/reward", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }
  const login = user["login"] as string;

  const parsed = RewardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { region_id, stars } = parsed.data;
  const earnable = TANGA_BY_STARS[stars] ?? 0;

  try {
    // Shu viloyat uchun avval nima berilgan?
    const prev = await queryOne<{ stars: number; tanga: number }>(
      "SELECT stars, tanga FROM sayohat_rewards WHERE user_login = $1 AND region_id = $2",
      [login, region_id]
    );
    const prevTanga = prev?.tanga ?? 0;
    const prevStars = prev?.stars ?? 0;

    // Faqat yangi (qo'shimcha) tangani beramiz
    const awarded = Math.max(0, earnable - prevTanga);
    const newStars = Math.max(prevStars, stars);
    const newTanga = Math.max(prevTanga, earnable);

    // Mukofot jadvalini yangilaymiz
    await query(
      `INSERT INTO sayohat_rewards (user_login, region_id, stars, tanga, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_login, region_id)
       DO UPDATE SET stars = $3, tanga = $4, updated_at = NOW()`,
      [login, region_id, newStars, newTanga]
    );

    // Haqiqiy tanga logiga faqat o'quvchilar uchun yozamiz (tanga tizimi o'quvchiga tegishli)
    if (awarded > 0 && user["role"] === "student") {
      await query(
        "INSERT INTO tanga_logs (user_login, amount, reason, source) VALUES ($1, $2, $3, 'sayohat')",
        [login, awarded, `Sayohat: ${region_id} (${stars}⭐)`]
      );
    }

    res.json({ ok: true, awarded, total_for_region: newTanga, stars: newStars });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ------------------------------------------------------------
// GET /api/sayohat/unlocks
//   Barcha viloyatlarning ochilish vaqti: { region_id: ISO-sana | null }
//   Har qanday kirgan foydalanuvchi o'qiy oladi (mijoz qulfni hisoblaydi).
// ------------------------------------------------------------
router.get("/sayohat/unlocks", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }
  try {
    const rows = await query<{ region_id: string; unlock_at: string | null }>(
      "SELECT region_id, unlock_at FROM sayohat_region_unlock",
    );
    const map: Record<string, string | null> = {};
    for (const r of rows) map[r.region_id] = r.unlock_at;
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ------------------------------------------------------------
// POST /api/sayohat/unlocks   { region_id, unlock_at: ISO | null }
//   Faqat rahbariyat. unlock_at=null — vaqtni olib tashlaydi (jadval tartibiga qaytadi).
// ------------------------------------------------------------
const UnlockBody = z.object({
  region_id: z.string().min(1).max(64),
  unlock_at: z.string().min(1).nullable(),
});
const MGMT_ROLES = ["admin", "director", "zam_direktor", "zavuch"];

router.post("/sayohat/unlocks", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !MGMT_ROLES.includes(user["role"] as string)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const parsed = UnlockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { region_id, unlock_at } = parsed.data;

  // Sana to'g'riligini tekshiramiz (null — ruxsat)
  if (unlock_at !== null && Number.isNaN(Date.parse(unlock_at))) {
    res.status(400).json({ error: "Noto'g'ri sana" });
    return;
  }

  try {
    await query(
      `INSERT INTO sayohat_region_unlock (region_id, unlock_at, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (region_id)
       DO UPDATE SET unlock_at = EXCLUDED.unlock_at, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [region_id, unlock_at, (user["login"] as string) ?? null],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

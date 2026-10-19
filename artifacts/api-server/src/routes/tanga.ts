import { Router, type IRouter } from "express";
import { query } from "../lib/db.js";
import { getAuthUser, schoolOf } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

// ============================================================
// O'YIN (Maktab Olami) — binolar darajasi + qahramon/avatar
// Tangalar shu o'yinда sarflanadi (shop_purchases ledgeriga yoziladi,
// shuning uchun balans hamma joyда bir xil kamayadi).
// ============================================================
void query(`
  CREATE TABLE IF NOT EXISTS game_buildings (
    user_login TEXT NOT NULL,
    bkey       TEXT NOT NULL,
    level      INT NOT NULL DEFAULT 0,
    maktab_id  INT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_login, bkey)
  );
  CREATE TABLE IF NOT EXISTS game_player (
    user_login TEXT PRIMARY KEY,
    avatar     TEXT NOT NULL DEFAULT 'bek',
    maktab_id  INT,
    last_claim TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ALTER TABLE game_player ADD COLUMN IF NOT EXISTS last_claim TIMESTAMPTZ;
`).catch(() => { /* migratsiya keyin yaratadi */ });

// ============================================================
// UNVONLAR
// ============================================================
interface Unvon {
  id: string;
  title: string;
  emoji: string;
  min_tanga: number;
  color: string;
  description: string;
  special?: string;
}

const UNVONLAR: Unvon[] = [
  { id: "yangi_shogird",   title: "Yangi Shogird",   emoji: "🌱", min_tanga: 0,    color: "#9CA3AF", description: "Saytga birinchi kirganda avtomatik beriladi" },
  { id: "izlanuvchi",      title: "Izlanuvchi",       emoji: "🔍", min_tanga: 30,   color: "#3B82F6", description: "Bilim yo'liga qadam qo'ydingiz!" },
  { id: "gayratli",        title: "G'ayratli",        emoji: "⭐", min_tanga: 80,   color: "#1D4ED8", description: "Bilimga chanqoqlik — muvaffaqiyat kaliti" },
  { id: "bilimdon",        title: "Bilimdon",         emoji: "🧠", min_tanga: 150,  color: "#F59E0B", description: "Profilda maxsus ramka paydo bo'ladi" },
  { id: "faol_talaba",     title: "Faol Talaba",      emoji: "⚡", min_tanga: 250,  color: "#06B6D4", description: "Reyting jadvalida ismi yonida belgi ko'rinadi" },
  { id: "ilm_sohibi",      title: "Ilm Sohibi",       emoji: "📚", min_tanga: 400,  color: "#059669", description: "Bilimning uch yulduz egasi" },
  { id: "olimpchi",        title: "Olimpchi",         emoji: "🏟️", min_tanga: 600,  color: "#7C3AED", description: "Olimpiadada ishtirok etgan!", special: "olimpiada" },
  { id: "ustoz_shogird",   title: "Ustoz Shogird",    emoji: "🎓", min_tanga: 900,  color: "#D97706", description: "Profil rasmi atrofida oltin halqa" },
  { id: "sinf_yulduzi",    title: "Sinf Yulduzi",     emoji: "🌟", min_tanga: 1300, color: "#FCD34D", description: "Sinfda eng ko'p tanga yig'gan o'quvchi" },
  { id: "maktab_faxri",    title: "Maktab Faxri",     emoji: "🏆", min_tanga: 2000, color: "#DC2626", description: "Maktab Faxrlari Zaliga kirdi!" },
  { id: "tuman_golibi",    title: "Tuman G'olibi",    emoji: "👑", min_tanga: 3000, color: "#2563EB", description: "Tuman olimpiadasida 1-o'rin!", special: "tuman" },
  { id: "olimp_choqqisi",  title: "Olimp Cho'qqisi",  emoji: "🌟", min_tanga: 5000, color: "#7C3AED", description: "Respublika darajasida natija" },
  { id: "afsonaviy",       title: "AFSONAVIY",        emoji: "🔱", min_tanga: 8000, color: "#1F2937", description: "Hech kim bilmaydi bu unvon borligini..." },
];

function getUnvon(totalTanga: number, hasOlimp = false): Unvon {
  let best = UNVONLAR[0]!;
  for (const u of UNVONLAR) {
    if (u.special === "olimpiada" && !hasOlimp) continue;
    if (totalTanga >= u.min_tanga) best = u;
    else break;
  }
  return best;
}

// ============================================================
// DO'KON MAHSULOTLARI
// ============================================================
const SHOP_ITEMS = [
  { id: "profile_frame",    name: "Maxsus profil ramkasi",          cost: 100, emoji: "🖼️" },
  { id: "profile_bg",       name: "Profil fon rangi",               cost: 80,  emoji: "🎨" },
  { id: "emoji_badge",      name: "Maxsus emoji badge",             cost: 50,  emoji: "😎" },
  { id: "reyting_boost",    name: "1 hafta reytingda yuqorida turish", cost: 200, emoji: "📈" },
];

// ============================================================
// KUNLIK BAHOLARDAN TANGA HISOBLASH (dinamik)
// ============================================================
async function calcGradeTanga(login: string): Promise<number> {
  const rows = await query<{ day: string; grade_sum: string }>(
    `SELECT DATE(created_at AT TIME ZONE 'Asia/Tashkent') AS day,
            SUM(grade) AS grade_sum
     FROM grades
     WHERE student_login = $1
     GROUP BY day`,
    [login]
  );

  let total = 0;
  for (const r of rows) {
    const avg = parseInt(r.grade_sum) / 5;
    if (avg >= 4.5) total += 15;
    else if (avg >= 4.0) total += 10;
    else if (avg >= 3.5) total += 6;
    else if (avg >= 3.0) total += 3;
  }
  return total;
}

// ============================================================
// GET /api/tanga/my
// ============================================================
router.get("/tanga/my", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || user["role"] !== "student") {
    res.status(403).json({ error: "Faqat o'quvchilar uchun" });
    return;
  }
  const login = user["login"] as string;

  try {
    const gradeTanga = await calcGradeTanga(login);

    const bonusRows = await query<{ total: string }>(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM tanga_logs WHERE user_login = $1",
      [login]
    );
    const bonusTanga = parseInt(bonusRows[0]?.total ?? "0");

    const spentRows = await query<{ total: string }>(
      "SELECT COALESCE(SUM(cost), 0) AS total FROM shop_purchases WHERE user_login = $1",
      [login]
    );
    const spent = parseInt(spentRows[0]?.total ?? "0");

    const totalTanga = gradeTanga + bonusTanga - spent;

    // olimpiada ishtirok etganmi?
    const olimpRows = await query<{ cnt: string }>(
      "SELECT COUNT(*) AS cnt FROM olimpiada_ishtirokchilar WHERE ism = $1",
      [user["full_name"] as string]
    );
    const hasOlimp = parseInt(olimpRows[0]?.cnt ?? "0") > 0;

    const unvon = getUnvon(totalTanga, hasOlimp);
    const nextUnvon = UNVONLAR.find(u => u.min_tanga > totalTanga && (!u.special || (u.special === "olimpiada" && hasOlimp)));

    // oxirgi 10 ta tranzaksiya
    const history = await query<{ reason: string; amount: number; source: string; created_at: string }>(
      "SELECT reason, amount, source, created_at FROM tanga_logs WHERE user_login = $1 ORDER BY created_at DESC LIMIT 10",
      [login]
    );

    res.json({
      grade_tanga: gradeTanga,
      bonus_tanga: bonusTanga,
      spent,
      total: totalTanga,
      unvon,
      next_unvon: nextUnvon ?? null,
      history,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================
// GET /api/tanga/leaderboard — top 50 o'quvchi (tangalar bo'yicha)
// ============================================================
router.get("/tanga/leaderboard", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const mid = schoolOf(user);

  try {
    // All students with grade tanga
    const gradeRows = mid !== null
      ? await query<{ student_login: string; student_name: string; class_name: string; day: string; grade_sum: string }>(
          `SELECT student_login, student_name, class_name,
                  DATE(created_at AT TIME ZONE 'Asia/Tashkent') AS day,
                  SUM(grade) AS grade_sum
           FROM grades
           WHERE maktab_id = $1
           GROUP BY student_login, student_name, class_name, day`,
          [mid]
        )
      : await query<{ student_login: string; student_name: string; class_name: string; day: string; grade_sum: string }>(
          `SELECT student_login, student_name, class_name,
                  DATE(created_at AT TIME ZONE 'Asia/Tashkent') AS day,
                  SUM(grade) AS grade_sum
           FROM grades
           GROUP BY student_login, student_name, class_name, day`
        );

    const gradeMap = new Map<string, { login: string; name: string; class_name: string; grade_tanga: number }>();
    for (const r of gradeRows) {
      const avg = parseInt(r.grade_sum) / 5;
      let daily = 0;
      if (avg >= 4.5) daily = 15;
      else if (avg >= 4.0) daily = 10;
      else if (avg >= 3.5) daily = 6;
      else if (avg >= 3.0) daily = 3;

      const existing = gradeMap.get(r.student_login);
      if (existing) existing.grade_tanga += daily;
      else gradeMap.set(r.student_login, {
        login: r.student_login,
        name: r.student_name,
        class_name: r.class_name,
        grade_tanga: daily,
      });
    }

    // Bonus tanga
    const bonusRows = mid !== null
      ? await query<{ user_login: string; total: string }>(
          "SELECT user_login, SUM(amount) AS total FROM tanga_logs WHERE maktab_id = $1 GROUP BY user_login",
          [mid]
        )
      : await query<{ user_login: string; total: string }>(
          "SELECT user_login, SUM(amount) AS total FROM tanga_logs GROUP BY user_login"
        );
    const bonusMap = new Map(bonusRows.map(r => [r.user_login, parseInt(r.total)]));

    // Spent
    const spentRows = mid !== null
      ? await query<{ user_login: string; total: string }>(
          "SELECT user_login, SUM(cost) AS total FROM shop_purchases WHERE maktab_id = $1 GROUP BY user_login",
          [mid]
        )
      : await query<{ user_login: string; total: string }>(
          "SELECT user_login, SUM(cost) AS total FROM shop_purchases GROUP BY user_login"
        );
    const spentMap = new Map(spentRows.map(r => [r.user_login, parseInt(r.total)]));

    // Combine all users
    const allLogins = new Set([...gradeMap.keys(), ...bonusMap.keys()]);
    const results: Array<{
      rank: number; login: string; name: string; class_name: string;
      total: number; unvon: Unvon;
    }> = [];

    for (const login of allLogins) {
      const gInfo = gradeMap.get(login);
      const gradeTanga = gInfo?.grade_tanga ?? 0;
      const bonusTanga = bonusMap.get(login) ?? 0;
      const spent = spentMap.get(login) ?? 0;
      const total = gradeTanga + bonusTanga - spent;

      results.push({
        rank: 0,
        login,
        name: gInfo?.name ?? login,
        class_name: gInfo?.class_name ?? "",
        total,
        unvon: getUnvon(total),
      });
    }

    results.sort((a, b) => b.total - a.total);
    results.forEach((r, i) => { r.rank = i + 1; });

    res.json(results.slice(0, 50));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================
// POST /api/tanga/bonus — qo'shimcha tanga berish (admin/server tomonidan)
// ============================================================
const BonusBody = z.object({
  user_login: z.string(),
  amount: z.number().int(),
  reason: z.string(),
  source: z.string().default("manual"),
});

router.post("/tanga/bonus", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !["admin", "director", "zam_direktor", "zavuch"].includes(user["role"] as string)) {
    res.status(403).json({ error: "Ruxsat yo'q" }); return;
  }

  const mid = schoolOf(user);

  const parsed = BonusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { user_login, amount, reason, source } = parsed.data;
  try {
    await query(
      "INSERT INTO tanga_logs (user_login, amount, reason, source, maktab_id) VALUES ($1, $2, $3, $4, $5)",
      [user_login, amount, reason, source, mid ?? 3]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================
// POST /api/tanga/daily-login — kunlik kirish bonusi (2 tanga)
// ============================================================
router.post("/tanga/daily-login", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || user["role"] !== "student") {
    res.status(403).json({ error: "Faqat o'quvchilar uchun" }); return;
  }
  const login = user["login"] as string;
  const mid = schoolOf(user);

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const existing = await query<{ cnt: string }>(
      "SELECT COUNT(*) AS cnt FROM tanga_logs WHERE user_login = $1 AND source = 'daily_login' AND created_at >= $2",
      [login, todayStart.toISOString()]
    );

    if (parseInt(existing[0]?.cnt ?? "0") > 0) {
      res.json({ ok: false, message: "Bugun allaqachon tanga oldingiz" });
      return;
    }

    await query(
      "INSERT INTO tanga_logs (user_login, amount, reason, source, maktab_id) VALUES ($1, 2, 'Saytga kunlik kirish', 'daily_login', $2)",
      [login, mid ?? 3]
    );
    res.json({ ok: true, amount: 2, message: "+2 tanga! Har kuni keling!" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================
// GET /api/tanga/shop — do'kon mahsulotlari
// ============================================================
router.get("/tanga/shop", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }

  const login = user["login"] as string;
  const purchases = await query<{ item_id: string }>(
    "SELECT item_id FROM shop_purchases WHERE user_login = $1",
    [login]
  );
  const purchasedIds = new Set(purchases.map(p => p.item_id));

  res.json(SHOP_ITEMS.map(item => ({
    ...item,
    purchased: purchasedIds.has(item.id),
  })));
});

// ============================================================
// POST /api/tanga/shop/buy
// ============================================================
const BuyBody = z.object({ item_id: z.string() });

router.post("/tanga/shop/buy", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || user["role"] !== "student") {
    res.status(403).json({ error: "Faqat o'quvchilar uchun" }); return;
  }
  const login = user["login"] as string;
  const mid = schoolOf(user);

  const parsed = BuyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const item = SHOP_ITEMS.find(i => i.id === parsed.data.item_id);
  if (!item) { res.status(404).json({ error: "Mahsulot topilmadi" }); return; }

  try {
    const already = await query<{ cnt: string }>(
      "SELECT COUNT(*) AS cnt FROM shop_purchases WHERE user_login = $1 AND item_id = $2",
      [login, item.id]
    );
    if (parseInt(already[0]?.cnt ?? "0") > 0) {
      res.status(400).json({ error: "Bu mahsulotni allaqachon sotib olgansiz" }); return;
    }

    const gradeTanga = await calcGradeTanga(login);
    const bonusRows = await query<{ total: string }>(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM tanga_logs WHERE user_login = $1", [login]
    );
    const spentRows = await query<{ total: string }>(
      "SELECT COALESCE(SUM(cost), 0) AS total FROM shop_purchases WHERE user_login = $1", [login]
    );
    const balance = gradeTanga + parseInt(bonusRows[0]?.total ?? "0") - parseInt(spentRows[0]?.total ?? "0");

    if (balance < item.cost) {
      res.status(400).json({ error: `Yetarli tanga yo'q. Kerak: ${item.cost}, Sizda: ${balance}` }); return;
    }

    await query(
      "INSERT INTO shop_purchases (user_login, item_id, item_name, cost, maktab_id) VALUES ($1, $2, $3, $4, $5)",
      [login, item.id, item.name, item.cost, mid ?? 3]
    );

    res.json({ ok: true, message: `${item.emoji} ${item.name} muvaffaqiyatli sotib olindi!` });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================
// GET /api/tanga/unvonlar — barcha unvonlar ro'yxati
// ============================================================
router.get("/tanga/unvonlar", async (req, res): Promise<void> => {
  res.json(UNVONLAR);
});

// ============================================================
// O'YIN — Maktab Olami (binolarni kuchaytirish)
// ============================================================
const MAX_LEVEL = 10;
function upgradeCost(base: number, level: number): number {
  return Math.round(base * Math.pow(1.7, level)); // 0->base, keyin har daraja qimmatroq
}
// Idle (offline) daromad: har bino darajasi soatiga 1 tanga ishlab chiqaradi.
// Jamg'arish eng ko'pi IDLE_CAP_HOURS soatlik (shundan keyin to'xtaydi — har kuni qaytishni rag'batlantiradi).
const IDLE_CAP_HOURS = 8;
function perHourFrom(levelMap: Record<string, number>): number {
  return BUILDINGS.reduce((s, b) => s + (levelMap[b.key] ?? 0), 0);
}
function accruedFrom(perHour: number, lastClaim: string | null): number {
  if (perHour <= 0 || !lastClaim) return 0;
  const hours = (Date.now() - new Date(lastClaim).getTime()) / 3_600_000;
  return Math.floor(Math.min(hours, IDLE_CAP_HOURS) * perHour);
}
const BUILDINGS = [
  { key: "maktab",       name: "Maktab",               emoji: "🏫", base: 50 },
  { key: "kutubxona",    name: "Kutubxona",            emoji: "📚", base: 40 },
  { key: "ingliz",       name: "Ingliz tili markazi",  emoji: "🇬🇧", base: 45 },
  { key: "matematika",   name: "Matematika markazi",   emoji: "🔢", base: 45 },
  { key: "milliy_kiyim", name: "Milliy kiyim do'koni", emoji: "🧵", base: 60 },
  { key: "qahramon",     name: "Qahramon (o'zing)",    emoji: "🦸", base: 70 },
];
const AVATARS = [
  { id: "bek",       name: "Bek",       emoji: "👦" },
  { id: "lola",      name: "Lola",      emoji: "👧" },
  { id: "olim",      name: "Olim",      emoji: "🧑‍🎓" },
  { id: "sportchi",  name: "Sportchi",  emoji: "🏃" },
  { id: "rassom",    name: "Rassom",    emoji: "🧑‍🎨" },
  { id: "dasturchi", name: "Dasturchi", emoji: "🧑‍💻" },
];

// Balans = baho tangasi + bonuslar − sarflangan (do'kon + o'yin). /tanga/my bilan bir xil.
async function calcBalance(login: string): Promise<number> {
  const grade = await calcGradeTanga(login);
  const bonusRows = await query<{ total: string }>("SELECT COALESCE(SUM(amount),0) AS total FROM tanga_logs WHERE user_login = $1", [login]);
  const spentRows = await query<{ total: string }>("SELECT COALESCE(SUM(cost),0) AS total FROM shop_purchases WHERE user_login = $1", [login]);
  return grade + parseInt(bonusRows[0]?.total ?? "0") - parseInt(spentRows[0]?.total ?? "0");
}

// GET /api/tanga/game — o'yin holati (balans, binolar, avatar)
router.get("/tanga/game", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const login = user["login"] as string;
  try {
    const total = await calcBalance(login);
    const rows = await query<{ bkey: string; level: number }>("SELECT bkey, level FROM game_buildings WHERE user_login = $1", [login]);
    const levelMap: Record<string, number> = {};
    for (const r of rows) levelMap[r.bkey] = r.level;
    const buildings = BUILDINGS.map(b => {
      const lvl = levelMap[b.key] ?? 0;
      return { key: b.key, name: b.name, emoji: b.emoji, level: lvl, max: MAX_LEVEL, income: lvl, next_cost: lvl >= MAX_LEVEL ? null : upgradeCost(b.base, lvl) };
    });
    const pr = await query<{ avatar: string; last_claim: string | null }>("SELECT avatar, last_claim::text AS last_claim FROM game_player WHERE user_login = $1", [login]);
    const perHour = perHourFrom(levelMap);
    // Idle soatini ishga tushiramiz (birinchi marta yoki binolar bo'lsa-yu vaqt yo'q bo'lsa)
    let lastClaim = pr[0]?.last_claim ?? null;
    if (perHour > 0 && !lastClaim) {
      const mid = schoolOf(user);
      await query(`INSERT INTO game_player (user_login, last_claim, maktab_id) VALUES ($1, NOW(), $2)
                   ON CONFLICT (user_login) DO UPDATE SET last_claim = NOW()`, [login, mid ?? 3]).catch(() => {});
      lastClaim = new Date().toISOString();
    }
    const accrued = accruedFrom(perHour, lastClaim);
    // "Tanga Tizimi" ma'lumotini shu yerга birlashtiramiz: unvon ham qaytadi.
    res.json({ total, buildings, avatar: pr[0]?.avatar ?? "bek", avatars: AVATARS, unvon: getUnvon(total), income_per_hour: perHour, accrued, cap_hours: IDLE_CAP_HOURS });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// POST /api/tanga/game/upgrade { key } — binoni 1 daraja kuchaytirish
const UpgradeBody = z.object({ key: z.string() });
router.post("/tanga/game/upgrade", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const login = user["login"] as string;
  const mid = schoolOf(user);
  const parsed = UpgradeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Noto'g'ri so'rov" }); return; }
  const b = BUILDINGS.find(x => x.key === parsed.data.key);
  if (!b) { res.status(404).json({ error: "Bino topilmadi" }); return; }
  try {
    const row = await query<{ level: number }>("SELECT level FROM game_buildings WHERE user_login = $1 AND bkey = $2", [login, b.key]);
    const level = row[0]?.level ?? 0;
    if (level >= MAX_LEVEL) { res.status(400).json({ error: "Eng yuqori daraja" }); return; }
    const cost = upgradeCost(b.base, level);
    const total = await calcBalance(login);
    if (total < cost) { res.status(400).json({ error: `Yetarli tanga yo'q. Kerak: ${cost} 🪙, sizda: ${total} 🪙` }); return; }

    await query("INSERT INTO shop_purchases (user_login, item_id, item_name, cost, maktab_id) VALUES ($1, $2, $3, $4, $5)",
      [login, `game_${b.key}_${level + 1}`, `O'yin: ${b.name} ${level + 1}-daraja`, cost, mid ?? 3]);
    await query(`INSERT INTO game_buildings (user_login, bkey, level, maktab_id) VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_login, bkey) DO UPDATE SET level = $3, updated_at = NOW()`,
      [login, b.key, level + 1, mid ?? 3]);

    const newLevel = level + 1;
    res.json({ ok: true, key: b.key, level: newLevel, total: total - cost, next_cost: newLevel >= MAX_LEVEL ? null : upgradeCost(b.base, newLevel) });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// POST /api/tanga/game/avatar { avatar } — qahramon avatarini tanlash (bepul)
const AvatarBody = z.object({ avatar: z.string() });
router.post("/tanga/game/avatar", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const login = user["login"] as string;
  const mid = schoolOf(user);
  const parsed = AvatarBody.safeParse(req.body);
  if (!parsed.success || !AVATARS.some(a => a.id === parsed.data.avatar)) { res.status(400).json({ error: "Noto'g'ri avatar" }); return; }
  await query(`INSERT INTO game_player (user_login, avatar, maktab_id) VALUES ($1, $2, $3)
               ON CONFLICT (user_login) DO UPDATE SET avatar = $2, updated_at = NOW()`, [login, parsed.data.avatar, mid ?? 3]);
  res.json({ ok: true, avatar: parsed.data.avatar });
});

// POST /api/tanga/game/claim — idle (jamg'arilgan) tangani yig'ish
router.post("/tanga/game/claim", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const login = user["login"] as string;
  const mid = schoolOf(user);
  try {
    const rows = await query<{ bkey: string; level: number }>("SELECT bkey, level FROM game_buildings WHERE user_login = $1", [login]);
    const levelMap: Record<string, number> = {};
    for (const r of rows) levelMap[r.bkey] = r.level;
    const perHour = perHourFrom(levelMap);
    const pr = await query<{ last_claim: string | null }>("SELECT last_claim::text AS last_claim FROM game_player WHERE user_login = $1", [login]);
    const accrued = accruedFrom(perHour, pr[0]?.last_claim ?? null);
    // Soatni har holda yangilaymiz (jamg'arish qaytadan boshlanadi)
    await query(`INSERT INTO game_player (user_login, last_claim, maktab_id) VALUES ($1, NOW(), $2)
                 ON CONFLICT (user_login) DO UPDATE SET last_claim = NOW()`, [login, mid ?? 3]);
    if (accrued <= 0) { const total = await calcBalance(login); res.json({ ok: true, claimed: 0, total, income_per_hour: perHour, accrued: 0 }); return; }
    await query("INSERT INTO tanga_logs (user_login, amount, reason, source, maktab_id) VALUES ($1, $2, $3, 'game_idle', $4)",
      [login, accrued, "Maktab Olami — shaharcha daromadi", mid ?? 3]);
    const total = await calcBalance(login);
    res.json({ ok: true, claimed: accrued, total, income_per_hour: perHour, accrued: 0 });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ============================================================
// MILLIY MERGE — o'zbek hunarmandchiligini merge qilib tiklash.
//   Tanga bilan asosiy buyum SOTIB OLINADI (bepul paydo bo'lmaydi), merge bepul,
//   zanjirni oxirigacha yetkazish bir martalik kolleksiya mukofoti beradi.
//   Tanga server tomonda hisoblanadi (buy → shop_purchases, mukofot → tanga_logs).
// ============================================================
void query(`
  CREATE TABLE IF NOT EXISTS merge_state (
    user_login TEXT PRIMARY KEY,
    board      JSONB NOT NULL DEFAULT '[]'::jsonb,
    claimed    JSONB NOT NULL DEFAULT '{}'::jsonb,
    maktab_id  INT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`).catch(() => { /* migratsiya keyin yaratadi */ });

const MERGE_BOARD_SIZE = 36; // 6 x 6
const MERGE_CHAINS: Record<string, { name: string; base_cost: number; reward: number; tiers: string[] }> = {
  atlas: { name: "Atlas yo'li", base_cost: 12, reward: 60, tiers: ["Ip", "Pilla", "Atlas", "Ko'ylak", "Chapan", "Usta"] },
  doppi: { name: "Do'ppi", base_cost: 15, reward: 40, tiers: ["Mato", "Tikilgan do'ppi", "Zarduzi", "Usta do'ppisi"] },
  dasturxan: { name: "Dasturxan", base_cost: 14, reward: 45, tiers: ["Non", "Patir", "Osh", "To'y dasturxani"] },
  cholgu: { name: "Cholg'u", base_cost: 16, reward: 50, tiers: ["Nay", "Dutor", "Rubob", "Ansambl"] },
};
type MergeCell = { chain: string; tier: number } | null;

function validBoard(raw: unknown): MergeCell[] | null {
  if (!Array.isArray(raw) || raw.length > MERGE_BOARD_SIZE) return null;
  const out: MergeCell[] = [];
  for (const c of raw) {
    if (c == null) { out.push(null); continue; }
    if (typeof c !== "object") return null;
    const chain = (c as Record<string, unknown>)["chain"];
    const tier = (c as Record<string, unknown>)["tier"];
    if (typeof chain !== "string" || !MERGE_CHAINS[chain]) return null;
    if (typeof tier !== "number" || tier < 0 || tier >= MERGE_CHAINS[chain]!.tiers.length) return null;
    out.push({ chain, tier: Math.floor(tier) });
  }
  while (out.length < MERGE_BOARD_SIZE) out.push(null);
  return out;
}

async function loadMerge(login: string): Promise<{ board: MergeCell[]; claimed: Record<string, boolean> }> {
  const rows = await query<{ board: unknown; claimed: unknown }>("SELECT board, claimed FROM merge_state WHERE user_login = $1", [login]);
  const board = validBoard(rows[0]?.board) ?? Array.from({ length: MERGE_BOARD_SIZE }, () => null);
  const claimed = (rows[0]?.claimed && typeof rows[0].claimed === "object") ? rows[0].claimed as Record<string, boolean> : {};
  return { board, claimed };
}

async function saveMerge(login: string, mid: number | null, board: MergeCell[], claimed: Record<string, boolean>): Promise<void> {
  await query(
    `INSERT INTO merge_state (user_login, board, claimed, maktab_id) VALUES ($1, $2::jsonb, $3::jsonb, $4)
     ON CONFLICT (user_login) DO UPDATE SET board = $2::jsonb, claimed = $3::jsonb, updated_at = NOW()`,
    [login, JSON.stringify(board), JSON.stringify(claimed), mid ?? 3]
  );
}

// GET /api/tanga/merge — holat: balans, taxta, kolleksiya, zanjirlar
router.get("/tanga/merge", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const login = user["login"] as string;
  try {
    const [total, { board, claimed }] = await Promise.all([calcBalance(login), loadMerge(login)]);
    res.json({ total, board, claimed, chains: MERGE_CHAINS, size: MERGE_BOARD_SIZE, unvon: getUnvon(total) });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// POST /api/tanga/merge/buy { chain } — tanga bilan asosiy buyum sotib olish (bo'sh katakka qo'yiladi)
const MergeBuyBody = z.object({ chain: z.string() });
router.post("/tanga/merge/buy", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const login = user["login"] as string;
  const mid = schoolOf(user);
  const parsed = MergeBuyBody.safeParse(req.body);
  if (!parsed.success || !MERGE_CHAINS[parsed.data.chain]) { res.status(400).json({ error: "Noto'g'ri zanjir" }); return; }
  const chain = parsed.data.chain;
  const cost = MERGE_CHAINS[chain]!.base_cost;
  try {
    const total = await calcBalance(login);
    if (total < cost) { res.status(400).json({ error: `Yetarli tanga yo'q. Kerak: ${cost} 🪙, sizda: ${total} 🪙` }); return; }
    const { board, claimed } = await loadMerge(login);
    const empty = board.findIndex((c) => c == null);
    if (empty === -1) { res.status(400).json({ error: "Taxta to'la — avval buyumlarni birlashtiring" }); return; }
    board[empty] = { chain, tier: 0 };
    await query("INSERT INTO shop_purchases (user_login, item_id, item_name, cost, maktab_id) VALUES ($1, $2, $3, $4, $5)",
      [login, `merge_${chain}`, `Merge: ${MERGE_CHAINS[chain]!.tiers[0]}`, cost, mid ?? 3]);
    await saveMerge(login, mid, board, claimed);
    res.json({ ok: true, board, total: total - cost });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// POST /api/tanga/merge/save { board } — merge natijasini saqlash (tangaga ta'sir qilmaydi)
const MergeSaveBody = z.object({ board: z.array(z.any()) });
router.post("/tanga/merge/save", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const login = user["login"] as string;
  const mid = schoolOf(user);
  const parsed = MergeSaveBody.safeParse(req.body);
  const board = parsed.success ? validBoard(parsed.data.board) : null;
  if (!board) { res.status(400).json({ error: "Noto'g'ri taxta" }); return; }
  try {
    const { claimed } = await loadMerge(login);
    await saveMerge(login, mid, board, claimed);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// POST /api/tanga/merge/claim { chain } — zanjirni oxirigacha yetkazish mukofoti (bir martalik)
const MergeClaimBody = z.object({ chain: z.string() });
router.post("/tanga/merge/claim", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const login = user["login"] as string;
  const mid = schoolOf(user);
  const parsed = MergeClaimBody.safeParse(req.body);
  if (!parsed.success || !MERGE_CHAINS[parsed.data.chain]) { res.status(400).json({ error: "Noto'g'ri zanjir" }); return; }
  const chain = parsed.data.chain;
  const topTier = MERGE_CHAINS[chain]!.tiers.length - 1;
  try {
    const { board, claimed } = await loadMerge(login);
    if (claimed[chain]) { res.status(400).json({ error: "Bu zanjir mukofoti allaqachon olingan" }); return; }
    const reached = board.some((c) => c && c.chain === chain && c.tier >= topTier);
    if (!reached) { res.status(400).json({ error: "Zanjir hali oxiriga yetmagan" }); return; }
    const reward = MERGE_CHAINS[chain]!.reward;
    await query("INSERT INTO tanga_logs (user_login, amount, reason, source, maktab_id) VALUES ($1, $2, $3, 'merge', $4)",
      [login, reward, `Merge: ${MERGE_CHAINS[chain]!.name} to'liq yig'ildi`, mid ?? 3]);
    claimed[chain] = true;
    await saveMerge(login, mid, board, claimed);
    const total = await calcBalance(login);
    res.json({ ok: true, reward, total, claimed });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

export default router;

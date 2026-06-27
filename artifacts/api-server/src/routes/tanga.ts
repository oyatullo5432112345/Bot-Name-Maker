import { Router, type IRouter } from "express";
import { query } from "../lib/db.js";
import { getAuthUser } from "./auth.js";
import { z } from "zod";

const router: IRouter = Router();

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

  try {
    // All students with grade tanga
    const gradeRows = await query<{ student_login: string; student_name: string; class_name: string; day: string; grade_sum: string }>(
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
    const bonusRows = await query<{ user_login: string; total: string }>(
      "SELECT user_login, SUM(amount) AS total FROM tanga_logs GROUP BY user_login"
    );
    const bonusMap = new Map(bonusRows.map(r => [r.user_login, parseInt(r.total)]));

    // Spent
    const spentRows = await query<{ user_login: string; total: string }>(
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

  const parsed = BonusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { user_login, amount, reason, source } = parsed.data;
  try {
    await query(
      "INSERT INTO tanga_logs (user_login, amount, reason, source) VALUES ($1, $2, $3, $4)",
      [user_login, amount, reason, source]
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
      "INSERT INTO tanga_logs (user_login, amount, reason, source) VALUES ($1, 2, 'Saytga kunlik kirish', 'daily_login')",
      [login]
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
      "INSERT INTO shop_purchases (user_login, item_id, item_name, cost) VALUES ($1, $2, $3, $4)",
      [login, item.id, item.name, item.cost]
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

export default router;

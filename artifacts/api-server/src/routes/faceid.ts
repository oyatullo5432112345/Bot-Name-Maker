// ═══════════════════════════════════════════════════════════════════════════
//  FACE ID — maktabga kirishda yuz orqali davomat
//
//  • Yuzni tanish BRAUZERDA (telefon kamerasi) bajariladi — server faqat
//    128 sonli "yuz izi"ni (descriptor) saqlaydi. RASM SAQLANMAYDI.
//  • Ro'yxatga olish faqat ota-ona roziligi belgilangan holda.
//  • Kiosk (eshikdagi telefon) o'quvchini tanisa → face_checkins + davomat
//    ("keldi" yoki "kech qoldi") + o'quvchiga Telegram xabar.
// ═══════════════════════════════════════════════════════════════════════════

import { Router, type IRouter, type Request } from "express";
import { query, queryOne } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { getAuthUser } from "./auth.js";
import { notifyUser } from "../lib/notify.js";
import { isRealTelegramId, uzDateStr, uzHourMin, sendToChat, esc } from "../lib/tg-shared.js";

const router: IRouter = Router();

const MANAGE = ["admin", "director", "zam_direktor", "zavuch"];
const ENROLL = [...MANAGE, "sinf_rahbari"];
const DESCRIPTOR_LEN = 128;

// ─── Sxema (server ishga tushganda, idempotent) ─────────────────────────────
const FACE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS face_profiles (
  student_login TEXT PRIMARY KEY,
  descriptors   JSONB NOT NULL,
  consent       BOOLEAN NOT NULL DEFAULT FALSE,
  consent_by    TEXT NOT NULL DEFAULT '',
  enrolled_by   TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS face_checkins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_login TEXT NOT NULL,
  student_name  TEXT NOT NULL DEFAULT '',
  class_name    TEXT NOT NULL DEFAULT '',
  date          DATE NOT NULL,
  checked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        TEXT NOT NULL DEFAULT 'present',
  distance      REAL,
  device        TEXT NOT NULL DEFAULT '',
  UNIQUE (student_login, date)
);
CREATE INDEX IF NOT EXISTS idx_face_checkins_date ON face_checkins(date, class_name);
CREATE TABLE IF NOT EXISTS face_settings (
  id         SMALLINT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

void query(FACE_SCHEMA_SQL)
  .then(() => logger.info("Face ID jadvallari tayyor ✅"))
  .catch((err) => logger.error({ err }, "Face ID sxemasini yaratishda xato"));

// ─── Sozlamalar ─────────────────────────────────────────────────────────────

export interface FaceSettings {
  late_after: string; // "08:00" — shundan keyin kelsa "kech qoldi"
  notify: boolean; // o'quvchiga Telegram xabar
  threshold: number; // moslik chegarasi (kichik = qat'iyroq)
}

const DEFAULT_SETTINGS: FaceSettings = { late_after: "08:00", notify: true, threshold: 0.48 };

async function getSettings(): Promise<FaceSettings> {
  const row = await queryOne<{ data: Partial<FaceSettings> }>("SELECT data FROM face_settings WHERE id = 1").catch(() => null);
  return { ...DEFAULT_SETTINGS, ...(row?.data ?? {}) };
}

// ─── Yordamchilar ───────────────────────────────────────────────────────────

type AuthUser = Record<string, unknown> & { role: string; login: string; class_name?: string | null; full_name?: string };

function authAs(req: Request, roles: string[]): AuthUser | null {
  const u = getAuthUser(req.headers.authorization) as AuthUser | null;
  if (!u || !roles.includes(String(u.role))) return null;
  return u;
}

function uzTime(): string {
  const { hour, min } = uzHourMin();
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function isDescriptor(d: unknown): d is number[] {
  return Array.isArray(d) && d.length === DESCRIPTOR_LEN && d.every((v) => typeof v === "number" && Number.isFinite(v));
}

function dist(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i]! - b[i]!;
    s += d * d;
  }
  return Math.sqrt(s);
}

/** Sinf rahbari faqat o'z sinfini boshqaradi */
function canTouchClass(u: AuthUser, className: string): boolean {
  if (MANAGE.includes(u.role)) return true;
  return !!u.class_name && u.class_name === className;
}

// ═══════════════════════════════════════════════════════════════════════════
//  BOSHQARUV SAHIFASI
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/faceid/overview — bugungi holat (sinflar kesimida)
router.get("/faceid/overview", async (req, res): Promise<void> => {
  if (!authAs(req, MANAGE)) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  try {
    const today = uzDateStr();
    const [settings, classes, recent, totals] = await Promise.all([
      getSettings(),
      query<{ class_name: string; total: number; enrolled: number; arrived: number; late: number }>(
        `SELECT u.class_name,
                COUNT(*)::int AS total,
                COUNT(fp.student_login)::int AS enrolled,
                COUNT(fc.student_login)::int AS arrived,
                COUNT(fc.student_login) FILTER (WHERE fc.status = 'late')::int AS late
           FROM users u
           LEFT JOIN face_profiles fp ON fp.student_login = u.login AND fp.consent
           LEFT JOIN face_checkins fc ON fc.student_login = u.login AND fc.date = $1::date
          WHERE u.class_name <> ''
          GROUP BY u.class_name`,
        [today]
      ),
      query<{ student_name: string; class_name: string; status: string; time: string }>(
        `SELECT student_name, class_name, status,
                to_char(checked_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS time
           FROM face_checkins WHERE date = $1::date ORDER BY checked_at DESC LIMIT 20`,
        [today]
      ),
      queryOne<{ students: number; enrolled: number }>(
        `SELECT (SELECT COUNT(*) FROM users)::int AS students,
                (SELECT COUNT(*) FROM face_profiles WHERE consent)::int AS enrolled`
      ),
    ]);
    classes.sort((a, b) => a.class_name.localeCompare(b.class_name, "uz", { numeric: true }));
    const arrived = classes.reduce((s, c) => s + c.arrived, 0);
    const late = classes.reduce((s, c) => s + c.late, 0);
    res.json({
      date: today,
      time: uzTime(),
      settings,
      students: totals?.students ?? 0,
      enrolled: totals?.enrolled ?? 0,
      arrived,
      late,
      classes,
      recent,
    });
  } catch (err) {
    logger.error({ err }, "faceid/overview");
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET/POST /api/faceid/settings
router.get("/faceid/settings", async (req, res): Promise<void> => {
  if (!authAs(req, MANAGE)) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  res.json(await getSettings());
});

router.post("/faceid/settings", async (req, res): Promise<void> => {
  if (!authAs(req, MANAGE)) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const b = req.body as Partial<FaceSettings>;
  const cur = await getSettings();
  const next: FaceSettings = {
    late_after: typeof b.late_after === "string" && /^\d{2}:\d{2}$/.test(b.late_after) ? b.late_after : cur.late_after,
    notify: typeof b.notify === "boolean" ? b.notify : cur.notify,
    threshold: typeof b.threshold === "number" && b.threshold >= 0.3 && b.threshold <= 0.65 ? b.threshold : cur.threshold,
  };
  await query(
    `INSERT INTO face_settings (id, data, updated_at) VALUES (1, $1, NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [JSON.stringify(next)]
  );
  res.json(next);
});

// POST /api/faceid/notify-absent — kelmaganlar ro'yxatini sinf rahbarlariga (Telegram)
router.post("/faceid/notify-absent", async (req, res): Promise<void> => {
  if (!authAs(req, MANAGE)) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  try {
    const today = uzDateStr();
    const rows = await query<{ class_name: string; full_name: string }>(
      `SELECT u.class_name, u.full_name FROM users u
        WHERE u.class_name <> ''
          AND NOT EXISTS (SELECT 1 FROM face_checkins fc WHERE fc.student_login = u.login AND fc.date = $1::date)
        ORDER BY u.class_name, u.full_name`,
      [today]
    );
    const byClass = new Map<string, string[]>();
    for (const r of rows) byClass.set(r.class_name, [...(byClass.get(r.class_name) ?? []), r.full_name]);

    let sent = 0;
    for (const [className, names] of byClass) {
      const heads = await query<{ telegram_id: number }>(
        `SELECT s.telegram_id FROM staff s JOIN classes c ON c.id = s.class_id
          WHERE c.name = $1 AND s.telegram_id IS NOT NULL`,
        [className]
      );
      if (heads.length === 0) continue;
      const text =
        `🚪 <b>${esc(className)} — Face ID orqali kelmaganlar</b> (${today.split("-").reverse().join(".")}, ${uzTime()})\n\n` +
        names.slice(0, 60).map((n, i) => `${i + 1}. ${esc(n)}`).join("\n") +
        `\n\n<i>Face ID'da ro'yxatdan o'tmaganlar ham shu ro'yxatda bo'lishi mumkin.</i>`;
      for (const h of heads) if (await sendToChat(h.telegram_id, text)) sent++;
    }
    res.json({ ok: true, classes: byClass.size, sent });
  } catch (err) {
    logger.error({ err }, "faceid/notify-absent");
    res.status(500).json({ error: (err as Error).message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  RO'YXATGA OLISH
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/faceid/students?class_name=7-B
router.get("/faceid/students", async (req, res): Promise<void> => {
  const u = authAs(req, ENROLL);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const className = String(req.query["class_name"] ?? "");
  if (!className) { res.status(400).json({ error: "class_name kerak" }); return; }
  if (!canTouchClass(u, className)) { res.status(403).json({ error: "Bu sinf sizga biriktirilmagan" }); return; }
  const rows = await query<{ login: string; full_name: string; enrolled: boolean; samples: number; updated_at: string | null }>(
    `SELECT u.login, u.full_name,
            (fp.student_login IS NOT NULL AND fp.consent) AS enrolled,
            COALESCE(jsonb_array_length(fp.descriptors), 0)::int AS samples,
            fp.updated_at::text AS updated_at
       FROM users u LEFT JOIN face_profiles fp ON fp.student_login = u.login
      WHERE u.class_name = $1 ORDER BY u.full_name`,
    [className]
  );
  res.json(rows);
});

// GET /api/faceid/classes — ro'yxatga olish uchun sinflar (sinf rahbari — faqat o'ziniki)
router.get("/faceid/classes", async (req, res): Promise<void> => {
  const u = authAs(req, ENROLL);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const rows = await query<{ class_name: string; total: number; enrolled: number }>(
    `SELECT u.class_name, COUNT(*)::int AS total, COUNT(fp.student_login) FILTER (WHERE fp.consent)::int AS enrolled
       FROM users u LEFT JOIN face_profiles fp ON fp.student_login = u.login
      WHERE u.class_name <> '' GROUP BY u.class_name`
  );
  const list = rows
    .filter((r) => canTouchClass(u, r.class_name))
    .sort((a, b) => a.class_name.localeCompare(b.class_name, "uz", { numeric: true }));
  res.json(list);
});

// POST /api/faceid/enroll { student_login, descriptors: number[][], consent: true, force?: boolean }
router.post("/faceid/enroll", async (req, res): Promise<void> => {
  const u = authAs(req, ENROLL);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const { student_login, descriptors, consent, force } = req.body as {
    student_login?: string; descriptors?: unknown; consent?: boolean; force?: boolean;
  };
  if (!student_login) { res.status(400).json({ error: "student_login kerak" }); return; }
  if (consent !== true) {
    res.status(400).json({ error: "Ota-ona roziligi belgilanmagan — yuz ma'lumoti saqlanmaydi" });
    return;
  }
  if (!Array.isArray(descriptors) || descriptors.length < 1 || descriptors.length > 5 || !descriptors.every(isDescriptor)) {
    res.status(400).json({ error: "Yuz namunalari noto'g'ri (1–5 ta, har biri 128 son)" });
    return;
  }
  const student = await queryOne<{ full_name: string; class_name: string }>(
    "SELECT full_name, class_name FROM users WHERE login = $1",
    [student_login]
  );
  if (!student) { res.status(404).json({ error: "O'quvchi topilmadi" }); return; }
  if (!canTouchClass(u, student.class_name)) { res.status(403).json({ error: "Bu sinf sizga biriktirilmagan" }); return; }

  // Namunalarning o'zi bir-biriga mosmi (kadrda boshqa odam bo'lib qolmaganmi)
  const ds = descriptors as number[][];
  for (let i = 1; i < ds.length; i++) {
    if (dist(ds[0]!, ds[i]!) > 0.6) {
      res.status(422).json({ error: "Namunalar bir-biriga o'xshamadi — kadrda faqat bitta o'quvchi bo'lsin va qayta urinib ko'ring" });
      return;
    }
  }

  // Boshqa o'quvchiga juda o'xshashmi (xato odamni ro'yxatga olish / egizaklar)
  if (!force) {
    const others = await query<{ student_login: string; descriptors: number[][]; full_name: string; class_name: string }>(
      `SELECT fp.student_login, fp.descriptors, u.full_name, u.class_name
         FROM face_profiles fp JOIN users u ON u.login = fp.student_login
        WHERE fp.student_login <> $1 AND fp.consent`,
      [student_login]
    );
    let best: { name: string; class_name: string; d: number } | null = null;
    for (const o of others) {
      for (const od of o.descriptors ?? []) {
        if (!isDescriptor(od)) continue;
        for (const d of ds) {
          const v = dist(d, od);
          if (!best || v < best.d) best = { name: o.full_name, class_name: o.class_name, d: v };
        }
      }
    }
    if (best && best.d < 0.4) {
      res.status(409).json({
        error: "similar",
        similar: { name: best.name, class_name: best.class_name, distance: Number(best.d.toFixed(3)) },
      });
      return;
    }
  }

  const rounded = ds.map((d) => d.map((v) => Math.round(v * 1e5) / 1e5));
  await query(
    `INSERT INTO face_profiles (student_login, descriptors, consent, consent_by, enrolled_by, updated_at)
     VALUES ($1, $2, TRUE, $3, $3, NOW())
     ON CONFLICT (student_login) DO UPDATE SET
       descriptors = EXCLUDED.descriptors, consent = TRUE, consent_by = EXCLUDED.consent_by,
       enrolled_by = EXCLUDED.enrolled_by, updated_at = NOW()`,
    [student_login, JSON.stringify(rounded), String(u.login)]
  );
  res.json({ ok: true, name: student.full_name, samples: rounded.length });
});

// DELETE /api/faceid/enroll/:login — yuz ma'lumotini butunlay o'chirish
router.delete("/faceid/enroll/:login", async (req, res): Promise<void> => {
  const u = authAs(req, ENROLL);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const login = String(req.params["login"] ?? "");
  const student = await queryOne<{ class_name: string }>("SELECT class_name FROM users WHERE login = $1", [login]);
  if (student && !canTouchClass(u, student.class_name)) { res.status(403).json({ error: "Bu sinf sizga biriktirilmagan" }); return; }
  await query("DELETE FROM face_profiles WHERE student_login = $1", [login]);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════
//  KIOSK (eshikdagi telefon)
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/faceid/descriptors — kiosk uchun hamma yuz izlari (faqat rozilik bilan)
router.get("/faceid/descriptors", async (req, res): Promise<void> => {
  if (!authAs(req, MANAGE)) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const today = uzDateStr();
  const rows = await query<{ login: string; name: string; class_name: string; d: number[][]; arrived: string | null }>(
    `SELECT fp.student_login AS login, u.full_name AS name, u.class_name, fp.descriptors AS d,
            to_char(fc.checked_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS arrived
       FROM face_profiles fp
       JOIN users u ON u.login = fp.student_login
       LEFT JOIN face_checkins fc ON fc.student_login = fp.student_login AND fc.date = $1::date
      WHERE fp.consent`,
    [today]
  );
  const settings = await getSettings();
  res.setHeader("Cache-Control", "no-store");
  res.json({ date: today, settings, people: rows });
});

// POST /api/faceid/checkin { student_login, distance, device }
router.post("/faceid/checkin", async (req, res): Promise<void> => {
  const u = authAs(req, MANAGE);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const { student_login, distance, device } = req.body as { student_login?: string; distance?: number; device?: string };
  if (!student_login) { res.status(400).json({ error: "student_login kerak" }); return; }
  try {
    const st = await queryOne<{ full_name: string; class_name: string; telegram_id: number | null }>(
      "SELECT full_name, class_name, telegram_id FROM users WHERE login = $1",
      [student_login]
    );
    if (!st) { res.status(404).json({ error: "O'quvchi topilmadi" }); return; }

    const today = uzDateStr();
    const time = uzTime();
    const settings = await getSettings();
    const status = time > settings.late_after ? "late" : "present";

    const inserted = await queryOne<{ id: string }>(
      `INSERT INTO face_checkins (student_login, student_name, class_name, date, status, distance, device)
       VALUES ($1, $2, $3, $4::date, $5, $6, $7)
       ON CONFLICT (student_login, date) DO NOTHING RETURNING id`,
      [student_login, st.full_name, st.class_name, today, status, typeof distance === "number" ? distance : null, String(device ?? "").slice(0, 60)]
    );

    if (!inserted) {
      // Bugun allaqachon belgilangan
      const prev = await queryOne<{ time: string; status: string }>(
        `SELECT to_char(checked_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS time, status
           FROM face_checkins WHERE student_login = $1 AND date = $2::date`,
        [student_login, today]
      );
      res.json({ already: true, name: st.full_name, class_name: st.class_name, time: prev?.time ?? time, status: prev?.status ?? status });
      return;
    }

    // Davomatga yozamiz. O'qituvchi allaqachon belgilagan bo'lsa — faqat "kelmadi"ni to'g'rilaymiz.
    const cls = await queryOne<{ id: string }>("SELECT id FROM classes WHERE name = $1", [st.class_name]);
    await query(
      `INSERT INTO attendance (class_id, class_name, student_login, student_name, date, status, note, teacher_login)
       VALUES ($1, $2, $3, $4, $5::date, $6, $7, 'faceid')
       ON CONFLICT (student_login, date) DO UPDATE
         SET status = EXCLUDED.status, note = EXCLUDED.note, teacher_login = 'faceid'
         WHERE attendance.status = 'absent'`,
      [cls?.id ?? null, st.class_name, student_login, st.full_name, today, status, `Face ID ${time}`]
    ).catch((err) => logger.warn({ err }, "Face ID: davomatga yozilmadi"));

    res.json({ ok: true, name: st.full_name, class_name: st.class_name, time, status });

    if (settings.notify && isRealTelegramId(st.telegram_id)) {
      void notifyUser(
        st.telegram_id,
        status === "late"
          ? `⏰ Maktabga keldingiz: ${time} (kechikish, dars ${settings.late_after} da boshlanadi)`
          : `✅ Maktabga keldingiz: ${time}. Xayrli kun!`
      );
    }
  } catch (err) {
    logger.error({ err }, "faceid/checkin");
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

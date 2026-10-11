// ═══════════════════════════════════════════════════════════════════════════
//  FACE ID — maktabga kirishda yuz orqali davomat
//
//  • Yuzni tanish BRAUZERDA (telefon kamerasi) bajariladi — server faqat
//    128 sonli "yuz izi"ni (descriptor) saqlaydi. RASM SAQLANMAYDI.
//  • Ro'yxatga olish faqat ota-ona roziligi belgilangan holda.
//  • Kiosk (eshikdagi telefon) o'quvchini tanisa → KELDI yoki KETDI:
//    - bugun hali kelmagan → "keldi" / "kech qoldi" (davomatga yoziladi)
//    - kelganiga min_stay daqiqadan ko'p bo'lgan → "ketdi"
//      (dars jadvalidagi oxirgi darsidan oldin bo'lsa → "erta ketdi")
//    + o'quvchiga Telegram xabar.
// ═══════════════════════════════════════════════════════════════════════════

import { Router, type IRouter, type Request } from "express";
import { query, queryOne } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { getAuthUser, schoolOf } from "./auth.js";
import { notifyUser } from "../lib/notify.js";
import { isRealTelegramId, uzDateStr, uzHourMin, uzDay, sendToChat, sendDocumentToChat, esc, PERIOD_TIMES, getClassChats, getChatsByPurpose, sleep } from "../lib/tg-shared.js";

const router: IRouter = Router();

const MANAGE = ["admin", "director", "zam_direktor", "zavuch"];
const ENROLL = [...MANAGE, "sinf_rahbari", "boshlangich_oqituvchi"];
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
ALTER TABLE face_checkins ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;
ALTER TABLE face_checkins ADD COLUMN IF NOT EXISTS left_early BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE face_checkins ADD COLUMN IF NOT EXISTS excused BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE face_checkins ADD COLUMN IF NOT EXISTS excuse_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE face_checkins ADD COLUMN IF NOT EXISTS excused_by TEXT NOT NULL DEFAULT '';
ALTER TABLE face_checkins ADD COLUMN IF NOT EXISTS truant BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE face_checkins ALTER COLUMN checked_at DROP NOT NULL;
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
  notify: boolean; // o'quvchiga (ota-onasiga) shaxsiy Telegram xabar
  notify_group: boolean; // har bir o'quvchi kir/chiqishini O'Z SINF GURUHIGA darhol, alohida post qilish (vaqti bilan)
  threshold: number; // moslik chegarasi (kichik = qat'iyroq)
  min_stay: number; // kelganidan keyin necha daqiqadan so'ng skanerlash "ketdi" deb hisoblanadi
  default_end: string; // "13:30" — dars jadvali yo'q bo'lsa, darslar tugash vaqti (shundan oldin ketsa "erta")
  open_from: string; // "06:00" — Face ID shu vaqtdan boshlab ishlaydi
  close_after: string; // "14:30" — shu vaqtdan keyin Face ID yopiladi, kunlik faoliyat tugaydi
  late_until: string; // "10:00" — shu vaqtgacha kelsa "kech keldi" (lekin kelgan), keyin kelmagan hisoblanadi
  quarter_start: string; // "YYYY-MM-DD" — chorak boshlanishi (sababsiz dars soatlari shu sanadan hisoblanadi); bo'sh = avtomatik
}

const DEFAULT_SETTINGS: FaceSettings = {
  late_after: "08:00", notify: true, notify_group: true, threshold: 0.48, min_stay: 20, default_end: "13:30",
  open_from: "06:00", close_after: "14:30", late_until: "10:00", quarter_start: "",
};

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

// ── O'qituvchi/xodimlar Face ID uchun "Xodimlar" guruhi sifatida ko'rinadi ──
// (login baribir ID bilan; bu faqat eshikdagi davomat — keldi/ketdi uchun)
const STAFF_GROUP = "Xodimlar";

interface FacePerson { full_name: string; class_name: string; telegram_id: number | null; kind: "student" | "staff" }

/** Loginni avval o'quvchilardan (users), keyin xodimlardan (staff) qidiradi */
async function findPerson(login: string): Promise<FacePerson | null> {
  const u = await queryOne<{ full_name: string; class_name: string; telegram_id: number | null }>(
    "SELECT full_name, class_name, telegram_id FROM users WHERE login = $1",
    [login]
  );
  if (u) return { full_name: u.full_name, class_name: u.class_name, telegram_id: u.telegram_id, kind: "student" };
  const s = await queryOne<{ full_name: string; telegram_id: number | null }>(
    "SELECT full_name, telegram_id FROM staff WHERE login = $1",
    [login]
  );
  if (s) return { full_name: s.full_name, class_name: STAFF_GROUP, telegram_id: s.telegram_id, kind: "staff" };
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
//  BOSHQARUV SAHIFASI
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/faceid/overview — bugungi holat (sinflar kesimida)
router.get("/faceid/overview", async (req, res): Promise<void> => {
  const u = authAs(req, MANAGE);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const mid = schoolOf(u);
  try {
    const today = uzDateStr();
    const [settings, classes, recent, totals] = await Promise.all([
      getSettings(),
      mid !== null
        ? query<{ class_name: string; total: number; enrolled: number; arrived: number; late: number; left: number; early: number }>(
            `SELECT u.class_name,
                    COUNT(*)::int AS total,
                    COUNT(fp.student_login)::int AS enrolled,
                    COUNT(fc.checked_at)::int AS arrived,
                    COUNT(fc.checked_at) FILTER (WHERE fc.status = 'late')::int AS late,
                    COUNT(fc.left_at)::int AS left,
                    COUNT(fc.left_at) FILTER (WHERE fc.left_early)::int AS early
               FROM users u
               LEFT JOIN face_profiles fp ON fp.student_login = u.login AND fp.consent
               LEFT JOIN face_checkins fc ON fc.student_login = u.login AND fc.date = $1::date
              WHERE u.class_name <> '' AND u.maktab_id = $2
              GROUP BY u.class_name`,
            [today, mid]
          )
        : query<{ class_name: string; total: number; enrolled: number; arrived: number; late: number; left: number; early: number }>(
            `SELECT u.class_name,
                    COUNT(*)::int AS total,
                    COUNT(fp.student_login)::int AS enrolled,
                    COUNT(fc.checked_at)::int AS arrived,
                    COUNT(fc.checked_at) FILTER (WHERE fc.status = 'late')::int AS late,
                    COUNT(fc.left_at)::int AS left,
                    COUNT(fc.left_at) FILTER (WHERE fc.left_early)::int AS early
               FROM users u
               LEFT JOIN face_profiles fp ON fp.student_login = u.login AND fp.consent
               LEFT JOIN face_checkins fc ON fc.student_login = u.login AND fc.date = $1::date
              WHERE u.class_name <> ''
              GROUP BY u.class_name`,
            [today]
          ),
      mid !== null
        ? query<{ student_name: string; class_name: string; kind: string; status: string; time: string }>(
            `SELECT student_name, class_name, kind, status, to_char(at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS time
               FROM (
                 SELECT student_name, class_name, 'in' AS kind, status, checked_at AS at
                   FROM face_checkins WHERE date = $1::date AND checked_at IS NOT NULL AND maktab_id = $2
                 UNION ALL
                 SELECT student_name, class_name, 'out' AS kind,
                        CASE WHEN excused THEN 'excused' WHEN left_early THEN 'early' ELSE 'normal' END, left_at
                   FROM face_checkins WHERE date = $1::date AND left_at IS NOT NULL AND maktab_id = $2
               ) e
              ORDER BY at DESC LIMIT 25`,
            [today, mid]
          )
        : query<{ student_name: string; class_name: string; kind: string; status: string; time: string }>(
            `SELECT student_name, class_name, kind, status, to_char(at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS time
               FROM (
                 SELECT student_name, class_name, 'in' AS kind, status, checked_at AS at
                   FROM face_checkins WHERE date = $1::date AND checked_at IS NOT NULL
                 UNION ALL
                 SELECT student_name, class_name, 'out' AS kind,
                        CASE WHEN excused THEN 'excused' WHEN left_early THEN 'early' ELSE 'normal' END, left_at
                   FROM face_checkins WHERE date = $1::date AND left_at IS NOT NULL
               ) e
              ORDER BY at DESC LIMIT 25`,
            [today]
          ),
      mid !== null
        ? queryOne<{ students: number; enrolled: number }>(
            `SELECT (SELECT COUNT(*) FROM users WHERE maktab_id = $1)::int AS students,
                    (SELECT COUNT(*) FROM face_profiles WHERE consent AND maktab_id = $1)::int AS enrolled`,
            [mid]
          )
        : queryOne<{ students: number; enrolled: number }>(
            `SELECT (SELECT COUNT(*) FROM users)::int AS students,
                    (SELECT COUNT(*) FROM face_profiles WHERE consent)::int AS enrolled`
          ),
    ]);
    classes.sort((x, y) => x.class_name.localeCompare(y.class_name, "uz", { numeric: true }));
    // Xodimlar (o'qituvchilar) — eshik davomati bo'yicha alohida qator
    const staffAgg = mid !== null
      ? await queryOne<{ total: number; enrolled: number; arrived: number; late: number; left: number; early: number }>(
          `SELECT COUNT(*)::int AS total,
                  COUNT(fp.student_login) FILTER (WHERE fp.consent)::int AS enrolled,
                  COUNT(fc.checked_at)::int AS arrived,
                  COUNT(fc.checked_at) FILTER (WHERE fc.status = 'late')::int AS late,
                  COUNT(fc.left_at)::int AS left,
                  COUNT(fc.left_at) FILTER (WHERE fc.left_early)::int AS early
             FROM staff st
             LEFT JOIN face_profiles fp ON fp.student_login = st.login AND fp.consent
             LEFT JOIN face_checkins fc ON fc.student_login = st.login AND fc.date = $1::date
            WHERE st.maktab_id = $2`,
          [today, mid]
        ).catch(() => null)
      : await queryOne<{ total: number; enrolled: number; arrived: number; late: number; left: number; early: number }>(
          `SELECT COUNT(*)::int AS total,
                  COUNT(fp.student_login) FILTER (WHERE fp.consent)::int AS enrolled,
                  COUNT(fc.checked_at)::int AS arrived,
                  COUNT(fc.checked_at) FILTER (WHERE fc.status = 'late')::int AS late,
                  COUNT(fc.left_at)::int AS left,
                  COUNT(fc.left_at) FILTER (WHERE fc.left_early)::int AS early
             FROM staff st
             LEFT JOIN face_profiles fp ON fp.student_login = st.login AND fp.consent
             LEFT JOIN face_checkins fc ON fc.student_login = st.login AND fc.date = $1::date`,
          [today]
        ).catch(() => null);
    if (staffAgg && staffAgg.total > 0) classes.push({ class_name: STAFF_GROUP, ...staffAgg });
    const sum = (k: "arrived" | "late" | "left" | "early") => classes.reduce((acc, c) => acc + c[k], 0);
    res.json({
      date: today,
      time: uzTime(),
      settings,
      students: totals?.students ?? 0,
      enrolled: totals?.enrolled ?? 0,
      arrived: sum("arrived"),
      late: sum("late"),
      left: sum("left"),
      early: sum("early"),
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
    notify_group: typeof b.notify_group === "boolean" ? b.notify_group : cur.notify_group,
    threshold: typeof b.threshold === "number" && b.threshold >= 0.3 && b.threshold <= 0.65 ? b.threshold : cur.threshold,
    min_stay: typeof b.min_stay === "number" && b.min_stay >= 1 && b.min_stay <= 480 ? Math.round(b.min_stay) : cur.min_stay,
    default_end: typeof b.default_end === "string" && /^\d{2}:\d{2}$/.test(b.default_end) ? b.default_end : cur.default_end,
    open_from: typeof b.open_from === "string" && /^\d{2}:\d{2}$/.test(b.open_from) ? b.open_from : cur.open_from,
    close_after: typeof b.close_after === "string" && /^\d{2}:\d{2}$/.test(b.close_after) ? b.close_after : cur.close_after,
    late_until: typeof b.late_until === "string" && /^\d{2}:\d{2}$/.test(b.late_until) ? b.late_until : cur.late_until,
    quarter_start: typeof b.quarter_start === "string" && (/^\d{4}-\d{2}-\d{2}$/.test(b.quarter_start) || b.quarter_start === "") ? b.quarter_start : cur.quarter_start,
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
  const u = authAs(req, MANAGE);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const mid = schoolOf(u);
  try {
    const today = uzDateStr();
    const rows = mid !== null
      ? await query<{ class_name: string; full_name: string }>(
          `SELECT u.class_name, u.full_name FROM users u
            WHERE u.class_name <> '' AND u.maktab_id = $2
              AND NOT EXISTS (SELECT 1 FROM face_checkins fc
                               WHERE fc.student_login = u.login AND fc.date = $1::date AND fc.checked_at IS NOT NULL)
            ORDER BY u.class_name, u.full_name`,
          [today, mid]
        )
      : await query<{ class_name: string; full_name: string }>(
          `SELECT u.class_name, u.full_name FROM users u
            WHERE u.class_name <> ''
              AND NOT EXISTS (SELECT 1 FROM face_checkins fc
                               WHERE fc.student_login = u.login AND fc.date = $1::date AND fc.checked_at IS NOT NULL)
            ORDER BY u.class_name, u.full_name`,
          [today]
        );
    const byClass = new Map<string, string[]>();
    for (const r of rows) byClass.set(r.class_name, [...(byClass.get(r.class_name) ?? []), r.full_name]);

    let sent = 0;
    for (const [className, names] of byClass) {
      const heads = mid !== null
        ? await query<{ telegram_id: number }>(
            `SELECT s.telegram_id FROM staff s JOIN classes c ON c.id = s.class_id
              WHERE c.name = $1 AND s.telegram_id IS NOT NULL AND c.maktab_id = $2`,
            [className, mid]
          )
        : await query<{ telegram_id: number }>(
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

    // Direktorga va adminga umumiy xulosa (Face ID direktorga ham "ulangan")
    const summary =
      `🚪 <b>Face ID — bugungi umumiy holat</b> (${today.split("-").reverse().join(".")}, ${uzTime()})\n\n` +
      `Hali kelmaganlar: <b>${rows.length}</b> ta (${byClass.size} sinf)\n` +
      `Sinf rahbarlariga xabar yuborildi: ${sent} ta`;
    const dirs = mid !== null
      ? await query<{ telegram_id: number }>(
          "SELECT telegram_id FROM staff WHERE role = 'director' AND telegram_id IS NOT NULL AND maktab_id = $1",
          [mid]
        ).catch(() => [] as { telegram_id: number }[])
      : await query<{ telegram_id: number }>(
          "SELECT telegram_id FROM staff WHERE role = 'director' AND telegram_id IS NOT NULL"
        ).catch(() => [] as { telegram_id: number }[]);
    for (const dd of dirs) await sendToChat(dd.telegram_id, summary);
    const adminId = Number(process.env["ADMIN_ID"] ?? 0);
    if (isRealTelegramId(adminId)) await sendToChat(adminId, summary);

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
  const mid = schoolOf(u);
  // Xodimlar (o'qituvchilar) guruhi — faqat rahbariyat
  if (className === STAFF_GROUP) {
    const staffRows = mid !== null
      ? await query<{ login: string; full_name: string; enrolled: boolean; samples: number; updated_at: string | null }>(
          `SELECT s.login, s.full_name,
                  (fp.student_login IS NOT NULL AND fp.consent) AS enrolled,
                  COALESCE(jsonb_array_length(fp.descriptors), 0)::int AS samples,
                  fp.updated_at::text AS updated_at
             FROM staff s LEFT JOIN face_profiles fp ON fp.student_login = s.login
            WHERE s.maktab_id = $1
            ORDER BY s.full_name`,
          [mid]
        )
      : await query<{ login: string; full_name: string; enrolled: boolean; samples: number; updated_at: string | null }>(
          `SELECT s.login, s.full_name,
                  (fp.student_login IS NOT NULL AND fp.consent) AS enrolled,
                  COALESCE(jsonb_array_length(fp.descriptors), 0)::int AS samples,
                  fp.updated_at::text AS updated_at
             FROM staff s LEFT JOIN face_profiles fp ON fp.student_login = s.login
            ORDER BY s.full_name`
        );
    res.json(staffRows);
    return;
  }
  const rows = mid !== null
    ? await query<{ login: string; full_name: string; enrolled: boolean; samples: number; updated_at: string | null }>(
        `SELECT u.login, u.full_name,
                (fp.student_login IS NOT NULL AND fp.consent) AS enrolled,
                COALESCE(jsonb_array_length(fp.descriptors), 0)::int AS samples,
                fp.updated_at::text AS updated_at
           FROM users u LEFT JOIN face_profiles fp ON fp.student_login = u.login
          WHERE u.class_name = $1 AND u.maktab_id = $2 ORDER BY u.full_name`,
        [className, mid]
      )
    : await query<{ login: string; full_name: string; enrolled: boolean; samples: number; updated_at: string | null }>(
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
  const mid = schoolOf(u);
  const rows = mid !== null
    ? await query<{ class_name: string; total: number; enrolled: number }>(
        `SELECT u.class_name, COUNT(*)::int AS total, COUNT(fp.student_login) FILTER (WHERE fp.consent)::int AS enrolled
           FROM users u LEFT JOIN face_profiles fp ON fp.student_login = u.login
          WHERE u.class_name <> '' AND u.maktab_id = $1 GROUP BY u.class_name`,
        [mid]
      )
    : await query<{ class_name: string; total: number; enrolled: number }>(
        `SELECT u.class_name, COUNT(*)::int AS total, COUNT(fp.student_login) FILTER (WHERE fp.consent)::int AS enrolled
           FROM users u LEFT JOIN face_profiles fp ON fp.student_login = u.login
          WHERE u.class_name <> '' GROUP BY u.class_name`
      );
  const list = rows
    .filter((r) => canTouchClass(u, r.class_name))
    .sort((a, b) => a.class_name.localeCompare(b.class_name, "uz", { numeric: true }));
  // Xodimlar (o'qituvchilar) guruhini oxiriga qo'shamiz — faqat rahbariyat uchun
  if (MANAGE.includes(u.role)) {
    const s = mid !== null
      ? await queryOne<{ total: number; enrolled: number }>(
          `SELECT COUNT(*)::int AS total,
                  COUNT(fp.student_login) FILTER (WHERE fp.consent)::int AS enrolled
             FROM staff st LEFT JOIN face_profiles fp ON fp.student_login = st.login
            WHERE st.maktab_id = $1`,
          [mid]
        )
      : await queryOne<{ total: number; enrolled: number }>(
          `SELECT COUNT(*)::int AS total,
                  COUNT(fp.student_login) FILTER (WHERE fp.consent)::int AS enrolled
             FROM staff st LEFT JOIN face_profiles fp ON fp.student_login = st.login`
        );
    if (s && s.total > 0) list.push({ class_name: STAFF_GROUP, total: s.total, enrolled: s.enrolled });
  }
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
  if (!Array.isArray(descriptors) || descriptors.length < 1 || descriptors.length > 8 || !descriptors.every(isDescriptor)) {
    res.status(400).json({ error: "Yuz namunalari noto'g'ri (1–8 ta, har biri 128 son)" });
    return;
  }
  const student = await findPerson(student_login);
  if (!student) { res.status(404).json({ error: "Foydalanuvchi topilmadi" }); return; }
  if (!canTouchClass(u, student.class_name)) { res.status(403).json({ error: "Bu sizga biriktirilmagan" }); return; }
  const mid = schoolOf(u);

  // Namunalarning o'zi bir-biriga mosmi (kadrda boshqa odam bo'lib qolmaganmi).
  // Namunalar turli burchakdan (to'g'ri → yon) olinadi, shuning uchun "zanjir" tekshiruvi:
  // har bir yangi namuna oldingilaridan biriga yaqin, va to'g'ri qarangan namunadan juda uzoq emas.
  const ds = descriptors as number[][];
  for (let i = 1; i < ds.length; i++) {
    let near = Infinity;
    for (let j = 0; j < i; j++) near = Math.min(near, dist(ds[j]!, ds[i]!));
    if (near > 0.65 || dist(ds[0]!, ds[i]!) > 0.9) {
      res.status(422).json({ error: "Namunalar bir-biriga o'xshamadi — kadrda faqat bitta o'quvchi bo'lsin va qayta urinib ko'ring" });
      return;
    }
  }

  // Boshqa o'quvchiga juda o'xshashmi (xato odamni ro'yxatga olish / egizaklar).
  // Faqat to'g'ri va biroz burilgan (birinchi 3 ta) namunalar solishtiriladi — yon namunalar
  // har xil odamlarda ham bir-biriga yaqinroq bo'ladi va keraksiz ogohlantirish beradi.
  if (!force) {
    const front = ds.slice(0, 3);
    const others = mid !== null
      ? await query<{ student_login: string; descriptors: number[][]; full_name: string; class_name: string }>(
          `SELECT fp.student_login, fp.descriptors, u.full_name, u.class_name
             FROM face_profiles fp JOIN users u ON u.login = fp.student_login
            WHERE fp.student_login <> $1 AND fp.consent AND fp.maktab_id = $2`,
          [student_login, mid]
        )
      : await query<{ student_login: string; descriptors: number[][]; full_name: string; class_name: string }>(
          `SELECT fp.student_login, fp.descriptors, u.full_name, u.class_name
             FROM face_profiles fp JOIN users u ON u.login = fp.student_login
            WHERE fp.student_login <> $1 AND fp.consent`,
          [student_login]
        );
    let best: { name: string; class_name: string; d: number } | null = null;
    for (const o of others) {
      for (const od of (o.descriptors ?? []).slice(0, 3)) {
        if (!isDescriptor(od)) continue;
        for (const d of front) {
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
    `INSERT INTO face_profiles (student_login, descriptors, consent, consent_by, enrolled_by, updated_at, maktab_id)
     VALUES ($1, $2, TRUE, $3, $3, NOW(), $4)
     ON CONFLICT (student_login) DO UPDATE SET
       descriptors = EXCLUDED.descriptors, consent = TRUE, consent_by = EXCLUDED.consent_by,
       enrolled_by = EXCLUDED.enrolled_by, updated_at = NOW()`,
    [student_login, JSON.stringify(rounded), String(u.login), mid ?? 3]
  );
  res.json({ ok: true, name: student.full_name, samples: rounded.length });
});

// DELETE /api/faceid/enroll/:login — yuz ma'lumotini butunlay o'chirish
router.delete("/faceid/enroll/:login", async (req, res): Promise<void> => {
  const u = authAs(req, ENROLL);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const login = String(req.params["login"] ?? "");
  const person = await findPerson(login);
  if (person && !canTouchClass(u, person.class_name)) { res.status(403).json({ error: "Bu sizga biriktirilmagan" }); return; }
  await query("DELETE FROM face_profiles WHERE student_login = $1", [login]);
  res.json({ ok: true });
});

// POST /api/faceid/reset — HAMMA yuz ma'lumotlarini o'chirish (faqat admin)
// Eski (3 namunali) ro'yxatdan o'tganlarni tozalash uchun — keyin yangi 7 burchak bilan qayta olinadi.
router.post("/faceid/reset", async (req, res): Promise<void> => {
  if (!authAs(req, ["admin"])) { res.status(403).json({ error: "Faqat admin" }); return; }
  const rows = await query<{ student_login: string }>("DELETE FROM face_profiles RETURNING student_login");
  logger.info({ deleted: rows.length }, "Face ID: hamma yuz ma'lumoti o'chirildi");
  res.json({ ok: true, deleted: rows.length });
});

// ═══════════════════════════════════════════════════════════════════════════
//  KIOSK (eshikdagi telefon)
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/faceid/descriptors — kiosk uchun hamma yuz izlari (faqat rozilik bilan) + bugungi holat
router.get("/faceid/descriptors", async (req, res): Promise<void> => {
  const au = authAs(req, MANAGE);
  if (!au) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const mid = schoolOf(au);
  const today = uzDateStr();
  const rows = mid !== null
    ? await query<{
        login: string; name: string; class_name: string; d: number[][];
        arrived: string | null; arrived_ms: number | null; left: string | null;
      }>(
        `SELECT fp.student_login AS login,
                COALESCE(u.full_name, s.full_name) AS name,
                COALESCE(NULLIF(u.class_name, ''), '${STAFF_GROUP}') AS class_name,
                fp.descriptors AS d,
                to_char(fc.checked_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS arrived,
                (EXTRACT(EPOCH FROM fc.checked_at) * 1000)::float8 AS arrived_ms,
                to_char(fc.left_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS left
           FROM face_profiles fp
           LEFT JOIN users u ON u.login = fp.student_login
           LEFT JOIN staff s ON s.login = fp.student_login
           LEFT JOIN face_checkins fc ON fc.student_login = fp.student_login AND fc.date = $1::date
          WHERE fp.consent AND (u.login IS NOT NULL OR s.login IS NOT NULL) AND fp.maktab_id = $2`,
        [today, mid]
      )
    : await query<{
        login: string; name: string; class_name: string; d: number[][];
        arrived: string | null; arrived_ms: number | null; left: string | null;
      }>(
        `SELECT fp.student_login AS login,
                COALESCE(u.full_name, s.full_name) AS name,
                COALESCE(NULLIF(u.class_name, ''), '${STAFF_GROUP}') AS class_name,
                fp.descriptors AS d,
                to_char(fc.checked_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS arrived,
                (EXTRACT(EPOCH FROM fc.checked_at) * 1000)::float8 AS arrived_ms,
                to_char(fc.left_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS left
           FROM face_profiles fp
           LEFT JOIN users u ON u.login = fp.student_login
           LEFT JOIN staff s ON s.login = fp.student_login
           LEFT JOIN face_checkins fc ON fc.student_login = fp.student_login AND fc.date = $1::date
          WHERE fp.consent AND (u.login IS NOT NULL OR s.login IS NOT NULL)`,
        [today]
      );
  const [settings, starts] = await Promise.all([getSettings(), classStarts()]);
  res.setHeader("Cache-Control", "no-store");
  res.json({ date: today, now: Date.now(), settings, starts, people: rows });
});

/** Bugun har bir sinfning birinchi darsi boshlanish vaqti — kechikish shundan hisoblanadi (2 smena uchun ham) */
async function classStarts(): Promise<Record<string, string>> {
  const day = uzDay();
  if (day === 0) return {};
  const rows = await query<{ class_name: string; p: number }>(
    `SELECT c.name AS class_name, MIN(t.period)::int AS p FROM timetable t JOIN classes c ON c.id = t.class_id
      WHERE t.day_of_week = $1 GROUP BY c.name`,
    [day]
  ).catch(() => [] as { class_name: string; p: number }[]);
  const out: Record<string, string> = {};
  for (const r of rows) {
    const start = PERIOD_TIMES[r.p]?.split("–")[0];
    if (start) out[r.class_name] = start;
  }
  return out;
}

/** Sinfning bugungi oxirgi darsi tugash vaqti (dars jadvalidan), masalan "13:30".
 *  Jadval bo'lmasa — standart (default_end, odatda "13:30"). */
async function lessonsEnd(className: string, fallback: string): Promise<string | null> {
  const day = uzDay();
  if (day === 0) return fallback; // yakshanba — jadval yo'q, standart
  const r = await queryOne<{ p: number | null }>(
    `SELECT MAX(t.period)::int AS p FROM timetable t JOIN classes c ON c.id = t.class_id
      WHERE c.name = $1 AND t.day_of_week = $2`,
    [className, day]
  ).catch(() => null);
  const range = r?.p ? PERIOD_TIMES[r.p] : undefined;
  const end = range ? range.split("–")[1] : undefined;
  return end ?? fallback; // jadval topilmasa — standart vaqt
}

type ScanMode = "auto" | "in" | "out";
type ScanResult = {
  event: "in" | "out" | "already_in" | "already_out" | "closed";
  name: string;
  class_name: string;
  time: string;
  status?: string; // in: present | late
  early?: boolean; // out: dars tugashidan oldin
  arrived?: string | null;
  lessons_end?: string | null;
  reason?: "before" | "after"; // closed: hali boshlanmagan | kun tugagan
};

/**
 * Bitta o'quvchining kir/chiqishini O'Z SINF GURUHIGA darhol, alohida xabar qilib
 * yuboradi (vaqti bilan). Faqat o'quvchilar uchun — xodimlar (kind="staff") o'tkazib
 * yuboriladi. Sinf guruhi ulanmagan bo'lsa — jim o'tadi. Fire-and-forget (javobni
 * kutmaydi), shuning uchun kiosk tez ishlayveradi.
 */
async function postClassGroup(
  st: FacePerson,
  mid: number | null,
  kind: "in" | "out",
  time: string,
  flags: { late?: boolean; early?: boolean; excused?: boolean } = {}
): Promise<void> {
  if (st.kind !== "student" || !st.class_name) return;
  const cls = mid !== null
    ? await queryOne<{ id: string }>("SELECT id FROM classes WHERE name = $1 AND maktab_id = $2", [st.class_name, mid])
    : await queryOne<{ id: string }>("SELECT id FROM classes WHERE name = $1", [st.class_name]);
  if (!cls) return;
  const chats = await getClassChats(cls.id);
  if (chats.length === 0) return;
  const text = kind === "in"
    ? `${flags.late ? "⏰" : "✅"} <b>${esc(st.full_name)}</b> maktabga keldi — <b>${time}</b>${flags.late ? " (kech qoldi)" : ""}`
    : `🏠 <b>${esc(st.full_name)}</b> maktabdan ketdi — <b>${time}</b>${flags.excused ? " (ruxsat bilan)" : flags.early ? " (erta)" : ""}`;
  for (const ch of chats) {
    await sendToChat(ch.chat_id, text);
    await sleep(50);
  }
}

/**
 * Sinf guruhiga: o'quvchi bugun sababli kela olmasligi — darhol, kim belgilaganini
 * ko'rsatib. Fire-and-forget. Faqat o'quvchilar uchun.
 */
async function postClassGroupExcused(
  st: FacePerson,
  mid: number | null,
  reason: string,
  by: string
): Promise<void> {
  if (st.kind !== "student" || !st.class_name) return;
  const cls = mid !== null
    ? await queryOne<{ id: string }>("SELECT id FROM classes WHERE name = $1 AND maktab_id = $2", [st.class_name, mid])
    : await queryOne<{ id: string }>("SELECT id FROM classes WHERE name = $1", [st.class_name]);
  if (!cls) return;
  const chats = await getClassChats(cls.id);
  if (chats.length === 0) return;
  const text =
    `📝 <b>${esc(st.full_name)}</b> bugun maktabga kela olmaydi (sababli)` +
    (reason ? `\n📌 Sabab: ${esc(reason)}` : "") +
    `\n👤 Belgiladi: ${esc(by)} · ${uzTime()}`;
  for (const ch of chats) {
    await sendToChat(ch.chat_id, text);
    await sleep(50);
  }
}

async function handleScan(
  login: string,
  mode: ScanMode,
  distance: number | null,
  device: string,
  mid: number | null
): Promise<ScanResult | null> {
  const st = await findPerson(login);
  if (!st) return null;

  const today = uzDateStr();
  const time = uzTime();
  const settings = await getSettings();

  // ── Kunlik oyna: 06:00 dan oldin — hali ochilmagan; 14:30 dan keyin — yopilgan.
  // Xodimlar (o'qituvchi) uchun cheklov yo'q — ular istalgan vaqt kirib chiqishi mumkin.
  if (st.kind === "student") {
    if (time < settings.open_from) return { name: st.full_name, class_name: st.class_name, event: "closed", time, reason: "before" };
    if (time > settings.close_after) return { name: st.full_name, class_name: st.class_name, event: "closed", time, reason: "after" };
  }
  const row = await queryOne<{ arrived: string | null; arrived_ms: number | null; left: string | null; left_ms: number | null; status: string }>(
    `SELECT to_char(checked_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS arrived,
            (EXTRACT(EPOCH FROM checked_at) * 1000)::float8 AS arrived_ms,
            to_char(left_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS left,
            (EXTRACT(EPOCH FROM left_at) * 1000)::float8 AS left_ms,
            status
       FROM face_checkins WHERE student_login = $1 AND date = $2::date`,
    [login, today]
  );
  const base = { name: st.full_name, class_name: st.class_name };
  const minStayMs = settings.min_stay * 60_000;

  // ── Qaror: keldi yoki ketdi
  let action: "in" | "out";
  if (mode === "in") {
    if (row?.arrived) return { ...base, event: "already_in", time: row.arrived, status: row.status };
    action = "in";
  } else if (mode === "out") {
    if (row?.left_ms && Date.now() - row.left_ms < 10 * 60_000) return { ...base, event: "already_out", time: row.left ?? time };
    action = "out";
  } else if (!row?.arrived) {
    action = "in";
  } else if (row.left) {
    return { ...base, event: "already_out", time: row.left };
  } else if (row.arrived_ms && Date.now() - row.arrived_ms < minStayMs) {
    return { ...base, event: "already_in", time: row.arrived, status: row.status };
  } else {
    action = "out";
  }

  if (action === "in") {
    const startsAt = (await classStarts())[st.class_name] ?? settings.late_after;
    const status = time > startsAt ? "late" : "present";
    await query(
      `INSERT INTO face_checkins (student_login, student_name, class_name, date, checked_at, status, distance, device, maktab_id)
       VALUES ($1, $2, $3, $4::date, NOW(), $5, $6, $7, $8)
       ON CONFLICT (student_login, date) DO UPDATE SET
         checked_at = COALESCE(face_checkins.checked_at, EXCLUDED.checked_at),
         status = CASE WHEN face_checkins.checked_at IS NULL THEN EXCLUDED.status ELSE face_checkins.status END`,
      [login, st.full_name, st.class_name, today, status, distance, device, mid ?? 3]
    );
    // Davomat (sinf jurnali) faqat O'QUVCHILAR uchun. Xodimlar (o'qituvchi) —
    // faqat eshik davomati (face_checkins), sinf jurnaliga yozilmaydi.
    if (st.kind === "student") {
      const cls = await queryOne<{ id: string }>("SELECT id FROM classes WHERE name = $1", [st.class_name]);
      await query(
        `INSERT INTO attendance (class_id, class_name, student_login, student_name, date, status, note, teacher_login, maktab_id)
         VALUES ($1, $2, $3, $4, $5::date, $6, $7, 'faceid', $8)
         ON CONFLICT (student_login, date) DO UPDATE
           SET status = EXCLUDED.status, note = EXCLUDED.note, teacher_login = 'faceid'
           WHERE attendance.status = 'absent'`,
        [cls?.id ?? null, st.class_name, login, st.full_name, today, status, `Face ID: keldi ${time}`, mid ?? 3]
      ).catch((err) => logger.warn({ err }, "Face ID: davomatga yozilmadi"));
    }

    if (settings.notify && isRealTelegramId(st.telegram_id)) {
      void notifyUser(
        st.telegram_id,
        status === "late"
          ? `⏰ Maktabga keldingiz: ${time} (kechikish — dars ${startsAt} da boshlanadi)`
          : `✅ Maktabga keldingiz: ${time}. Xayrli kun!`
      );
    }
    if (settings.notify_group) void postClassGroup(st, mid, "in", time, { late: status === "late" });
    return { ...base, event: "in", time, status };
  }

  // action === "out"
  const end = await lessonsEnd(st.class_name, settings.default_end);
  const early = !!end && time < end;
  await query(
    `INSERT INTO face_checkins (student_login, student_name, class_name, date, checked_at, status, distance, device, left_at, left_early, maktab_id)
     VALUES ($1, $2, $3, $4::date, NULL, 'present', $5, $6, NOW(), $7, $8)
     ON CONFLICT (student_login, date) DO UPDATE SET left_at = NOW(), left_early = EXCLUDED.left_early`,
    [login, st.full_name, st.class_name, today, distance, device, early, mid ?? 3]
  );
  if (st.kind === "student") {
    await query(
      `UPDATE attendance SET note = CASE WHEN note = '' THEN $1 ELSE note || ' · ' || $1 END
        WHERE student_login = $2 AND date = $3::date`,
      [`ketdi ${time}${early ? " (erta)" : ""}`, login, today]
    ).catch(() => {});
  }

  if (settings.notify && isRealTelegramId(st.telegram_id)) {
    void notifyUser(st.telegram_id, `🏠 Maktabdan chiqdingiz: ${time}${early ? ` (darslar ${end} da tugaydi)` : ""}. Yaxshi dam oling!`);
  }
  if (settings.notify_group) void postClassGroup(st, mid, "out", time, { early });
  return { ...base, event: "out", time, early, arrived: row?.arrived ?? null, lessons_end: end };
}

// POST /api/faceid/scan { student_login, mode: "auto" | "in" | "out", distance, device }
router.post("/faceid/scan", async (req, res): Promise<void> => {
  const au = authAs(req, MANAGE);
  if (!au) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const mid = schoolOf(au);
  const { student_login, mode, distance, device } = req.body as { student_login?: string; mode?: string; distance?: number; device?: string };
  if (!student_login) { res.status(400).json({ error: "student_login kerak" }); return; }
  const m: ScanMode = mode === "in" || mode === "out" ? mode : "auto";
  try {
    const r = await handleScan(student_login, m, typeof distance === "number" ? distance : null, String(device ?? "").slice(0, 60), mid);
    if (!r) { res.status(404).json({ error: "O'quvchi topilmadi" }); return; }
    res.json(r);
  } catch (err) {
    logger.error({ err }, "faceid/scan");
    res.status(500).json({ error: (err as Error).message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  QO'LDA TO'G'RILASH (bugungi keldi/ketdi)
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/faceid/today?class_name= — bir sinf (yoki "Xodimlar") uchun bugungi holat
router.get("/faceid/today", async (req, res): Promise<void> => {
  const u = authAs(req, ENROLL);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const className = String(req.query["class_name"] ?? "");
  if (!className) { res.status(400).json({ error: "class_name kerak" }); return; }
  if (!canTouchClass(u, className)) { res.status(403).json({ error: "Bu sizga biriktirilmagan" }); return; }
  const today = uzDateStr();
  const mid = schoolOf(u);
  const isStaff = className === STAFF_GROUP;
  const where = isStaff
    ? (mid !== null ? "WHERE s.maktab_id = $2" : "")
    : (mid !== null ? "WHERE s.class_name = $2 AND s.maktab_id = $3" : "WHERE s.class_name = $2");
  const params: unknown[] = isStaff
    ? (mid !== null ? [today, mid] : [today])
    : (mid !== null ? [today, className, mid] : [today, className]);
  const sql =
    `SELECT s.login, s.full_name,
            to_char(fc.checked_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS arrived,
            fc.status,
            to_char(fc.left_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS "left",
            COALESCE(fc.left_early, false) AS early,
            COALESCE(fc.excused, false) AS excused
       FROM ${isStaff ? "staff" : "users"} s
       LEFT JOIN face_checkins fc ON fc.student_login = s.login AND fc.date = $1::date
      ${where}
      ORDER BY s.full_name`;
  const rows = await query(sql, params);
  res.json(rows);
});

// POST /api/faceid/manual { student_login, action: "in"|"out"|"out_excused"|"clear", time?: "HH:MM" }
router.post("/faceid/manual", async (req, res): Promise<void> => {
  const u = authAs(req, ENROLL);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const { student_login, action, time, reason } = req.body as { student_login?: string; action?: string; time?: string; reason?: string };
  if (!student_login || !["in", "out", "out_excused", "clear", "absent_excused"].includes(String(action))) {
    res.status(400).json({ error: "Noto'g'ri so'rov" }); return;
  }
  const person = await findPerson(student_login);
  if (!person) { res.status(404).json({ error: "Topilmadi" }); return; }
  if (!canTouchClass(u, person.class_name)) { res.status(403).json({ error: "Bu sizga biriktirilmagan" }); return; }
  const mid = schoolOf(u);
  const byName = String(u.full_name ?? u.login ?? "O'qituvchi").trim();
  const excuseReason = String(reason ?? "").trim().slice(0, 300);

  const today = uzDateStr();
  const settings = await getSettings();
  const t = typeof time === "string" && /^\d{2}:\d{2}$/.test(time) ? time : null;
  const ts = t ? `${today}T${t}:00+05:00` : null; // O'zbekiston = UTC+5
  const shownTime = t ?? uzTime();

  if (action === "clear") {
    await query("DELETE FROM face_checkins WHERE student_login = $1 AND date = $2::date", [student_login, today]);
    res.json({ ok: true });
    return;
  }

  // Sababli kelmagan (ruxsat bilan yo'q) — "sababsizlar" ro'yxatidan chiqadi.
  // Sabab va kim belgilagani saqlanadi; sinf guruhiga va o'quvchiga darhol xabar.
  if (action === "absent_excused") {
    await query(
      `INSERT INTO face_checkins (student_login, student_name, class_name, date, checked_at, status, device, excused, excuse_reason, excused_by, maktab_id)
       VALUES ($1, $2, $3, $4::date, NULL, 'excused', 'manual', TRUE, $5, $6, $7)
       ON CONFLICT (student_login, date) DO UPDATE SET
         excused = TRUE, status = 'excused', student_name = EXCLUDED.student_name,
         excuse_reason = EXCLUDED.excuse_reason, excused_by = EXCLUDED.excused_by`,
      [student_login, person.full_name, person.class_name, today, excuseReason, byName, mid ?? 3]
    );
    if (person.kind === "student") {
      void postClassGroupExcused(person, mid, excuseReason, byName);
      if (isRealTelegramId(person.telegram_id)) {
        void notifyUser(
          person.telegram_id,
          `📝 Bugun siz sababli (ruxsat bilan) deb belgilandingiz${excuseReason ? ` — ${excuseReason}` : ""}.\n👤 ${byName}`
        );
      }
    }
    res.json({ ok: true, excused: true, reason: excuseReason, by: byName });
    return;
  }

  if (action === "in") {
    const startsAt = person.kind === "student" ? ((await classStarts())[person.class_name] ?? settings.late_after) : settings.late_after;
    const status = shownTime > startsAt ? "late" : "present";
    await query(
      `INSERT INTO face_checkins (student_login, student_name, class_name, date, checked_at, status, device, maktab_id)
       VALUES ($1, $2, $3, $4::date, COALESCE($5::timestamptz, NOW()), $6, 'manual', $7)
       ON CONFLICT (student_login, date) DO UPDATE SET
         checked_at = COALESCE($5::timestamptz, NOW()), status = $6, student_name = EXCLUDED.student_name`,
      [student_login, person.full_name, person.class_name, today, ts, status, mid ?? 3]
    );
    if (settings.notify_group && person.kind === "student") void postClassGroup(person, mid, "in", shownTime, { late: status === "late" });
    res.json({ ok: true, status });
    return;
  }

  // out yoki out_excused
  const excused = action === "out_excused";
  const end = await lessonsEnd(person.class_name, settings.default_end);
  const early = !!end && shownTime < end;
  await query(
    `INSERT INTO face_checkins (student_login, student_name, class_name, date, checked_at, status, device, left_at, left_early, excused, maktab_id)
     VALUES ($1, $2, $3, $4::date, NULL, 'present', 'manual', COALESCE($5::timestamptz, NOW()), $6, $7, $8)
     ON CONFLICT (student_login, date) DO UPDATE SET
       left_at = COALESCE($5::timestamptz, NOW()), left_early = $6, excused = $7`,
    [student_login, person.full_name, person.class_name, today, ts, early, excused, mid ?? 3]
  );
  if (settings.notify_group && person.kind === "student") void postClassGroup(person, mid, "out", shownTime, { early, excused });
  res.json({ ok: true, early, excused, lessons_end: end });
});

// POST /api/faceid/checkin — eski versiya bilan moslik (faqat "keldi")
router.post("/faceid/checkin", async (req, res): Promise<void> => {
  const au = authAs(req, MANAGE);
  if (!au) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const mid = schoolOf(au);
  const { student_login, distance, device } = req.body as { student_login?: string; distance?: number; device?: string };
  if (!student_login) { res.status(400).json({ error: "student_login kerak" }); return; }
  try {
    const r = await handleScan(student_login, "in", typeof distance === "number" ? distance : null, String(device ?? "").slice(0, 60), mid);
    if (!r) { res.status(404).json({ error: "O'quvchi topilmadi" }); return; }
    res.json({ ...r, ok: r.event === "in", already: r.event === "already_in" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Bir sinfdagi har bir o'quvchining bugungi holati ───────────────────────
type StudentState = "present" | "late" | "excused" | "unexcused";
interface RosterRow { full_name: string; state: StudentState; reason: string }
async function classRoster(className: string, today: string): Promise<RosterRow[]> {
  const rows = await query<{ full_name: string; arrived: boolean; status: string; excused: boolean; reason: string }>(
    `SELECT u.full_name,
            (fc.checked_at IS NOT NULL) AS arrived,
            COALESCE(fc.status, '') AS status,
            COALESCE(fc.excused, false) AS excused,
            COALESCE(fc.excuse_reason, '') AS reason
       FROM users u
       LEFT JOIN face_checkins fc ON fc.student_login = u.login AND fc.date = $2::date
      WHERE u.class_name = $1
      ORDER BY u.full_name`,
    [className, today]
  );
  return rows.map((r) => ({
    full_name: r.full_name,
    reason: r.reason,
    state: r.arrived ? (r.status === "late" ? "late" : "present") : r.excused ? "excused" : "unexcused",
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
//  08:00 — MAKTAB GURUHIGA: shu paytgacha kelganlar soni (qisqa snapshot)
// ═══════════════════════════════════════════════════════════════════════════
export async function faceidArrivedCount(): Promise<{ sent: number; arrived: number; total: number }> {
  const today = uzDateStr();
  const dateStr = today.split("-").reverse().join(".");
  const agg = await queryOne<{ total: number; arrived: number; late: number }>(
    `SELECT COUNT(*)::int AS total,
            COUNT(fc.checked_at)::int AS arrived,
            COUNT(fc.checked_at) FILTER (WHERE fc.status = 'late')::int AS late
       FROM users u LEFT JOIN face_checkins fc ON fc.student_login = u.login AND fc.date = $1::date
      WHERE u.class_name <> ''`,
    [today]
  );
  const total = agg?.total ?? 0, arrived = agg?.arrived ?? 0, late = agg?.late ?? 0;
  const schoolChats = await getChatsByPurpose("school");
  let sent = 0;
  const text =
    `🏫 <b>Maktab — darslar boshlandi (08:00)</b> (${dateStr})\n\n` +
    `✅ Hozirgacha kelganlar: <b>${arrived}</b>/${total}` +
    (late ? `\n⏰ Shundan kech kelganlar: ${late}` : "") +
    `\n\n<i>To'liq ro'yxat (kech/sababli/sababsiz) soat 10:00 da chiqadi.</i>`;
  for (const ch of schoolChats) { if (await sendToChat(ch.chat_id, text)) sent++; await sleep(80); }
  return { sent, arrived, total };
}

// ═══════════════════════════════════════════════════════════════════════════
//  10:00 — TO'LIQ KUNLIK XULOSA
//   • Har bir SINF GURUHIGA: keldi/kech + sababli ro'yxat + sababsiz ro'yxat
//   • MAKTAB GURUHIGA: umumiy sonlar + sababli va sababsizlar ro'yxati (sinflar kesimida)
//  Har bir o'quvchiga (ota-onasiga) alohida xabar handleScan ichida darhol boradi.
// ═══════════════════════════════════════════════════════════════════════════
export async function faceidGroupSummary(): Promise<{ classes: number; sent: number }> {
  const today = uzDateStr();
  const dateStr = today.split("-").reverse().join(".");
  const classes = await query<{ id: string; name: string }>("SELECT id, name FROM classes WHERE name <> '' ORDER BY name");
  let sent = 0, done = 0;
  let sTotal = 0, sArrived = 0, sLate = 0, sExcused = 0, sUnexcused = 0;
  const schoolExcused: string[] = [];   // "7-A — Ism F. (sabab)"
  const schoolUnexcused: string[] = []; // "7-A — Ism F."

  for (const c of classes) {
    const roster = await classRoster(c.name, today);
    if (roster.length === 0) continue;
    const present = roster.filter((r) => r.state === "present");
    const late = roster.filter((r) => r.state === "late");
    const excused = roster.filter((r) => r.state === "excused");
    const unexcused = roster.filter((r) => r.state === "unexcused");
    sTotal += roster.length; sArrived += present.length + late.length;
    sLate += late.length; sExcused += excused.length; sUnexcused += unexcused.length;
    for (const e of excused) schoolExcused.push(`${c.name} — ${e.full_name}${e.reason ? ` (${e.reason})` : ""}`);
    for (const e of unexcused) schoolUnexcused.push(`${c.name} — ${e.full_name}`);

    const chats = await getClassChats(c.id);
    if (chats.length === 0) continue;
    const lines: string[] = [
      `🚪 <b>${esc(c.name)} — bugungi davomat</b> (${dateStr}, soat ${uzTime()})`,
      ``,
      `✅ Keldi: <b>${present.length + late.length}</b>/${roster.length}` + (late.length ? ` · ⏰ kech: ${late.length}` : ""),
    ];
    if (excused.length) {
      lines.push(``, `📝 <b>Sababli kelmaganlar (${excused.length}):</b>`);
      excused.slice(0, 60).forEach((e, i) => lines.push(`${i + 1}. ${esc(e.full_name)}${e.reason ? ` — ${esc(e.reason)}` : ""}`));
    }
    if (unexcused.length) {
      lines.push(``, `⛔️ <b>Sababsiz kelmaganlar (${unexcused.length}):</b>`);
      unexcused.slice(0, 80).forEach((e, i) => lines.push(`${i + 1}. ${esc(e.full_name)}`));
      lines.push(``, `<i>Sababli bo'lsa — platformada "Sababli" deb belgilang, darhol shu guruhga yoziladi.</i>`);
    } else if (excused.length === 0) {
      lines.push(``, `🎉 Hamma keldi!`);
    }
    const text = lines.join("\n");
    for (const ch of chats) { if (await sendToChat(ch.chat_id, text)) sent++; done++; await sleep(80); }
  }

  // ── Maktab guruhiga — umumiy holat + sababli/sababsiz ro'yxatlar
  const schoolChats = await getChatsByPurpose("school");
  if (schoolChats.length) {
    const lines: string[] = [
      `🏫 <b>Maktab — bugungi davomat (Face ID, 10:00)</b> (${dateStr})`,
      ``,
      `👥 Jami: <b>${sTotal}</b>`,
      `✅ Keldi: <b>${sArrived}</b>${sLate ? ` (shundan kech: ${sLate})` : ""}`,
      `📝 Sababli kelmaganlar: <b>${sExcused}</b>`,
      `⛔️ Sababsiz kelmaganlar: <b>${sUnexcused}</b>`,
    ];
    if (schoolExcused.length) {
      lines.push(``, `📝 <b>Sababli kelmaganlar:</b>`);
      schoolExcused.slice(0, 100).forEach((s, i) => lines.push(`${i + 1}. ${esc(s)}`));
    }
    if (schoolUnexcused.length) {
      lines.push(``, `⛔️ <b>Sababsiz kelmaganlar:</b>`);
      schoolUnexcused.slice(0, 120).forEach((s, i) => lines.push(`${i + 1}. ${esc(s)}`));
    }
    const text = lines.join("\n");
    for (const ch of schoolChats) { if (await sendToChat(ch.chat_id, text)) sent++; done++; await sleep(80); }
  }
  return { classes: done, sent };
}

// POST /api/faceid/group-summary — qo'lda yuborish (rahbariyat)
router.post("/faceid/group-summary", async (req, res): Promise<void> => {
  if (!authAs(req, MANAGE)) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  try {
    const r = await faceidGroupSummary();
    res.json({ ok: true, ...r });
  } catch (err) {
    logger.error({ err }, "faceid/group-summary");
    res.status(500).json({ error: (err as Error).message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  14:30 — KUN OXIRI: KETGANLAR / QOCHIB KETGANLAR / JAVOB SO'RAGANLAR
//   • Avval "qochib ketish" tozalanishi: kelgan, lekin Face ID'dan chiqib
//     ketmagan (left_at yo'q) va sababli bo'lmaganlar → qochgan (truant) deb belgilanadi.
//   • Har SINF GURUHIGA: ketganlar, qochib/erta ketganlar, javob so'raganlar ro'yxati.
//   • MAKTAB GURUHIGA: umumiy sonlar + qochib ketganlar va javob so'raganlar ro'yxati.
//   • Qochib ketganlarga shaxsiy chatga ham eslatma (ota-onasiga).
//   • Shundan so'ng kunlik faoliyat yopiladi (14:30 dan keyin Face ID ishlamaydi).
// ═══════════════════════════════════════════════════════════════════════════
export async function faceidDepartureSummary(): Promise<{ classes: number; sent: number; truants: number }> {
  const today = uzDateStr();
  const dateStr = today.split("-").reverse().join(".");

  // 1) Qochib ketish: kelgan, lekin chiqishi belgilanmagan va sababli bo'lmaganlar
  const swept = await query<{ student_login: string; student_name: string; class_name: string; telegram_id: number | null }>(
    `UPDATE face_checkins fc
        SET left_at = NOW(), left_early = TRUE, truant = TRUE
       FROM users u
      WHERE fc.student_login = u.login
        AND fc.date = $1::date AND fc.checked_at IS NOT NULL AND fc.left_at IS NULL
        AND fc.excused = FALSE AND fc.class_name <> $2
      RETURNING fc.student_login, fc.student_name, fc.class_name, u.telegram_id`,
    [today, STAFF_GROUP]
  ).catch(() => [] as { student_login: string; student_name: string; class_name: string; telegram_id: number | null }[]);

  const classes = await query<{ id: string; name: string }>("SELECT id, name FROM classes WHERE name <> '' ORDER BY name");
  let sent = 0, done = 0;
  const schoolTruant: string[] = [];   // "7-A — Ism F. (chiqishi belgilanmagan)"
  const schoolExcusedOut: string[] = []; // "7-A — Ism F. — 12:30"

  for (const c of classes) {
    const chats = await getClassChats(c.id);
    const left = await query<{ full_name: string; t: string; excused: boolean; early: boolean; truant: boolean }>(
      `SELECT u.full_name,
              to_char(fc.left_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS t,
              COALESCE(fc.excused, false) AS excused,
              COALESCE(fc.left_early, false) AS early,
              COALESCE(fc.truant, false) AS truant
         FROM face_checkins fc JOIN users u ON u.login = fc.student_login
        WHERE fc.class_name = $1 AND fc.date = $2::date AND fc.left_at IS NOT NULL
        ORDER BY fc.left_at`,
      [c.name, today]
    );
    const normal = left.filter((r) => !r.excused && !r.early);
    const runaway = left.filter((r) => !r.excused && r.early);       // erta yoki qochib ketgan
    const excusedOut = left.filter((r) => r.excused);                 // javob so'ragan (ruxsat bilan)
    for (const r of runaway) schoolTruant.push(`${c.name} — ${r.full_name}${r.truant ? " (chiqishi belgilanmagan)" : ` (${r.t})`}`);
    for (const r of excusedOut) schoolExcusedOut.push(`${c.name} — ${r.full_name} — ${r.t}`);

    if (chats.length === 0 || left.length === 0) continue;
    const lines: string[] = [`🏁 <b>${esc(c.name)} — kun yakuni (Face ID, 14:30)</b> (${dateStr})`];
    if (normal.length) {
      lines.push(``, `🏠 <b>Ketganlar (${normal.length}):</b>`);
      normal.slice(0, 80).forEach((r, i) => lines.push(`${i + 1}. ${esc(r.full_name)} — ${r.t}`));
    }
    if (runaway.length) {
      lines.push(``, `🏃 <b>Erta / ruxsatsiz ketganlar (${runaway.length}):</b>`);
      runaway.slice(0, 80).forEach((r, i) => lines.push(`${i + 1}. ${esc(r.full_name)}${r.truant ? " — chiqishi belgilanmagan" : ` — ${r.t} (erta)`}`));
    }
    if (excusedOut.length) {
      lines.push(``, `📝 <b>Javob so'raganlar (ruxsat bilan, ${excusedOut.length}):</b>`);
      excusedOut.slice(0, 80).forEach((r, i) => lines.push(`${i + 1}. ${esc(r.full_name)} — ${r.t}`));
    }
    const text = lines.join("\n");
    for (const ch of chats) { if (await sendToChat(ch.chat_id, text)) sent++; done++; await sleep(80); }
  }

  // 2) Qochib ketganlarga shaxsiy eslatma (ota-onasiga)
  for (const s of swept) {
    if (isRealTelegramId(s.telegram_id)) {
      void notifyUser(s.telegram_id!, `🏃 Bugun maktabdan chiqish (Face ID) belgilanmadi — darsdan ruxsatsiz ketilgan deb qayd etildi. Xato bo'lsa sinf rahbaringizga murojaat qiling.`);
      await sleep(30);
    }
  }

  // 3) Maktab guruhiga umumiy yakun
  const schoolChats = await getChatsByPurpose("school");
  if (schoolChats.length) {
    const lines: string[] = [
      `🏫 <b>Maktab — kun yakuni (Face ID, 14:30)</b> (${dateStr})`,
      ``,
      `🏃 Erta / ruxsatsiz ketganlar: <b>${schoolTruant.length}</b>`,
      `📝 Javob so'raganlar (ruxsat bilan): <b>${schoolExcusedOut.length}</b>`,
    ];
    if (schoolTruant.length) {
      lines.push(``, `🏃 <b>Erta / ruxsatsiz ketganlar:</b>`);
      schoolTruant.slice(0, 120).forEach((s, i) => lines.push(`${i + 1}. ${esc(s)}`));
    }
    if (schoolExcusedOut.length) {
      lines.push(``, `📝 <b>Javob so'raganlar:</b>`);
      schoolExcusedOut.slice(0, 120).forEach((s, i) => lines.push(`${i + 1}. ${esc(s)}`));
    }
    lines.push(``, `🔒 <i>Kunlik Face ID yopildi. Ertaga 06:00 dan qayta ochiladi.</i>`);
    const text = lines.join("\n");
    for (const ch of schoolChats) { if (await sendToChat(ch.chat_id, text)) sent++; done++; await sleep(80); }
  }

  return { classes: done, sent, truants: swept.length };
}

// ═══════════════════════════════════════════════════════════════════════════
//  SABABSIZ KELMAGANLAR — sinf rahbari, fan o'qituvchilari, direktor, MMTB, zavuch
//  "Sababsiz" = bugun kelmagan VA "Sababli" deb belgilanmagan o'quvchilar.
// ═══════════════════════════════════════════════════════════════════════════

/** Bitta sinf uchun xabar oluvchilar: sinf rahbari + fan o'qituvchilari (tartib bo'yicha). */
async function classRecipients(className: string): Promise<number[]> {
  const ids: number[] = [];
  const seen = new Set<number>();
  const add = (tid: number | null | undefined) => {
    if (tid != null && isRealTelegramId(tid) && !seen.has(tid)) { seen.add(tid); ids.push(tid); }
  };
  // 1) Sinf rahbari
  const rahbar = await query<{ telegram_id: number | null }>(
    `SELECT s.telegram_id FROM classes c JOIN staff s ON s.id = c.teacher_id
      WHERE c.name = $1 AND s.telegram_id IS NOT NULL`,
    [className]
  ).catch(() => [] as { telegram_id: number | null }[]);
  for (const r of rahbar) add(r.telegram_id);
  // 2) Fan o'qituvchilari (shu sinfga biriktirilgan)
  const fan = await query<{ telegram_id: number | null }>(
    `SELECT DISTINCT s.telegram_id FROM teacher_subjects ts
       JOIN classes c ON c.id = ts.class_id JOIN staff s ON s.id = ts.teacher_id
      WHERE c.name = $1 AND s.telegram_id IS NOT NULL`,
    [className]
  ).catch(() => [] as { telegram_id: number | null }[]);
  for (const r of fan) add(r.telegram_id);
  return ids;
}

/** Rahbariyat: direktor, MMTB (zam_direktor), zavuch. */
async function mgmtRecipients(): Promise<number[]> {
  const rows = await query<{ telegram_id: number | null }>(
    `SELECT telegram_id FROM staff
      WHERE role IN ('director', 'zam_direktor', 'zavuch') AND telegram_id IS NOT NULL`
  ).catch(() => [] as { telegram_id: number | null }[]);
  const out: number[] = [];
  for (const r of rows) if (r.telegram_id != null && isRealTelegramId(r.telegram_id)) out.push(r.telegram_id);
  return out;
}

export async function faceidUnexcusedNotify(): Promise<{ classes: number; recipients: number }> {
  const today = uzDateStr();
  const dateStr = today.split("-").reverse().join(".");
  const classes = await query<{ name: string }>(
    "SELECT DISTINCT class_name AS name FROM users WHERE class_name <> '' ORDER BY class_name"
  );
  let recipients = 0;
  let affected = 0;
  const schoolLines: string[] = [];

  for (const c of classes) {
    const absent = await query<{ full_name: string }>(
      `SELECT u.full_name FROM users u
        WHERE u.class_name = $1
          AND NOT EXISTS (
            SELECT 1 FROM face_checkins fc
             WHERE fc.student_login = u.login AND fc.date = $2::date
               AND (fc.checked_at IS NOT NULL OR fc.excused = TRUE)
          )
        ORDER BY u.full_name`,
      [c.name, today]
    );
    if (absent.length === 0) continue;
    affected++;
    schoolLines.push(`• <b>${esc(c.name)}</b>: ${absent.length} ta`);
    const text =
      `⛔️ <b>${esc(c.name)} — sababsiz kelmaganlar</b> (${dateStr}, ${uzTime()})\n\n` +
      absent.slice(0, 80).map((a, i) => `${i + 1}. ${esc(a.full_name)}`).join("\n") +
      `\n\n<i>Sababli bo'lsa — platformada "Sababli" deb belgilang, ro'yxatdan chiqadi.</i>`;
    const to = await classRecipients(c.name);
    for (const id of to) { if (await sendToChat(id, text)) recipients++; await sleep(60); }
  }

  // Rahbariyatga (direktor, MMTB, zavuch) — umumiy xulosa
  if (schoolLines.length) {
    const total = schoolLines.length;
    const text =
      `⛔️ <b>Maktab — bugungi sababsiz kelmaganlar</b> (${dateStr}, ${uzTime()})\n\n` +
      schoolLines.join("\n") +
      `\n\n<b>Jami:</b> ${total} sinfda sababsiz kelmaganlar bor.`;
    for (const id of await mgmtRecipients()) { if (await sendToChat(id, text)) recipients++; await sleep(60); }
  }
  return { classes: affected, recipients };
}

// POST /api/faceid/notify-unexcused — qo'lda yuborish (rahbariyat)
router.post("/faceid/notify-unexcused", async (req, res): Promise<void> => {
  if (!authAs(req, MANAGE)) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  try {
    const r = await faceidUnexcusedNotify();
    res.json({ ok: true, ...r });
  } catch (err) {
    logger.error({ err }, "faceid/notify-unexcused");
    res.status(500).json({ error: (err as Error).message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  O'QUVCHI — O'Z DAVOMATI (bosh sahifada "qachon keldi/ketdi")
// ═══════════════════════════════════════════════════════════════════════════
// GET /api/faceid/my — kirgan foydalanuvchining o'z kir/chiqishi (bugun + oxirgi 14 kun)
router.get("/faceid/my", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization) as AuthUser | null;
  if (!u) { res.status(401).json({ error: "Avtorizatsiya talab qilinadi" }); return; }
  const login = String(u.login ?? "");
  if (!login) { res.json({ today: null, recent: [] }); return; }
  const today = uzDateStr();
  const rows = await query<{ date: string; arrived: string | null; left: string | null; status: string; early: boolean; excused: boolean }>(
    `SELECT to_char(date, 'YYYY-MM-DD') AS date,
            to_char(checked_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS arrived,
            to_char(left_at AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS "left",
            status,
            COALESCE(left_early, false) AS early,
            COALESCE(excused, false) AS excused
       FROM face_checkins
      WHERE student_login = $1
      ORDER BY date DESC LIMIT 14`,
    [login]
  ).catch(() => [] as { date: string; arrived: string | null; left: string | null; status: string; early: boolean; excused: boolean }[]);
  const todayRow = rows.find((r) => r.date === today) ?? null;
  res.setHeader("Cache-Control", "no-store");
  res.json({ today: todayRow, recent: rows });
});

// ═══════════════════════════════════════════════════════════════════════════
//  KUNLIK DAVOMAT ARXIVI (Word .doc — kutubxonasiz, HTML asosida)
//  Word .doc fayl HTML'ni to'liq ochadi; shuning uchun hisobotni HTML hujjat
//  sifatida yasaymiz va .doc nomi bilan beramiz (Render'da qo'shimcha paket shart emas).
// ═══════════════════════════════════════════════════════════════════════════

/** Chorak boshlanishi: sozlamada bo'lsa — o'sha; bo'lmasa oy bo'yicha taxminiy (O'zbekiston chorak taqvimi). */
function autoQuarterStart(today: string, configured: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(configured)) return configured;
  const [y, m] = today.split("-").map(Number) as [number, number];
  if (m >= 9 && m <= 10) return `${y}-09-01`;
  if (m === 11 || m === 12) return `${y}-11-01`;
  if (m >= 1 && m <= 3) return `${y}-01-01`;
  if (m >= 4 && m <= 6) return `${y}-04-01`;
  // yoz (7–8) — oldingi chorakdan davom etmaydi, oxirgi 90 kun
  const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - 90);
  return d.toISOString().slice(0, 10);
}

interface ArchiveData {
  date: string;
  counts: { total: number; arrived: number; excusedAbsent: number; unexcusedAbsent: number; leftEarly: number; excusedOut: number };
  excused: { class_name: string; full_name: string; reason: string }[];
  unexcused: { class_name: string; full_name: string; hours: number }[];
  quarterStart: string;
}

/** Arxiv uchun ma'lumotlarni yig'adi (bitta sana bo'yicha, butun maktab). */
async function collectArchive(date: string): Promise<ArchiveData> {
  const settings = await getSettings();
  const quarterStart = autoQuarterStart(date, settings.quarter_start);

  const counts = await queryOne<{ total: number; arrived: number; excused_absent: number; left_early: number; excused_out: number }>(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE class_name <> '')::int AS total,
       (SELECT COUNT(*) FROM face_checkins WHERE date = $1::date AND checked_at IS NOT NULL AND class_name <> '${STAFF_GROUP}')::int AS arrived,
       (SELECT COUNT(*) FROM face_checkins WHERE date = $1::date AND excused = TRUE AND checked_at IS NULL AND class_name <> '${STAFF_GROUP}')::int AS excused_absent,
       (SELECT COUNT(*) FROM face_checkins WHERE date = $1::date AND left_early = TRUE AND excused = FALSE AND class_name <> '${STAFF_GROUP}')::int AS left_early,
       (SELECT COUNT(*) FROM face_checkins WHERE date = $1::date AND excused = TRUE AND left_at IS NOT NULL AND class_name <> '${STAFF_GROUP}')::int AS excused_out`,
    [date]
  );
  const total = counts?.total ?? 0;
  const arrived = counts?.arrived ?? 0;
  const excusedAbsent = counts?.excused_absent ?? 0;

  // Sababli kelmaganlar (ism + sabab)
  const excused = await query<{ class_name: string; full_name: string; reason: string }>(
    `SELECT fc.class_name, fc.student_name AS full_name, COALESCE(fc.excuse_reason, '') AS reason
       FROM face_checkins fc
      WHERE fc.date = $1::date AND fc.excused = TRUE AND fc.checked_at IS NULL AND fc.class_name <> '${STAFF_GROUP}'
      ORDER BY fc.class_name, fc.student_name`,
    [date]
  );

  // Sababsiz kelmaganlar (bugun kelmagan va sababli emas) — har biriga chorakdagi qoldirilgan soat
  const unexcusedRows = await query<{ class_name: string; login: string; full_name: string }>(
    `SELECT u.class_name, u.login, u.full_name FROM users u
      WHERE u.class_name <> ''
        AND NOT EXISTS (
          SELECT 1 FROM face_checkins fc
           WHERE fc.student_login = u.login AND fc.date = $1::date
             AND (fc.checked_at IS NOT NULL OR fc.excused = TRUE)
        )
      ORDER BY u.class_name, u.full_name`,
    [date]
  );
  // Chorakdagi qoldirilgan soat: sinf bo'yicha hafta-kuni dars soni × attendance absent kunlari
  const hoursByLogin = new Map<string, number>();
  const classesInvolved = [...new Set(unexcusedRows.map((r) => r.class_name))];
  for (const cn of classesInvolved) {
    const rows = await query<{ login: string; hours: number }>(
      `WITH lc AS (
         SELECT t.day_of_week AS dow, COUNT(*)::int AS n
           FROM timetable t JOIN classes c ON c.id = t.class_id
          WHERE c.name = $1 GROUP BY t.day_of_week
       )
       SELECT a.student_login AS login, COALESCE(SUM(lc.n), 0)::int AS hours
         FROM attendance a
         LEFT JOIN lc ON lc.dow = EXTRACT(DOW FROM a.date)::int
        WHERE a.class_name = $1 AND a.status = 'absent'
          AND a.date >= $2::date AND a.date <= $3::date
        GROUP BY a.student_login`,
      [cn, quarterStart, date]
    ).catch(() => [] as { login: string; hours: number }[]);
    for (const r of rows) hoursByLogin.set(r.login, r.hours);
  }
  const unexcused = unexcusedRows.map((r) => ({ class_name: r.class_name, full_name: r.full_name, hours: hoursByLogin.get(r.login) ?? 0 }));

  return {
    date,
    quarterStart,
    counts: {
      total, arrived, excusedAbsent,
      unexcusedAbsent: Math.max(0, total - arrived - excusedAbsent),
      leftEarly: counts?.left_early ?? 0,
      excusedOut: counts?.excused_out ?? 0,
    },
    excused,
    unexcused,
  };
}

/** Word ochadigan HTML hujjat (.doc). */
function renderArchiveDoc(a: ArchiveData): string {
  const dateStr = a.date.split("-").reverse().join(".");
  const qStr = a.quarterStart.split("-").reverse().join(".");
  const row = (cells: string[]) => `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
  const head = (cells: string[]) => `<tr>${cells.map((c) => `<th>${c}</th>`).join("")}</tr>`;

  const countTable =
    `<table class="box"><tbody>` +
    row([`<b>Maktabdagi jami o'quvchi</b>`, String(a.counts.total)]) +
    row([`Bugun kelganlar`, String(a.counts.arrived)]) +
    row([`Sababli kelmaganlar`, String(a.counts.excusedAbsent)]) +
    row([`Sababsiz kelmaganlar`, String(a.counts.unexcusedAbsent)]) +
    row([`Erta / ruxsatsiz ketganlar`, String(a.counts.leftEarly)]) +
    row([`Sababli (ruxsat bilan) ketganlar`, String(a.counts.excusedOut)]) +
    `</tbody></table>`;

  const excusedTable = a.excused.length
    ? `<table class="list">${head(["#", "Sinf", "Familya, ism", "Sabab"])}` +
      a.excused.map((e, i) => row([String(i + 1), esc(e.class_name), esc(e.full_name), esc(e.reason || "—")])).join("") +
      `</table>`
    : `<p class="muted">Sababli kelmaganlar yo'q.</p>`;

  const unexcusedTable = a.unexcused.length
    ? `<table class="list">${head(["#", "Sinf", "Familya, ism", "Chorakda qoldirilgan soat"])}` +
      a.unexcused.map((e, i) => row([String(i + 1), esc(e.class_name), esc(e.full_name), String(e.hours)])).join("") +
      `</table>`
    : `<p class="muted">Sababsiz kelmaganlar yo'q.</p>`;

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Davomat ${dateStr}</title>
<style>
  body { font-family: "Times New Roman", serif; font-size: 12pt; color: #111; }
  h1 { font-size: 16pt; text-align: center; margin: 0 0 2pt; }
  h2 { font-size: 13pt; margin: 18pt 0 6pt; border-bottom: 1px solid #999; padding-bottom: 3pt; }
  .sub { text-align: center; color: #555; margin: 0 0 12pt; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0; }
  table.box td { border: 1px solid #bbb; padding: 4pt 8pt; }
  table.box td:last-child { text-align: center; width: 90pt; font-weight: bold; }
  table.list th, table.list td { border: 1px solid #bbb; padding: 4pt 6pt; font-size: 11pt; }
  table.list th { background: #eee; }
  table.list td:first-child { text-align: center; width: 28pt; }
  .muted { color: #777; font-style: italic; }
  .foot { margin-top: 20pt; color: #777; font-size: 10pt; }
</style></head>
<body>
  <h1>Kunlik davomat hisoboti</h1>
  <div class="sub">Face ID · ${dateStr}</div>
  ${countTable}
  <h2>Sababli kelmaganlar</h2>
  ${excusedTable}
  <h2>Sababsiz kelmaganlar (chorakda qoldirilgan soat — ${qStr} dan)</h2>
  ${unexcusedTable}
  <div class="foot">Avtomatik yaratildi — Ta'lim platformasi, Face ID davomat tizimi.</div>
</body></html>`;
}

// GET /api/faceid/archive?date=YYYY-MM-DD — Word (.doc) hisobotni yuklab olish
router.get("/faceid/archive", async (req, res): Promise<void> => {
  if (!authAs(req, MANAGE)) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const q = String(req.query["date"] ?? "");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : uzDateStr();
  try {
    const data = await collectArchive(date);
    const html = renderArchiveDoc(data);
    res.setHeader("Content-Type", "application/msword; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="davomat-${date}.doc"`);
    res.send(html);
  } catch (err) {
    logger.error({ err }, "faceid/archive");
    res.status(500).json({ error: (err as Error).message });
  }
});

/** 14:30 da — kunlik arxivni Telegramga (maktab guruhi + rahbariyat) hujjat sifatida yuboradi. */
export async function faceidArchiveToTelegram(date = uzDateStr()): Promise<{ sent: number }> {
  const data = await collectArchive(date);
  const buf = Buffer.from(renderArchiveDoc(data), "utf-8");
  const fname = `davomat-${date}.doc`;
  const dateStr = date.split("-").reverse().join(".");
  const caption =
    `🗂 <b>Kunlik davomat hisoboti</b> (${dateStr})\n` +
    `✅ Keldi: ${data.counts.arrived}/${data.counts.total} · ` +
    `📝 sababli: ${data.counts.excusedAbsent} · ⛔️ sababsiz: ${data.counts.unexcusedAbsent}`;
  let sent = 0;
  const schoolChats = await getChatsByPurpose("school");
  for (const ch of schoolChats) { if (await sendDocumentToChat(ch.chat_id, buf, fname, caption)) sent++; await sleep(120); }
  for (const id of await mgmtRecipients()) { if (await sendDocumentToChat(id, buf, fname, caption)) sent++; await sleep(120); }
  return { sent };
}

export default router;

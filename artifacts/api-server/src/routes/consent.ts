// Elektron rozilik (imzo) — yuz ma'lumotini ochish faqat imzo bo'lsa ruxsat etiladi.
// • Platforma qoidalari: har kim o'zi imzolaydi (admin bundan mustasno).
// • Face ID: ota-ona (yoki o'quvchi) imzosi bo'lsa — ruxsat. Imzo bekor qilinsa — yuz ma'lumoti o'chadi.
// • Yuz ma'lumoti (descriptor) hech qayerda ro'yxat/hisobotda ko'rsatilmaydi; faqat holat (qulf/imzo/yuz olingan).

import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { getAuthUser, schoolOf } from "./auth.js";

const router: IRouter = Router();

export const RULES_VERSION = "1.0";
export const FACE_VERSION = "1.0";
const MGMT = ["admin", "director", "zam_direktor", "zavuch"];
const FACE_ROLES = [...MGMT, "sinf_rahbari", "boshlangich_oqituvchi"];

void query(`
  CREATE TABLE IF NOT EXISTS user_consents (
    id BIGSERIAL PRIMARY KEY,
    subject_login TEXT NOT NULL,
    subject_name  TEXT NOT NULL DEFAULT '',
    subject_role  TEXT NOT NULL DEFAULT '',
    class_name    TEXT NOT NULL DEFAULT '',
    maktab_id     INT,
    kind          TEXT NOT NULL,
    version       TEXT NOT NULL,
    signer_type   TEXT NOT NULL,
    signer_name   TEXT NOT NULL,
    signature     TEXT NOT NULL,
    recorded_by   TEXT NOT NULL DEFAULT '',
    accepted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS user_consents_idx ON user_consents (subject_login, kind, version);
  CREATE OR REPLACE FUNCTION face_consent_ok(p_login TEXT) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
    SELECT COALESCE((
      SELECT c.kind = 'face_id' FROM user_consents c
       WHERE c.subject_login = p_login AND c.kind IN ('face_id', 'face_id_revoked') AND c.version = '${FACE_VERSION}'
       ORDER BY c.accepted_at DESC, c.id DESC LIMIT 1
    ), FALSE)
  $$;
`).catch(() => { /* migratsiya */ });

function s(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

// Face ID ruxsati bormi — oxirgi yozuv "face_id" bo'lsa
export async function hasFaceConsent(login: string): Promise<boolean> {
  const r = await queryOne<{ ok: boolean }>("SELECT face_consent_ok($1) AS ok", [login]).catch(() => null);
  return !!r?.ok;
}

async function hasRules(login: string): Promise<boolean> {
  const r = await queryOne(
    "SELECT 1 AS x FROM user_consents WHERE subject_login = $1 AND kind = 'rules' AND version = $2 LIMIT 1",
    [login, RULES_VERSION],
  ).catch(() => null);
  return !!r;
}

// GET /api/consent/status
router.get("/consent/status", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization);
  if (!u) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const rulesRequired = s(u["role"]) !== "admin";
  res.json({
    rules_version: RULES_VERSION,
    rules_required: rulesRequired,
    rules_done: !rulesRequired || (await hasRules(s(u["login"]))),
  });
});

// POST /api/consent/accept { signer_type, signer_name, signature } — qoidalarni o'zi imzolaydi
router.post("/consent/accept", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization);
  if (!u) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const body = req.body as { signer_type?: string; signer_name?: string; signature?: string };
  const signerType = s(body.signer_type);
  const signerName = s(body.signer_name);
  const signature = s(body.signature);
  if (!["self", "parent"].includes(signerType)) { res.status(400).json({ error: "Imzo chiquvchi turini tanlang" }); return; }
  if (signerName.length < 5) { res.status(400).json({ error: "To'liq ism-familiyani kiriting" }); return; }
  if (signature.toUpperCase() !== signerName.toUpperCase()) {
    res.status(400).json({ error: "Imzo ism-familiya bilan bir xil bo'lishi kerak" }); return;
  }
  try {
    const login = s(u["login"]);
    await query(
      `INSERT INTO user_consents (subject_login, subject_name, subject_role, class_name, maktab_id, kind, version, signer_type, signer_name, signature, recorded_by)
       VALUES ($1, $2, $3, $4, $5, 'rules', $6, $7, $8, $9, $1)`,
      [login, s(u["full_name"]), s(u["role"]), s(u["class_name"]),
        typeof u["maktab_id"] === "number" ? u["maktab_id"] : null,
        RULES_VERSION, signerType, signerName, signature],
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/consent/face { student_login, signer_type, signer_name, signature } — Face ID imzosi
router.post("/consent/face", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization);
  if (!u || !FACE_ROLES.includes(s(u["role"]))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const body = req.body as { student_login?: string; signer_type?: string; signer_name?: string; signature?: string };
  const studentLogin = s(body.student_login);
  const signerType = s(body.signer_type);
  const signerName = s(body.signer_name);
  const signature = s(body.signature);
  if (!studentLogin) { res.status(400).json({ error: "O'quvchi tanlanmagan" }); return; }
  if (!["parent", "self"].includes(signerType)) { res.status(400).json({ error: "Imzo chiquvchi turini tanlang" }); return; }
  if (signerName.length < 5) { res.status(400).json({ error: "Imzo chiquvchining ism-familiyasini kiriting" }); return; }
  if (signature.toUpperCase() !== signerName.toUpperCase()) {
    res.status(400).json({ error: "Imzo ism-familiya bilan bir xil bo'lishi kerak" }); return;
  }
  try {
    const mid = schoolOf(u);
    const st = await queryOne<{ full_name: string; class_name: string; maktab_id: number | null }>(
      "SELECT full_name, class_name, maktab_id FROM users WHERE login = $1 AND maktab_id IS NOT DISTINCT FROM $2",
      [studentLogin, mid]);
    if (!st) { res.status(404).json({ error: "O'quvchi topilmadi" }); return; }
    await query(
      `INSERT INTO user_consents (subject_login, subject_name, subject_role, class_name, maktab_id, kind, version, signer_type, signer_name, signature, recorded_by)
       VALUES ($1, $2, 'student', $3, $4, 'face_id', $5, $6, $7, $8, $9)`,
      [studentLogin, st.full_name, st.class_name, st.maktab_id, FACE_VERSION, signerType, signerName, signature, s(u["login"])],
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/consent/face-revoke { student_login } — rozilik bekor qilinadi, yuz ma'lumoti O'CHADI
router.post("/consent/face-revoke", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization);
  if (!u || !FACE_ROLES.includes(s(u["role"]))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const studentLogin = s((req.body as { student_login?: string })?.student_login);
  if (!studentLogin) { res.status(400).json({ error: "O'quvchi tanlanmagan" }); return; }
  try {
    const mid = schoolOf(u);
    const st = await queryOne<{ full_name: string; class_name: string; maktab_id: number | null }>(
      "SELECT full_name, class_name, maktab_id FROM users WHERE login = $1 AND maktab_id IS NOT DISTINCT FROM $2",
      [studentLogin, mid]);
    if (!st) { res.status(404).json({ error: "O'quvchi topilmadi" }); return; }
    await query("DELETE FROM face_profiles WHERE student_login = $1", [studentLogin]);
    await query(
      `INSERT INTO user_consents (subject_login, subject_name, subject_role, class_name, maktab_id, kind, version, signer_type, signer_name, signature, recorded_by)
       VALUES ($1, $2, 'student', $3, $4, 'face_id_revoked', $5, 'revoked', $6, $6, $6)`,
      [studentLogin, st.full_name, st.class_name, st.maktab_id, FACE_VERSION, s(u["login"])],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/consent/mine
router.get("/consent/mine", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization);
  if (!u) { res.status(401).json({ error: "Avtorizatsiya talab etiladi" }); return; }
  const rows = await query(
    `SELECT id, kind, version, signer_type, signer_name, signature, accepted_at
       FROM user_consents WHERE subject_login = $1 AND kind IN ('rules','face_id') ORDER BY accepted_at DESC`,
    [s(u["login"])]);
  res.json(rows);
});

// GET /api/consent/students?class_name= — holat: locked (imzo yo'q) | signed (imzo bor, yuz olinmagan) | enrolled (yuz olingan)
// Yuz ma'lumotlari (descriptor) bu yerda hech qachon qaytarilmaydi.
router.get("/consent/students", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization);
  if (!u || !FACE_ROLES.includes(s(u["role"]))) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const cls = s(req.query["class_name"]);
  if (!cls) { res.status(400).json({ error: "class_name kerak" }); return; }
  const mid = schoolOf(u);
  const rows = await query<{ login: string; full_name: string; consent: boolean; enrolled: boolean; signer_name: string | null; signed_at: string | null }>(
    `SELECT u.login, u.full_name,
            face_consent_ok(u.login) AS consent,
            EXISTS (SELECT 1 FROM face_profiles fp WHERE fp.student_login = u.login) AS enrolled,
            (SELECT c.signer_name FROM user_consents c WHERE c.subject_login = u.login AND c.kind = 'face_id' AND c.version = $3
              ORDER BY c.accepted_at DESC LIMIT 1) AS signer_name,
            (SELECT to_char(c.accepted_at AT TIME ZONE 'Asia/Tashkent', 'DD.MM.YYYY HH24:MI') FROM user_consents c
              WHERE c.subject_login = u.login AND c.kind = 'face_id' AND c.version = $3
              ORDER BY c.accepted_at DESC LIMIT 1) AS signed_at
       FROM users u
      WHERE u.class_name = $1 AND u.maktab_id IS NOT DISTINCT FROM $2
      ORDER BY u.full_name`,
    [cls, mid, FACE_VERSION]).catch(() => []);
  res.json(rows.map((r) => ({
    login: r.login,
    full_name: r.full_name,
    status: !r.consent ? "locked" : r.enrolled ? "enrolled" : "signed",
    signer_name: r.signer_name,
    signed_at: r.signed_at,
  })));
});

// GET /api/consent/records?kind=&class_name= — admin: hammasi; rahbariyat: o'z maktabi
router.get("/consent/records", async (req, res): Promise<void> => {
  const u = getAuthUser(req.headers.authorization);
  if (!u || !MGMT.includes(s(u["role"]))) { res.status(403).json({ error: "Faqat rahbariyat va admin" }); return; }
  const kind = s(req.query["kind"]);
  const cls = s(req.query["class_name"]);
  const mid = s(u["role"]) === "admin" ? null : (schoolOf(u) ?? 3);
  const rows = await query(
    `SELECT id, subject_login, subject_name, subject_role, class_name, maktab_id, kind, version,
            signer_type, signer_name, signature, recorded_by, accepted_at
       FROM user_consents
      WHERE kind IN ('rules','face_id','face_id_revoked')
        AND ($1 = '' OR kind = $1)
        AND ($2 = '' OR class_name = $2)
        AND ($3::int IS NULL OR maktab_id = $3)
      ORDER BY accepted_at DESC
      LIMIT 3000`,
    [kind, cls, mid]);
  res.json(rows);
});

export default router;

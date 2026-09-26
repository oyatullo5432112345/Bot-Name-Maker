// ═══════════════════════════════════════════════════════════════════════════
//  KOMPYUTER SINFI BOSHQARUVI (Veyon bilan)
//
//  • Maktab kompyuterlari platformadan boshqariladi: jonli holat (online/offline),
//    bloklash / ochish, o'chirish / qayta yuklash / xabar yuborish, jurnal.
//  • Amaliy qulflashni har bir kompyuterdagi Veyon bajaradi. Platforma faqat
//    "buyruq navbati"ni yuritadi; o'qituvchi kompyuteridagi KO'PRIK (bridge)
//    dasturi bu navbatni o'qib, veyon-cli orqali bajaradi va holatni qaytaradi.
//  • Ochish faqat AYLANUVCHI KOD bilan: kompyuter bloklanganda yangi kod beriladi,
//    kodni faqat rahbariyat ko'radi; ochilgach kod o'chadi (keyingi safar — yangi kod).
//
//  Xavfsizlik: ko'prik so'rovlari LAB_BRIDGE_SECRET (Render env) bilan tekshiriladi.
// ═══════════════════════════════════════════════════════════════════════════

import { Router, type IRouter, type Request } from "express";
import crypto from "node:crypto";
import { query, queryOne } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { getAuthUser } from "./auth.js";

const router: IRouter = Router();

const MANAGE = ["admin", "director", "zam_direktor", "zavuch"]; // to'liq boshqaruv + kodni ko'radi
const CONTROL = [...MANAGE, "teacher", "sinf_rahbari"]; // bloklash/ochishda ishtirok etadi

const BRIDGE_SECRET = process.env["LAB_BRIDGE_SECRET"] ?? "";
const ONLINE_WINDOW_MS = 90_000; // shundan eski last_seen — offline

// ─── Sxema (server ishga tushganda, idempotent) ─────────────────────────────
const LAB_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS lab_rooms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS lab_computers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID REFERENCES lab_rooms(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  host         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'unknown',
  locked       BOOLEAN NOT NULL DEFAULT FALSE,
  unlock_code  TEXT NOT NULL DEFAULT '',
  locked_by    TEXT NOT NULL DEFAULT '',
  locked_at    TIMESTAMPTZ,
  active_user  TEXT NOT NULL DEFAULT '',
  last_seen    TIMESTAMPTZ,
  note         TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (host)
);
CREATE INDEX IF NOT EXISTS idx_lab_computers_room ON lab_computers(room_id);
CREATE TABLE IF NOT EXISTS lab_commands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  computer_id UUID NOT NULL REFERENCES lab_computers(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  status      TEXT NOT NULL DEFAULT 'pending',
  result      TEXT NOT NULL DEFAULT '',
  created_by  TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  picked_at   TIMESTAMPTZ,
  done_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_lab_commands_pending ON lab_commands(status, created_at);
CREATE INDEX IF NOT EXISTS idx_lab_commands_computer ON lab_commands(computer_id, created_at DESC);
CREATE TABLE IF NOT EXISTS lab_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  computer_id   UUID,
  computer_name TEXT NOT NULL DEFAULT '',
  action        TEXT NOT NULL,
  detail        TEXT NOT NULL DEFAULT '',
  actor         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_events_time ON lab_events(created_at DESC);
CREATE TABLE IF NOT EXISTS lab_settings (
  id         SMALLINT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

void query(LAB_SCHEMA_SQL)
  .then(() => logger.info("Kompyuter sinfi (lab) jadvallari tayyor ✅"))
  .catch((err) => logger.error({ err }, "Lab sxemasini yaratishda xato"));

// ─── Sozlamalar ─────────────────────────────────────────────────────────────
interface LabSettings {
  lock_message: string; // bloklanganda ekranda ko'rinadigan matn
  code_digits: number; // ochish kodi uzunligi
  teacher_can_lock: boolean; // o'qituvchi/sinf rahbari bloklay oladimi
  teacher_can_unlock: boolean; // o'qituvchi/sinf rahbari kod bilan ocha oladimi
  show_message_on_lock: boolean; // bloklaganda ekranga xabar chiqarilsinmi
}
const DEFAULT_SETTINGS: LabSettings = {
  lock_message: "Bu kompyuter vaqtincha bloklandi. Ochish uchun navbatchi o'qituvchi yoki administratorga murojaat qiling.",
  code_digits: 4,
  teacher_can_lock: true,
  teacher_can_unlock: true,
  show_message_on_lock: true,
};
async function getSettings(): Promise<LabSettings> {
  const row = await queryOne<{ data: Partial<LabSettings> }>("SELECT data FROM lab_settings WHERE id = 1").catch(() => null);
  return { ...DEFAULT_SETTINGS, ...(row?.data ?? {}) };
}

// ─── Yordamchilar ───────────────────────────────────────────────────────────
type AuthUser = Record<string, unknown> & { role: string; login: string; full_name?: string };

function authAs(req: Request, roles: string[]): AuthUser | null {
  const u = getAuthUser(req.headers.authorization) as AuthUser | null;
  if (!u || !roles.includes(String(u.role))) return null;
  return u;
}
function isManager(u: AuthUser): boolean {
  return MANAGE.includes(String(u.role));
}
function actorName(u: AuthUser): string {
  return `${u.full_name ?? u.login} (${u.role})`;
}
function makeCode(digits: number): string {
  const n = Math.max(3, Math.min(8, digits || 4));
  const max = 10 ** n;
  return String(crypto.randomInt(0, max)).padStart(n, "0");
}
async function logEvent(computerId: string | null, name: string, action: string, detail: string, actor: string): Promise<void> {
  await query(
    "INSERT INTO lab_events (computer_id, computer_name, action, detail, actor) VALUES ($1,$2,$3,$4,$5)",
    [computerId, name, action, detail, actor]
  ).catch(() => {});
}
async function enqueue(computerId: string, action: string, payload: Record<string, unknown>, by: string): Promise<void> {
  await query(
    "INSERT INTO lab_commands (computer_id, action, payload, created_by) VALUES ($1,$2,$3,$4)",
    [computerId, action, JSON.stringify(payload), by]
  );
}

interface ComputerRow {
  id: string;
  room_id: string | null;
  name: string;
  host: string;
  status: string;
  locked: boolean;
  unlock_code: string;
  locked_by: string;
  locked_at: string | null;
  active_user: string;
  last_seen: string | null;
  note: string;
}

/** Foydalanuvchiga yuboriladigan ko'rinish (kodni faqat rahbariyat ko'radi) */
function viewComputer(c: ComputerRow, manager: boolean) {
  const seen = c.last_seen ? new Date(c.last_seen).getTime() : 0;
  const online = c.status === "online" && Date.now() - seen < ONLINE_WINDOW_MS;
  return {
    id: c.id,
    room_id: c.room_id,
    name: c.name,
    host: c.host,
    online,
    locked: c.locked,
    locked_by: c.locked_by,
    locked_at: c.locked_at,
    current_user: c.active_user,
    last_seen: c.last_seen,
    note: c.note,
    unlock_code: manager ? c.unlock_code : undefined,
  };
}

// ═══════════════════════════ RAHBARIYAT / O'QITUVCHI ═══════════════════════════

// GET /api/lab/overview — xonalar + kompyuterlar + sozlama + hisob
router.get("/lab/overview", async (req, res): Promise<void> => {
  const u = authAs(req, CONTROL);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const manager = isManager(u);
  const [rooms, comps, settings] = await Promise.all([
    query<{ id: string; name: string; note: string }>("SELECT id, name, note FROM lab_rooms ORDER BY name"),
    query<ComputerRow>("SELECT * FROM lab_computers ORDER BY name"),
    getSettings(),
  ]);
  const computers = comps.map((c) => viewComputer(c, manager));
  const online = computers.filter((c) => c.online).length;
  const locked = computers.filter((c) => c.locked).length;
  res.json({
    manager,
    settings: manager ? settings : { teacher_can_lock: settings.teacher_can_lock, teacher_can_unlock: settings.teacher_can_unlock },
    rooms,
    computers,
    counts: { total: computers.length, online, offline: computers.length - online, locked },
  });
});

// GET /api/lab/events — jurnal
router.get("/lab/events", async (req, res): Promise<void> => {
  const u = authAs(req, CONTROL);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const rows = await query(
    "SELECT computer_name, action, detail, actor, created_at FROM lab_events ORDER BY created_at DESC LIMIT 100"
  );
  res.json(rows);
});

// ─── Xonalar (rahbariyat) ─────────────────────────────────────────────────
router.post("/lab/rooms", async (req, res): Promise<void> => {
  const u = authAs(req, MANAGE);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const { name, note } = req.body as { name?: string; note?: string };
  if (!name || !name.trim()) { res.status(400).json({ error: "Xona nomi kerak" }); return; }
  const row = await queryOne<{ id: string }>(
    "INSERT INTO lab_rooms (name, note) VALUES ($1,$2) RETURNING id",
    [name.trim(), (note ?? "").trim()]
  );
  res.json({ ok: true, id: row?.id });
});
router.patch("/lab/rooms/:id", async (req, res): Promise<void> => {
  const u = authAs(req, MANAGE);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const { name, note } = req.body as { name?: string; note?: string };
  await query("UPDATE lab_rooms SET name = COALESCE($2, name), note = COALESCE($3, note) WHERE id = $1", [
    req.params.id, name?.trim() ?? null, note?.trim() ?? null,
  ]);
  res.json({ ok: true });
});
router.delete("/lab/rooms/:id", async (req, res): Promise<void> => {
  const u = authAs(req, MANAGE);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  await query("DELETE FROM lab_rooms WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

// ─── Kompyuterlar (rahbariyat) ────────────────────────────────────────────
router.post("/lab/computers", async (req, res): Promise<void> => {
  const u = authAs(req, MANAGE);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const { name, host, room_id, note } = req.body as { name?: string; host?: string; room_id?: string | null; note?: string };
  if (!name || !name.trim()) { res.status(400).json({ error: "Kompyuter nomi kerak" }); return; }
  if (!host || !host.trim()) { res.status(400).json({ error: "IP yoki hostname kerak" }); return; }
  try {
    const row = await queryOne<{ id: string }>(
      "INSERT INTO lab_computers (name, host, room_id, note) VALUES ($1,$2,$3,$4) RETURNING id",
      [name.trim(), host.trim(), room_id || null, (note ?? "").trim()]
    );
    await logEvent(row?.id ?? null, name.trim(), "add", host.trim(), actorName(u));
    res.json({ ok: true, id: row?.id });
  } catch (e) {
    const msg = (e as { code?: string }).code === "23505" ? "Bu IP/host allaqachon qo'shilgan" : (e as Error).message;
    res.status(400).json({ error: msg });
  }
});
router.patch("/lab/computers/:id", async (req, res): Promise<void> => {
  const u = authAs(req, MANAGE);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const { name, host, room_id, note } = req.body as { name?: string; host?: string; room_id?: string | null; note?: string };
  await query(
    `UPDATE lab_computers SET
       name = COALESCE($2, name), host = COALESCE($3, host),
       room_id = $4, note = COALESCE($5, note), updated_at = NOW()
     WHERE id = $1`,
    [req.params.id, name?.trim() ?? null, host?.trim() ?? null, room_id === undefined ? null : (room_id || null), note?.trim() ?? null]
  );
  res.json({ ok: true });
});
router.delete("/lab/computers/:id", async (req, res): Promise<void> => {
  const u = authAs(req, MANAGE);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const c = await queryOne<{ name: string }>("SELECT name FROM lab_computers WHERE id = $1", [req.params.id]);
  await query("DELETE FROM lab_computers WHERE id = $1", [req.params.id]);
  await logEvent(null, c?.name ?? "", "remove", "", actorName(u));
  res.json({ ok: true });
});

// ─── Bloklash / Ochish ─────────────────────────────────────────────────────

async function lockOne(c: ComputerRow, u: AuthUser, s: LabSettings, message: string): Promise<string> {
  const code = makeCode(s.code_digits);
  await query(
    "UPDATE lab_computers SET locked = TRUE, unlock_code = $2, locked_by = $3, locked_at = NOW(), updated_at = NOW() WHERE id = $1",
    [c.id, code, actorName(u)]
  );
  await enqueue(c.id, "lock", { message: s.show_message_on_lock ? message : "" }, actorName(u));
  await logEvent(c.id, c.name, "lock", "", actorName(u));
  return code;
}

// POST /api/lab/computers/:id/lock  { message? }
router.post("/lab/computers/:id/lock", async (req, res): Promise<void> => {
  const u = authAs(req, CONTROL);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const s = await getSettings();
  if (!isManager(u) && !s.teacher_can_lock) { res.status(403).json({ error: "O'qituvchilarga bloklash yoqilmagan" }); return; }
  const c = await queryOne<ComputerRow>("SELECT * FROM lab_computers WHERE id = $1", [req.params.id]);
  if (!c) { res.status(404).json({ error: "Kompyuter topilmadi" }); return; }
  const message = ((req.body as { message?: string }).message ?? s.lock_message).slice(0, 400);
  const code = await lockOne(c, u, s, message);
  res.json({ ok: true, code: isManager(u) ? code : undefined });
});

// POST /api/lab/computers/:id/unlock  { code, force? }
router.post("/lab/computers/:id/unlock", async (req, res): Promise<void> => {
  const u = authAs(req, CONTROL);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const s = await getSettings();
  const manager = isManager(u);
  if (!manager && !s.teacher_can_unlock) { res.status(403).json({ error: "O'qituvchilarga ochish yoqilmagan" }); return; }
  const c = await queryOne<ComputerRow>("SELECT * FROM lab_computers WHERE id = $1", [req.params.id]);
  if (!c) { res.status(404).json({ error: "Kompyuter topilmadi" }); return; }
  const { code, force } = req.body as { code?: string; force?: boolean };
  const bypass = manager && force === true; // rahbar kodsiz ham ocha oladi
  if (!bypass) {
    if (!c.unlock_code) { res.status(400).json({ error: "Kod topilmadi — rahbariyat kodni qayta chiqarsin" }); return; }
    if (!code || String(code).trim() !== c.unlock_code) {
      await logEvent(c.id, c.name, "unlock_fail", "kod noto'g'ri", actorName(u));
      res.status(403).json({ error: "Kod noto'g'ri" });
      return;
    }
  }
  await query(
    "UPDATE lab_computers SET locked = FALSE, unlock_code = '', locked_by = '', locked_at = NULL, updated_at = NOW() WHERE id = $1",
    [c.id]
  );
  await enqueue(c.id, "unlock", {}, actorName(u));
  await logEvent(c.id, c.name, "unlock", bypass ? "kodsiz (rahbar)" : "kod bilan", actorName(u));
  res.json({ ok: true });
});

// POST /api/lab/computers/:id/code — kodni qayta chiqarish (rahbariyat)
router.post("/lab/computers/:id/code", async (req, res): Promise<void> => {
  const u = authAs(req, MANAGE);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const s = await getSettings();
  const c = await queryOne<ComputerRow>("SELECT * FROM lab_computers WHERE id = $1", [req.params.id]);
  if (!c) { res.status(404).json({ error: "Kompyuter topilmadi" }); return; }
  const code = makeCode(s.code_digits);
  await query("UPDATE lab_computers SET unlock_code = $2, updated_at = NOW() WHERE id = $1", [c.id, code]);
  await logEvent(c.id, c.name, "code", "kod yangilandi", actorName(u));
  res.json({ ok: true, code });
});

// POST /api/lab/computers/:id/action  { action: reboot|poweroff|logoff|message, message? }
const DIRECT_ACTIONS = ["reboot", "poweroff", "logoff", "message"];
router.post("/lab/computers/:id/action", async (req, res): Promise<void> => {
  const u = authAs(req, MANAGE);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const { action, message } = req.body as { action?: string; message?: string };
  if (!action || !DIRECT_ACTIONS.includes(action)) { res.status(400).json({ error: "Noto'g'ri amal" }); return; }
  const c = await queryOne<ComputerRow>("SELECT * FROM lab_computers WHERE id = $1", [req.params.id]);
  if (!c) { res.status(404).json({ error: "Kompyuter topilmadi" }); return; }
  await enqueue(c.id, action, action === "message" ? { message: (message ?? "").slice(0, 400) } : {}, actorName(u));
  await logEvent(c.id, c.name, action, (message ?? "").slice(0, 120), actorName(u));
  res.json({ ok: true });
});

// ─── Xona bo'yicha ommaviy (bulk) ──────────────────────────────────────────
// POST /api/lab/rooms/:id/lock  → xonadagi hamma kompyuter, BITTA umumiy kod
router.post("/lab/rooms/:id/lock", async (req, res): Promise<void> => {
  const u = authAs(req, CONTROL);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const s = await getSettings();
  if (!isManager(u) && !s.teacher_can_lock) { res.status(403).json({ error: "O'qituvchilarga bloklash yoqilmagan" }); return; }
  const comps = await query<ComputerRow>("SELECT * FROM lab_computers WHERE room_id = $1", [req.params.id]);
  if (comps.length === 0) { res.status(404).json({ error: "Xonada kompyuter yo'q" }); return; }
  const code = makeCode(s.code_digits);
  const message = ((req.body as { message?: string }).message ?? s.lock_message).slice(0, 400);
  for (const c of comps) {
    await query(
      "UPDATE lab_computers SET locked = TRUE, unlock_code = $2, locked_by = $3, locked_at = NOW(), updated_at = NOW() WHERE id = $1",
      [c.id, code, actorName(u)]
    );
    await enqueue(c.id, "lock", { message: s.show_message_on_lock ? message : "" }, actorName(u));
  }
  await logEvent(null, `Xona (${comps.length} ta)`, "lock", "ommaviy", actorName(u));
  res.json({ ok: true, code: isManager(u) ? code : undefined, count: comps.length });
});

// POST /api/lab/rooms/:id/unlock  { code, force? }
router.post("/lab/rooms/:id/unlock", async (req, res): Promise<void> => {
  const u = authAs(req, CONTROL);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const s = await getSettings();
  const manager = isManager(u);
  if (!manager && !s.teacher_can_unlock) { res.status(403).json({ error: "O'qituvchilarga ochish yoqilmagan" }); return; }
  const comps = await query<ComputerRow>("SELECT * FROM lab_computers WHERE room_id = $1 AND locked = TRUE", [req.params.id]);
  const { code, force } = req.body as { code?: string; force?: boolean };
  const bypass = manager && force === true;
  let count = 0;
  for (const c of comps) {
    if (!bypass && (!c.unlock_code || String(code ?? "").trim() !== c.unlock_code)) continue;
    await query(
      "UPDATE lab_computers SET locked = FALSE, unlock_code = '', locked_by = '', locked_at = NULL, updated_at = NOW() WHERE id = $1",
      [c.id]
    );
    await enqueue(c.id, "unlock", {}, actorName(u));
    count++;
  }
  if (count === 0 && !bypass) { res.status(403).json({ error: "Kod noto'g'ri (yoki bloklangan kompyuter yo'q)" }); return; }
  await logEvent(null, `Xona (${count} ta)`, "unlock", bypass ? "kodsiz (rahbar)" : "kod bilan", actorName(u));
  res.json({ ok: true, count });
});

// ─── Sozlamalar (rahbariyat) ───────────────────────────────────────────────
router.get("/lab/settings", async (req, res): Promise<void> => {
  const u = authAs(req, MANAGE);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  res.json(await getSettings());
});
router.post("/lab/settings", async (req, res): Promise<void> => {
  const u = authAs(req, MANAGE);
  if (!u) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }
  const cur = await getSettings();
  const b = req.body as Partial<LabSettings>;
  const next: LabSettings = {
    lock_message: typeof b.lock_message === "string" ? b.lock_message.slice(0, 400) : cur.lock_message,
    code_digits: typeof b.code_digits === "number" && b.code_digits >= 3 && b.code_digits <= 8 ? Math.round(b.code_digits) : cur.code_digits,
    teacher_can_lock: typeof b.teacher_can_lock === "boolean" ? b.teacher_can_lock : cur.teacher_can_lock,
    teacher_can_unlock: typeof b.teacher_can_unlock === "boolean" ? b.teacher_can_unlock : cur.teacher_can_unlock,
    show_message_on_lock: typeof b.show_message_on_lock === "boolean" ? b.show_message_on_lock : cur.show_message_on_lock,
  };
  await query(
    `INSERT INTO lab_settings (id, data, updated_at) VALUES (1, $1, NOW())
     ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW()`,
    [JSON.stringify(next)]
  );
  res.json({ ok: true, settings: next });
});

// ═══════════════════════════════ KO'PRIK (BRIDGE) ══════════════════════════════
// O'qituvchi kompyuteridagi dastur. LAB_BRIDGE_SECRET bilan tekshiriladi.

function bridgeOk(req: Request): boolean {
  if (!BRIDGE_SECRET) return false;
  const got = req.headers["x-lab-secret"];
  const a = Buffer.from(String(got ?? ""));
  const b = Buffer.from(BRIDGE_SECRET);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// GET /api/lab/agent/poll — kutayotgan buyruqlar + kompyuterlar ro'yxati
router.get("/lab/agent/poll", async (req, res): Promise<void> => {
  if (!BRIDGE_SECRET) { res.status(503).json({ error: "LAB_BRIDGE_SECRET sozlanmagan" }); return; }
  if (!bridgeOk(req)) { res.status(401).json({ error: "Noto'g'ri maxfiy kalit" }); return; }
  const computers = await query<{ id: string; name: string; host: string }>(
    "SELECT id, name, host FROM lab_computers ORDER BY name"
  );
  // Kutayotganlarni olamiz va "picked" deb belgilaymiz (2 daqiqada javob bo'lmasa qayta beriladi)
  const cmds = await query<{ id: string; computer_id: string; host: string; action: string; payload: unknown }>(
    `UPDATE lab_commands c SET status = 'picked', picked_at = NOW()
       FROM lab_computers pc
      WHERE c.computer_id = pc.id
        AND (c.status = 'pending' OR (c.status = 'picked' AND c.picked_at < NOW() - INTERVAL '2 minutes'))
      RETURNING c.id, c.computer_id, pc.host AS host, c.action, c.payload`
  );
  res.json({ commands: cmds, computers });
});

// POST /api/lab/agent/report — bajarilgan buyruqlar natijasi + holat
router.post("/lab/agent/report", async (req, res): Promise<void> => {
  if (!BRIDGE_SECRET) { res.status(503).json({ error: "LAB_BRIDGE_SECRET sozlanmagan" }); return; }
  if (!bridgeOk(req)) { res.status(401).json({ error: "Noto'g'ri maxfiy kalit" }); return; }
  const { results, statuses } = req.body as {
    results?: { id: string; ok: boolean; error?: string }[];
    statuses?: { host: string; online: boolean; current_user?: string }[];
  };
  for (const r of results ?? []) {
    await query(
      "UPDATE lab_commands SET status = $2, result = $3, done_at = NOW() WHERE id = $1",
      [r.id, r.ok ? "done" : "failed", (r.error ?? "").slice(0, 200)]
    ).catch(() => {});
  }
  for (const s of statuses ?? []) {
    await query(
      `UPDATE lab_computers SET status = $2, active_user = COALESCE($3, active_user), last_seen = NOW(), updated_at = NOW()
        WHERE host = $1`,
      [s.host, s.online ? "online" : "offline", s.current_user ?? null]
    ).catch(() => {});
  }
  res.json({ ok: true });
});

export default router;

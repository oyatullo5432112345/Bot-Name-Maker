-- ============================================================
-- 013 — KOMPYUTER SINFI BOSHQARUVI (Veyon bilan)
-- Maktab kompyuterlari platformadan boshqariladi: holat, bloklash/ochish,
-- aylanuvchi ochish kodi, jurnal. Amaliy qulflashni Veyon bajaradi,
-- platforma <-> Veyon o'rtasida "ko'prik" (bridge) dasturi turadi.
-- ============================================================

CREATE TABLE IF NOT EXISTS lab_rooms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_computers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID REFERENCES lab_rooms(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,                 -- ko'rinadigan nom, masalan "PC-01"
  host         TEXT NOT NULL,                 -- IP yoki hostname (Veyon shu orqali topadi)
  status       TEXT NOT NULL DEFAULT 'unknown', -- online | offline | unknown
  locked       BOOLEAN NOT NULL DEFAULT FALSE,
  unlock_code  TEXT NOT NULL DEFAULT '',      -- joriy ochish kodi (bloklanganda yangi beriladi)
  locked_by    TEXT NOT NULL DEFAULT '',
  locked_at    TIMESTAMPTZ,
  current_user TEXT NOT NULL DEFAULT '',      -- kompyuterda kim tizimga kirgan (bridge yuboradi)
  last_seen    TIMESTAMPTZ,
  note         TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (host)
);
CREATE INDEX IF NOT EXISTS idx_lab_computers_room ON lab_computers(room_id);

-- Buyruqlar navbati: platforma yozadi, ko'prik o'qiydi va bajaradi
CREATE TABLE IF NOT EXISTS lab_commands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  computer_id UUID NOT NULL REFERENCES lab_computers(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,                  -- lock | unlock | message | reboot | poweroff | logoff | demo_stop
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | done | failed | expired
  result      TEXT NOT NULL DEFAULT '',
  created_by  TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  picked_at   TIMESTAMPTZ,
  done_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_lab_commands_pending ON lab_commands(status, created_at);
CREATE INDEX IF NOT EXISTS idx_lab_commands_computer ON lab_commands(computer_id, created_at DESC);

-- Jurnal (kim nima qildi)
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
);

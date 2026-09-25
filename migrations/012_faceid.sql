-- ============================================================
-- 012 — FACE ID: maktabga kirishda yuz orqali davomat
-- Rasm SAQLANMAYDI — faqat yuzning raqamli izi (128 ta son, "descriptor").
-- Undan rasmni qayta tiklab bo'lmaydi. Ota-ona roziligi majburiy.
-- ============================================================

CREATE TABLE IF NOT EXISTS face_profiles (
  student_login TEXT PRIMARY KEY,
  descriptors   JSONB NOT NULL,                 -- [[128 son], [128 son], ...] — 1..8 ta namuna (turli burchak)
  consent       BOOLEAN NOT NULL DEFAULT FALSE, -- ota-ona roziligi olingan
  consent_by    TEXT NOT NULL DEFAULT '',       -- rozilikni tasdiqlagan xodim logini
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
  status        TEXT NOT NULL DEFAULT 'present', -- present | late
  distance      REAL,
  device        TEXT NOT NULL DEFAULT '',
  UNIQUE (student_login, date)
);
CREATE INDEX IF NOT EXISTS idx_face_checkins_date ON face_checkins(date, class_name);

-- Keldi / ketdi: ketish vaqti va "erta ketdi" belgisi
ALTER TABLE face_checkins ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;
ALTER TABLE face_checkins ADD COLUMN IF NOT EXISTS left_early BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE face_checkins ALTER COLUMN checked_at DROP NOT NULL;

CREATE TABLE IF NOT EXISTS face_settings (
  id         SMALLINT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

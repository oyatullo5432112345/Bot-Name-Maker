-- ================================================================
-- TALIM PLATFORM — Supabase SQL Setup
-- Supabase Dashboard → SQL Editor → Run
-- ================================================================

-- ── 1. O'QUVCHILAR JADVALI ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  telegram_id BIGINT PRIMARY KEY,
  full_name   TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  class_name  TEXT NOT NULL,
  login       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  registration_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_class ON users(class_name);

-- ── 2. SINFLAR JADVALI ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  teacher_id UUID,           -- sinf rahbari (staff.id)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name);

-- ── 3. XODIMLAR JADVALI ─────────────────────────────────────────
-- Rollar: admin | director | zam_direktor | zavuch | teacher
CREATE TABLE IF NOT EXISTS staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE,          -- Telegram bot orqali kirilganda to'ldiriladi
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin','director','zam_direktor','zavuch','teacher')),
  class_id    UUID REFERENCES classes(id) ON DELETE SET NULL,
  login       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- classes.teacher_id → staff.id munosabati
ALTER TABLE classes
  ADD CONSTRAINT fk_classes_teacher
  FOREIGN KEY (teacher_id) REFERENCES staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_staff_role        ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_telegram_id ON staff(telegram_id);
CREATE INDEX IF NOT EXISTS idx_staff_class_id    ON staff(class_id);

-- ── 4. ROW LEVEL SECURITY — O'CHIRISH ──────────────────────────
-- Bot server tarafdan ishlaganida RLS kerak emas
ALTER TABLE users   DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff   DISABLE ROW LEVEL SECURITY;

-- ================================================================
-- TAYYOR! Jadvallar yaratildi.
-- ================================================================

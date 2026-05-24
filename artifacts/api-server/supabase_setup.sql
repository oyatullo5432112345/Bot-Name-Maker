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

-- Agar eski versiyada login ustuni bo'lsa, o'chirish:
ALTER TABLE classes DROP COLUMN IF EXISTS login;

CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name);

-- ── 3. XODIMLAR JADVALI ─────────────────────────────────────────
-- Rollar: admin | director | zam_direktor | zavuch | sinf_rahbari | teacher | kutubxonachi
CREATE TABLE IF NOT EXISTS staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL,
  class_id    UUID REFERENCES classes(id) ON DELETE SET NULL,
  login       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Rol CHECK constraintni yangilash (sinf_rahbari va kutubxonachi qo'shish)
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE staff ADD CONSTRAINT staff_role_check
  CHECK (role IN ('admin','director','zam_direktor','zavuch','sinf_rahbari','teacher','kutubxonachi'));

-- classes.teacher_id → staff.id munosabati
ALTER TABLE classes
  ADD CONSTRAINT fk_classes_teacher
  FOREIGN KEY (teacher_id) REFERENCES staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_staff_role        ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_telegram_id ON staff(telegram_id);
CREATE INDEX IF NOT EXISTS idx_staff_class_id    ON staff(class_id);

-- ── 4. FAN-O'QITUVCHI BIRIKMALARI ───────────────────────────────
-- Qaysi o'qituvchi qaysi sinfga qaysi fandan dars beradi
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, class_id, subject)
);

CREATE INDEX IF NOT EXISTS idx_ts_teacher ON teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ts_class   ON teacher_subjects(class_id);

-- ── 5. ROW LEVEL SECURITY — O'CHIRISH ──────────────────────────
ALTER TABLE users            DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes          DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff            DISABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects DISABLE ROW LEVEL SECURITY;

-- ================================================================
-- TAYYOR! Jadvallar yaratildi/yangilandi.
-- ================================================================

-- ── MIGRATION (mavjud DB uchun) ─────────────────────────────────
-- Agar siz avval jadvallarni yaratgan bo'lsangiz va
-- yangilashingiz kerak bo'lsa, quyidagi SQL ni alohida ishga tushiring:
--
-- ALTER TABLE classes DROP COLUMN IF EXISTS login;
-- ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;
-- ALTER TABLE staff ADD CONSTRAINT staff_role_check
--   CHECK (role IN ('admin','director','zam_direktor','zavuch','sinf_rahbari','teacher','kutubxonachi'));
-- CREATE TABLE IF NOT EXISTS teacher_subjects (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   teacher_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
--   class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
--   subject TEXT NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   UNIQUE(teacher_id, class_id, subject)
-- );
-- ALTER TABLE teacher_subjects DISABLE ROW LEVEL SECURITY;

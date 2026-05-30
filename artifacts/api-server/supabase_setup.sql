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
  teacher_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE classes DROP COLUMN IF EXISTS login;

CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name);

-- ── 3. XODIMLAR JADVALI ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL,
  class_id    UUID,
  login       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  subjects    TEXT[] DEFAULT '{}',
  can_teach   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Mavjud jadvalga yangi ustunlarni qo'shish (agar yo'q bo'lsa)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT '{}';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS can_teach BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE staff ADD CONSTRAINT staff_role_check
  CHECK (role IN ('admin','director','zam_direktor','zavuch','sinf_rahbari','teacher','kutubxonachi'));

CREATE INDEX IF NOT EXISTS idx_staff_role        ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_telegram_id ON staff(telegram_id);
CREATE INDEX IF NOT EXISTS idx_staff_class_id    ON staff(class_id);

-- ── 4. FOREIGN KEY CONSTRAINTLAR ────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'staff_class_id_fkey'
      AND table_name = 'staff'
  ) THEN
    ALTER TABLE staff
      ADD CONSTRAINT staff_class_id_fkey
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_classes_teacher'
      AND table_name = 'classes'
  ) THEN
    ALTER TABLE classes
      ADD CONSTRAINT fk_classes_teacher
      FOREIGN KEY (teacher_id) REFERENCES staff(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 5. FAN-O'QITUVCHI BIRIKMALARI ───────────────────────────────
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

-- ── 6. O'YIN BALLARI JADVALI ────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_scores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_login  TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  class_name  TEXT NOT NULL DEFAULT '',
  game_id     TEXT NOT NULL CHECK (game_id IN ('sozoyini','jumboq','arqon','poyga')),
  score_change INTEGER NOT NULL DEFAULT 0,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_scores_user   ON game_scores(user_login);
CREATE INDEX IF NOT EXISTS idx_game_scores_game   ON game_scores(game_id);

-- ── 7. ROW LEVEL SECURITY — O'CHIRISH ───────────────────────────
ALTER TABLE users            DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes          DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff            DISABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores      DISABLE ROW LEVEL SECURITY;

-- ================================================================
-- TAYYOR!
-- ================================================================

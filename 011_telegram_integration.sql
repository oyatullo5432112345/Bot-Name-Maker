-- ============================================================
-- 011 — TELEGRAM INTEGRATSIYASI (guruhlar, kanallar, rejalashtirilgan postlar)
-- ============================================================

-- Bot ulangan guruh va kanallar.
--   purpose = 'class'    → sinf guruhi (class_id majburiy)
--   purpose = 'school'   → maktab rasmiy kanali / umumiy guruh
--   purpose = 'teachers' → o'qituvchilar guruhi
CREATE TABLE IF NOT EXISTS tg_chats (
  chat_id     BIGINT PRIMARY KEY,
  chat_type   TEXT NOT NULL DEFAULT 'group',
  title       TEXT NOT NULL DEFAULT '',
  purpose     TEXT NOT NULL DEFAULT 'class'
                CHECK (purpose IN ('class', 'school', 'teachers')),
  class_id    UUID REFERENCES classes(id) ON DELETE SET NULL,
  settings    JSONB NOT NULL DEFAULT '{"morning_schedule": true, "birthdays": true, "weekly_top": true}'::jsonb,
  linked_by   BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tg_chats_class_id ON tg_chats(class_id);
CREATE INDEX IF NOT EXISTS idx_tg_chats_purpose  ON tg_chats(purpose);

-- Rejalashtirilgan ishlar bir kunda ikki marta ishlamasligi uchun
-- (server qayta ishga tushsa ham). job_key misol: "morning:2026-09-25".
CREATE TABLE IF NOT EXISTS tg_job_runs (
  job_key    TEXT PRIMARY KEY,
  ran_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Davomat jadvali — routes/attendance.ts ishlatadi, lekin migratsiyalarda
-- yaratilmagan edi (yangi bazada davomat 500 xato berardi).
CREATE TABLE IF NOT EXISTS attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      UUID,
  class_name    TEXT NOT NULL DEFAULT '',
  student_login TEXT NOT NULL,
  student_name  TEXT NOT NULL DEFAULT '',
  date          DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'present',
  note          TEXT NOT NULL DEFAULT '',
  teacher_login TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_login, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, date);

-- E'lonlar — routes/announcements.ts ishlatadigan ustunlar
-- (migrate.mjs dagi eski jadvalda faqat title/body bor edi).
CREATE TABLE IF NOT EXISTS announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  author_id  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS content      TEXT NOT NULL DEFAULT '';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_name  TEXT NOT NULL DEFAULT '';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_login TEXT NOT NULL DEFAULT '';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS role_filter  TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS pinned       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS priority     TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS tg_published BOOLEAN NOT NULL DEFAULT FALSE;

-- Tug'ilgan kun ustunlari (migrate.mjs EXTRA_SQL da ham bor — bu yerda
-- ham qo'yamiz, chunki bu fayl undan oldin ishlaydi).
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS birthday DATE;

CREATE INDEX IF NOT EXISTS idx_grades_student_login ON grades(student_login);
CREATE INDEX IF NOT EXISTS idx_grades_created_at    ON grades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id    ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_staff_telegram_id    ON staff(telegram_id);

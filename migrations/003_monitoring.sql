-- ============================================================
-- CHORAK MONITORING TESTI — har chorakda, har fandan 1 marta
-- o'tkaziladigan test tizimi. Anonim rejimni ham qo'llab-quvvatlaydi.
-- ============================================================

CREATE TABLE IF NOT EXISTS monitoring_tests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  subject           TEXT NOT NULL,
  class_name        TEXT,                 -- NULL = barcha sinflar uchun
  quarter           INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  academic_year     TEXT NOT NULL,         -- masalan '2025-2026'
  duration_minutes  INTEGER NOT NULL DEFAULT 30,
  is_anonymous      BOOLEAN NOT NULL DEFAULT FALSE,
  show_result_immediately BOOLEAN NOT NULL DEFAULT TRUE,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed')),
  opens_at          TIMESTAMPTZ,
  closes_at         TIMESTAMPTZ,
  created_by_login  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_tests_status  ON monitoring_tests(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_tests_subject ON monitoring_tests(subject);
CREATE INDEX IF NOT EXISTS idx_monitoring_tests_class   ON monitoring_tests(class_name);

CREATE TABLE IF NOT EXISTS monitoring_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id       UUID NOT NULL REFERENCES monitoring_tests(id) ON DELETE CASCADE,
  question      TEXT NOT NULL,
  options       JSONB NOT NULL,          -- ["variant A", "variant B", ...]
  correct_index INTEGER NOT NULL,
  order_index   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_monitoring_questions_test_id ON monitoring_questions(test_id);

CREATE TABLE IF NOT EXISTS monitoring_attempts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id        UUID NOT NULL REFERENCES monitoring_tests(id) ON DELETE CASCADE,
  student_login  TEXT NOT NULL,
  student_name   TEXT NOT NULL,
  class_name     TEXT NOT NULL,
  answers        JSONB NOT NULL,          -- [chosen_index, chosen_index, ...]
  score          INTEGER NOT NULL,
  total          INTEGER NOT NULL,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (test_id, student_login)         -- har o'quvchi bitta testni faqat 1 marta ishlaydi
);

CREATE INDEX IF NOT EXISTS idx_monitoring_attempts_test_id ON monitoring_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_attempts_student ON monitoring_attempts(student_login);

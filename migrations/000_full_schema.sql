-- ============================================================
-- Talim Platform — To'liq ma'lumotlar bazasi sxemasi
-- ============================================================

-- 1. SINFLAR
CREATE TABLE IF NOT EXISTS classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  teacher_id  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. O'QUVCHILAR (users)
CREATE TABLE IF NOT EXISTS users (
  telegram_id       BIGINT PRIMARY KEY,
  full_name         TEXT NOT NULL,
  phone_number      TEXT NOT NULL DEFAULT '',
  class_name        TEXT NOT NULL DEFAULT '',
  login             TEXT NOT NULL UNIQUE,
  password          TEXT NOT NULL DEFAULT '',
  registration_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. XODIMLAR (staff)
CREATE TABLE IF NOT EXISTS staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN (
                'admin','director','mudir','zam_direktor','zavuch',
                'sinf_rahbari','teacher','kutubxonachi')),
  class_id    UUID REFERENCES classes(id) ON DELETE SET NULL,
  login       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL DEFAULT '',
  telegram_id BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subjects    TEXT[] NOT NULL DEFAULT '{}',
  can_teach   BOOLEAN NOT NULL DEFAULT FALSE
);

-- classes.teacher_id -> staff.id (deferred FK)
ALTER TABLE classes
  DROP CONSTRAINT IF EXISTS classes_teacher_id_fkey;
ALTER TABLE classes
  ADD CONSTRAINT classes_teacher_id_fkey
  FOREIGN KEY (teacher_id) REFERENCES staff(id) ON DELETE SET NULL;

-- 4. DARS JADVALI
CREATE TABLE IF NOT EXISTS timetable (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
  period       INTEGER NOT NULL CHECK (period BETWEEN 1 AND 8),
  subject      TEXT NOT NULL,
  teacher_id   UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_id, day_of_week, period)
);

-- 5. BAHOLAR
CREATE TABLE IF NOT EXISTS grades (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_login TEXT NOT NULL,
  student_name  TEXT NOT NULL,
  class_name    TEXT NOT NULL,
  subject       TEXT NOT NULL,
  grade         INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 5),
  comment       TEXT NOT NULL DEFAULT '',
  teacher_login TEXT NOT NULL,
  teacher_name  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- 6. KUTUBXONA — KITOBLAR
CREATE TABLE IF NOT EXISTS library_books (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  author         TEXT NOT NULL DEFAULT '',
  category       TEXT NOT NULL DEFAULT 'boshqa'
                   CHECK (category IN ('darslik','badiiy','ilmiy','boshqa')),
  class_name     TEXT NOT NULL DEFAULT '',
  subject        TEXT NOT NULL DEFAULT '',
  quantity       INTEGER NOT NULL DEFAULT 1,
  available      INTEGER NOT NULL DEFAULT 1,
  isbn           TEXT NOT NULL DEFAULT '',
  published_year INTEGER,
  description    TEXT NOT NULL DEFAULT '',
  added_by       TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. KUTUBXONA — IJARALAR
CREATE TABLE IF NOT EXISTS library_loans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id        UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  student_name   TEXT NOT NULL,
  student_class  TEXT NOT NULL DEFAULT '',
  student_login  TEXT NOT NULL DEFAULT '',
  due_date       DATE NOT NULL,
  notes          TEXT NOT NULL DEFAULT '',
  issued_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  issued_by      TEXT NOT NULL DEFAULT '',
  returned_date  DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. O'YIN BALLARI
CREATE TABLE IF NOT EXISTS game_scores (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_login   TEXT NOT NULL,
  full_name    TEXT NOT NULL,
  class_name   TEXT NOT NULL DEFAULT '',
  game_id      TEXT NOT NULL CHECK (game_id IN ('sozoyini','jumboq','arqon','poyga')),
  score_change INTEGER NOT NULL,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. DARSLIKLAR (lessons)
CREATE TABLE IF NOT EXISTS lessons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  subject       TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  content       TEXT NOT NULL DEFAULT '',
  class_name    TEXT NOT NULL,
  teacher_login TEXT NOT NULL,
  teacher_name  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- 10. RO'YXATDAN O'TISH KODLARI
CREATE TABLE IF NOT EXISTS registration_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL,
  first_name  TEXT NOT NULL DEFAULT '',
  last_name   TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'student',
  class_id    UUID REFERENCES classes(id) ON DELETE SET NULL,
  class_name  TEXT,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. O'QITUVCHI FANLARI
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  subject    TEXT NOT NULL,
  class_id   UUID REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. OLIMPIADA — MAKTABLAR
CREATE TABLE IF NOT EXISTS olimpiada_maktablar (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomi       TEXT NOT NULL,
  tuman      TEXT NOT NULL DEFAULT '',
  jami_ball  INTEGER NOT NULL DEFAULT 0,
  yil        INTEGER NOT NULL DEFAULT 2026,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. OLIMPIADA — ISHTIROKCHILAR
CREATE TABLE IF NOT EXISTS olimpiada_ishtirokchilar (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maktab_id   UUID REFERENCES olimpiada_maktablar(id) ON DELETE CASCADE,
  maktab_nomi TEXT NOT NULL DEFAULT '',
  ism         TEXT NOT NULL,
  fan         TEXT NOT NULL,
  ball        INTEGER NOT NULL DEFAULT 0,
  orin        INTEGER,
  yil         INTEGER NOT NULL DEFAULT 2026,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEKSLAR (tezlik uchun)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_class_name         ON users(class_name);
CREATE INDEX IF NOT EXISTS idx_users_login              ON users(login);
CREATE INDEX IF NOT EXISTS idx_staff_role               ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_login              ON staff(login);
CREATE INDEX IF NOT EXISTS idx_timetable_class_id       ON timetable(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_teacher_id     ON timetable(teacher_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_login     ON grades(student_login);
CREATE INDEX IF NOT EXISTS idx_grades_teacher_login     ON grades(teacher_login);
CREATE INDEX IF NOT EXISTS idx_grades_class_name        ON grades(class_name);
CREATE INDEX IF NOT EXISTS idx_library_loans_book_id    ON library_loans(book_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_user_login   ON game_scores(user_login);
CREATE INDEX IF NOT EXISTS idx_game_scores_game_id      ON game_scores(game_id);
CREATE INDEX IF NOT EXISTS idx_lessons_class_name       ON lessons(class_name);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher_login    ON lessons(teacher_login);
CREATE INDEX IF NOT EXISTS idx_reg_codes_code           ON registration_codes(code);
CREATE INDEX IF NOT EXISTS idx_reg_codes_used           ON registration_codes(used);
CREATE INDEX IF NOT EXISTS idx_olimpiada_maktab_ball    ON olimpiada_maktablar(jami_ball DESC);
CREATE INDEX IF NOT EXISTS idx_olimpiada_ishtirok_maktab ON olimpiada_ishtirokchilar(maktab_id);

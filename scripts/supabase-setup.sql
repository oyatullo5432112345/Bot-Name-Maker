-- ============================================================
-- TALIM PLATFORM — Supabase jadvallarini yaratish
-- Supabase SQL Editor da bir marta ishga tushiring
-- ============================================================

-- 1. Sinflar jadvali
CREATE TABLE IF NOT EXISTS public.classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  teacher_id  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Xodimlar jadvali
CREATE TABLE IF NOT EXISTS public.staff (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id  BIGINT,
  full_name    TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('director','zam_direktor','zavuch','teacher')),
  class_id     UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  login        TEXT NOT NULL UNIQUE,
  password     TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. O'quvchilar jadvali
CREATE TABLE IF NOT EXISTS public.users (
  telegram_id        BIGINT PRIMARY KEY,
  full_name          TEXT NOT NULL,
  phone_number       TEXT NOT NULL,
  class_name         TEXT NOT NULL,
  login              TEXT NOT NULL UNIQUE,
  password           TEXT NOT NULL,
  registration_date  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Foreign key: classes.teacher_id → staff.id
ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_teacher_id_fkey;

ALTER TABLE public.classes
  ADD CONSTRAINT classes_teacher_id_fkey
  FOREIGN KEY (teacher_id) REFERENCES public.staff(id) ON DELETE SET NULL;

-- 5. Row Level Security — o'chirish (API server service key ishlatadi)
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users   DISABLE ROW LEVEL SECURITY;

-- Tekshirish
SELECT 'classes' AS jadval, COUNT(*) FROM public.classes
UNION ALL
SELECT 'staff',   COUNT(*) FROM public.staff
UNION ALL
SELECT 'users',   COUNT(*) FROM public.users;

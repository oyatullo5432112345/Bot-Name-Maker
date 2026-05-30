-- Kutubxona jadvallari — Supabase SQL Editor'da ishlatish uchun
-- Bu faylni Supabase Dashboard > SQL Editor'da bir marta ishga tushiring

CREATE TABLE IF NOT EXISTS library_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'boshqa',
  class_name TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  available INTEGER NOT NULL DEFAULT 1,
  isbn TEXT DEFAULT '',
  published_year INTEGER,
  description TEXT DEFAULT '',
  added_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS library_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_class TEXT DEFAULT '',
  student_login TEXT DEFAULT '',
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  returned_date DATE,
  issued_by TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) — ixtiyoriy, agar kerak bo'lsa
-- ALTER TABLE library_books ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE library_loans ENABLE ROW LEVEL SECURITY;

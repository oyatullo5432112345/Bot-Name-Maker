-- Supabase SQL Editor ga joylashtiring va Run tugmasini bosing

CREATE TABLE IF NOT EXISTS users (
  telegram_id BIGINT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  class_name TEXT NOT NULL,
  login TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  registration_date TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks: tezkor qidirish uchun
CREATE INDEX IF NOT EXISTS idx_users_class ON users(class_name);

-- Row Level Security o'chirish (bot server tarafdan ishlaydi)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

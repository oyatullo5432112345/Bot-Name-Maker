-- ============================================================
-- 014 — KIRISH (LOGIN) YANGILANDI
-- • Yuz (Face ID) orqali kirish + 5 xonali ID orqali kirish.
-- • Mahfiy kod bilan ro'yxatdan o'tish bekor qilinadi (kod endi kirishda ishlatilmaydi).
-- • Har bir foydalanuvchiga 5 xonali kirish IDsi beriladi (bo'sh — kerak bo'lganda beriladi).
-- login_id bo'sh ('') bo'lishi mumkin; unique faqat bo'sh bo'lmaganlarга nisbatan.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS login_id TEXT NOT NULL DEFAULT '';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS login_id TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login_id ON users(login_id) WHERE login_id <> '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_login_id ON staff(login_id) WHERE login_id <> '';

-- Kirish sozlamalari va admin kirish IDsi shu yerda saqlanadi
CREATE TABLE IF NOT EXISTS auth_settings (
  id         SMALLINT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

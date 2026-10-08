-- ============================================================
-- "BEK VA LOLA: SAYOHAT" — yakka tartibdagi ta'limiy o'yin
-- ------------------------------------------------------------
-- Har bir o'quvchi (yoki istalgan foydalanuvchi) uchun o'yin
-- holati JSONB bo'lib saqlanadi. Tanga mukofotlari esa alohida
-- jadvalda qayd etiladi — bu "tanga yig'ish" (farming) ni oldini
-- oladi: har bir viloyat uchun faqat bir marta (yaxshilansa —
-- faqat farqi) tanga beriladi.
-- ============================================================

-- O'yin holati (har foydalanuvchiga bitta satr)
CREATE TABLE IF NOT EXISTS sayohat_progress (
  user_login  TEXT PRIMARY KEY,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Viloyat mukofotlari (tanga ikki marta berilmasligi uchun)
--   stars  — shu viloyatda olingan eng yuqori yulduz (0..3)
--   tanga  — shu viloyat uchun HOZIRGACHA berilgan jami tanga
CREATE TABLE IF NOT EXISTS sayohat_rewards (
  user_login  TEXT NOT NULL,
  region_id   TEXT NOT NULL,
  stars       INTEGER NOT NULL DEFAULT 0,
  tanga       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_login, region_id)
);

CREATE INDEX IF NOT EXISTS idx_sayohat_rewards_user ON sayohat_rewards(user_login);

-- ============================================================
-- Viloyat ochilish vaqti (admin belgilaydi)
--   unlock_at = NULL  →  jadval bo'yicha (oldingisini yakunlagach ochiladi)
--   unlock_at bor     →  o'sha vaqtdan keyin hammaga ochiladi
-- ============================================================
CREATE TABLE IF NOT EXISTS sayohat_region_unlock (
  region_id   TEXT PRIMARY KEY,
  unlock_at   TIMESTAMPTZ,
  updated_by  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TANGA TIZIMI — Qo'shimcha tangalar (bonus, olimpiada, login, ...)
-- Grade-dan hisoblangan tangalar dinamik tarzda grades jadvalidan
-- ============================================================

CREATE TABLE IF NOT EXISTS tanga_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_login  TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'manual',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tanga_logs_user_login  ON tanga_logs(user_login);
CREATE INDEX IF NOT EXISTS idx_tanga_logs_source      ON tanga_logs(source);
CREATE INDEX IF NOT EXISTS idx_tanga_logs_created_at  ON tanga_logs(created_at DESC);

-- ============================================================
-- DO'KON — sotib olingan narsalar
-- ============================================================

CREATE TABLE IF NOT EXISTS shop_purchases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_login  TEXT NOT NULL,
  item_id     TEXT NOT NULL,
  item_name   TEXT NOT NULL,
  cost        INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_purchases_user_login ON shop_purchases(user_login);

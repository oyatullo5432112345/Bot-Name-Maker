-- ============================================================
-- MONITORING V3 — har savol uchun alohida vaqt, pauza, taymersiz rejim
-- ============================================================

ALTER TABLE monitoring_tests ADD COLUMN IF NOT EXISTS timed BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE monitoring_tests ADD COLUMN IF NOT EXISTS pause_seconds INTEGER NOT NULL DEFAULT 0;

ALTER TABLE monitoring_questions ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'orta'
  CHECK (difficulty IN ('oson','orta','qiyin'));
ALTER TABLE monitoring_questions ADD COLUMN IF NOT EXISTS time_seconds INTEGER;

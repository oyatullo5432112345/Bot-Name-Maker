-- ============================================================
-- MONITORING V2 — variantli/variantsiz test, avto-ochilish vaqti
-- ============================================================

-- Variantsiz (yozma javob) testlarni qo'llab-quvvatlash
ALTER TABLE monitoring_tests ADD COLUMN IF NOT EXISTS has_options BOOLEAN NOT NULL DEFAULT TRUE;

-- Admin belgilagan avtomatik ochilish vaqti (bo'lmasa — qo'lda ochiladi)
ALTER TABLE monitoring_tests ADD COLUMN IF NOT EXISTS scheduled_open_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_monitoring_tests_scheduled ON monitoring_tests(scheduled_open_at)
  WHERE status = 'draft' AND scheduled_open_at IS NOT NULL;

-- Variantsiz savollar uchun to'g'ri javob matni; variantli uchun options/correct_index ishlatiladi
ALTER TABLE monitoring_questions ADD COLUMN IF NOT EXISTS correct_text TEXT;
ALTER TABLE monitoring_questions ALTER COLUMN options DROP NOT NULL;
ALTER TABLE monitoring_questions ALTER COLUMN correct_index DROP NOT NULL;
ALTER TABLE monitoring_questions ALTER COLUMN options SET DEFAULT '[]'::jsonb;

-- O'quvchi javoblarida matnli javob (variantsiz) ham saqlanadi
ALTER TABLE monitoring_attempts ADD COLUMN IF NOT EXISTS started_at_client TIMESTAMPTZ;

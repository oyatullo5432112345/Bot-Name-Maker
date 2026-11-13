-- 019: Monitoring — so'rovnomalar (to'g'ri javobsiz fikr so'rash)
-- kind = 'test'   → ball hisoblanadigan oddiy monitoring testi
-- kind = 'survey' → to'g'ri javobi yo'q so'rovnoma (faqat fikrlar statistikasi)
ALTER TABLE monitoring_tests ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'test';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monitoring_tests_kind_chk') THEN
    ALTER TABLE monitoring_tests ADD CONSTRAINT monitoring_tests_kind_chk CHECK (kind IN ('test','survey'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_monitoring_tests_kind ON monitoring_tests(kind);

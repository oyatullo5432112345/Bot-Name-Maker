-- registration_codes jadvali — admin mahfiy kod tizimi
-- Supabase Dashboard → SQL Editor da bu faylni ishga tushiring

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

-- Indekslar tezlik uchun
CREATE INDEX IF NOT EXISTS idx_registration_codes_code     ON registration_codes(code);
CREATE INDEX IF NOT EXISTS idx_registration_codes_used     ON registration_codes(used);
CREATE INDEX IF NOT EXISTS idx_registration_codes_class_id ON registration_codes(class_id);

-- RLS (Row Level Security) — agar yoqilgan bo'lsa
-- ALTER TABLE registration_codes ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "service_role_full_access" ON registration_codes FOR ALL USING (true);

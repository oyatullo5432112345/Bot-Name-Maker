-- Registration codes jadvali
CREATE TABLE IF NOT EXISTS registration_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  role VARCHAR(50) NOT NULL DEFAULT 'student',
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  class_name TEXT,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reg_codes_code ON registration_codes(code);
CREATE INDEX IF NOT EXISTS idx_reg_codes_class ON registration_codes(class_id);
CREATE INDEX IF NOT EXISTS idx_reg_codes_used ON registration_codes(used);

-- ============================================================
-- FAZA 1A — KO'P MAKTABLI (MULTI-TENANT) POYDEVOR
-- ------------------------------------------------------------
--  Maqsad: bitta maktab ilovasini butun TUMAN platformasiga aylantirish.
--  Har maktab o'z ma'lumotini ko'radi; maktablar bir-biriga aralashmaydi.
--
--  XAVFSIZLIK: bu migratsiya QO'SHIMCHA (non-breaking). Har jadvalga
--  maktab_id ustuni DEFAULT 3 bilan qo'shiladi — ya'ni mavjud hamma satr
--  avtomatik 3-maktabga tegishli bo'ladi va hozirgi kod o'zgarmasdan
--  ishlayveradi. Filtrlash (izolyatsiya) keyingi fazalarda kodga qo'shiladi.
--
--  MODEL:
--   • maktablar.id = maktab RAQAMI (1, 3, 7 ...). 3-maktab = id 3.
--   • users.login va 5-xonali kod BUTUN TUMAN bo'yicha yagona qoladi —
--     shuning uchun o'quvchi/xodim hech qachon boshqa maktab bilan aralashmaydi.
--   • classes.name ("5-A") endi HAR MAKTAB ichida yagona (tumanda emas).
-- ============================================================

-- ─── 1. Maktablar jadvali ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maktablar (
  id          INT PRIMARY KEY,                 -- maktab raqami (admin beradi)
  nom         TEXT NOT NULL,                   -- "3-maktab"
  tuman       TEXT NOT NULL DEFAULT 'Toshloq',
  manzil      TEXT NOT NULL DEFAULT '',
  direktor    TEXT NOT NULL DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  settings    JSONB NOT NULL DEFAULT '{}'::jsonb,  -- kelajak: per-maktab kanallar va h.k.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hozirgi (ishlab turgan) maktab — 3-maktab, Toshloq tumani.
INSERT INTO maktablar (id, nom, tuman, manzil)
VALUES (3, '3-maktab', 'Toshloq', 'Toshloq tumani, 3-maktab')
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Har tenant jadvalga maktab_id (DEFAULT 3) + FK + indeks ──────────────
--  Idempotent: ustun/FK/indeks faqat yo'q bo'lsa qo'shiladi.
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'classes','users','staff','grades','lessons','timetable','teacher_subjects',
    'attendance','registration_codes','library_books','library_loans',
    'game_scores','tanga_logs','shop_purchases','board_games','board_cells',
    'wheel_games','monitoring_tests','monitoring_questions','monitoring_attempts',
    'face_checkins','face_profiles','lab_rooms','lab_computers','lab_events',
    'lab_commands','announcements'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      -- ustun (default 3 — mavjud satrlar 3-maktabga tegishli bo'ladi)
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS maktab_id INT NOT NULL DEFAULT 3', t);
      -- FK (faqat yo'q bo'lsa)
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_maktab_fk') THEN
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (maktab_id) REFERENCES maktablar(id) ON DELETE RESTRICT', t, t || '_maktab_fk');
      END IF;
      -- indeks
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (maktab_id)', 'idx_' || t || '_maktab', t);
    END IF;
  END LOOP;
END $$;

-- ─── 3. classes.name: tuman bo'yicha emas, HAR MAKTAB ichida yagona ──────────
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_name_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classes_maktab_name_key') THEN
    ALTER TABLE classes ADD CONSTRAINT classes_maktab_name_key UNIQUE (maktab_id, name);
  END IF;
END $$;

-- ─── 4. Eslatma ──────────────────────────────────────────────────────────────
--  users.login, staff.login, registration_codes.code, login_id (5-xonali kod)
--  BUTUN TUMAN bo'yicha yagona bo'lib QOLADI — ataylab o'zgartirilmaydi.
--  Shu sabab student_login/teacher_login bilan bog'langan hamma jadval
--  (grades, attendance, tanga_logs ...) avtomatik to'g'ri maktabga tegishli.

-- ============================================================
-- "BEK VA LOLA: SAYOHAT v2" — serverda baholanadigan, bazadan
--  savol oladigan tuzilma.
-- ------------------------------------------------------------
--  MUHIM: eski 015_sayohat.sql dagi jadvallar (sayohat_progress,
--  sayohat_region_unlock, eski sayohat_rewards) bilan TO'QNASHMASLIGI
--  uchun v2 jadvallari YANGI nomlar bilan yaratiladi. Shuning uchun
--  bu fayl ham yangi, ham eski bazada bexatar ishlaydi.
--
--  Qiyinlik qiymatlari: 'oson' | 'orta' | 'qiyin' (frontend bilan bir xil).
-- ============================================================

-- ─── 1. Viloyatlar (savollar uchun ildiz + ochilish vaqti + faollik) ─────────
--  Xaritadagi ko'rinish (rang, koordinata, emoji) frontendda turadi;
--  bu jadval savollarga bog'lanish, ochilish vaqti va faollik uchun.
CREATE TABLE IF NOT EXISTS sayohat_regions (
  id          VARCHAR(50) PRIMARY KEY,         -- "fargona", "andijon" ...
  title       VARCHAR(255) NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,   -- FALSE = o'quvchiga ko'rinmaydi
  unlock_at   TIMESTAMPTZ,                     -- NULL = jadval bo'yicha; bor = o'sha vaqtdan ochiq
  updated_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. Savollar (faqat test — 2..6 variant) ─────────────────────────────────
--  options: JSON massiv, masalan ["Atlas","Kulolchilik","Gilam","Mis"]
--  correct_index: to'g'ri variant tartibi (0 dan)
--  MUHIM: to'g'ri javob FAQAT serverda qoladi — o'quvchiga yuborilmaydi.
CREATE TABLE IF NOT EXISTS sayohat_questions (
  id            SERIAL PRIMARY KEY,
  region_id     VARCHAR(50) NOT NULL REFERENCES sayohat_regions(id) ON DELETE CASCADE,
  difficulty    VARCHAR(10) NOT NULL DEFAULT 'oson' CHECK (difficulty IN ('oson','orta','qiyin')),
  question_text TEXT NOT NULL,
  options       JSONB NOT NULL,                -- ["A","B","C","D"]
  correct_index INT NOT NULL DEFAULT 0,
  explanation   TEXT NOT NULL DEFAULT '',
  hint          TEXT NOT NULL DEFAULT '',
  points        INT NOT NULL DEFAULT 10,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sayohat_questions_region ON sayohat_questions(region_id, difficulty);

-- ─── 3. O'quvchi taraqqiyoti (bitta satr) ────────────────────────────────────
--  state: frontend holati (qahramon, ism, daraja, yulduzlar, esdaliklar...)
--  total_score: serverda hisoblangan umumiy ball (statistika uchun)
--  completed_regions: yakunlangan viloyat id lari (JSON massiv)
CREATE TABLE IF NOT EXISTS sayohat_user_progress (
  user_id           VARCHAR(255) PRIMARY KEY,
  state             JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_score       INT NOT NULL DEFAULT 0,
  completed_regions JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sayohat_progress_user ON sayohat_user_progress(user_id);

-- ─── 4. Tanga mukofotlari (anti-cheat: har viloyatdan 1 marta) ───────────────
--  UNIQUE(user_id, region_id) — bir viloyat uchun qayta tanga berilmaydi.
--  coins_awarded — shu viloyat uchun HOZIRGACHA berilgan jami tanga.
CREATE TABLE IF NOT EXISTS sayohat_awards (
  id            SERIAL PRIMARY KEY,
  user_id       VARCHAR(255) NOT NULL,
  region_id     VARCHAR(50) NOT NULL,
  stars         INT NOT NULL DEFAULT 0,
  coins_awarded INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, region_id)
);
CREATE INDEX IF NOT EXISTS idx_sayohat_awards_user ON sayohat_awards(user_id);

-- ============================================================
--  SEED: 14 viloyat (xaritadagi tartib bilan). Mavjud bo'lsa tegilmaydi —
--  admin o'zgartirgan sarlavha/tartib/ochilish vaqti saqlanadi.
-- ============================================================
INSERT INTO sayohat_regions (id, title, order_index) VALUES
  ('fargona',            'Farg''ona',          0),
  ('andijon',            'Andijon',            1),
  ('namangan',           'Namangan',           2),
  ('toshkent_shahri',    'Toshkent shahri',    3),
  ('toshkent_viloyati',  'Toshkent viloyati',  4),
  ('sirdaryo',           'Sirdaryo',           5),
  ('jizzax',             'Jizzax',             6),
  ('samarqand',          'Samarqand',          7),
  ('qashqadaryo',        'Qashqadaryo',        8),
  ('surxondaryo',        'Surxondaryo',        9),
  ('buxoro',             'Buxoro',             10),
  ('navoiy',             'Navoiy',             11),
  ('xorazm',             'Xorazm',             12),
  ('qoraqalpogiston',    'Qoraqalpog''iston',  13)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
--  SEED: namuna savollar (Farg'ona + Andijon). Faqat bir marta qo'shiladi
--  (bir xil savol matni bo'lsa — qayta qo'shilmaydi). Admin keyin o'zi
--  qo'shadi/tahrirlaydi.
-- ============================================================
INSERT INTO sayohat_questions (region_id, difficulty, question_text, options, correct_index, explanation, hint, points)
SELECT v.region_id, v.difficulty, v.question_text, v.options::jsonb, v.correct_index, v.explanation, v.hint, v.points
FROM (VALUES
  ('fargona','oson',
   'Marg''ilon shahri qaysi hunarmandchilik mahsuloti bilan mashhur?',
   '["Atlas va adras","Kulolchilik","Gilamdo''zlik","Misgarlik"]', 0,
   'Marg''ilon — O''zbekiston ipakchiligi va atlas-adras markazi.',
   'Rang-barang, ipakdan to''qiladigan mato.', 10),

  ('fargona','oson',
   'Farg''ona vodiysi O''zbekistonning aholisi eng zich hududlaridan biri — to''g''rimi?',
   '["To''g''ri","Noto''g''ri"]', 0,
   'To''g''ri — vodiy serhosil va aholisi juda zich.',
   '', 10),

  ('fargona','orta',
   'Farg''ona vodiysida nechta viloyat joylashgan?',
   '["2 ta","3 ta","4 ta","5 ta"]', 1,
   'Farg''ona, Andijon va Namangan — jami 3 ta.',
   'Bobur tavallud topgan viloyat ham shu yerda.', 15),

  ('fargona','qiyin',
   'Atlas naqshi 5 rangdan iborat, har rang 2 daqiqada bo''yaladi. Bitta bir xil naqsh uchun necha daqiqa bo''yash kerak?',
   '["6 daqiqa","10 daqiqa","15 daqiqa","30 daqiqa"]', 1,
   '5 rang × 2 daqiqa = 10 daqiqa.',
   'Har rang bir marta bo''yaladi.', 20),

  ('andijon','oson',
   'Andijonda tug''ilgan buyuk shoh va shoir kim?',
   '["Bobur","Amir Temur","Ulug''bek","Navoiy"]', 0,
   'Zahiriddin Muhammad Bobur — Boburiylar saltanati asoschisi.',
   'U ''Boburnoma'' asari muallifi.', 10),

  ('andijon','orta',
   'Bobur yozgan mashhur tarixiy-memuar asar qaysi?',
   '["Boburnoma","Xamsa","Qutadg''u bilig","Devoni lug''otit turk"]', 0,
   '''Boburnoma'' — jahonga mashhur tarixiy asar.',
   'Muallif nomi bilan ataladi.', 15),

  ('andijon','qiyin',
   'Bobur qaysi yili Hindistonda Boburiylar saltanatiga asos solgan?',
   '["1501","1526","1556","1605"]', 1,
   '1526-yilda Panipat jangidan so''ng Bobur Hindistonda saltanatga asos solgan.',
   'XVI asr boshi.', 20)
) AS v(region_id, difficulty, question_text, options, correct_index, explanation, hint, points)
WHERE NOT EXISTS (
  SELECT 1 FROM sayohat_questions q
  WHERE q.region_id = v.region_id AND q.question_text = v.question_text
);

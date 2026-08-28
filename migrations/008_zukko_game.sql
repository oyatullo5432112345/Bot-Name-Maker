-- ============================================================
-- ZUKKO — hamma o'ynaydigan individual topishmoq/IQ o'yini
-- ============================================================

CREATE TABLE IF NOT EXISTS riddle_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level         INTEGER NOT NULL,
  question      TEXT NOT NULL,
  options       JSONB NOT NULL,
  correct_index INTEGER NOT NULL,
  difficulty    TEXT NOT NULL DEFAULT 'orta' CHECK (difficulty IN ('oson','orta','qiyin')),
  category      TEXT NOT NULL DEFAULT 'topishmoq' CHECK (category IN ('topishmoq','mantiq','bilim')),
  order_index   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_riddle_questions_level ON riddle_questions(level);

CREATE TABLE IF NOT EXISTS riddle_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_login   TEXT NOT NULL,
  user_name    TEXT NOT NULL,
  level        INTEGER NOT NULL,
  score        INTEGER NOT NULL,
  total        INTEGER NOT NULL,
  stars        INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_riddle_attempts_user  ON riddle_attempts(user_login);
CREATE INDEX IF NOT EXISTS idx_riddle_attempts_level ON riddle_attempts(level);

-- Boshlang'ich savollar (1-5 bosqich, har birida 5 tadan) — asl, o'zi yozilgan
INSERT INTO riddle_questions (level, question, options, correct_index, difficulty, category, order_index) VALUES
(1, 'Tuni bilan yotadi, kunduzi yuradi. Bu nima?', '["Soat", "Eshik", "Ko''lanka", "Yulduz"]', 2, 'oson', 'topishmoq', 1),
(1, 'Boshi bor, oyog'' yo''q, o''zi yeriga yopishib yotadi. Bu nima?', '["Ignabarg", "Mix", "Tosh", "Barg"]', 1, 'oson', 'topishmoq', 2),
(1, '5 ta olma bor edi, 2 tasini yedingiz. Nechta olma qoldi?', '["2", "3", "5", "7"]', 1, 'oson', 'mantiq', 3),
(1, 'Qishda oq, yozda yashil bo''ladigan narsa — bu?', '["Dala", "Tog''", "Ko''l", "Osmon"]', 0, 'oson', 'topishmoq', 4),
(1, 'Bir kunda soat necha marta 12 ni ko''rsatadi?', '["1 marta", "2 marta", "12 marta", "24 marta"]', 1, 'oson', 'mantiq', 5),

(2, 'Ertalab to''rt oyoqda, kunduzi ikki oyoqda, kechqurun uch oyoqda yuradigan mavjudot kim?', '["Mushuk", "Odam", "It", "Qush"]', 1, 'orta', 'topishmoq', 1),
(2, 'Agar 3 ta mushuk 3 daqiqada 3 ta sichqonni tutsa, 100 ta mushuk 100 ta sichqonni tutishi uchun necha daqiqa kerak?', '["100 daqiqa", "3 daqiqa", "33 daqiqa", "10 daqiqa"]', 1, 'qiyin', 'mantiq', 2),
(2, 'Meni sindirmasangiz ishlata olmaysiz. Bu nima?', '["Tuxum", "Shisha", "Qalam", "Yong''oq"]', 0, 'orta', 'topishmoq', 3),
(2, 'Bir uyda 5 ta xona bor, har xonada 4 ta burchak bor. Uyda jami nechta burchak bor?', '["9", "20", "16", "24"]', 1, 'orta', 'mantiq', 4),
(2, 'Dunyodagi eng baland tog'' qaysi?', '["Everest", "Elbrus", "Kilimanjaro", "Fudziyama"]', 0, 'orta', 'bilim', 5),

(3, 'Nima uzoqlashsa kattalashadi, yaqinlashsa kichraydi?', '["Soya", "Ovoz", "Yorug''lik", "Vaqt"]', 0, 'orta', 'topishmoq', 1),
(3, 'Bir oilada 2 ta ota, 2 ta o''g''il bor, lekin ular jami 3 kishi. Qanday bo''lishi mumkin?', '["Buva, ota, o''g''il", "Ikki oila", "Egizaklar", "Bunday bo''lmaydi"]', 0, 'qiyin', 'mantiq', 2),
(3, 'Nafas olmasa o''ladi, lekin o''zi tirik emas. Bu nima?', '["O''simlik", "Olov", "Baliq", "Robot"]', 1, 'qiyin', 'topishmoq', 3),
(3, 'Quyosh sistemasida nechta sayyora bor?', '["7", "8", "9", "10"]', 1, 'orta', 'bilim', 4),
(3, 'Meni kesing — yig''layman, lekin ko''zim yo''q. Bu nima?', '["Piyoz", "Daraxt", "Qog''oz", "Bulut"]', 0, 'oson', 'topishmoq', 5)
ON CONFLICT DO NOTHING;

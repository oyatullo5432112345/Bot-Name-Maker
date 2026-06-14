-- Olimpiada ishtirokchilarini "ro'yxatdan o'tgan" va "natija kiritilgan"
-- bosqichlariga ajratish uchun holat ustuni qo'shamiz.
-- Tuman bo'yicha olimpiada: avval har maktabdan fan bo'yicha 3 ta o'quvchi
-- ro'yxatdan o'tadi (ball/orin bo'sh), olimpiada o'tgandan keyin admin
-- ball/orin kiritadi va holat "natija_kiritilgan" ga o'tadi.

ALTER TABLE olimpiada_ishtirokchilar
  ADD COLUMN IF NOT EXISTS holat TEXT NOT NULL DEFAULT 'natija_kiritilgan';

-- ball ixtiyoriy bo'lishi kerak (ro'yxatdan o'tganda hali ball yo'q)
ALTER TABLE olimpiada_ishtirokchilar
  ALTER COLUMN ball DROP NOT NULL;

ALTER TABLE olimpiada_ishtirokchilar
  ALTER COLUMN ball DROP DEFAULT;

-- holat qiymatlarini cheklash
ALTER TABLE olimpiada_ishtirokchilar
  DROP CONSTRAINT IF EXISTS olimpiada_ishtirokchilar_holat_check;

ALTER TABLE olimpiada_ishtirokchilar
  ADD CONSTRAINT olimpiada_ishtirokchilar_holat_check
  CHECK (holat IN ('royhatdan_otgan', 'natija_kiritilgan'));

CREATE INDEX IF NOT EXISTS idx_olimpiada_ishtirokchilar_holat ON olimpiada_ishtirokchilar(holat);
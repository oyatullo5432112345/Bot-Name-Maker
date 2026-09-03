-- ============================================================
-- MONITORING V4 — bir nechta variant "to'g'ri" deb belgilash imkoniyati
-- (masalan sinonim javoblar yoki bir nechta qabul qilinadigan variant)
-- ============================================================

ALTER TABLE monitoring_questions ADD COLUMN IF NOT EXISTS correct_indices INTEGER[];

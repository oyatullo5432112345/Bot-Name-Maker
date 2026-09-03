-- ============================================================
-- O'YINLAR V3 — o'ynalish statistikasi, joriy segment kuzatuvi
-- ============================================================

ALTER TABLE board_games ADD COLUMN IF NOT EXISTS play_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE board_games ADD COLUMN IF NOT EXISTS last_played_at TIMESTAMPTZ;

ALTER TABLE wheel_games ADD COLUMN IF NOT EXISTS play_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE wheel_games ADD COLUMN IF NOT EXISTS last_played_at TIMESTAMPTZ;
ALTER TABLE wheel_games ADD COLUMN IF NOT EXISTS current_segment_index INTEGER;

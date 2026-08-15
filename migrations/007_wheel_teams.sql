-- ============================================================
-- G'ILDIRAK V2 — jamoalar, ball, sessiya holati
-- (savol/togri javob segments JSONB ichida saqlanadi — migratsiya kerak emas)
-- ============================================================

ALTER TABLE wheel_games ADD COLUMN IF NOT EXISTS team_count INTEGER NOT NULL DEFAULT 2 CHECK (team_count BETWEEN 2 AND 4);
ALTER TABLE wheel_games ADD COLUMN IF NOT EXISTS team_scores JSONB NOT NULL DEFAULT '[]';
ALTER TABLE wheel_games ADD COLUMN IF NOT EXISTS current_team INTEGER NOT NULL DEFAULT 0;
ALTER TABLE wheel_games ADD COLUMN IF NOT EXISTS session_status TEXT NOT NULL DEFAULT 'not_started'
  CHECK (session_status IN ('not_started','playing','finished'));
ALTER TABLE wheel_games ADD COLUMN IF NOT EXISTS answer_grace_seconds INTEGER NOT NULL DEFAULT 19;

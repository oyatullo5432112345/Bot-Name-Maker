-- ============================================================
-- O'YINLAR V2 — Jamoaviy doska o'yini (savol katakchalari) va G'ildirak
-- ============================================================

CREATE TABLE IF NOT EXISTS board_games (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  subject           TEXT,
  class_name        TEXT,
  team_count        INTEGER NOT NULL CHECK (team_count IN (2,3)),
  cell_count        INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','archived')),
  session_status    TEXT NOT NULL DEFAULT 'not_started' CHECK (session_status IN ('not_started','playing','finished')),
  team_scores       JSONB NOT NULL DEFAULT '[]',   -- [{"name":"1-jamoa","score":0}, ...]
  current_team      INTEGER NOT NULL DEFAULT 0,
  created_by_login  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_games_status ON board_games(status);
CREATE INDEX IF NOT EXISTS idx_board_games_title  ON board_games(title);

CREATE TABLE IF NOT EXISTS board_cells (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id         UUID NOT NULL REFERENCES board_games(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('question','bonus','penalty','lose','steal')),
  question        TEXT,
  options         JSONB,
  correct_index   INTEGER,
  correct_text    TEXT,
  difficulty      TEXT CHECK (difficulty IN ('oson','orta','qiyin')),
  points          INTEGER NOT NULL DEFAULT 0,     -- savol/bonus/jarima HP qiymati
  time_seconds    INTEGER,
  steal_percent   INTEGER NOT NULL DEFAULT 25,
  revealed        BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_by_team INTEGER,
  UNIQUE (game_id, position)
);

CREATE INDEX IF NOT EXISTS idx_board_cells_game ON board_cells(game_id);

CREATE TABLE IF NOT EXISTS wheel_games (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  subject           TEXT,
  class_name        TEXT,
  segments          JSONB NOT NULL DEFAULT '[]',  -- [{"label":"...", "weight":1, "color":"#3b82f6"}]
  time_limit_seconds INTEGER,
  status            TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','archived')),
  created_by_login  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wheel_games_title ON wheel_games(title);

-- Olimpiada maktablar jadvali
CREATE TABLE IF NOT EXISTS olimpiada_maktablar (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomi        TEXT NOT NULL,
  tuman       TEXT NOT NULL DEFAULT '',
  jami_ball   INTEGER NOT NULL DEFAULT 0,
  yil         INTEGER NOT NULL DEFAULT 2026,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Olimpiada ishtirokchilar jadvali
CREATE TABLE IF NOT EXISTS olimpiada_ishtirokchilar (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maktab_id    UUID REFERENCES olimpiada_maktablar(id) ON DELETE CASCADE,
  maktab_nomi  TEXT NOT NULL DEFAULT '',
  ism          TEXT NOT NULL,
  fan          TEXT NOT NULL,
  ball         INTEGER NOT NULL DEFAULT 0,
  orin         INTEGER,
  yil          INTEGER NOT NULL DEFAULT 2026,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_olimpiada_ishtirokchilar_maktab ON olimpiada_ishtirokchilar(maktab_id);
CREATE INDEX IF NOT EXISTS idx_olimpiada_maktablar_ball ON olimpiada_maktablar(jami_ball DESC);

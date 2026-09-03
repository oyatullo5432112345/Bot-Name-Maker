/**
 * DB Migration runner — barcha SQL fayllarni tartib bilan ishlatadi
 * Render deploy paytida avtomatik chaqiriladi: preDeployCommand
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL topilmadi");
  process.exit(1);
}

// SSL: Render DB ssl talab qiladi, local emas
const useSSL = process.env.NODE_ENV === "production" || DATABASE_URL.includes("render.com");

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
});

// migrate.mjs artifacts/api-server/ ichida, migrations/ loyiha ildizida
const MIGRATIONS_DIR = path.resolve(__dirname, "../../migrations");

// SQL fayllar tartib bo'yicha
const SQL_FILES = [
  "000_full_schema.sql",
  "001_registration_codes.sql",
  "001_tanga_system.sql",
  "002_olimpiada_royhatdan_otish.sql",
  "003_monitoring.sql",
  "004_monitoring_v2.sql",
  "005_monitoring_v3.sql",
  "006_board_and_wheel_games.sql",
  "007_wheel_teams.sql",
  "008_zukko_game.sql",
  "009_monitoring_multi_correct.sql",
  "010_games_stats_ownership.sql",
];

// Qo'shimcha ustunlar (agar mavjud bo'lmasa qo'shiladi)
const EXTRA_SQL = `
ALTER TABLE users  ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ;
ALTER TABLE staff  ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ;
ALTER TABLE users  ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE staff  ADD COLUMN IF NOT EXISTS birthday DATE;

CREATE TABLE IF NOT EXISTS announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  author_id  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS olimpiada_announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  author_id  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bot va admin panel sessiyalarini saqlash (server qayta ishga tushsa ham
-- foydalanuvchi qayerda to'xtagan bo'lsa, o'sha yerdan davom etadi)
CREATE TABLE IF NOT EXISTS bot_sessions (
  namespace  TEXT NOT NULL,
  user_id    BIGINT NOT NULL,
  state      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (namespace, user_id)
);

-- Bot sozlamalari (kanallar, xush kelibsiz xabari, telefon-chatId bog'lanishi,
-- ro'yxatdan o'tish kodlari va h.k.) — avval JSON faylda edi, endi bazada,
-- shuning uchun har deployda o'chib ketmaydi.
CREATE TABLE IF NOT EXISTS bot_settings (
  id         SMALLINT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function run() {
  process.stdout.write("🚀 Migration boshlanmoqda...\n");

  try {
    process.stdout.write("▶ Bazaga ulanmoqda...\n");
    await pool.query("SELECT 1");
    process.stdout.write("✅ Bazaga ulanish muvaffaqiyatli\n");

    for (const file of SQL_FILES) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  ${file} topilmadi — o'tkazib yuborildi`);
        continue;
      }
      const sql = fs.readFileSync(filePath, "utf-8");
      console.log(`▶ ${file} ishlatilmoqda...`);
      await pool.query(sql);
      console.log(`✅ ${file} muvaffaqiyatli\n`);
    }

    console.log("▶ Qo'shimcha ustunlar tekshirilmoqda...");
    await pool.query(EXTRA_SQL);
    console.log("✅ Barcha ustunlar mavjud\n");

    console.log("🎉 Migration muvaffaqiyatli yakunlandi!");
  } catch (err) {
    console.error("❌ Migration xatosi:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();

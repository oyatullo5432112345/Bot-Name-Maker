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
});

// migrate.mjs artifacts/api-server/ ichida, migrations/ loyiha ildizida
const MIGRATIONS_DIR = path.resolve(__dirname, "../../migrations");

// SQL fayllar tartib bo'yicha
const SQL_FILES = [
  "000_full_schema.sql",
  "001_registration_codes.sql",
  "001_tanga_system.sql",
  "002_olimpiada_royhatdan_otish.sql",
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
`;

async function run() {
  console.log("🚀 Migration boshlanmoqda...\n");

  try {
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

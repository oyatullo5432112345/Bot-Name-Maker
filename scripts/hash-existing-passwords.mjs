// Bir martalik skript: bazadagi hali xeshlanmagan (plaintext) parollarni
// bcrypt bilan xeshlaydi. auth.ts allaqachon "upgrade-on-login" logikasiga
// ega (foydalanuvchi kirganda avtomatik xeshlanadi), lekin hech qachon
// kirmagan / kam faol akkauntlar uchun bu skriptni bir marta ishga
// tushirish tavsiya etiladi.
//
// Ishga tushirish:
//   DATABASE_URL=postgres://... node scripts/hash-existing-passwords.mjs
//
// Xavfsiz: allaqachon bcrypt xeshiga o'tgan qatorlarga tegmaydi.

import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment o'zgaruvchisi kerak");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const BCRYPT_ROUNDS = 10;

function looksHashed(stored) {
  return stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$");
}

async function hashTable(table) {
  const { rows } = await pool.query(`SELECT id, password FROM ${table} WHERE password IS NOT NULL`);
  let updated = 0;
  for (const row of rows) {
    if (looksHashed(row.password)) continue;
    const hash = await bcrypt.hash(row.password, BCRYPT_ROUNDS);
    await pool.query(`UPDATE ${table} SET password = $1 WHERE id = $2`, [hash, row.id]);
    updated++;
  }
  console.log(`${table}: ${updated} ta parol xeshlandi (jami ${rows.length} qator tekshirildi)`);
}

async function main() {
  await hashTable("staff");
  await hashTable("users");
  await pool.end();
  console.log("Tayyor.");
}

main().catch((err) => {
  console.error("Xatolik:", err);
  process.exit(1);
});

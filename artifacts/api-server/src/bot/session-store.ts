// Bazaga tayanadigan sessiya do'koni.
//
// Nega kerak: avval userStates/states in-memory Map edi — server qayta ishga
// tushganda (Render'da restart, deploy va h.k. tez-tez bo'ladi) hamma
// foydalanuvchi holati o'chib ketardi va odam ro'yxatdan o'tishning
// yarmida qolib ketardi.
//
// Bu yerda ikkita narsa qilinadi:
//  1) Xotirada Map saqlanadi — shuning uchun bot.ts/admin.ts ichidagi
//     mavjud `.get(id)` / `.set(id, val)` chaqiruvlari o'zgarishsiz ishlayveradi
//     (sinxron, tezkor).
//  2) Har bir `.set()` chaqirilganda orqa fonda (await qilinmasdan) bazaga
//     ham yoziladi. Server ishga tushganda `loadAll()` bazadan hammasini
//     xotiraga qayta yuklaydi — shu bilan foydalanuvchi qayerda to'xtagan
//     bo'lsa, o'sha yerdan davom etadi.

import { pool } from "../lib/db.js";
import { logger } from "../lib/logger.js";

export interface SessionStore<T> {
  get(userId: number): T | undefined;
  set(userId: number, value: T): void;
  delete(userId: number): void;
  loadAll(): Promise<void>;
}

const IDLE_VALUES = new Set(["idle", '{"type":"idle"}', '{"step":"idle"}']);

export function createSessionStore<T>(namespace: string, defaultValue: T): SessionStore<T> {
  const cache = new Map<number, T>();

  function isDefault(value: T): boolean {
    try {
      return JSON.stringify(value) === JSON.stringify(defaultValue);
    } catch {
      return false;
    }
  }

  return {
    get(userId: number): T | undefined {
      return cache.get(userId);
    },

    set(userId: number, value: T): void {
      cache.set(userId, value);

      // Orqa fonda bazaga yozamiz — chaqiruvchi kutib turmaydi.
      if (isDefault(value)) {
        // "idle" holatini bazada saqlashning hojati yo'q — qatorni o'chiramiz.
        void pool
          .query("DELETE FROM bot_sessions WHERE namespace = $1 AND user_id = $2", [namespace, userId])
          .catch((err) => logger.warn({ err, namespace, userId }, "Sessiya o'chirishda xato"));
        return;
      }

      void pool
        .query(
          `INSERT INTO bot_sessions (namespace, user_id, state, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (namespace, user_id)
           DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
          [namespace, userId, JSON.stringify(value)]
        )
        .catch((err) => logger.warn({ err, namespace, userId }, "Sessiya saqlashda xato"));
    },

    delete(userId: number): void {
      cache.delete(userId);
      void pool
        .query("DELETE FROM bot_sessions WHERE namespace = $1 AND user_id = $2", [namespace, userId])
        .catch((err) => logger.warn({ err, namespace, userId }, "Sessiya o'chirishda xato"));
    },

    async loadAll(): Promise<void> {
      try {
        const result = await pool.query<{ user_id: string; state: T }>(
          "SELECT user_id, state FROM bot_sessions WHERE namespace = $1",
          [namespace]
        );
        for (const row of result.rows) {
          cache.set(Number(row.user_id), row.state);
        }
        logger.info({ namespace, count: result.rows.length }, "Sessiyalar bazadan yuklandi ✅");
      } catch (err) {
        logger.error({ err, namespace }, "Sessiyalarni bazadan yuklashda xato — bo'sh holda boshlanadi");
      }
    },
  };
}

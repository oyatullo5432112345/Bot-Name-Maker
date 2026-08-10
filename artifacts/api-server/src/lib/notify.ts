// Telegram orqali bildirishnoma yuborish — routes (grades, attendance,
// announcements va h.k.) ichidan chaqiriladi. bot.ts'dan mustaqil ishlaydi,
// shuning uchun aylanma import (circular import) muammosi bo'lmaydi.

import { Api } from "grammy";
import { logger } from "./logger.js";

const BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
const api = BOT_TOKEN ? new Api(BOT_TOKEN) : null;

/**
 * Bitta foydalanuvchiga Telegram xabar yuboradi.
 * Xato bo'lsa (masalan, foydalanuvchi botni bloklagan) — jim o'tkazib yuboradi,
 * asosiy so'rovni (baho qo'yish, davomat belgilash) buzmaydi.
 */
export async function notifyUser(telegramId: number | null | undefined, text: string): Promise<void> {
  if (!api || !telegramId) return;
  try {
    await api.sendMessage(telegramId, text, { parse_mode: "Markdown" });
  } catch (err) {
    logger.warn({ err, telegramId }, "Telegram bildirishnoma yuborilmadi");
  }
}

export function gradeNotificationText(subject: string, grade: number, teacherName?: string): string {
  const emoji = grade >= 5 ? "🌟" : grade >= 4 ? "✅" : grade >= 3 ? "📘" : "⚠️";
  return (
    `${emoji} *Yangi baho*\n\n` +
    `📚 Fan: ${subject}\n` +
    `🔢 Baho: *${grade}*` +
    (teacherName ? `\n👤 O'qituvchi: ${teacherName}` : "")
  );
}

export function attendanceNotificationText(className: string, status: string, date: string): string {
  const statusMap: Record<string, string> = {
    present: "✅ Keldi",
    absent: "❌ Kelmadi",
    late: "⏰ Kech qoldi",
    excused: "📝 Sababli",
  };
  const label = statusMap[status] ?? status;
  return `📋 *Davomat belgilandi*\n\n🏫 Sinf: ${className}\n📅 Sana: ${date}\n${label}`;
}

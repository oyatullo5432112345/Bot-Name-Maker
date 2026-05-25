const BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"] ?? "";
const ADMIN_ID = process.env["ADMIN_ID"] ?? "";

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  extra?: Record<string, unknown>
): Promise<void> {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", ...extra }),
  });
}

export async function sendToAdmin(text: string, extra?: Record<string, unknown>): Promise<void> {
  if (!ADMIN_ID) return;
  await sendTelegramMessage(ADMIN_ID, text, extra);
}

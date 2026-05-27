import app from "./app.js";
import { logger } from "./lib/logger.js";
import { createBot } from "./bot/bot.js";
import { webhookCallback } from "grammy";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const isProduction = process.env["NODE_ENV"] === "production";
// Production da REPLIT_DOMAINS dan ol (to'g'ri production URL)
// Development da WEBSITE_URL dan ol
const WEBSITE_URL = isProduction
  ? (process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim() ?? process.env["WEBSITE_URL"] ?? "")
  : (process.env["WEBSITE_URL"] ?? process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim() ?? "");

try {
  const bot = createBot();

  if (isProduction && WEBSITE_URL) {
    // Production: webhook orqali ishlash (polling conflict yo'q)
    const webhookPath = "/api/telegram/webhook";
    const webhookUrl = `${WEBSITE_URL}${webhookPath}`;

    app.use(webhookPath, webhookCallback(bot, "express"));

    // Express serverini ishga tushirish
    app.listen(port, async (err?: Error) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");

      // Telegram'ga webhook URLni ro'yxatdan o'tkazish
      await bot.api.setWebhook(webhookUrl);
      logger.info({ webhookUrl }, "Telegram bot webhook o'rnatildi ✅");
    });

    process.once("SIGINT", () => bot.api.deleteWebhook());
    process.once("SIGTERM", () => bot.api.deleteWebhook());
  } else {
    // Development: polling orqali ishlash
    app.listen(port, (err?: Error) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
    });

    // Development: polling boshlash (production webhookni O'CHIRMASLIK kerak!)
    bot.start().then(() => {
      logger.info("Telegram bot to'xtatildi");
    }).catch((err: unknown) => {
      const isConflict = (err as { error_code?: number })?.error_code === 409;
      if (isConflict) {
        logger.warn("Bot polling o'tkazib yuborildi — production webhook faol. Bu normal holat.");
      } else {
        logger.error({ err }, "Bot xatoligi");
      }
    });
    logger.info("Telegram bot ishga tushdi (polling) ✅");

    process.once("SIGINT", () => bot.stop());
    process.once("SIGTERM", () => bot.stop());
  }
} catch (err) {
  logger.error({ err }, "Bot ishga tushmadi");
}

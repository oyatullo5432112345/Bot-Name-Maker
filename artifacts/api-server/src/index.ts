import app from "./app.js";
import { logger } from "./lib/logger.js";
import { createBot } from "./bot/bot.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Express serverini ishga tushirish
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});

// Telegram botini ishga tushirish (long polling)
try {
  const bot = createBot();
  bot.start().then(() => {
    logger.info("Telegram bot to'xtatildi");
  }).catch((err: unknown) => {
    logger.error({ err }, "Bot xatoligi");
  });

  logger.info("Telegram bot ishga tushdi ✅");

  // Graceful shutdown
  process.once("SIGINT", () => bot.stop());
  process.once("SIGTERM", () => bot.stop());
} catch (err) {
  logger.error({ err }, "Bot ishga tushmadi");
}

import app from "./app.js";
import { logger } from "./lib/logger.js";
import { createBot } from "./bot/bot.js";
import { webhookCallback } from "grammy";
import { createServer } from "http";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const isProduction = process.env["NODE_ENV"] === "production";

function buildWebsiteUrl(): string {
  const rawDomain = process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim() ?? "";
  const envUrl = process.env["WEBSITE_URL"] ?? "";
  if (isProduction) {
    if (rawDomain) return `https://${rawDomain}`;
    return envUrl;
  }
  return envUrl || (rawDomain ? `https://${rawDomain}` : "");
}

const WEBSITE_URL = buildWebsiteUrl();

let isShuttingDown = false;

async function gracefulShutdown(signal: string, stopBot?: () => Promise<void>) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, "Graceful shutdown boshlandi...");
  try {
    if (stopBot) await stopBot();
  } catch (err) {
    logger.error({ err }, "Bot to'xtatishda xatolik");
  }
  process.exit(0);
}

try {
  const bot = createBot();

  if (isProduction && WEBSITE_URL) {
    const webhookPath = "/api/telegram/webhook";
    const webhookUrl = `${WEBSITE_URL}${webhookPath}`;

    app.use(webhookPath, webhookCallback(bot, "express"));

    const server = createServer(app);

    server.listen(port, async () => {
      logger.info({ port }, "Server listening");
      try {
        await bot.api.setWebhook(webhookUrl);
        logger.info({ webhookUrl }, "Telegram bot webhook o'rnatildi ✅");
      } catch (err) {
        logger.error({ err }, "Webhook o'rnatishda xatolik");
      }
    });

    server.on("error", (err) => {
      logger.error({ err }, "Server xatoligi");
      process.exit(1);
    });

    const stopProd = async () => {
      try { await bot.api.deleteWebhook(); } catch { /* ignore */ }
    };
    process.once("SIGINT", () => gracefulShutdown("SIGINT", stopProd));
    process.once("SIGTERM", () => gracefulShutdown("SIGTERM", stopProd));
  } else {
    const server = createServer(app);

    server.listen(port, () => {
      logger.info({ port }, "Server listening");
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    });

    void (async () => {
      try {
        const info = await bot.api.getWebhookInfo();
        if (info.url && info.url.length > 0) {
          logger.warn(
            `Dev: eski webhook topildi (${info.url}) — o'chirilmoqda...`
          );
          try {
            await bot.api.deleteWebhook({ drop_pending_updates: true });
            logger.info("Eski webhook o'chirildi ✅ — polling boshlanmoqda...");
          } catch (delErr) {
            logger.error({ err: delErr }, "Webhook o'chirishda xatolik — polling ishlamaydi");
            return;
          }
        }

        const stopDev = async () => {
          try { await bot.stop(); } catch { /* ignore */ }
        };

        process.once("SIGINT", () => gracefulShutdown("SIGINT", stopDev));
        process.once("SIGTERM", () => gracefulShutdown("SIGTERM", stopDev));

        await bot.start({
          onStart: () => logger.info("Telegram bot ishga tushdi (polling) ✅"),
        });
      } catch (err) {
        logger.error({ err }, "Bot polling xatoligi");
      }
    })();
  }
} catch (err) {
  logger.error({ err }, "Bot ishga tushmadi");
}

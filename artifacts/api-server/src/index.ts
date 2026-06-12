import app from "./app.js";
import { logger } from "./lib/logger.js";
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

const server = createServer(app);

server.listen(port, () => {
  logger.info({ port }, "Server listening ✅");
});

server.on("error", (err: NodeJS.ErrnoException) => {
  logger.error({ err }, "Server xatoligi");
  process.exit(1);
});

// Telegram bot — ixtiyoriy (token bo'lmasa ishlamasada server ishlayveradi)
const BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
if (!BOT_TOKEN) {
  logger.warn("TELEGRAM_BOT_TOKEN yo'q — bot o'chirilgan holda ishlaydi");
} else {
  void (async () => {
    try {
      const { createBot } = await import("./bot/bot.js");
      const { webhookCallback } = await import("grammy");
      const bot = createBot();

      if (isProduction && WEBSITE_URL) {
        const webhookPath = "/api/telegram/webhook";
        const webhookUrl = `${WEBSITE_URL}${webhookPath}`;

        app.use(webhookPath, webhookCallback(bot, "express"));

        try {
          await bot.api.setWebhook(webhookUrl);
          logger.info({ webhookUrl }, "Telegram bot webhook o'rnatildi ✅");
        } catch (err) {
          logger.error({ err }, "Webhook o'rnatishda xatolik");
        }

        const stopProd = async () => {
          try { await bot.api.deleteWebhook(); } catch { /* ignore */ }
        };
        process.once("SIGINT", () => gracefulShutdown("SIGINT", stopProd));
        process.once("SIGTERM", () => gracefulShutdown("SIGTERM", stopProd));
      } else {
        // Dev: polling mode
        try {
          const info = await bot.api.getWebhookInfo();
          if (info.url && info.url.length > 0) {
            logger.warn(`Dev: eski webhook topildi (${info.url}) — o'chirilmoqda...`);
            await bot.api.deleteWebhook({ drop_pending_updates: true });
            logger.info("Eski webhook o'chirildi ✅");
          }
        } catch (err) {
          logger.warn({ err }, "Webhook info tekshirishda xatolik — polling boshlanmoqda...");
        }

        const stopDev = async () => {
          try { await bot.stop(); } catch { /* ignore */ }
        };
        process.once("SIGINT", () => gracefulShutdown("SIGINT", stopDev));
        process.once("SIGTERM", () => gracefulShutdown("SIGTERM", stopDev));

        await bot.start({
          onStart: () => logger.info("Telegram bot ishga tushdi (polling) ✅"),
        });
      }
    } catch (err) {
      logger.error({ err }, "Bot xatoligi — server davom etmoqda");
    }
  })();
}

process.once("SIGINT", () => gracefulShutdown("SIGINT"));
process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));

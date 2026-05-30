import path from "path";
import fs from "fs";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Production: platform frontend static fayllarni serve qilish
const platformDist = path.resolve(
  import.meta.dirname ?? __dirname,
  "../../platform/dist/public"
);

if (fs.existsSync(platformDist)) {
  logger.info({ platformDist }, "Frontend static fayllar topildi — serve qilinmoqda");
  app.use(express.static(platformDist));
  // SPA fallback: barcha yo'llar uchun index.html (Express 5 syntax)
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(platformDist, "index.html"));
  });
}

export default app;

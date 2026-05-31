import { Router, type IRouter } from "express";
import { loadSettings, setVideoUrls, type VideoUrls } from "../bot/settings.js";
import { getAuthUser } from "./auth.js";

const router: IRouter = Router();

router.get("/settings/videos", (_req, res): void => {
  const settings = loadSettings();
  const urls: VideoUrls = settings.videoUrls ?? { student: "", teacher: "", staff: "" };
  res.json(urls);
});

router.post("/settings/videos", (req, res): void => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !["admin", "director"].includes(user["role"] as string)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }
  const body = req.body as { student?: string; teacher?: string; staff?: string };
  setVideoUrls({
    student: (body.student ?? "").trim(),
    teacher: (body.teacher ?? "").trim(),
    staff: (body.staff ?? "").trim(),
  });
  res.json({ success: true });
});

export default router;

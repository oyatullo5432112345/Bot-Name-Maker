import { Router, type IRouter } from "express";
import {
  loadSettings,
  setVideoUrls,
  setRoleVideoUrls,
  getRoleVideoUrls,
  type VideoUrls,
} from "../bot/settings.js";
import { getAuthUser } from "./auth.js";

const router: IRouter = Router();

router.get("/settings/videos", (_req, res): void => {
  const settings = loadSettings();
  const urls: VideoUrls = settings.videoUrls ?? { student: "", teacher: "", staff: "" };
  const roleUrls = settings.roleVideoUrls ?? {};
  res.json({
    student: roleUrls.student ?? urls.student ?? "",
    teacher: roleUrls.teacher ?? urls.teacher ?? "",
    staff: urls.staff ?? "",
    sinfRahbari: roleUrls.sinfRahbari ?? "",
  });
});

router.post("/settings/videos", (req, res): void => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !["admin", "director"].includes(user["role"] as string)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }
  const body = req.body as { student?: string; teacher?: string; staff?: string; sinfRahbari?: string };
  setVideoUrls({
    student: (body.student ?? "").trim(),
    teacher: (body.teacher ?? "").trim(),
    staff: (body.staff ?? "").trim(),
  });
  setRoleVideoUrls({
    student: (body.student ?? "").trim(),
    teacher: (body.teacher ?? "").trim(),
    sinfRahbari: (body.sinfRahbari ?? "").trim(),
  });
  res.json({ success: true });
});

router.get("/settings/role-videos", (_req, res): void => {
  const urls = getRoleVideoUrls();
  res.json({
    student: urls.student ?? "",
    teacher: urls.teacher ?? "",
    sinfRahbari: urls.sinfRahbari ?? "",
  });
});

export default router;

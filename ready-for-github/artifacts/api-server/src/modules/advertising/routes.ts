import { Router } from "express";
import { AdvertisingController } from "./controller.js";
import { authenticateToken } from "../../middleware/auth.js";

const router = Router();
const controller = new AdvertisingController();

// Public routes
router.get("/", controller.listActiveAds.bind(controller));
router.get("/slot/:slotName", controller.getAdsForSlot.bind(controller));
router.get("/:id", controller.getAdById.bind(controller));
router.post("/:id/track-view", controller.trackAdView.bind(controller));
router.post("/:id/track-click", controller.trackAdClick.bind(controller));

// Admin routes (protected)
router.post("/", authenticateToken, controller.createAd.bind(controller));
router.put("/:id", authenticateToken, controller.updateAd.bind(controller));
router.delete("/:id", authenticateToken, controller.deleteAd.bind(controller));
router.patch("/:id/status", authenticateToken, controller.updateAdStatus.bind(controller));
router.get("/:id/analytics", authenticateToken, controller.getAdAnalytics.bind(controller));
router.get("/dashboard/stats", authenticateToken, controller.getAdsDashboard.bind(controller));

export default router;

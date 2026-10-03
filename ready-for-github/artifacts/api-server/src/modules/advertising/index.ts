import { Router } from "express";
import { AdvertisingController } from "./controller.js";

const router = Router();
const controller = new AdvertisingController();

// Public routes
router.get("/", (req, res) => controller.listActiveAds(req, res));
router.get("/slot/:slotName", (req, res) => controller.getAdsForSlot(req, res));
router.get("/:id", (req, res) => controller.getAdById(req, res));
router.post("/:id/track-view", (req, res) => controller.trackAdView(req, res));
router.post("/:id/track-click", (req, res) => controller.trackAdClick(req, res));

// Admin routes (need authentication middleware)
router.post("/", (req, res) => controller.createAd(req, res));
router.put("/:id", (req, res) => controller.updateAd(req, res));
router.delete("/:id", (req, res) => controller.deleteAd(req, res));
router.patch("/:id/status", (req, res) => controller.updateAdStatus(req, res));
router.get("/:id/analytics", (req, res) => controller.getAdAnalytics(req, res));
router.get("/dashboard/stats", (req, res) => controller.getAdsDashboard(req, res));

export default router;

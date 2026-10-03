import { Request, Response } from "express";
import { AdvertisingService } from "./service.js";

const service = new AdvertisingService();

export class AdvertisingController {
  async listActiveAds(req: Request, res: Response) {
    try {
      const ads = await service.listActiveAds();
      res.json({ success: true, data: ads });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAdsForSlot(req: Request, res: Response) {
    try {
      const { slotName } = req.params;
      const ads = await service.getAdsForSlot(slotName);
      res.json({ success: true, data: ads });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAdById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const ad = await service.getAdById(id);
      if (!ad) {
        return res.status(404).json({ success: false, error: "Ad not found" });
      }
      res.json({ success: true, data: ad });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createAd(req: Request, res: Response) {
    try {
      const { title, description, imageUrl, linkUrl, advertiserName, category, position, startDate, endDate } =
        req.body;

      if (!title || !imageUrl || !advertiserName) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: title, imageUrl, advertiserName",
        });
      }

      const ad = await service.createAd({
        title,
        description,
        imageUrl,
        linkUrl,
        advertiserName,
        category,
        position,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        createdBy: req.user.id,
      });

      res.status(201).json({ success: true, data: ad });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateAd(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const ad = await service.updateAd(id, {
        ...req.body,
        updatedBy: req.user.id,
      });
      res.json({ success: true, data: ad });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteAd(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await service.deleteAd(id);
      res.json({ success: true, message: "Ad deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateAdStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["active", "inactive", "paused"].includes(status)) {
        return res.status(400).json({ success: false, error: "Invalid status" });
      }

      const ad = await service.updateAdStatus(id, status);
      res.json({ success: true, data: ad });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async trackAdView(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const ipAddress = req.ip;
      const userAgent = req.get("user-agent");

      await service.trackAdView(id, ipAddress, userAgent);
      res.json({ success: true, message: "View tracked" });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async trackAdClick(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const ipAddress = req.ip;
      const userId = req.user?.id;

      await service.trackAdClick(id, userId, ipAddress);
      res.json({ success: true, message: "Click tracked" });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAdAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const analytics = await service.getAdAnalytics(id);
      if (!analytics) {
        return res.status(404).json({ success: false, error: "Ad not found" });
      }
      res.json({ success: true, data: analytics });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAdsDashboard(req: Request, res: Response) {
    try {
      const dashboard = await service.getAdsDashboard();
      res.json({ success: true, data: dashboard });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

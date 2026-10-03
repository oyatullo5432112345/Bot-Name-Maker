import { Request, Response } from "express";
import { FaceIDService } from "./service.js";

const faceIDService = new FaceIDService();

export class FaceIDController {
  async registerFace(req: Request, res: Response) {
    try {
      const { faceData, faceDescriptors } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      if (!faceData || !faceDescriptors) {
        return res
          .status(400)
          .json({ success: false, message: "Face data and descriptors are required" });
      }

      const result = await faceIDService.registerFace({
        userId,
        faceData,
        faceDescriptors,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Error in registerFace:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async verifyFace(req: Request, res: Response) {
    try {
      const { faceDescriptors } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      if (!faceDescriptors) {
        return res
          .status(400)
          .json({ success: false, message: "Face descriptors are required" });
      }

      const deviceInfo = req.get("user-agent");
      const ipAddress =
        (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress;

      const result = await faceIDService.verifyFace(
        userId,
        faceDescriptors,
        deviceInfo,
        ipAddress
      );

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Error in verifyFace:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getFaceIDStatus(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const status = await faceIDService.getFaceIDStatus(userId);

      res.json({ success: true, data: status });
    } catch (error: any) {
      console.error("Error in getFaceIDStatus:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async removeFaceID(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const result = await faceIDService.removeFaceID(userId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Error in removeFaceID:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getVerificationLogs(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const logs = await faceIDService.getVerificationLogs(userId);

      res.json({ success: true, data: logs });
    } catch (error: any) {
      console.error("Error in getVerificationLogs:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new FaceIDController();

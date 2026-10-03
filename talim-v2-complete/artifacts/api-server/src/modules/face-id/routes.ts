import { Router } from "express";
import faceIDController from "./controller.js";
import { authenticateToken } from "../../middleware/auth.js";

const router = Router();

// All face-id routes require authentication
router.use(authenticateToken);

// Register face
router.post("/register", (req, res) => faceIDController.registerFace(req, res));

// Verify face
router.post("/verify", (req, res) => faceIDController.verifyFace(req, res));

// Get face ID status
router.get("/status", (req, res) => faceIDController.getFaceIDStatus(req, res));

// Remove face ID
router.delete("/", (req, res) => faceIDController.removeFaceID(req, res));

// Get verification logs
router.get("/logs", (req, res) => faceIDController.getVerificationLogs(req, res));

export default router;

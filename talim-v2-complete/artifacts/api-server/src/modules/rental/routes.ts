import { Router } from "express";
import rentalController from "./controller.js";
import { authenticateToken } from "../../middleware/auth.js";

const router = Router();

// All rental routes require authentication
router.use(authenticateToken);

// ===== BOOKS =====
router.get("/books", (req, res) => rentalController.getBooks(req, res));
router.get("/books/:id", (req, res) => rentalController.getBookById(req, res));
router.post("/books", (req, res) => rentalController.addBook(req, res));
router.put("/books/:id", (req, res) => rentalController.updateBook(req, res));
router.delete("/books/:id", (req, res) => rentalController.deleteBook(req, res));

// ===== RENTAL REQUESTS =====
router.post("/request", (req, res) => rentalController.createRentalRequest(req, res));
router.get("/requests", (req, res) => rentalController.getUserRentalRequests(req, res));
router.patch("/requests/:id/approve", (req, res) =>
  rentalController.approveRentalRequest(req, res)
);
router.patch("/requests/:id/reject", (req, res) =>
  rentalController.rejectRentalRequest(req, res)
);

// ===== ACTIVE RENTALS =====
router.get("/active", (req, res) => rentalController.getUserActiveRentals(req, res));
router.post("/:requestId/checkout", (req, res) =>
  rentalController.checkoutBook(req, res)
);
router.patch("/:id/return", (req, res) => rentalController.returnBook(req, res));

// ===== HISTORY =====
router.get("/history", (req, res) => rentalController.getUserRentalHistory(req, res));
router.get("/stats", (req, res) => rentalController.getRentalStats(req, res));

export default router;

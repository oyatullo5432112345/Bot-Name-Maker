import { Request, Response } from "express";
import { RentalService } from "./service.js";

const rentalService = new RentalService();

export class RentalController {
  // ===== BOOKS =====

  async getBooks(req: Request, res: Response) {
    try {
      const { category } = req.query;
      const booksList = await rentalService.listBooks(category as string);

      res.json({ success: true, data: booksList });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getBookById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const book = await rentalService.getBookById(id);

      if (!book) {
        return res.status(404).json({ success: false, message: "Book not found" });
      }

      res.json({ success: true, data: book });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async addBook(req: Request, res: Response) {
    try {
      const {
        title,
        author,
        isbn,
        category,
        description,
        coverImageUrl,
        totalCopies,
        location,
      } = req.body;
      const userId = (req as any).user?.id;

      if (!userId || !(req as any).user?.isAdmin) {
        return res.status(403).json({ success: false, message: "Admin access required" });
      }

      if (!title || !totalCopies) {
        return res
          .status(400)
          .json({ success: false, message: "Title and total copies are required" });
      }

      const result = await rentalService.addBook(
        title,
        author,
        isbn,
        category,
        description,
        coverImageUrl,
        totalCopies,
        location,
        userId
      );

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateBook(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, author, category, description, totalCopies } = req.body;

      if (!(req as any).user?.isAdmin) {
        return res.status(403).json({ success: false, message: "Admin access required" });
      }

      const result = await rentalService.updateBook(
        id,
        title,
        author,
        category,
        description,
        totalCopies
      );

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async deleteBook(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!(req as any).user?.isAdmin) {
        return res.status(403).json({ success: false, message: "Admin access required" });
      }

      const result = await rentalService.deleteBook(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ===== RENTAL REQUESTS =====

  async createRentalRequest(req: Request, res: Response) {
    try {
      const { bookId } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      if (!bookId) {
        return res.status(400).json({ success: false, message: "Book ID is required" });
      }

      const result = await rentalService.createRentalRequest(userId, bookId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getUserRentalRequests(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const requests = await rentalService.getUserRentalRequests(userId);
      res.json({ success: true, data: requests });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async approveRentalRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId || !(req as any).user?.isAdmin) {
        return res.status(403).json({ success: false, message: "Admin access required" });
      }

      const result = await rentalService.approveRentalRequest(id, userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async rejectRentalRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!(req as any).user?.isAdmin) {
        return res.status(403).json({ success: false, message: "Admin access required" });
      }

      const result = await rentalService.rejectRentalRequest(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ===== ACTIVE RENTALS =====

  async checkoutBook(req: Request, res: Response) {
    try {
      const { requestId } = req.params;
      const { dueDays } = req.body;

      if (!(req as any).user?.isAdmin) {
        return res.status(403).json({ success: false, message: "Admin access required" });
      }

      const result = await rentalService.checkoutBook(
        requestId,
        dueDays || 14
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getUserActiveRentals(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const rentals = await rentalService.getUserActiveRentals(userId);
      res.json({ success: true, data: rentals });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async returnBook(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const result = await rentalService.returnBook(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ===== HISTORY =====

  async getUserRentalHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const history = await rentalService.getUserRentalHistory(userId);
      res.json({ success: true, data: history });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getRentalStats(req: Request, res: Response) {
    try {
      if (!(req as any).user?.isAdmin) {
        return res.status(403).json({ success: false, message: "Admin access required" });
      }

      const stats = await rentalService.getRentalStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new RentalController();

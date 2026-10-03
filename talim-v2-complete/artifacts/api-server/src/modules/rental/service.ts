import { db } from "../../db/index.js";
import {
  books,
  rentalRequests,
  rentals,
  rentalHistory,
} from "../../db/schema.js";
import { eq, and, desc } from "drizzle-orm";

export class RentalService {
  // ===== BOOKS MANAGEMENT =====

  async listBooks(category?: string) {
    try {
      let query = db.select().from(books);

      if (category) {
        query = db.select().from(books).where(eq(books.category, category));
      }

      return await query;
    } catch (error) {
      console.error("Error listing books:", error);
      throw error;
    }
  }

  async getBookById(bookId: string) {
    try {
      const result = await db
        .select()
        .from(books)
        .where(eq(books.id, bookId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error("Error getting book:", error);
      throw error;
    }
  }

  async addBook(
    title: string,
    author: string,
    isbn: string,
    category: string,
    description: string,
    coverImageUrl: string,
    totalCopies: number,
    location: string,
    addedBy: string
  ) {
    try {
      const result = await db
        .insert(books)
        .values({
          title,
          author,
          isbn,
          category,
          description,
          coverImageUrl,
          totalCopies,
          availableCopies: totalCopies,
          location,
          addedBy,
        })
        .returning();

      return { success: true, book: result[0] };
    } catch (error) {
      console.error("Error adding book:", error);
      throw error;
    }
  }

  async updateBook(
    bookId: string,
    title?: string,
    author?: string,
    category?: string,
    description?: string,
    totalCopies?: number
  ) {
    try {
      const updates: any = {};
      if (title) updates.title = title;
      if (author) updates.author = author;
      if (category) updates.category = category;
      if (description) updates.description = description;

      if (totalCopies !== undefined) {
        const book = await this.getBookById(bookId);
        if (book) {
          const difference = totalCopies - book.totalCopies;
          updates.totalCopies = totalCopies;
          updates.availableCopies = Math.max(0, book.availableCopies + difference);
        }
      }

      updates.updatedAt = new Date();

      const result = await db
        .update(books)
        .set(updates)
        .where(eq(books.id, bookId))
        .returning();

      return { success: true, book: result[0] };
    } catch (error) {
      console.error("Error updating book:", error);
      throw error;
    }
  }

  async deleteBook(bookId: string) {
    try {
      await db.delete(books).where(eq(books.id, bookId));
      return { success: true, message: "Book deleted successfully" };
    } catch (error) {
      console.error("Error deleting book:", error);
      throw error;
    }
  }

  // ===== RENTAL REQUESTS =====

  async createRentalRequest(userId: string, bookId: string) {
    try {
      const book = await this.getBookById(bookId);
      if (!book || book.availableCopies <= 0) {
        return {
          success: false,
          message: "Book not available for rental",
        };
      }

      const result = await db
        .insert(rentalRequests)
        .values({
          userId,
          bookId,
          requestStatus: "pending",
        })
        .returning();

      return { success: true, request: result[0] };
    } catch (error) {
      console.error("Error creating rental request:", error);
      throw error;
    }
  }

  async getUserRentalRequests(userId: string) {
    try {
      return await db
        .select()
        .from(rentalRequests)
        .where(eq(rentalRequests.userId, userId))
        .orderBy(desc(rentalRequests.requestedAt));
    } catch (error) {
      console.error("Error getting user rental requests:", error);
      throw error;
    }
  }

  async approveRentalRequest(requestId: string, approvedBy: string) {
    try {
      const request = await db
        .select()
        .from(rentalRequests)
        .where(eq(rentalRequests.id, requestId))
        .limit(1);

      if (!request[0]) {
        return { success: false, message: "Request not found" };
      }

      const result = await db
        .update(rentalRequests)
        .set({
          requestStatus: "approved",
          approvedAt: new Date(),
          approvedBy,
        })
        .where(eq(rentalRequests.id, requestId))
        .returning();

      return { success: true, request: result[0] };
    } catch (error) {
      console.error("Error approving rental request:", error);
      throw error;
    }
  }

  async rejectRentalRequest(requestId: string) {
    try {
      const result = await db
        .update(rentalRequests)
        .set({ requestStatus: "rejected" })
        .where(eq(rentalRequests.id, requestId))
        .returning();

      return { success: true, request: result[0] };
    } catch (error) {
      console.error("Error rejecting rental request:", error);
      throw error;
    }
  }

  // ===== ACTIVE RENTALS =====

  async checkoutBook(requestId: string, dueDays: number = 14) {
    try {
      const request = await db
        .select()
        .from(rentalRequests)
        .where(eq(rentalRequests.id, requestId))
        .limit(1);

      if (!request[0]) {
        return { success: false, message: "Request not found" };
      }

      // Create rental
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueDays);

      const rentalResult = await db
        .insert(rentals)
        .values({
          userId: request[0].userId,
          bookId: request[0].bookId,
          dueDate,
          rentalStatus: "active",
        })
        .returning();

      // Decrease available copies
      const book = await this.getBookById(request[0].bookId);
      if (book) {
        await db
          .update(books)
          .set({
            availableCopies: Math.max(0, book.availableCopies - 1),
          })
          .where(eq(books.id, request[0].bookId));
      }

      return { success: true, rental: rentalResult[0] };
    } catch (error) {
      console.error("Error checking out book:", error);
      throw error;
    }
  }

  async getUserActiveRentals(userId: string) {
    try {
      return await db
        .select()
        .from(rentals)
        .where(
          and(
            eq(rentals.userId, userId),
            eq(rentals.rentalStatus, "active")
          )
        )
        .orderBy(desc(rentals.rentalDate));
    } catch (error) {
      console.error("Error getting user active rentals:", error);
      throw error;
    }
  }

  async returnBook(rentalId: string) {
    try {
      const rental = await db
        .select()
        .from(rentals)
        .where(eq(rentals.id, rentalId))
        .limit(1);

      if (!rental[0]) {
        return { success: false, message: "Rental not found" };
      }

      const returnDate = new Date();
      const dueDate = new Date(rental[0].dueDate);
      const isLate = returnDate > dueDate;
      const daysKept = Math.ceil(
        (returnDate.getTime() - new Date(rental[0].rentalDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      let fineAmount = 0;
      if (isLate) {
        const daysOverdue = Math.ceil(
          (returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        fineAmount = daysOverdue * 10000; // 10,000 per day in local currency
      }

      // Update rental
      const result = await db
        .update(rentals)
        .set({
          returnDate,
          rentalStatus: "returned",
        })
        .where(eq(rentals.id, rentalId))
        .returning();

      // Add to rental history
      await db
        .insert(rentalHistory)
        .values({
          userId: rental[0].userId,
          bookId: rental[0].bookId,
          rentalDate: rental[0].rentalDate,
          returnDate,
          daysKept,
          wasLate: isLate,
          fineAmount,
        });

      // Increase available copies
      const book = await this.getBookById(rental[0].bookId);
      if (book) {
        await db
          .update(books)
          .set({
            availableCopies: book.availableCopies + 1,
          })
          .where(eq(books.id, rental[0].bookId));
      }

      return {
        success: true,
        rental: result[0],
        fine: fineAmount,
        isLate,
      };
    } catch (error) {
      console.error("Error returning book:", error);
      throw error;
    }
  }

  // ===== RENTAL HISTORY =====

  async getUserRentalHistory(userId: string) {
    try {
      return await db
        .select()
        .from(rentalHistory)
        .where(eq(rentalHistory.userId, userId))
        .orderBy(desc(rentalHistory.rentalDate));
    } catch (error) {
      console.error("Error getting user rental history:", error);
      throw error;
    }
  }

  async getRentalStats() {
    try {
      const activeRentals = await db
        .select()
        .from(rentals)
        .where(eq(rentals.rentalStatus, "active"));

      const totalRentals = await db.select().from(rentalHistory);

      const lateRentals = activeRentals.filter(
        (r) => new Date() > new Date(r.dueDate)
      );

      return {
        activeRentals: activeRentals.length,
        totalRentalsCompleted: totalRentals.length,
        lateRentals: lateRentals.length,
        totalBooksAvailable: 0,
        totalFinesCollected: totalRentals.reduce((sum, h) => sum + h.fineAmount, 0),
      };
    } catch (error) {
      console.error("Error getting rental stats:", error);
      throw error;
    }
  }
}

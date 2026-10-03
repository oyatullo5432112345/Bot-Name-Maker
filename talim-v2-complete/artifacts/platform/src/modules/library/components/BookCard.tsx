import React, { useState } from "react";

interface Book {
  id: string;
  title: string;
  author?: string;
  category?: string;
  coverImageUrl?: string;
  availableCopies: number;
  totalCopies: number;
  description?: string;
}

interface BookCardProps {
  book: Book;
  onRental?: (bookId: string) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onRental }) => {
  const [requesting, setRequesting] = useState(false);

  const handleRentalRequest = async () => {
    if (book.availableCopies <= 0) {
      alert("Bu kitob hozirda mavjud emas");
      return;
    }

    setRequesting(true);
    try {
      const response = await fetch("/api/v2/rentals/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: book.id }),
      });

      const result = await response.json();
      if (result.success) {
        alert("Ijara so'rovi yuborildi. Admin tasdiqlanishi uchun kutib turing.");
        onRental?.(book.id);
      } else {
        alert("Xato: " + result.message);
      }
    } catch (error) {
      alert("Ijara so'rovini yuborishda xato");
      console.error("Error:", error);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
      {/* Cover Image */}
      {book.coverImageUrl ? (
        <img
          src={book.coverImageUrl}
          alt={book.title}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
          <span className="text-white text-4xl">📖</span>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg truncate">{book.title}</h3>
          {book.author && <p className="text-sm text-gray-600">{book.author}</p>}
        </div>

        {book.category && (
          <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
            {book.category}
          </span>
        )}

        {book.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{book.description}</p>
        )}

        {/* Availability */}
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Mavjudlik</span>
            <span
              className={`font-semibold ${
                book.availableCopies > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {book.availableCopies}/{book.totalCopies}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition ${
                book.availableCopies > 0 ? "bg-green-500" : "bg-red-500"
              }`}
              style={{
                width: `${(book.availableCopies / book.totalCopies) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleRentalRequest}
          disabled={book.availableCopies <= 0 || requesting}
          className={`w-full py-2 rounded-lg font-medium transition ${
            book.availableCopies > 0
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          } ${requesting ? "opacity-50" : ""}`}
        >
          {requesting ? "Yuborilmoqda..." : "Ijara so'rovi"}
        </button>
      </div>
    </div>
  );
};

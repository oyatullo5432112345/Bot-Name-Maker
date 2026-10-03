import React, { useState, useEffect } from "react";
import { BookCard } from "../components/BookCard";

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

export const BooksPage: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchBooks();
  }, [selectedCategory]);

  useEffect(() => {
    filterBooks();
  }, [searchTerm, books]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const url = selectedCategory
        ? `/api/v2/rentals/books?category=${selectedCategory}`
        : "/api/v2/rentals/books";

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setBooks(result.data);
      }
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterBooks = () => {
    let filtered = books;

    if (searchTerm) {
      filtered = filtered.filter(
        (book) =>
          book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          book.author?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredBooks(filtered);
  };

  const categories = Array.from(
    new Set(books.map((b) => b.category).filter(Boolean))
  );

  if (loading && books.length === 0) {
    return <div className="p-6">Kitoblar yuklanmoqda...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Kutubxona</h1>
        <p className="text-gray-600">Kitob ijarasini boshqaring va ringga oluvchi bo'ling</p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <input
          type="text"
          placeholder="Kitob yoki muallif bo'yicha qidiring..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Kategoriya</p>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Barcha kategoriyalar</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Books Grid */}
      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">Kitoblar topilmadi</p>
        </div>
      )}

      {/* Summary */}
      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
        <p className="text-gray-700">
          <strong>{filteredBooks.length}</strong> ta kitob topildi,{" "}
          <strong>
            {filteredBooks.reduce((sum, b) => sum + b.availableCopies, 0)}
          </strong>{" "}
          ta mavjud
        </p>
      </div>
    </div>
  );
};

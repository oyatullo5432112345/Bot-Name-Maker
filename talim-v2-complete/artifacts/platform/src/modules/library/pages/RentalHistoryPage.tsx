import React, { useState, useEffect } from "react";

interface RentalHistory {
  id: string;
  bookId: string;
  rentalDate: string;
  returnDate?: string;
  daysKept: number;
  wasLate: boolean;
  fineAmount: number;
}

export const RentalHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<RentalHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch("/api/v2/rentals/history");
      const result = await response.json();
      if (result.success) {
        setHistory(result.data);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalFines = history.reduce((sum, h) => sum + h.fineAmount, 0);

  if (loading) {
    return <div className="p-6">Yuklanmoqda...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Ijara Tarixi</h1>
        <p className="text-gray-600">Siz qilingan barcha ijara operatsiyalarini ko'ring</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
          <p className="text-gray-600 text-sm">Jami ijara</p>
          <p className="text-2xl font-bold text-blue-600">{history.length}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-600">
          <p className="text-gray-600 text-sm">O'z vaqtida kelmagan</p>
          <p className="text-2xl font-bold text-orange-600">
            {history.filter((h) => h.wasLate).length}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-600">
          <p className="text-gray-600 text-sm">O'z vaqtida kelgan</p>
          <p className="text-2xl font-bold text-green-600">
            {history.filter((h) => !h.wasLate).length}
          </p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-600">
          <p className="text-gray-600 text-sm">Jami jarimalar</p>
          <p className="text-2xl font-bold text-red-600">{totalFines.toLocaleString()} сўм</p>
        </div>
      </div>

      {/* History Table */}
      {history.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Kitob</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Ijara sanasi</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Qaytarish sanasi</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Kunlar</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Holati</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Jarima</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {item.bookId.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(item.rentalDate).toLocaleDateString("uz-UZ")}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.returnDate
                      ? new Date(item.returnDate).toLocaleDateString("uz-UZ")
                      : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm">{item.daysKept}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.wasLate
                          ? "bg-orange-100 text-orange-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {item.wasLate ? "Kechiktirilgan" : "O'z vaqtida"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {item.fineAmount > 0 ? `${item.fineAmount.toLocaleString()} сўм` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">Ijara tarixi yo'q</p>
        </div>
      )}
    </div>
  );
};

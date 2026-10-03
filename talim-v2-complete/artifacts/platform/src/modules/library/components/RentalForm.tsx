import React, { useState } from "react";

interface RentalFormProps {
  bookId: string;
  onSuccess?: () => void;
}

export const RentalForm: React.FC<RentalFormProps> = ({ bookId, onSuccess }) => {
  const [dueDays, setDueDays] = useState(14);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/v2/rentals/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage("Ijara so'rovi muvaffaqiyatli yuborildi!");
        setDueDays(14);
        setNotes("");
        onSuccess?.();
      } else {
        setMessage("Xato: " + result.message);
      }
    } catch (error) {
      setMessage("Ijara so'rovini yuborishda xato");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <h3 className="text-lg font-semibold">Ijara So'rovi</h3>

      {/* Due Days */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Muddati (kunlar)
        </label>
        <input
          type="number"
          min="1"
          max="30"
          value={dueDays}
          onChange={(e) => setDueDays(parseInt(e.target.value))}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Qaytarish sanasi:{" "}
          {new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toLocaleDateString(
            "uz-UZ"
          )}
        </p>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Eslatmalar (ixtiyoriy)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Biron nimani qo'shmoqchimisiz?"
          rows={3}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded text-sm ${
            message.includes("muvaffaqiyatli")
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
      >
        {loading ? "Yuborilmoqda..." : "Ijara so'rovi yuborish"}
      </button>
    </form>
  );
};

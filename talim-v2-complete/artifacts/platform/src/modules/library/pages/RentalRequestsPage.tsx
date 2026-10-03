import React, { useState, useEffect } from "react";

interface RentalRequest {
  id: string;
  bookId: string;
  requestStatus: "pending" | "approved" | "rejected";
  requestedAt: string;
  approvedAt?: string;
}

export const RentalRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch("/api/v2/rentals/requests");
      const result = await response.json();
      if (result.success) {
        setRequests(result.data);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    const labels = {
      pending: "Kutilmoqda",
      approved: "Tasdiqlangan",
      rejected: "Rad etilgan",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return <div className="p-6">Yuklanmoqda...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Ijara so'rovlari</h1>
        <p className="text-gray-600">Sizning ijara so'rovlaringizni boshqaring</p>
      </div>

      {requests.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Kitob ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">So'rov vaqti</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Tasdiqlash vaqti</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {request.bookId.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-sm">{getStatusBadge(request.requestStatus)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(request.requestedAt).toLocaleDateString("uz-UZ")}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {request.approvedAt
                      ? new Date(request.approvedAt).toLocaleDateString("uz-UZ")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">So'rov topilmadi</p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-600">
          <p className="text-gray-600 text-sm">Kutilmoqda</p>
          <p className="text-2xl font-bold text-yellow-600">
            {requests.filter((r) => r.requestStatus === "pending").length}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-600">
          <p className="text-gray-600 text-sm">Tasdiqlangan</p>
          <p className="text-2xl font-bold text-green-600">
            {requests.filter((r) => r.requestStatus === "approved").length}
          </p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-600">
          <p className="text-gray-600 text-sm">Rad etilgan</p>
          <p className="text-2xl font-bold text-red-600">
            {requests.filter((r) => r.requestStatus === "rejected").length}
          </p>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { FaceRegistration } from "../components/FaceRegistration";

interface FaceIDStatus {
  registered: boolean;
  active: boolean;
  registeredAt?: string;
  lastVerifiedAt?: string;
  totalVerificationAttempts?: number;
  recentAttempts?: Array<{
    id: string;
    verificationStatus: string;
    confidenceScore: number;
    createdAt: string;
  }>;
}

export const FaceIDPage: React.FC = () => {
  const [status, setStatus] = useState<FaceIDStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/v2/face-id/status");
      const result = await response.json();
      if (result.success) {
        setStatus(result.data);
        setShowRegistration(!result.data.registered);
      }
    } catch (error) {
      console.error("Error fetching status:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeFaceID = async () => {
    if (confirm("Yuzni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.")) {
      try {
        const response = await fetch("/api/v2/face-id", { method: "DELETE" });
        const result = await response.json();
        if (result.success) {
          setStatus({ registered: false, active: false });
          setShowRegistration(true);
        }
      } catch (error) {
        console.error("Error removing face ID:", error);
      }
    }
  };

  if (loading) {
    return <div className="p-6">Yuklanmoqda...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Yuz ID Tasdiqlanishi</h1>

      {/* Status Card */}
      {status?.registered && (
        <div className="bg-green-50 border-l-4 border-green-600 p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-green-800 mb-2">✓ Faol</h2>
          <p className="text-gray-700 mb-4">Sizning yuzing ro'yxatdan o'tgan.</p>

          {status.registeredAt && (
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong>Ro'yxatdan o'tgan:</strong>{" "}
                {new Date(status.registeredAt).toLocaleDateString("uz-UZ")}
              </p>
              {status.lastVerifiedAt && (
                <p>
                  <strong>Oxirgi tasdiqlash:</strong>{" "}
                  {new Date(status.lastVerifiedAt).toLocaleDateString("uz-UZ")}
                </p>
              )}
              <p>
                <strong>Tasdiqlash urinishlari:</strong>{" "}
                {status.totalVerificationAttempts || 0}
              </p>
            </div>
          )}

          <button
            onClick={removeFaceID}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Yuzni o'chirish
          </button>
        </div>
      )}

      {/* Registration Form */}
      {showRegistration && <FaceRegistration onSuccess={fetchStatus} />}

      {/* Recent Attempts */}
      {status?.recentAttempts && status.recentAttempts.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">So'nggi tasdiqlash urinishlari</h2>
          <div className="space-y-2">
            {status.recentAttempts.slice(0, 5).map((attempt) => (
              <div
                key={attempt.id}
                className="flex justify-between items-center p-3 border rounded"
              >
                <div>
                  <p className="font-medium">
                    {attempt.verificationStatus === "success"
                      ? "✓ Muvaffaqiyatli"
                      : "✗ Muvaffaqiyatsiz"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(attempt.createdAt).toLocaleString("uz-UZ")}
                  </p>
                </div>
                <span className="text-sm bg-gray-100 px-3 py-1 rounded">
                  {(attempt.confidenceScore * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

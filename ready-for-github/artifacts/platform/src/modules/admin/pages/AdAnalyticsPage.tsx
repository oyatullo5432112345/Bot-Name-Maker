import React, { useState, useEffect } from "react";

interface DashboardData {
  totalAds: number;
  activeAds: number;
  totalViews: number;
  totalClicks: number;
  byAdvertiser: Array<{
    advertiserName: string;
    views: number;
    clicks: number;
  }>;
}

export const AdAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/v2/ads/dashboard/stats");
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-6">Yuklanmoqda...</div>;
  if (!data) return <div className="p-6">Ma'lumot topilmadi</div>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">Reklama Analitikasi</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-600">
          <p className="text-gray-600 text-sm">Jami reklamalar</p>
          <p className="text-3xl font-bold text-blue-600">{data.totalAds}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-600">
          <p className="text-gray-600 text-sm">Faol reklamalar</p>
          <p className="text-3xl font-bold text-green-600">{data.activeAds}</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-600">
          <p className="text-gray-600 text-sm">Jami ko'rishlar</p>
          <p className="text-3xl font-bold text-purple-600">{data.totalViews}</p>
        </div>
        <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-600">
          <p className="text-gray-600 text-sm">Jami kliklari</p>
          <p className="text-3xl font-bold text-orange-600">{data.totalClicks}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Reklama beruvchi bo'yicha</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Reklama beruvchi</th>
                <th className="px-4 py-2 text-left">Ko'rishlar</th>
                <th className="px-4 py-2 text-left">Kliklari</th>
                <th className="px-4 py-2 text-left">CTR (%)</th>
              </tr>
            </thead>
            <tbody>
              {data.byAdvertiser.map((item, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{item.advertiserName}</td>
                  <td className="px-4 py-2">{item.views}</td>
                  <td className="px-4 py-2">{item.clicks}</td>
                  <td className="px-4 py-2">
                    {item.views > 0
                      ? ((item.clicks / item.views) * 100).toFixed(2)
                      : "0"}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

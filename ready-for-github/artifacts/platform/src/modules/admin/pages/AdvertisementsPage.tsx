import React, { useState, useEffect } from "react";
import { Trash2, Edit2, Plus } from "lucide-react";

interface Advertisement {
  id: string;
  title: string;
  advertiserName: string;
  imageUrl: string;
  status: "active" | "inactive" | "paused";
  viewsCount: number;
  clicksCount: number;
  startDate?: string;
  endDate?: string;
}

export const AdvertisementsPage: React.FC = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    linkUrl: "",
    advertiserName: "",
    category: "",
    position: "sidebar",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const response = await fetch("/api/v2/ads");
      const data = await response.json();
      if (data.success) {
        setAds(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch ads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (ad?: Advertisement) => {
    if (ad) {
      setEditingId(ad.id);
      setFormData({
        title: ad.title,
        description: "",
        imageUrl: ad.imageUrl,
        linkUrl: "",
        advertiserName: ad.advertiserName,
        category: "",
        position: "sidebar",
        startDate: ad.startDate || "",
        endDate: ad.endDate || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        title: "",
        description: "",
        imageUrl: "",
        linkUrl: "",
        advertiserName: "",
        category: "",
        position: "sidebar",
        startDate: "",
        endDate: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = editingId ? `/api/v2/ads/${editingId}` : "/api/v2/ads";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          startDate: formData.startDate ? new Date(formData.startDate) : undefined,
          endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        fetchAds();
      }
    } catch (error) {
      console.error("Failed to save ad:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Reklamani o'chirish?")) {
      try {
        const response = await fetch(`/api/v2/ads/${id}`, { method: "DELETE" });
        if (response.ok) {
          fetchAds();
        }
      } catch (error) {
        console.error("Failed to delete ad:", error);
      }
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/v2/ads/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        fetchAds();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  if (loading) return <div className="p-6">Yuklanmoqda...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Reklamalar</h1>
        <button
          onClick={() => handleOpenDialog()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} /> Yangi reklama
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Reklama nomi</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Reklama beruvchi</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Rasm</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Ko'rishlar</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Kliklari</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad) => (
              <tr key={ad.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3">{ad.title}</td>
                <td className="px-6 py-3">{ad.advertiserName}</td>
                <td className="px-6 py-3">
                  <img
                    src={ad.imageUrl}
                    alt={ad.title}
                    className="h-10 w-10 object-cover rounded"
                  />
                </td>
                <td className="px-6 py-3">
                  <select
                    value={ad.status}
                    onChange={(e) => handleStatusChange(ad.id, e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="active">Faol</option>
                    <option value="inactive">O'chiq</option>
                    <option value="paused">To'xtatilgan</option>
                  </select>
                </td>
                <td className="px-6 py-3">{ad.viewsCount}</td>
                <td className="px-6 py-3">{ad.clicksCount}</td>
                <td className="px-6 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenDialog(ad)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(ad.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? "Reklamani tahrirlash" : "Yangi reklama qo'shish"}
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Reklama nomi"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
              <textarea
                placeholder="Tavsif"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="Rasm URL"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="Link URL"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="Reklama beruvchi nomi"
                value={formData.advertiserName}
                onChange={(e) => setFormData({ ...formData, advertiserName: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
              <select
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="sidebar">Yon paneli</option>
                <option value="banner">Banner</option>
                <option value="popup">Pop-up</option>
                <option value="footer">Footer</option>
              </select>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDialogOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingId ? "Saqlash" : "Qo'shish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

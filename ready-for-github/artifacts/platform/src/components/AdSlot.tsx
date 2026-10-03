import React, { useEffect, useState } from "react";

interface Ad {
  id: string;
  title: string;
  advertiserName: string;
  imageUrl: string;
  linkUrl?: string;
}

interface AdSlotProps {
  slotName: string;
  className?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ slotName, className = "" }) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const response = await fetch(`/api/v2/ads/slot/${slotName}`);
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          setAds(data.data);
          trackView(data.data[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch ads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, [slotName]);

  const trackView = async (adId: string) => {
    try {
      await fetch(`/api/v2/ads/${adId}/track-view`, { method: "POST" });
    } catch (error) {
      console.error("Failed to track view:", error);
    }
  };

  const handleAdClick = async (ad: Ad) => {
    try {
      await fetch(`/api/v2/ads/${ad.id}/track-click`, { method: "POST" });
      if (ad.linkUrl) {
        window.open(ad.linkUrl, "_blank");
      }
    } catch (error) {
      console.error("Failed to track click:", error);
    }
  };

  const rotateAd = () => {
    if (ads.length > 1) {
      const nextIndex = (currentAdIndex + 1) % ads.length;
      setCurrentAdIndex(nextIndex);
      trackView(ads[nextIndex].id);
    }
  };

  if (loading || ads.length === 0) return null;

  const currentAd = ads[currentAdIndex];

  return (
    <div className={`ad-slot ${className}`}>
      <div
        className="ad-container hover:opacity-90 transition-opacity cursor-pointer rounded-lg overflow-hidden"
        onClick={() => handleAdClick(currentAd)}
      >
        <img
          src={currentAd.imageUrl}
          alt={currentAd.title}
          className="w-full h-auto object-cover"
        />
        <div className="mt-2 p-2">
          <p className="font-semibold text-sm">{currentAd.title}</p>
          <p className="text-xs text-gray-600">by {currentAd.advertiserName}</p>
        </div>
      </div>

      {ads.length > 1 && (
        <button
          onClick={rotateAd}
          className="mt-2 w-full px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition"
        >
          Keyingi reklama
        </button>
      )}
    </div>
  );
};

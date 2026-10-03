import React, { useRef, useState } from "react";

interface FaceRegistrationProps {
  onSuccess?: () => void;
}

export const FaceRegistration: React.FC<FaceRegistrationProps> = ({ onSuccess }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 300 },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setMessage("");
      }
    } catch (error) {
      setMessage("Kamera ochilmadi. Ruxsat berish kerak.");
      console.error("Camera error:", error);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      setIsStreaming(false);
    }
  };

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsLoading(true);
    try {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);

        // Get image data
        const imageData = canvasRef.current.toDataURL("image/jpeg");

        // Send to backend
        const response = await fetch("/api/v2/face-id/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            faceData: { image: imageData },
            faceDescriptors: JSON.stringify([]), // Would be filled by ML model
          }),
        });

        const result = await response.json();
        if (result.success) {
          setMessage("Yuz muvaffaqiyatli ro'yxatdan o'tkazildi!");
          stopCamera();
          onSuccess?.();
        } else {
          setMessage("Ro'yxatdan o'tkazish muvaffaq bo'lmadi: " + result.message);
        }
      }
    } catch (error) {
      setMessage("Xato: Iltimos qayta urinib ko'ring");
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Yuz ro'yxatdan o'tkazish</h3>

        <div className="space-y-4">
          {/* Video stream */}
          {isStreaming && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg border-2 border-blue-500"
            />
          )}

          {/* Canvas for face capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Controls */}
          <div className="flex gap-2">
            {!isStreaming ? (
              <button
                onClick={startCamera}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Kamerani ochnig
              </button>
            ) : (
              <>
                <button
                  onClick={captureFace}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isLoading ? "Saqlanmoqda..." : "Yuzni saqlash"}
                </button>
                <button
                  onClick={stopCamera}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Kamerani yopish
                </button>
              </>
            )}
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded ${
                message.includes("muvaffaqiyatli")
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

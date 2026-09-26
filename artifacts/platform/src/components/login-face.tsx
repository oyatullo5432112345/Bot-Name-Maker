// Yuz (Face ID) bilan kirish — o'quvchilar uchun.
// Yuz izlari (128 son) SERVERda solishtiriladi; boshqa o'quvchilar ma'lumoti brauzerga kelmaydi.
// Tiriklik: to'g'ri qarash + boshni burish (2 kadr) — oddiy rasm bilan aldashni qiyinlashtiradi.

import { useEffect, useRef, useState } from "react";
import { ScanFace, Loader2, X, KeyRound, CheckCircle2 } from "lucide-react";
import { loadFaceApi, startCamera, stopCamera, detectFaces, distance } from "@/lib/face";

type Stage = "loading" | "frontal" | "turn" | "verify" | "error";
const TURN_TIMEOUT_MS = 6000; // burilishni shuncha kutamiz, keyin faqat to'g'ri kadr bilan davom etamiz

export function FaceLoginDialog({
  onSuccess, onClose, onUseId,
}: {
  onSuccess: (result: Record<string, unknown>) => void;
  onClose: () => void;
  onUseId: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const runningRef = useRef(false);
  const d1Ref = useRef<number[] | null>(null);
  const yaw0Ref = useRef(0);
  const turnStartRef = useRef(0);

  const [stage, setStage] = useState<Stage>("loading");
  const [progress, setProgress] = useState("Tayyorlanmoqda…");
  const [hint, setHint] = useState("To'g'ri kameraga qarang");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fa = await loadFaceApi((m) => alive && setProgress(m));
        if (!alive) return;
        faRef.current = fa;
        streamRef.current = await startCamera(videoRef.current!, "user", false);
        setStage("frontal");
        runningRef.current = true;
        void loop();
      } catch (e) {
        if (alive) { setError((e as Error).message); setStage("error"); }
      }
    })();
    return () => {
      alive = false;
      runningRef.current = false;
      stopCamera(streamRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async (descriptors: number[][]) => {
    runningRef.current = false;
    stopCamera(streamRef.current);
    setStage("verify");
    try {
      const r = await fetch("/api/auth/face-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptors }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError((data as { error?: string }).error ?? "Yuz tanilmadi");
        setStage("error");
        return;
      }
      onSuccess(data as Record<string, unknown>);
    } catch {
      setError("Serverga ulanib bo'lmadi. Internetni tekshiring.");
      setStage("error");
    }
  };

  const loop = async () => {
    if (!runningRef.current) return;
    const video = videoRef.current;
    const fa = faRef.current;
    try {
      if (video && fa && video.readyState >= 2 && video.videoWidth) {
        const faces = await detectFaces(fa, video, "tiny", { inputSize: 320, maxFaces: 1, minScore: 0.5 });
        const f = faces[0];
        const big = f && f.box.width >= video.videoWidth * 0.2;
        if (!f) setHint("Yuz ko'rinmayapti — kamerani yuzingizga qarating");
        else if (!big) setHint("Yaqinroq keling");
        else if (d1Ref.current === null) {
          // 1-bosqich: to'g'ri qarash
          if (Math.abs(f.yaw) < 0.2) {
            d1Ref.current = Array.from(f.descriptor);
            yaw0Ref.current = f.yaw;
            turnStartRef.current = Date.now();
            setStage("turn");
            setHint("Endi boshingizni biroz chapga yoki o'ngga buring");
          } else {
            setHint("To'g'ri kameraga qarang");
          }
        } else {
          // 2-bosqich: tiriklik uchun burilish
          const turned = Math.abs(f.yaw - yaw0Ref.current) > 0.18;
          const same = distance(f.descriptor, d1Ref.current) < 0.6;
          if (turned && same) {
            await verify([d1Ref.current, Array.from(f.descriptor)]);
            return;
          }
          if (Date.now() - turnStartRef.current > TURN_TIMEOUT_MS) {
            // burilishni ololmadik — faqat to'g'ri kadr bilan davom etamiz
            await verify([d1Ref.current]);
            return;
          }
          setHint("Boshingizni biroz buring…");
        }
      }
    } catch {
      /* keyingi kadr */
    }
    setTimeout(() => void loop(), 60);
  };

  const retry = () => {
    d1Ref.current = null;
    setError("");
    setStage("loading");
    (async () => {
      try {
        streamRef.current = await startCamera(videoRef.current!, "user", false);
        setStage("frontal");
        setHint("To'g'ri kameraga qarang");
        runningRef.current = true;
        void loop();
      } catch (e) { setError((e as Error).message); setStage("error"); }
    })();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2 font-semibold"><ScanFace className="w-5 h-5 text-primary" /> Yuz bilan kirish</div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-accent flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>

        <div className="relative aspect-[3/4] sm:aspect-square bg-black">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: "scaleX(-1)", opacity: stage === "frontal" || stage === "turn" ? 1 : 0.25 }}
            muted
            playsInline
          />
          {/* Oval yo'riqnoma */}
          {(stage === "frontal" || stage === "turn") && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-[62%] aspect-[3/4] rounded-[45%] border-4 ${stage === "turn" ? "border-amber-400/80" : "border-cyan-400/70"}`} />
            </div>
          )}
          {(stage === "loading" || stage === "verify") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
              <div className="mt-3 text-sm">{stage === "verify" ? "Tekshirilmoqda…" : progress}</div>
            </div>
          )}
          {stage === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-6">
              <X className="w-12 h-12 text-red-400" />
              <div className="mt-3 text-red-200">{error}</div>
            </div>
          )}
          {(stage === "frontal" || stage === "turn") && (
            <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white text-center">
              <div className="font-semibold">{hint}</div>
              <div className="mt-1 text-xs text-white/60 flex items-center justify-center gap-1">
                {stage === "turn" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : null}
                {stage === "turn" ? "To'g'ri qarash olindi" : "Yuzingizni ovalga joylashtiring"}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col gap-2">
          {stage === "error" && <button onClick={retry} className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold">Qayta urinish</button>}
          <button onClick={onUseId} className="w-full rounded-xl border py-3 font-medium flex items-center justify-center gap-2">
            <KeyRound className="w-4 h-4" /> 5 xonali ID bilan kirish
          </button>
        </div>
      </div>
    </div>
  );
}

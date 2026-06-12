import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const SYNC_KEY = "data_sync_v1";
const MAX_SYNC_MS = 10000;
const SHOW_SKIP_AFTER_MS = 3000;
const GLOBE_URL = "/globe-bg.png";

function getToken() {
  return localStorage.getItem("talim_auth_token");
}

interface DataSyncProps {
  userId: string;
  userRole: string;
}

export function DataSync({ userId, userRole }: DataSyncProps) {
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState("Yuklanmoqda...");
  const [showSkip, setShowSkip] = useState(false);
  const [globeLoaded, setGlobeLoaded] = useState(false);
  const didSync = useRef(false);
  const doneRef = useRef(false);

  const finish = (syncKey: string) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setProgress(100);
    setLabel("Tayyor!");
    sessionStorage.setItem(syncKey, "1");
    setTimeout(() => setVisible(false), 600);
  };

  useEffect(() => {
    const syncKey = `${SYNC_KEY}_${userId}`;
    if (sessionStorage.getItem(syncKey)) return;
    if (didSync.current) return;
    didSync.current = true;

    setVisible(true);
    setProgress(5);

    // Globe rasmini preload qilish — layout uchun kesh to'ldiriladi
    const img = new Image();
    img.onload = () => setGlobeLoaded(true);
    img.onerror = () => setGlobeLoaded(true);
    img.src = GLOBE_URL;

    const skipTimer = setTimeout(() => setShowSkip(true), SHOW_SKIP_AFTER_MS);
    const hardTimer = setTimeout(() => finish(syncKey), MAX_SYNC_MS);

    const token = getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const isAdmin = ["admin", "director", "zam_direktor", "zavuch", "sinf_rahbari"].includes(userRole);
    const isStudent = userRole === "student";

    const tasks: { key: string[]; url: string; label: string }[] = [
      { key: ["dashboard-stats"], url: "/dashboard/stats", label: "Dashboard..." },
    ];
    if (!isStudent) {
      tasks.push({ key: ["classes", {}], url: "/classes", label: "Sinflar..." });
    }
    if (isAdmin) {
      tasks.push({ key: ["students", {}], url: "/students", label: "O'quvchilar..." });
      tasks.push({ key: ["staff", {}], url: "/staff", label: "Xodimlar..." });
    }

    let done = 0;

    const fetchAll = async () => {
      // Globe rasm tugashini kutamiz (max 3s)
      await Promise.race([
        new Promise<void>((res) => { img.complete ? res() : (img.onload = img.onerror = () => res()); }),
        new Promise<void>((res) => setTimeout(res, 3000)),
      ]);

      setProgress(15);

      for (const task of tasks) {
        if (doneRef.current) break;
        setLabel(task.label);
        try {
          const controller = new AbortController();
          const reqTimer = setTimeout(() => controller.abort(), 5000);
          await queryClient.prefetchQuery({
            queryKey: task.key,
            queryFn: async () => {
              try {
                const r = await fetch(`${API_BASE}${task.url}`, {
                  headers,
                  signal: controller.signal,
                });
                clearTimeout(reqTimer);
                if (!r.ok) return null;
                return r.json();
              } catch {
                clearTimeout(reqTimer);
                return null;
              }
            },
            staleTime: 5 * 60 * 1000,
          });
        } catch {}
        done++;
        setProgress(Math.round(20 + (done / tasks.length) * 78));
      }

      clearTimeout(hardTimer);
      clearTimeout(skipTimer);
      finish(syncKey);
    };

    fetchAll();

    return () => {
      clearTimeout(skipTimer);
      clearTimeout(hardTimer);
    };
  }, [userId]);

  const handleSkip = () => {
    const syncKey = `${SYNC_KEY}_${userId}`;
    finish(syncKey);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="datasync"
          className="fixed inset-0 z-[9997] flex flex-col items-center justify-center"
          style={{
            backgroundImage: globeLoaded
              ? `url(${GLOBE_URL}), linear-gradient(135deg, #07122a 0%, #0d1f4a 50%, #07122a 100%)`
              : "linear-gradient(135deg, #07122a 0%, #0d1f4a 50%, #07122a 100%)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundBlendMode: "overlay",
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
        >
          <div className="absolute inset-0 bg-[#06102a]/82" />

          <div className="relative z-10 flex flex-col items-center gap-7 px-6">
            <motion.div
              className="relative"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 border-t-blue-400 border-r-indigo-400" />
            </motion.div>

            <div className="text-center space-y-1">
              <motion.p
                key={label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white font-semibold text-lg"
              >
                {label}
              </motion.p>
              <p className="text-blue-300/70 text-sm">Iltimos kuting...</p>
            </div>

            <div className="w-56 space-y-2">
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
              <p className="text-center text-white/30 text-xs">{progress}%</p>
            </div>

            <AnimatePresence>
              {showSkip && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={handleSkip}
                  className="mt-2 px-5 py-1.5 rounded-full text-sm text-white/60 border border-white/15 hover:border-white/40 hover:text-white/90 transition-colors"
                >
                  O'tkazib yuborish →
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

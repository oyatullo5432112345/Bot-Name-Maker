import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X } from "lucide-react";

export function PwaUpdatePrompt() {
  const [visible, setVisible] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Har 60 daqiqada yangi versiyani tekshir
      if (r) {
        setInterval(() => r.update(), 60 * 60 * 1000);
      }
    },
    onNeedRefresh() {
      setVisible(true);
    },
  });

  useEffect(() => {
    if (needRefresh) setVisible(true);
  }, [needRefresh]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="bg-primary text-primary-foreground rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
            <RefreshCw className="w-5 h-5 shrink-0 animate-spin-slow" />
            <p className="flex-1 text-sm font-medium">
              Yangi versiya tayyor! Yangilanish uchun bosing.
            </p>
            <button
              onClick={() => updateServiceWorker(true)}
              className="shrink-0 bg-white/20 hover:bg-white/30 transition rounded-xl px-3 py-1 text-sm font-semibold"
            >
              Yangilash
            </button>
            <button
              onClick={() => setVisible(false)}
              className="shrink-0 hover:bg-white/20 transition rounded-full p-1"
              aria-label="Yopish"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

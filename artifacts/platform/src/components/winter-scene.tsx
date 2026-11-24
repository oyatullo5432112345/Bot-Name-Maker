// Qish sahnasi: realistik qor parchalari va sovg'a sirli xabari (uchuvchi Qorbobosiz).
// Faqat qish rejimi yoqilganda ko'rinadi (useSeason).

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useSeason } from "@/lib/season";

const GIFT_TEXT = "Sizning sovg'angiz bor! Yangi yil bilan — platforma jamoasi nomidan eng yaxshi tilaklar. 🎁";
const GIFT_KEY = "talim_gift_year_";

const ANIM = `
@keyframes ws-fall { 0% { transform: translate3d(0,-12vh,0) rotate(0deg); } 100% { transform: translate3d(var(--dx,0px),112vh,0) rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .ws-anim { animation: none !important; } }
`;

function Flake({ size = 24, opacity = 0.9 }: { size?: number; opacity?: number }) {
  const arms = useMemo(() => {
    const out: ReactElement[] = [];
    for (let i = 0; i < 6; i++) {
      const rot = i * 60;
      out.push(
        <g key={i} transform={`rotate(${rot} 50 50)`}>
          <line x1="50" y1="50" x2="50" y2="8" stroke="#eaf6ff" strokeWidth="3" strokeLinecap="round" />
          <line x1="50" y1="26" x2="40" y2="16" stroke="#eaf6ff" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="50" y1="26" x2="60" y2="16" stroke="#eaf6ff" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="50" y1="38" x2="42" y2="30" stroke="#eaf6ff" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="50" y1="38" x2="58" y2="30" stroke="#eaf6ff" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="50" cy="8" r="2.2" fill="#ffffff" />
        </g>
      );
    }
    return out;
  }, []);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ opacity, filter: "drop-shadow(0 0 3px rgba(186,230,253,.8))" }} aria-hidden>
      {arms}
      <circle cx="50" cy="50" r="4" fill="#ffffff" />
    </svg>
  );
}

export function WinterScene() {
  const { winter } = useSeason();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const flakes = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    left: (i * 53) % 100,
    delay: -((i * 2.3) % 14),
    dur: 9 + ((i * 1.7) % 7),
    size: 10 + ((i * 7) % 16),
    dx: ((i % 5) - 2) * 14,
    op: 0.5 + ((i * 3) % 5) / 10,
  })), []);
  if (!winter || !mounted) return null;
  return (
    <>
      <style>{ANIM}</style>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[25] overflow-hidden">
        {flakes.map((f, i) => (
          <div
            key={i}
            className="ws-anim absolute top-0"
            style={{
              left: `${f.left}%`,
              animation: `ws-fall ${f.dur}s linear ${f.delay}s infinite`,
              ["--dx" as string]: `${f.dx}px`,
            }}
          >
            <Flake size={f.size} opacity={f.op} />
          </div>
        ))}
      </div>
      <GiftSurprise />
    </>
  );
}

export function openGift(force = false) {
  const now = new Date();
  const key = GIFT_KEY + now.getFullYear();
  const isNewYear = now.getMonth() === 0 && now.getDate() === 1;
  if (!force && (!isNewYear || localStorage.getItem(key))) return false;
  window.dispatchEvent(new CustomEvent("talim:gift"));
  return true;
}

export function GiftSurprise() {
  const [open, setOpen] = useState(false);
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    const onGift = () => setOpen(true);
    window.addEventListener("talim:gift", onGift);
    openGift(false);
    return () => window.removeEventListener("talim:gift", onGift);
  }, []);
  if (!open) return null;
  const close = () => {
    localStorage.setItem(GIFT_KEY + new Date().getFullYear(), "1");
    setOpen(false);
    setReveal(false);
  };
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" onClick={close}>
      <div className="w-full max-w-sm rounded-3xl border border-amber-300/40 bg-gradient-to-b from-[#1e3a8a] to-[#0b1224] p-6 text-center text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {!reveal ? (
          <>
            <div className="text-5xl mb-3">🎁</div>
            <div className="text-xl font-extrabold">Sizning sovg'angiz bor!</div>
            <p className="text-sm text-blue-100/80 mt-2">Yangi yil muborak bo'lsin.</p>
            <button onClick={() => setReveal(true)} className="mt-5 w-full rounded-xl bg-gradient-to-r from-amber-300 to-rose-400 py-3 font-bold text-[#1f1300]">Ochish</button>
          </>
        ) : (
          <>
            <div className="text-4xl mb-2">✨</div>
            <p className="text-base leading-relaxed">{GIFT_TEXT}</p>
            <button onClick={close} className="mt-5 w-full rounded-xl border border-white/20 py-2.5 font-semibold">Yopish</button>
          </>
        )}
      </div>
    </div>
  );
}

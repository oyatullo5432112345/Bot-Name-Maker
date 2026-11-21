// Qish sahnasi: realistik qor parchalari, qorbobo uchuvchi chana, sovg'a sirli xabari.
// Faqat qish rejimi yoqilganda ko'rinadi (useSeason). Harakat "kamroq harakat" sozlamasiga bo'ysunadi.

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useSeason } from "@/lib/season";
import { ArchaTree, loadArcha, type Orn } from "@/components/archa-tree";

const GIFT_TEXT = "Sizning sovg'angiz bor! Yangi yil bilan — platforma jamoasi nomidan eng yaxshi tilaklar. 🎁";
const GIFT_KEY = "talim_gift_year_";

const ANIM = `
@keyframes ws-fall { 0% { transform: translate3d(0,-12vh,0) rotate(0deg); } 100% { transform: translate3d(var(--dx,0px),112vh,0) rotate(360deg); } }
@keyframes ws-fly { 0% { transform: translateX(-35vw) translateY(0); } 9% { transform: translateX(118vw) translateY(-8vh); } 100% { transform: translateX(118vw) translateY(-8vh); } }
@keyframes ws-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes ws-glow { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .ws-anim { animation: none !important; } }
`;

/* Realistik qor parchasi: 6 tarmoqli simmetriya, har tarmoqda yonbarmoqlar */
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

/* Qorbobo va uchta bug'u chanada */
function SantaSleigh({ width = 190 }: { width?: number }) {
  return (
    <svg width={width} viewBox="0 0 300 120" aria-hidden style={{ overflow: "visible" }}>
      {/* iz (yorug' iz) */}
      <path d="M0 70 Q 60 40 130 62" stroke="rgba(147,197,253,.55)" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M0 84 Q 60 56 130 76" stroke="rgba(186,230,253,.35)" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* bug'ular */}
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${96 - i * 30} ${i % 2 ? 58 : 48})`}>
          <ellipse cx="0" cy="22" rx="22" ry="10" fill="#8b5a2b" />
          <circle cx="20" cy="10" r="8" fill="#9a6a3a" />
          <path d="M14 2 L18 -8 M24 2 L28 -8" stroke="#6b4423" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="-18" y1="26" x2="-30" y2="30" stroke="#6b4423" strokeWidth="2.5" />
        </g>
      ))}
      {/* chana */}
      <path d="M130 62 Q 150 84 190 84 L 200 66 L 146 56 Z" fill="#b91c1c" />
      <path d="M130 62 Q 150 84 190 84" stroke="#fde68a" strokeWidth="3" fill="none" />
      {/* qorbobo */}
      <circle cx="170" cy="40" r="11" fill="#fcd9b6" />
      <path d="M160 36 Q 170 24 180 36 L 180 42 Q 170 46 160 42 Z" fill="#ffffff" />
      <path d="M158 56 Q 170 44 182 56 L 186 80 L 154 80 Z" fill="#1d4ed8" />
      <path d="M154 80 L 186 80" stroke="#fde68a" strokeWidth="3" />
      <circle cx="169" cy="40" r="1.4" fill="#111827" />
      <path d="M160 48 Q 170 56 180 48" stroke="#e5e7eb" strokeWidth="5" fill="none" />
      {/* porloq */}
      <circle cx="250" cy="30" r="3" fill="#bae6fd" style={{ animation: "ws-glow 2s ease-in-out infinite" }} />
      <circle cx="270" cy="44" r="2" fill="#e0f2fe" />
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
          <div key={i} className="ws-anim absolute top-0" style={{
            left: `${f.left}%`,
            animation: `ws-fall ${f.dur}s linear ${f.delay}s infinite`,
            ["--dx" as string]: `${f.dx}px`,
          }}>
            <Flake size={f.size} opacity={f.op} />
          </div>
        ))}
        {/* Qorbobo: har 40 soniyada bir marta uchib o'tadi */}
        <div className="ws-anim absolute" style={{ top: "9vh", left: 0, animation: "ws-fly 40s linear infinite", willChange: "transform" }}>
          <div className="ws-anim" style={{ animation: "ws-bob 1.6s ease-in-out infinite" }}>
            <SantaSleigh />
          </div>
        </div>
      </div>
      <GiftSurprise />
    </>
  );
}

/* Yangi yil kuni (1-yanvar) yoki 7 marta yulduzni bosganda — bir martalik sirli sovg'a */
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
    if (openGift(false)) { /* hodisa dispatch qilindi */ }
    return () => window.removeEventListener("talim:gift", onGift);
  }, []);
  if (!open) return null;
  const close = () => {
    localStorage.setItem(GIFT_KEY + new Date().getFullYear(), "1");
    setOpen(false); setReveal(false);
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

/* Bosh sahifadagi archa kartasi: qish rejimida, bezaklar bilan. Yulduzni 7 marta bossangiz — sovg'a. */
export function ArchaCard() {
  const { winter } = useSeason();
  const [orn, setOrn] = useState<Orn[]>([]);
  const [taps, setTaps] = useState(0);
  useEffect(() => { setOrn(loadArcha()); }, []);
  if (!winter) return null;
  return (
    <a href="/archa" className="block rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f2a1f] to-[#0b1224] p-4 text-white hover:border-emerald-400/40 transition">
      <div className="flex items-center gap-4">
        <div className="w-20 shrink-0">
          <ArchaTree ornaments={orn} className="w-full h-auto" showStar onStarClick={() => {
            const n = taps + 1; setTaps(n);
            if (n >= 7) { setTaps(0); openGift(true); }
          }} />
        </div>
        <div className="min-w-0">
          <div className="font-bold">Yangi yil archasi</div>
          <div className="text-xs text-white/70 mt-1">{orn.length ? `${orn.length} ta bezak` : "Hali bezak yo'q"} · Archani bezash uchun bosing</div>
        </div>
      </div>
    </a>
  );
}

export { SantaSleigh, Flake };

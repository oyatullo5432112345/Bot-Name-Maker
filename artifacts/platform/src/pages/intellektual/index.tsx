import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Lock, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

// ═══════════════════════════════════════════════════════════════════
//  INTELEKTUAL O'YINLAR — hub.
//  • Admin uchun DOIMIY OCHIQ (countdown yo'q).
//  • Boshqalar uchun 10-DEKABR 2026 gacha countdown;
//    tugaganda portlash bilan ochiladi.
// ═══════════════════════════════════════════════════════════════════
const LAUNCH_AT = new Date("2026-12-10T08:00:00+05:00").getTime();

// Progress hisoblash uchun "boshlanish" nuqtasi.
// Sahifa birinchi marta ochilganda localStorage'ga yoziladi.
const START_KEY = "intellektual_start_at";
const BOOM_SEEN_KEY = "intellektual_boom_seen";

function getStartAt(): number {
  try {
    const v = localStorage.getItem(START_KEY);
    if (v) return Number(v);
    const now = Date.now();
    localStorage.setItem(START_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}
// ═══════════════════════════════════════════════════════════════════

const CSS = `
@keyframes intel-flash { 0%{opacity:0} 10%{opacity:1} 100%{opacity:0} }
@keyframes intel-ring { 0%{transform:translate(-50%,-50%) scale(0);opacity:.9} 100%{transform:translate(-50%,-50%) scale(14);opacity:0} }
@keyframes intel-particle { 0%{opacity:1} 100%{opacity:0} }
@keyframes intel-title { 0%{transform:scale(.3);opacity:0} 60%{transform:scale(1.15);opacity:1} 100%{transform:scale(1);opacity:1} }
@keyframes intel-glow { 0%,100%{opacity:.4} 50%{opacity:.9} }
@keyframes intel-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes intel-tick { 0%,100%{opacity:1} 50%{opacity:.5} }
`;

function Boom() {
  const particles = Array.from({ length: 26 });
  return (
    <div className="fixed inset-0 z-[80] pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-white" style={{ animation: "intel-flash 0.7s ease-out forwards" }} />
      {[0, 1, 2].map((i) => (
        <div key={i} className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: 60, height: 60,
            border: "6px solid " + ["#fbbf24", "#a855f7", "#38bdf8"][i],
            animation: `intel-ring 1.3s ${i * 0.12}s cubic-bezier(.2,.7,.3,1) forwards`,
          }} />
      ))}
      {particles.map((_, i) => {
        const ang = (i / particles.length) * Math.PI * 2;
        const dist = 160 + Math.random() * 220;
        const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
        const col = ["#fbbf24", "#f472b6", "#a855f7", "#38bdf8", "#34d399"][i % 5];
        return (
          <div key={i} className="absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: 14, height: 14, background: col,
              transform: "translate(-50%,-50%)", translate: `${dx}px ${dy}px`,
              animation: `intel-particle 1.2s ${0.1 + Math.random() * 0.2}s ease-out forwards`,
            }} />
        );
      })}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl"
        style={{ animation: "intel-title 1s 0.3s both" }}>🎉</div>
    </div>
  );
}

function pad(n: number) { return String(n).padStart(2, "0"); }

export default function Intellektual() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [now, setNow] = useState(Date.now());
  const [boom, setBoom] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [startAt] = useState<number>(() => getStartAt());
  const started = useRef(false);

  useEffect(() => {
    const seen = (() => { try { return localStorage.getItem(BOOM_SEEN_KEY) === "1"; } catch { return false; } })();
    if (isAdmin || (Date.now() >= LAUNCH_AT && seen)) { setRevealed(true); started.current = true; }
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isAdmin]);

  const launched = now >= LAUNCH_AT;

  useEffect(() => {
    if (!isAdmin && launched && !revealed && !started.current) {
      started.current = true;
      setBoom(true);
      const t = setTimeout(() => {
        setBoom(false); setRevealed(true);
        try { localStorage.setItem(BOOM_SEEN_KEY, "1"); } catch { /* ignore */ }
      }, 2600);
      return () => clearTimeout(t);
    }
  }, [isAdmin, launched, revealed]);

  // ─────────── OCHILGAN: o'yinlar ───────────
  if (revealed) {
    return (
      <div className="space-y-5 pb-10">
        <style>{CSS}</style>
        <div className="text-center pt-2">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
            🧠 Intelektual o'yinlar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Aqlingni charxla, maktabingni kuchaytir!</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <GameCard href="/oyin" emoji="🏰" title="Maktab Olami"
            desc="Tangalaringga maktab binolarini va qahramoningni kuchaytir."
            from="from-indigo-600" via="via-violet-600" to="to-amber-500" cta="KIRISH" />
          <GameCard href="/oyin/merge" emoji="🧩" title="Merge — kuchaytir"
            desc="Bir xil plitkalarni birlashtirib yuqori darajaga chiq."
            from="from-fuchsia-600" via="via-pink-600" to="to-rose-500" cta="O'YNASH" />
        </div>
        <p className="text-center text-xs text-muted-foreground">Yana yangi o'yinlar tez orada qo'shiladi.</p>
      </div>
    );
  }

  // ─────────── QULF: 10-DEKABRGACHA COUNTDOWN ───────────
  const rem = Math.max(0, LAUNCH_AT - now);
  const d = Math.floor(rem / 86400000);
  const h = Math.floor((rem % 86400000) / 3600000);
  const m = Math.floor((rem % 3600000) / 60000);
  const s = Math.floor((rem % 60000) / 1000);

  // Progress: sahifa birinchi ochilgan paytdan LAUNCH_AT gacha
  const total = Math.max(1, LAUNCH_AT - startAt);
  const elapsed = Math.min(total, Math.max(0, now - startAt));
  const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));

  return (
    <div className="relative min-h-[85vh] flex flex-col items-center justify-center rounded-3xl overflow-hidden p-6
      bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950">
      <style>{CSS}</style>
      {boom && <Boom />}

      {/* fon halqalari */}
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="absolute rounded-full pointer-events-none"
          style={{
            width: 260 + i * 180, height: 260 + i * 180,
            border: "1px solid rgba(168,85,247,0.10)",
            animation: "intel-glow 4s ease-in-out infinite", animationDelay: `${i * 0.4}s`,
          }} />
      ))}

      {/* yulduzcha effekt */}
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={`star-${i}`} className="absolute w-1 h-1 rounded-full bg-white/40 pointer-events-none"
          style={{
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 100}%`,
            animation: `intel-tick ${2 + (i % 3)}s ease-in-out infinite`,
            animationDelay: `${i * 0.15}s`,
          }} />
      ))}

      <div className="relative z-10 flex flex-col items-center w-full max-w-2xl">

        {/* Qulf ikonkasi */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400/20 to-fuchsia-500/20 border border-white/20 flex items-center justify-center mb-6 backdrop-blur"
          style={{ animation: "intel-float 3s ease-in-out infinite" }}>
          <Lock className="w-10 h-10 text-amber-300" />
        </div>

        {/* Sarlavha */}
        <h2 className="text-xl sm:text-2xl font-extrabold text-white text-center mb-1 tracking-tight">
          Intellektual o'yinlar
        </h2>
        <p className="text-white/50 text-sm text-center mb-7">
          10-dekabr 2026 da ochiladi — sabr qiling!
        </p>

        {/* Countdown raqamlari */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-7">
          {[
            { v: d, l: "kun" },
            { v: h, l: "soat" },
            { v: m, l: "daqiqa" },
            { v: s, l: "soniya" },
          ].map((x, i) => (
            <div key={i} className="flex flex-col items-center">
              <div
                className="relative w-[72px] sm:w-[88px] h-[88px] sm:h-[104px] rounded-2xl
                  bg-gradient-to-b from-white/[0.12] to-white/[0.04]
                  border border-white/15 backdrop-blur
                  flex items-center justify-center
                  shadow-[0_8px_32px_rgba(168,85,247,0.15)]"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/10 to-fuchsia-500/10" />
                <span className="relative text-white font-black text-4xl sm:text-5xl tabular-nums tracking-tight">
                  {pad(x.v)}
                </span>
              </div>
              <div className="text-white/40 text-[10px] sm:text-[11px] mt-2 uppercase tracking-[0.15em] font-semibold">
                {x.l}
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-md">
          <div className="flex justify-between text-[11px] text-white/40 mb-1.5 px-1">
            <span>Ochilishga</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden border border-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-fuchsia-500 to-indigo-500 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-[11px] text-white/30 mt-3">
            10-dekabr 2026, soat 08:00 (Toshkent)
          </p>
        </div>
      </div>
    </div>
  );
}

function GameCard({ href, emoji, title, desc, from, via, to, cta }: {
  href: string; emoji: string; title: string; desc: string; from: string; via: string; to: string; cta: string;
}) {
  return (
    <Link href={href} className="block">
      <div className="relative rounded-2xl border border-border overflow-hidden p-5 bg-card hover:border-primary/50 transition group">
        <div className={`absolute -top-10 -right-8 w-28 h-28 rounded-full bg-gradient-to-br ${from} ${via} ${to} opacity-20 blur-2xl`} />
        <div className="relative z-10">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${from} ${via} ${to} flex items-center justify-center text-3xl mb-3 shadow-md`}>{emoji}</div>
          <h3 className="font-extrabold text-lg">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
          <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
            {cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
          </div>
        </div>
      </div>
    </Link>
  );
          }

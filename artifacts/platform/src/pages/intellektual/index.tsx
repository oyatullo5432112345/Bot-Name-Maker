import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Lock, ArrowRight } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
//  INTELEKTUAL O'YINLAR — hub.
//  48 soatlik "tez kunda" countdown bilan qulflangan. Vaqt tugaganda —
//  katta portlash effekti bilan ochiladi va o'yinlar ko'rinadi.
//
//  ⬇⬇⬇  MUHIM: deploy qilganда shu sanani "hozir + 48 soat" ga qo'ying.
//  (Masalan hozir 2026-10-18 08:00 bo'lsa → 2026-10-20 08:00)
const LAUNCH_AT = new Date("2026-10-20T08:00:00+05:00").getTime();
const BOOM_SEEN_KEY = "intellektual_boom_seen";
// ═══════════════════════════════════════════════════════════════════

const CSS = `
@keyframes intel-flash { 0%{opacity:0} 10%{opacity:1} 100%{opacity:0} }
@keyframes intel-ring { 0%{transform:translate(-50%,-50%) scale(0);opacity:.9} 100%{transform:translate(-50%,-50%) scale(14);opacity:0} }
@keyframes intel-particle { 0%{transform:translate(-50%,-50%) translate(0,0) scale(1);opacity:1} 100%{opacity:0} }
@keyframes intel-title { 0%{transform:scale(.3);opacity:0} 60%{transform:scale(1.15);opacity:1} 100%{transform:scale(1);opacity:1} }
@keyframes intel-glow { 0%,100%{opacity:.5} 50%{opacity:1} }
@keyframes intel-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
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
              transform: "translate(-50%,-50%)",
              animation: `intel-particle 1.2s ${0.1 + Math.random() * 0.2}s ease-out forwards`,
              // CSS o'zgaruvchisi bilan tarqalish
              ["--none" as string]: "0",
              translate: `${dx}px ${dy}px`,
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
  const [now, setNow] = useState(Date.now());
  const [boom, setBoom] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // Agar allaqachon ochilgan bo'lsa va portlashni ko'rgan bo'lsa — to'g'ridan-to'g'ri ko'rsatamiz
    const seen = (() => { try { return localStorage.getItem(BOOM_SEEN_KEY) === "1"; } catch { return false; } })();
    if (Date.now() >= LAUNCH_AT && seen) { setRevealed(true); started.current = true; }
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const launched = now >= LAUNCH_AT;

  useEffect(() => {
    if (launched && !revealed && !started.current) {
      started.current = true;
      setBoom(true);
      const t = setTimeout(() => {
        setBoom(false); setRevealed(true);
        try { localStorage.setItem(BOOM_SEEN_KEY, "1"); } catch { /* ignore */ }
      }, 2600);
      return () => clearTimeout(t);
    }
  }, [launched, revealed]);

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

  // ─────────── QULF: countdown ───────────
  const rem = Math.max(0, LAUNCH_AT - now);
  const d = Math.floor(rem / 86400000);
  const h = Math.floor((rem % 86400000) / 3600000);
  const m = Math.floor((rem % 3600000) / 60000);
  const s = Math.floor((rem % 60000) / 1000);

  return (
    <div className="fixed inset-0 z-[40] flex flex-col items-center justify-center p-6 overflow-hidden
      bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950">
      <style>{CSS}</style>
      {boom && <Boom />}

      {/* fon halqalari */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="absolute rounded-full pointer-events-none"
          style={{
            width: 300 + i * 220, height: 300 + i * 220,
            border: "1px solid rgba(168,85,247,0.12)",
            animation: "intel-glow 4s ease-in-out infinite", animationDelay: `${i * 0.5}s`,
          }} />
      ))}

      <div className="relative z-10 text-center" style={{ animation: "intel-float 4s ease-in-out infinite" }}>
        <div className="w-20 h-20 mx-auto rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-5">
          <Lock className="w-9 h-9 text-amber-300" />
        </div>
        <div className="text-amber-300/90 text-xs font-bold tracking-[0.2em] uppercase mb-2">Tez kunda</div>
        <h1 className="text-white font-extrabold text-3xl sm:text-4xl mb-2">Intelektual o'yinlar</h1>
        <p className="text-white/50 text-sm mb-8 max-w-xs mx-auto">Katta ochilishga tayyorlaning — vaqt tugaganda portlash bilan ochiladi!</p>

        <div className="flex items-center justify-center gap-2.5">
          {[{ v: d, l: "kun" }, { v: h, l: "soat" }, { v: m, l: "daq" }, { v: s, l: "son" }].map((x, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-[70px] h-[84px] rounded-2xl bg-white/8 border border-white/12 backdrop-blur flex items-center justify-center text-white font-black text-4xl tabular-nums">
                {pad(x.v)}
              </div>
              <div className="text-white/40 text-[11px] mt-1.5 uppercase tracking-wider">{x.l}</div>
            </div>
          ))}
        </div>
      </div>

      <Link href="/games" className="relative z-10 mt-10 text-white/40 text-xs underline">← O'yinlarга qaytish</Link>
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

// Maktab Olami — tanga bilan o'z milliy shaharchangni qurasan va kuchaytirasan.
// Urush yo'q; har bino daraja oshgani sari ko'rinishi boyib, Registon uslubidagi
// gumbaz va oltin bezaklar paydo bo'ladi.
import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "wouter";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/face";

const INK = "#0E1230";
const INK2 = "#161B3C";
const PANEL = "#1B2150";
const GOLD = "#E8B04B";
const CREAM = "#F3EEE2";
const TEAL = "#1EA896";

interface Building { key: string; name: string; emoji: string; level: number; max: number; income: number; next_cost: number | null }
interface Avatar { id: string; name: string; emoji: string }
interface Unvon { title: string; emoji: string; color: string }
interface GameState { total: number; buildings: Building[]; avatar: string; avatars: Avatar[]; unvon?: Unvon; income_per_hour: number; accrued: number; cap_hours: number }

// Har binoga milliy kolorit
const ACCENT: Record<string, string> = {
  maktab: GOLD, kutubxona: TEAL, ingliz: "#4759C4",
  matematika: "#C0392B", milliy_kiyim: "#C2487E", qahramon: "#1F9D6B",
};
const accentOf = (k: string) => ACCENT[k] ?? GOLD;

// Daraja oshgani sari boyiydigan bino tasviri (oddiy uy → gumbazli, oltinli obida)
function Facade({ level, max, color }: { level: number; max: number; color: string }) {
  const p = level / max;                    // 0..1
  const bodyH = 46 + p * 46;                // balandlik o'sadi
  const floors = Math.min(1 + Math.floor(level / 2), 5);
  const hasDome = level >= 4;
  const gold = level >= 7;
  const topY = 118 - bodyH;
  const windows: JSX.Element[] = [];
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < 3; c++) {
      windows.push(<rect key={`${f}-${c}`} x={28 + c * 16} y={topY + 12 + f * ((bodyH - 16) / floors)} width="9" height={Math.max(7, (bodyH - 16) / floors - 6)} rx="2" fill="rgba(255,240,200,0.85)" />);
    }
  }
  return (
    <svg viewBox="0 0 100 120" width="100%" height="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`b-${color}-${level}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor="rgba(0,0,0,0.35)" />
        </linearGradient>
      </defs>
      {/* poydevor soyasi */}
      <ellipse cx="50" cy="116" rx="34" ry="5" fill="rgba(0,0,0,0.35)" />
      {/* tana */}
      <rect x="22" y={topY} width="56" height={bodyH} rx="4" fill={`url(#b-${color}-${level})`} stroke={gold ? GOLD : "rgba(255,255,255,0.15)"} strokeWidth={gold ? 2 : 1} />
      {windows}
      {/* tom / gumbaz */}
      {hasDome ? (
        <>
          <path d={`M22 ${topY} Q50 ${topY - 26} 78 ${topY} Z`} fill={TEAL} stroke={gold ? GOLD : "rgba(255,255,255,0.25)"} strokeWidth={gold ? 2 : 1} />
          <rect x="48" y={topY - 34} width="4" height="12" fill={GOLD} />
          <circle cx="50" cy={topY - 35} r="3" fill={GOLD} />
        </>
      ) : (
        <path d={`M18 ${topY} L50 ${topY - 16} L82 ${topY} Z`} fill={color} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      )}
      {/* oltin peshtoq (yuqori darajada) */}
      {gold && <rect x="40" y={118 - 20} width="20" height="20" rx="2" fill="rgba(0,0,0,0.3)" stroke={GOLD} strokeWidth="1.5" />}
    </svg>
  );
}

export default function MaktabOlami() {
  const { toast } = useToast();
  const [st, setSt] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [pop, setPop] = useState("");
  const [picker, setPicker] = useState(false);
  const [liveAccrued, setLiveAccrued] = useState(0); // jonli o'suvchi jamg'arma

  useEffect(() => {
    void (async () => {
      try { const d = await api<GameState>("/tanga/game"); setSt(d); setLiveAccrued(d.accrued ?? 0); }
      catch (e) { toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message }); }
      finally { setLoading(false); }
    })();
  }, [toast]);

  // Shaharcha daromadi — soatiga perHour; jamg'arma har soniyada jonli o'sadi (cap gacha)
  const perHour = st ? st.buildings.reduce((s, b) => s + b.level, 0) : 0;
  const cap = perHour * (st?.cap_hours ?? 8);
  useEffect(() => {
    if (perHour <= 0) return;
    const t = setInterval(() => setLiveAccrued((a) => Math.min(a + perHour / 3600, cap)), 1000);
    return () => clearInterval(t);
  }, [perHour, cap]);

  const claimIdle = async () => {
    if (busy || !st || liveAccrued < 1) return;
    setBusy("claim");
    try {
      const r = await api<{ claimed: number; total: number }>("/tanga/game/claim", { method: "POST" });
      setSt({ ...st, total: r.total, accrued: 0 });
      setLiveAccrued(0);
      if (r.claimed > 0) toast({ title: `+${r.claimed} 🪙`, description: "Shaharcha daromadi yig'ildi!" });
    } catch (e) { toast({ variant: "destructive", title: "Bo'lmadi", description: (e as Error).message }); }
    finally { setBusy(""); }
  };

  const upgrade = async (b: Building) => {
    if (busy || !st || b.next_cost == null) return;
    if (st.total < b.next_cost) { toast({ variant: "destructive", title: "Tanga yetarli emas", description: `Kerak: ${b.next_cost} 🪙` }); return; }
    setBusy(b.key);
    try {
      const r = await api<{ level: number; total: number; next_cost: number | null }>("/tanga/game/upgrade", { method: "POST", body: JSON.stringify({ key: b.key }) });
      setSt({ ...st, total: r.total, buildings: st.buildings.map((x) => x.key === b.key ? { ...x, level: r.level, income: r.level, next_cost: r.next_cost } : x) });
      setPop(b.key); setTimeout(() => setPop(""), 500);
    } catch (e) { toast({ variant: "destructive", title: "Bo'lmadi", description: (e as Error).message }); }
    finally { setBusy(""); }
  };

  const pickAvatar = async (id: string) => {
    if (!st) return;
    setSt({ ...st, avatar: id }); setPicker(false);
    try { await api("/tanga/game/avatar", { method: "POST", body: JSON.stringify({ avatar: id }) }); } catch { /* ignore */ }
  };

  const curAvatar = st?.avatars.find((a) => a.id === st.avatar);

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, #241B4A 0%, ${INK2} 42%, ${INK} 100%)`, color: CREAM }}>
      <style>{`@keyframes mo-rise{0%{transform:translateY(6px) scale(.96)}60%{transform:translateY(-3px) scale(1.04)}100%{transform:translateY(0) scale(1)}} .mo-rise{animation:mo-rise .5s ease}`}</style>
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 16px 40px" }}>
        {/* Yuqori panel */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <Link href="/intellektual" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(243,238,226,0.7)", fontSize: 14 }}>
            <ArrowLeft size={18} /> Orqaga
          </Link>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/reyting" style={{ display: "inline-flex", alignItems: "center", gap: 5, background: PANEL, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "5px 12px", color: CREAM, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>🏆 Reyting</Link>
            <button onClick={() => setPicker(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: PANEL, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "5px 10px", color: CREAM, cursor: "pointer" }}>
              <span style={{ width: 22, height: 22, borderRadius: 999, background: `${GOLD}22`, border: `1px solid ${GOLD}`, display: "grid", placeItems: "center", fontSize: 13 }}>{curAvatar?.emoji ?? "👤"}</span>
              <span style={{ fontSize: 13 }}>{curAvatar?.name ?? "Qahramon"}</span>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: PANEL, border: `1px solid ${GOLD}55`, borderRadius: 999, padding: "6px 14px", fontWeight: 700, color: GOLD }}>🪙 {st?.total ?? "…"}</div>
          </div>
        </div>

        {/* Sarlavha */}
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.01em", margin: 0 }}>Maktab Olami</h1>
          {st?.unvon && <p style={{ margin: "4px 0 0", fontSize: 13, color: st.unvon.color, fontWeight: 600 }}>{st.unvon.emoji} {st.unvon.title}</p>}
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Loader2 className="animate-spin" color={GOLD} /></div>
        ) : !st ? (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(243,238,226,0.6)" }}>Yuklab bo'lmadi</div>
        ) : (
          <>
            {/* Idle daromad — shaharcha vaqt bo'yicha tanga ishlab chiqaradi, yig'ib olinadi */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 14,
              background: `linear-gradient(135deg, ${PANEL}, ${INK2})`, border: `1px solid ${GOLD}33`, borderRadius: 16, padding: "11px 14px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
              <div>
                <div style={{ fontSize: 11.5, color: "rgba(243,238,226,0.6)" }}>Shaharcha daromadi</div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>🪙 {perHour}<span style={{ fontSize: 12, fontWeight: 400, color: "rgba(243,238,226,0.55)" }}> / soat</span></div>
              </div>
              <button onClick={() => void claimIdle()} disabled={busy === "claim" || liveAccrued < 1}
                style={{ borderRadius: 12, padding: "10px 16px", fontWeight: 800, fontSize: 14, minWidth: 132, cursor: liveAccrued < 1 ? "default" : "pointer",
                  color: liveAccrued < 1 ? "rgba(243,238,226,0.5)" : INK,
                  background: liveAccrued < 1 ? "rgba(255,255,255,0.06)" : `linear-gradient(135deg, ${TEAL}, ${GOLD})`,
                  border: "1px solid rgba(255,255,255,0.12)", transition: "transform .1s" }}>
                {perHour <= 0 ? "Bino quring" : liveAccrued < 1 ? "Jamg'arilmoqda…" : `Yig'ish · 🪙 ${Math.floor(liveAccrued)}`}
              </button>
            </div>

            {/* Shaharcha — binolar maydoni */}
            <div style={{ position: "relative", marginTop: 12, borderRadius: 22, padding: "16px 12px 12px",
              background: `linear-gradient(180deg, rgba(232,176,75,0.10), rgba(0,0,0,0.25))`,
              border: `1px solid ${GOLD}33`, boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }}>
              {/* nozik milliy naqsh foni (ikat yulduzchalari) */}
              <div aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 22, pointerEvents: "none", opacity: 0.07,
                backgroundImage: `repeating-conic-gradient(from 0deg at 50% 0%, ${GOLD} 0deg 4deg, transparent 4deg 22deg)` }} />
              {/* yer chizig'i */}
              <div aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: 56, height: 1, background: `${GOLD}33` }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {st.buildings.map((b) => {
                  const col = accentOf(b.key); const maxed = b.next_cost == null;
                  const afford = b.next_cost != null && st.total >= b.next_cost;
                  return (
                    <div key={b.key} style={{ borderRadius: 16, overflow: "hidden", background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className={pop === b.key ? "mo-rise" : ""} style={{ height: 118, padding: "6px 6px 0" }}>
                        <Facade level={b.level} max={b.max} color={col} />
                      </div>
                      <div style={{ padding: "8px 10px 10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</span>
                          <span style={{ fontSize: 11, color: "rgba(243,238,226,0.55)" }}>{b.income > 0 ? `🪙${b.income}/s · ` : ""}{b.level}/{b.max}</span>
                        </div>
                        {/* daraja chizig'i */}
                        <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,0.08)", marginTop: 6, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(b.level / b.max) * 100}%`, background: `linear-gradient(90deg, ${col}, ${GOLD})` }} />
                        </div>
                        <button onClick={() => void upgrade(b)} disabled={!!busy || maxed || !afford}
                          style={{ width: "100%", marginTop: 8, borderRadius: 10, padding: "7px 8px", fontSize: 13, fontWeight: 700, cursor: maxed || !afford ? "not-allowed" : "pointer",
                            color: maxed ? "rgba(243,238,226,0.5)" : afford ? INK : "rgba(243,238,226,0.5)",
                            background: maxed ? "rgba(255,255,255,0.06)" : afford ? `linear-gradient(135deg, ${col}, ${GOLD})` : "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.1)" }}>
                          {busy === b.key ? "…" : maxed ? "Eng yuqori ✓" : `Kuchaytirish · 🪙 ${b.next_cost}`}
                        </button>
                        {b.key === "kutubxona" && (
                          <Link href="/kutubxona" style={{ display: "block", textAlign: "center", marginTop: 6, fontSize: 12.5, color: TEAL, textDecoration: "none", fontWeight: 700 }}>📖 Kutubxonani ochish →</Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p style={{ fontSize: 12, color: "rgba(243,238,226,0.5)", textAlign: "center", margin: "14px 0 0", lineHeight: 1.6 }}>
              Binolar vaqt bo'yicha tanga ishlab chiqaradi — qaytib kelganingizda yig'ib olasiz (eng ko'pi {st.cap_hours} soat jamg'ariladi).
              Bino kuchaygani sari daromadi oshadi va ko'rinishi boyiydi — gumbaz va oltin bezaklar paydo bo'ladi. Tangani platformada ham ishlab topasiz (baho, davomat, faollik).
            </p>
          </>
        )}
      </div>

      {/* Qahramon tanlash */}
      {picker && st && (
        <div onClick={() => setPicker(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", padding: 20, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: PANEL, borderRadius: 20, padding: 18, width: "100%", maxWidth: 360, border: `1px solid ${GOLD}33` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <b style={{ fontSize: 16 }}>Qahramonni tanlang</b>
              <button onClick={() => setPicker(false)} style={{ background: "none", border: "none", color: CREAM, cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {st.avatars.map((a) => {
                const on = a.id === st.avatar;
                return (
                  <button key={a.id} onClick={() => void pickAvatar(a.id)} style={{ borderRadius: 14, padding: "12px 6px", cursor: "pointer",
                    background: on ? `${GOLD}22` : "rgba(0,0,0,0.25)", border: on ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.1)", color: CREAM }}>
                    <div style={{ fontSize: 26 }}>{a.emoji}</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>{a.name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

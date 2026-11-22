// Maktab Olami — tanga bilan o'z milliy shaharchangni qurasan va kuchaytirasan.
// Urush yo'q; har bino daraja oshgani sari ko'rinishi boyib, Registon uslubidagi
// gumbaz va oltin bezaklar paydo bo'ladi.
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Loader2, Snowflake, X } from "lucide-react";
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

const ACCENT: Record<string, string> = {
  maktab: GOLD, kutubxona: TEAL, ingliz: "#4759C4",
  matematika: "#C0392B", milliy_kiyim: "#C2487E", qahramon: "#1F9D6B",
};
const accentOf = (k: string) => ACCENT[k] ?? GOLD;

// Tepadagi muz sumalaklari (Kutubxona va boshqa ochiq binolar uchun)
function IcicleHeader() {
  return (
    <svg viewBox="0 0 360 55" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-0 z-20 h-9 w-full" aria-hidden>
      <defs>
        <linearGradient id="iceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
          <stop offset="55%" stopColor="#bae6fd" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.78" />
        </linearGradient>
      </defs>
      <path
        d="M0,0 L360,0 L360,18 Q345,22 338,48 Q332,20 322,22 Q314,52 306,20 Q292,16 284,38 Q278,16 260,12 Q220,6 180,10 Q140,14 95,12 Q78,14 70,44 Q64,16 52,18 Q44,54 36,22 Q24,20 14,42 Q6,20 0,18 Z"
        fill="url(#iceGrad)"
      />
    </svg>
  );
}

// Qishki girlyanda chiroqlari (Maktab kartasi tepasi uchun)
function GarlandHeader() {
  const bulbs = [
    { x: 25, y: 18, c: "#fb7185" },
    { x: 65, y: 26, c: "#facc15" },
    { x: 108, y: 31, c: "#38bdf8" },
    { x: 152, y: 33, c: "#fb7185" },
    { x: 198, y: 32, c: "#facc15" },
    { x: 242, y: 29, c: "#38bdf8" },
    { x: 286, y: 23, c: "#fb7185" },
    { x: 330, y: 15, c: "#facc15" },
  ];
  return (
    <svg viewBox="0 0 360 48" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-0 z-20 h-9 w-full" aria-hidden>
      <path d="M-5,10 Q175,45 365,8" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      {bulbs.map((b, i) => (
        <g key={i}>
          <circle cx={b.x} cy={b.y} r="7" fill={b.c} opacity="0.28" />
          <ellipse cx={b.x} cy={b.y} rx="3.2" ry="5" fill={b.c} />
        </g>
      ))}
    </svg>
  );
}

// 1-rasmdagi Qorli 3D Kutubxona javoni
function SnowyLibraryIllustration() {
  return (
    <svg viewBox="0 0 260 220" className="mx-auto h-32 w-36 drop-shadow-[0_12px_20px_rgba(0,0,0,0.55)]" aria-hidden>
      <defs>
        <linearGradient id="woodBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b46936" />
          <stop offset="50%" stopColor="#85441e" />
          <stop offset="100%" stopColor="#52260e" />
        </linearGradient>
        <linearGradient id="woodInner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b1908" />
          <stop offset="100%" stopColor="#5e2c12" />
        </linearGradient>
        <linearGradient id="goldBook" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="55%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
        <linearGradient id="brownBook" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="60%" stopColor="#92400e" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
      </defs>
      <circle cx="130" cy="115" r="82" fill="rgba(253, 224, 71, 0.16)" />
      <rect x="46" y="34" width="168" height="162" rx="14" fill="url(#woodBody)" stroke="#d98a4e" strokeWidth="2" />
      <rect x="60" y="48" width="140" height="58" rx="6" fill="url(#woodInner)" />
      <rect x="60" y="122" width="140" height="58" rx="6" fill="url(#woodInner)" />
      <rect x="68" y="60" width="15" height="46" rx="2" fill="url(#brownBook)" />
      <rect x="85" y="58" width="15" height="48" rx="2" fill="url(#goldBook)" />
      <rect x="108" y="61" width="14" height="45" rx="2" transform="rotate(-14 108 106)" fill="url(#brownBook)" />
      <rect x="144" y="56" width="18" height="50" rx="2" fill="url(#goldBook)" />
      <rect x="164" y="60" width="15" height="46" rx="2" fill="url(#brownBook)" />
      <rect x="181" y="57" width="15" height="49" rx="2" fill="url(#goldBook)" />
      <rect x="68" y="134" width="14" height="46" rx="2" fill="url(#brownBook)" />
      <rect x="84" y="132" width="15" height="48" rx="2" fill="url(#goldBook)" />
      <rect x="101" y="135" width="15" height="45" rx="2" fill="url(#goldBook)" />
      <rect x="118" y="170" width="44" height="10" rx="2" fill="url(#goldBook)" />
      <rect x="122" y="138" width="13" height="36" rx="2" transform="rotate(-32 122 174)" fill="url(#goldBook)" />
      <rect x="164" y="134" width="15" height="46" rx="2" fill="url(#brownBook)" />
      <rect x="181" y="132" width="15" height="48" rx="2" fill="url(#goldBook)" />
      <path
        d="M36,36 Q38,14 68,18 Q98,10 130,18 Q165,8 196,18 Q224,14 224,36 Q216,44 202,40 L198,64 L193,40 L72,40 L67,68 L62,40 Q42,44 36,36 Z"
        fill="#f8fafc"
      />
      <path d="M40,186 Q58,176 78,188 Q62,198 40,194 Z" fill="#f1f5f9" />
      <path d="M182,188 Q202,176 220,186 Q218,196 182,194 Z" fill="#f1f5f9" />
    </svg>
  );
}

// 2-rasmdagi Zanjirlangan va muz qulfli 3D Maktab binosi
function LockedSnowSchoolIllustration({ unlocked = false }: { unlocked?: boolean }) {
  return (
    <svg viewBox="0 0 280 220" className="mx-auto h-32 w-40 drop-shadow-[0_12px_20px_rgba(0,0,0,0.6)]" aria-hidden>
      <defs>
        <linearGradient id="stoneWall" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="roofWood" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7c4a2d" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
        <linearGradient id="iceLock" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="50%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <rect x="44" y="88" width="192" height="106" rx="10" fill="url(#stoneWall)" stroke="#475569" strokeWidth="2" />
      <g stroke="#1e293b" strokeWidth="2" opacity="0.65">
        <line x1="44" y1="114" x2="236" y2="114" />
        <line x1="44" y1="140" x2="236" y2="140" />
        <line x1="44" y1="166" x2="236" y2="166" />
        <line x1="92" y1="88" x2="92" y2="114" />
        <line x1="140" y1="88" x2="140" y2="114" />
        <line x1="188" y1="88" x2="188" y2="114" />
        <line x1="70" y1="114" x2="70" y2="140" />
        <line x1="118" y1="114" x2="118" y2="140" />
        <line x1="166" y1="114" x2="166" y2="140" />
        <line x1="212" y1="114" x2="212" y2="140" />
      </g>
      <polygon points="140,26 26,88 254,88" fill="url(#roofWood)" />
      <path
        d="M140,12 Q165,24 264,78 Q272,92 254,96 L246,126 L239,95 L230,118 L224,92 L56,92 L48,124 L41,94 L32,116 L25,94 Q8,90 16,78 Q115,24 140,12 Z"
        fill="#f8fafc"
      />
      {!unlocked && (
        <g>
          <line x1="36" y1="104" x2="244" y2="178" stroke="#cbd5e1" strokeWidth="9" strokeDasharray="12 6" strokeLinecap="round" />
          <line x1="244" y1="104" x2="36" y2="178" stroke="#94a3b8" strokeWidth="9" strokeDasharray="12 6" strokeLinecap="round" />
          <line x1="36" y1="104" x2="244" y2="178" stroke="#475569" strokeWidth="3" strokeDasharray="12 6" strokeLinecap="round" />
          <path d="M122,126 L122,110 A18,18 0 0,1 158,110 L158,126" fill="none" stroke="#e2e8f0" strokeWidth="8" strokeLinecap="round" />
          <rect x="114" y="124" width="52" height="44" rx="8" fill="url(#iceLock)" stroke="#ffffff" strokeWidth="2" />
          <circle cx="140" cy="142" r="5" fill="#0f172a" />
          <polygon points="137,144 143,144 145,156 135,156" fill="#0f172a" />
          <path d="M112,124 Q140,118 168,124 Q164,132 156,129 L154,138 L150,129 L126,129 L122,138 L119,129 Q114,131 112,124 Z" fill="#ffffff" />
        </g>
      )}
    </svg>
  );
}

// Qolgan binolar uchun qorli gumbaz/obida tasviri
function SnowyFacade({ level, max, color }: { level: number; max: number; color: string }) {
  const p = level / max;
  const bodyH = 46 + p * 46;
  const floors = Math.min(1 + Math.floor(level / 2), 5);
  const hasDome = level >= 4;
  const gold = level >= 7;
  const topY = 118 - bodyH;
  const windows: JSX.Element[] = [];
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < 3; c++) {
      windows.push(
        <rect
          key={`${f}-${c}`}
          x={28 + c * 16}
          y={topY + 12 + f * ((bodyH - 16) / floors)}
          width="9"
          height={Math.max(7, (bodyH - 16) / floors - 6)}
          rx="2"
          fill="rgba(255,240,200,0.88)"
        />
      );
    }
  }
  return (
    <svg viewBox="0 0 100 120" className="mx-auto h-32 w-28 drop-shadow-[0_10px_18px_rgba(0,0,0,0.5)]" aria-hidden>
      <defs>
        <linearGradient id={`b-${color}-${level}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor="rgba(0,0,0,0.35)" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="116" rx="34" ry="5" fill="rgba(240,249,255,0.4)" />
      <rect x="22" y={topY} width="56" height={bodyH} rx="4" fill={`url(#b-${color}-${level})`} stroke={gold ? GOLD : "rgba(255,255,255,0.22)"} strokeWidth={gold ? 2 : 1} />
      {windows}
      {hasDome ? (
        <>
          <path d={`M22 ${topY} Q50 ${topY - 26} 78 ${topY} Z`} fill={TEAL} stroke={gold ? GOLD : "#ffffff"} strokeWidth={gold ? 2 : 1.2} />
          <rect x="48" y={topY - 34} width="4" height="12" fill={GOLD} />
          <circle cx="50" cy={topY - 35} r="3" fill={GOLD} />
        </>
      ) : (
        <>
          <path d={`M18 ${topY} L50 ${topY - 16} L82 ${topY} Z`} fill={color} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          {/* Tom ustidagi qor qatlami */}
          <path d={`M16 ${topY} L50 ${topY - 18} L84 ${topY} Q70 ${topY + 4} 50 ${topY - 12} Q30 ${topY + 4} 16 ${topY} Z`} fill="#f8fafc" />
        </>
      )}
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
  const [liveAccrued, setLiveAccrued] = useState(0);

  useEffect(() => {
    void (async () => {
      try { const d = await api<GameState>("/tanga/game"); setSt(d); setLiveAccrued(d.accrued ?? 0); }
      catch (e) { toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message }); }
      finally { setLoading(false); }
    })();
  }, [toast]);

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
            {/* Idle daromad */}
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

            {/* Qishki 3D Binolar maydoni (1- va 2-rasmlar uslubida) */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {st.buildings.map((b) => {
                const col = accentOf(b.key);
                const maxed = b.next_cost == null;
                const afford = b.next_cost != null && st.total >= b.next_cost;
                const pct = Math.min(100, Math.round((b.level / b.max) * 100));

                if (b.key === "kutubxona" || b.key === "maktab") {
                  const src = b.key === "kutubxona" ? "/imagine/kutubxona-karta.jpg" : "/imagine/maktab-karta.jpg";
                  return (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => void upgrade(b)}
                      disabled={!!busy || maxed}
                      className="relative block w-full overflow-hidden rounded-[22px] transition-transform active:scale-[0.98] disabled:opacity-90"
                    >
                      <img src={src} alt={b.name} className="block h-auto w-full" />
                    </button>
                  );
                }

                return (
                  <div
                    key={b.key}
                    className="relative overflow-hidden rounded-[26px] border border-sky-300/30 bg-gradient-to-b from-[#211d52] via-[#17193b] to-[#0e152b] p-4 pt-8 text-white shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
                  >
                    {/* Tepada qishki bezak: Maktabda girlyanda, qolganlarida muz sumalaklari */}
                    {b.key === "maktab" ? <GarlandHeader /> : <IcicleHeader />}

                    {/* Orqa fondagi qor parchalari */}
                    <Snowflake className="pointer-events-none absolute top-10 left-4 h-4 w-4 text-sky-200/40" />
                    <Snowflake className="pointer-events-none absolute top-14 right-5 h-5 w-5 text-sky-200/40" />

                    {/* 3D Bino tasviri */}
                    <div className={`relative z-10 flex h-36 items-center justify-center ${pop === b.key ? "mo-rise" : ""}`}>
                      {b.key === "kutubxona" ? (
                        <SnowyLibraryIllustration />
                      ) : b.key === "maktab" ? (
                        <LockedSnowSchoolIllustration unlocked={b.level > 0} />
                      ) : (
                        <SnowyFacade level={b.level} max={b.max} color={col} />
                      )}
                    </div>

                    {/* Bino nomi va daraja (0/10) */}
                    <div className="relative z-10 mt-1 flex items-baseline justify-between gap-2 px-0.5">
                      <span className="truncate text-lg font-extrabold tracking-tight text-amber-50 drop-shadow">
                        {b.name}
                      </span>
                      <span className="shrink-0 text-sm font-extrabold tabular-nums text-sky-200">
                        {b.income > 0 ? `🪙${b.income}/s · ` : ""}
                        {b.level}/{b.max}
                      </span>
                    </div>

                    {/* Ustida qori bor muzli daraja chizig'i */}
                    <div className="relative z-10 mt-2">
                      <div className="pointer-events-none -mb-1 flex justify-between px-1">
                        <span className="h-2 w-16 rounded-full bg-white/95 shadow-sm" />
                        <span className="h-1.5 w-12 rounded-full bg-white/85 shadow-sm" />
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full border border-sky-200/40 bg-slate-950/75 p-0.5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-300 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Muz bilan qoplangan "Kuchaytirish • 🪙 50" tugmasi */}
                    <button
                      type="button"
                      onClick={() => void upgrade(b)}
                      disabled={!!busy || maxed || !afford}
                      className={`relative z-10 mt-3.5 w-full rounded-2xl border-2 px-3 py-2.5 text-center backdrop-blur-md transition-transform active:scale-[0.98] ${
                        maxed
                          ? "border-white/15 bg-white/5 text-slate-400 cursor-not-allowed"
                          : afford
                            ? "border-sky-200/75 bg-gradient-to-b from-sky-300/25 via-sky-400/15 to-slate-900/45 text-white shadow-[0_8px_22px_rgba(56,189,248,0.28),inset_0_1px_6px_rgba(255,255,255,0.45)] cursor-pointer"
                            : "border-sky-200/35 bg-slate-400/15 text-slate-300/75 cursor-not-allowed"
                      }`}
                    >
                      {/* Tugma burchaklaridagi qor qatlami */}
                      <span className="pointer-events-none absolute -top-1.5 right-1.5 h-2.5 w-20 rounded-full bg-white/95 shadow" />
                      <span className="pointer-events-none absolute -bottom-1 left-1.5 h-2 w-16 rounded-full bg-white/90 shadow" />
                      <span className="pointer-events-none absolute -bottom-1 right-1.5 h-2 w-16 rounded-full bg-white/90 shadow" />

                      {/* Chap tarafdagi qor kristalli */}
                      <Snowflake className="pointer-events-none absolute top-1.5 left-2.5 h-5 w-5 text-sky-100/90" />

                      <div className="relative flex flex-col items-center justify-center leading-tight">
                        <span className="text-sm font-extrabold tracking-wide drop-shadow">
                          {busy === b.key
                            ? "…"
                            : maxed
                              ? "Eng yuqori ✓"
                              : "Kuchaytirish •"}
                        </span>
                        {!maxed && (
                          <span className="mt-0.5 inline-flex items-center gap-1 text-base font-black text-amber-300 drop-shadow">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-200 bg-gradient-to-b from-yellow-300 to-amber-500 text-[10px] font-black text-amber-950">
                              ↑
                            </span>
                            {b.next_cost}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Kutubxona uchun mavjud ochish havolasi */}
                    {b.key === "kutubxona" && (
                      <Link
                        href="/kutubxona"
                        className="relative z-10 mt-2.5 block text-center text-xs font-bold text-teal-300 hover:text-teal-200"
                      >
                        📖 Kutubxonani ochish →
                      </Link>
                    )}
                  </div>
                );
              })}
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

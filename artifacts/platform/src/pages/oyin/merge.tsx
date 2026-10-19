// Milliy Merge — o'zbek hunarmandchiligini birlashtirib tiklash.
// Tanga bilan asosiy buyum sotib olinadi; bir xil ikkitasini birlashtirib zanjirni
// ko'tarasan; zanjir to'lsa — Milliy xazinaga tushadi va bir martalik mukofot beradi.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "wouter";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/face";

// ── Palitra: chuqur indigo kecha, Samarqand oltini, anor, Registon feruzasi ──
const INK = "#0E1230";
const INK2 = "#161B3C";
const PANEL = "#1B2150";
const GOLD = "#E8B04B";
const CREAM = "#F3EEE2";

type Cell = { chain: string; tier: number } | null;
interface ChainDef { name: string; base_cost: number; reward: number; tiers: string[] }
interface Unvon { title: string; emoji: string; color: string }
interface MergeState { total: number; board: Cell[]; claimed: Record<string, boolean>; chains: Record<string, ChainDef>; size: number; unvon?: Unvon }

// Zanjir ranglari — har hunarga o'z kolorit
const CHAIN_UI: Record<string, { c1: string; c2: string; ink: string }> = {
  atlas: { c1: "#B9322B", c2: "#E8B04B", ink: "#2A0E0C" },     // anor → oltin (atlas)
  doppi: { c1: "#273B8E", c2: "#1EA896", ink: "#081F1C" },     // indigo → feruza (do'ppi)
  dasturxan: { c1: "#C0792E", c2: "#F2D06B", ink: "#2A1A08" }, // non/terakota → oltin (dasturxan)
  cholgu: { c1: "#6B3FA0", c2: "#1EA896", ink: "#140A24" },    // binafsha → feruza (cholg'u)
};
const chainUi = (chain: string) => CHAIN_UI[chain] ?? { c1: "#5A5A7A", c2: "#9A9ABA", ink: "#15151F" };

// Ikat medalyoni — tier oshgani sari bezak boyib boradi (ip → usta)
function Medallion({ chain, tier, top }: { chain: string; tier: number; top: boolean }) {
  const ui = chainUi(chain);
  const rings = Math.min(tier + 1, 5);
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`g-${chain}-${tier}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={ui.c1} />
          <stop offset="1" stopColor={ui.c2} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="10" fill={`url(#g-${chain}-${tier})`} />
      <rect x="2" y="2" width="44" height="44" rx="10" fill="none" stroke={top ? GOLD : "rgba(255,255,255,0.18)"} strokeWidth={top ? 2 : 1} />
      {Array.from({ length: rings }, (_, i) => {
        const s = 20 - i * 3.6;
        return <rect key={i} x={24 - s} y={24 - s} width={s * 2} height={s * 2} rx="2"
          transform="rotate(45 24 24)" fill="none"
          stroke={i === rings - 1 ? GOLD : "rgba(243,238,226,0.55)"} strokeWidth={i === rings - 1 ? 1.6 : 0.9} />;
      })}
      <circle cx="24" cy="24" r="2.4" fill={GOLD} />
    </svg>
  );
}

export default function MergeGame() {
  const { toast } = useToast();
  const [st, setSt] = useState<MergeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<number>(-1);
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState<number>(-1);      // merge animatsiyasi bo'layotgan katak
  const [dropped, setDropped] = useState<number>(-1); // yangi sotib olingan katak
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void (async () => {
      try { setSt(await api<MergeState>("/tanga/merge")); }
      catch (e) { toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message }); }
      finally { setLoading(false); }
    })();
  }, [toast]);

  const queueSave = (board: Cell[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void api("/tanga/merge/save", { method: "POST", body: JSON.stringify({ board }) }).catch(() => {}); }, 450);
  };

  const buy = async (chain: string) => {
    if (busy || !st) return;
    setBusy(true);
    try {
      const prev = st.board;
      const r = await api<{ board: Cell[]; total: number }>("/tanga/merge/buy", { method: "POST", body: JSON.stringify({ chain }) });
      const idx = r.board.findIndex((c, i) => c && !prev[i]);
      setSt({ ...st, board: r.board, total: r.total });
      setDropped(idx); setTimeout(() => setDropped(-1), 450);
    } catch (e) { toast({ variant: "destructive", title: "Bo'lmadi", description: (e as Error).message }); }
    finally { setBusy(false); }
  };

  const tapCell = (i: number) => {
    if (!st) return;
    const cell = st.board[i];
    if (sel === -1) { if (cell) setSel(i); return; }
    if (sel === i) { setSel(-1); return; }
    const a = st.board[sel];
    if (!cell) { // bo'sh katakka ko'chirish
      const board = st.board.slice(); board[i] = a; board[sel] = null;
      setSt({ ...st, board }); setSel(-1); queueSave(board); return;
    }
    if (a && cell && a.chain === cell.chain && a.tier === cell.tier) {
      const def = st.chains[a.chain];
      if (def && a.tier < def.tiers.length - 1) {
        const board = st.board.slice();
        board[i] = { chain: a.chain, tier: a.tier + 1 }; board[sel] = null;
        setSt({ ...st, board }); setSel(-1); queueSave(board);
        setPop(i); setTimeout(() => setPop(-1), 420);
        return;
      }
    }
    setSel(i); // boshqa buyum — qayta tanlash
  };

  const claim = async (chain: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api<{ reward: number; total: number; claimed: Record<string, boolean> }>("/tanga/merge/claim", { method: "POST", body: JSON.stringify({ chain }) });
      setSt((s) => s ? { ...s, total: r.total, claimed: r.claimed } : s);
      toast({ title: `+${r.reward} 🪙`, description: "Milliy xazina to'ldi — mukofot qo'shildi!" });
    } catch (e) { toast({ variant: "destructive", title: "Bo'lmadi", description: (e as Error).message }); }
    finally { setBusy(false); }
  };

  const cols = 6;
  const selCell = st && sel >= 0 ? st.board[sel] : null;

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(1200px 600px at 50% -10%, ${INK2}, ${INK})`, color: CREAM }}>
      <style>{`
        @keyframes mg-pop { 0%{transform:scale(1)} 45%{transform:scale(1.22)} 100%{transform:scale(1)} }
        @keyframes mg-drop { 0%{transform:scale(0.4);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes mg-spark { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0} }
        .mg-pop{animation:mg-pop .42s ease}
        .mg-drop{animation:mg-drop .42s cubic-bezier(.2,1.4,.4,1)}
        .mg-spark{position:absolute;width:7px;height:7px;border-radius:9px;background:${GOLD};animation:mg-spark .45s ease-out forwards;pointer-events:none}
      `}</style>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 40px" }}>
        {/* Sarlavha + balans */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <Link href="/intellektual" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(243,238,226,0.7)", fontSize: 14 }}>
            <ArrowLeft size={18} /> Orqaga
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: PANEL, border: `1px solid ${GOLD}55`, borderRadius: 999, padding: "6px 14px", fontWeight: 700 }}>
            <span style={{ color: GOLD }}>🪙 {st?.total ?? "…"}</span>
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.01em", margin: 0 }}>Milliy Merge</h1>
          <p style={{ color: "rgba(243,238,226,0.6)", fontSize: 13, margin: "4px 0 0" }}>
            {st?.unvon && <span style={{ color: st.unvon.color, fontWeight: 600 }}>{st.unvon.emoji} {st.unvon.title}</span>}
          </p>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Loader2 className="animate-spin" color={GOLD} /></div>
        ) : !st ? (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(243,238,226,0.6)" }}>Yuklab bo'lmadi</div>
        ) : (
          <>
            {/* Taxta — suzani medalyoni fonida */}
            <div style={{ position: "relative", borderRadius: 22, padding: 12, marginTop: 10,
              background: `linear-gradient(180deg, ${PANEL}, ${INK2})`,
              border: `1px solid ${GOLD}44`, boxShadow: "0 20px 50px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
              <div aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 22, pointerEvents: "none", opacity: 0.08,
                backgroundImage: `repeating-conic-gradient(from 0deg at 50% 50%, ${GOLD} 0deg 6deg, transparent 6deg 24deg)` }} />
              <div style={{ position: "relative", display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6 }}>
                {st.board.map((cell, i) => {
                  const isSel = sel === i;
                  const top = !!cell && !!st.chains[cell.chain] && cell.tier === st.chains[cell.chain]!.tiers.length - 1;
                  const base: CSSProperties = {
                    position: "relative", aspectRatio: "1", borderRadius: 12, padding: 5,
                    background: cell ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.22)",
                    border: isSel ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.06)",
                    boxShadow: isSel ? `0 0 0 3px ${GOLD}33` : "none",
                    transition: "border-color .15s, box-shadow .15s", cursor: cell || sel >= 0 ? "pointer" : "default",
                  };
                  return (
                    <button key={i} onClick={() => tapCell(i)} style={base} aria-label={cell ? st.chains[cell.chain]?.tiers[cell.tier] : "bo'sh"}>
                      {cell && (
                        <div className={pop === i ? "mg-pop" : dropped === i ? "mg-drop" : ""} style={{ width: "100%", height: "100%", position: "relative", filter: top ? `drop-shadow(0 0 6px ${GOLD})` : "none" }}>
                          <Medallion chain={cell.chain} tier={cell.tier} top={top} />
                          <span style={{ position: "absolute", top: -3, right: -3, fontSize: 10, fontWeight: 800, color: INK, background: GOLD, borderRadius: 999, minWidth: 15, height: 15, display: "grid", placeItems: "center", padding: "0 3px" }}>{cell.tier + 1}</span>
                        </div>
                      )}
                      {pop === i && Array.from({ length: 8 }, (_, k) => {
                        const ang = (k / 8) * Math.PI * 2;
                        return <span key={k} className="mg-spark" style={{ left: "50%", top: "50%", "--dx": `${Math.cos(ang) * 26}px`, "--dy": `${Math.sin(ang) * 26}px` } as CSSProperties} />;
                      })}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tanlangan buyum ma'lumoti */}
            <div style={{ textAlign: "center", minHeight: 22, marginTop: 10, fontSize: 14, color: "rgba(243,238,226,0.85)" }}>
              {selCell ? (
                <span><b style={{ color: chainUi(selCell.chain).c2 }}>{st.chains[selCell.chain]?.tiers[selCell.tier]}</b> — {st.chains[selCell.chain]?.name} ({selCell.tier + 1}/{st.chains[selCell.chain]?.tiers.length})</span>
              ) : <span style={{ color: "rgba(243,238,226,0.45)" }}>Buyumni tanlang, keyin bir xilini bosing</span>}
            </div>

            {/* Do'kon — tanga bilan asosiy buyum */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              {Object.entries(st.chains).map(([key, def]) => {
                const ui = chainUi(key); const afford = st.total >= def.base_cost;
                return (
                  <button key={key} onClick={() => void buy(key)} disabled={busy || !afford}
                    style={{ borderRadius: 16, padding: "12px 10px", textAlign: "left", color: CREAM, cursor: afford ? "pointer" : "not-allowed",
                      background: `linear-gradient(135deg, ${ui.c1}, ${ui.c2})`, border: "1px solid rgba(255,255,255,0.14)",
                      opacity: afford ? 1 : 0.5, boxShadow: "0 8px 22px rgba(0,0,0,0.35)" }}>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>{def.name}</div>
                    <div style={{ fontWeight: 800, fontSize: 15, marginTop: 2 }}>{def.tiers[0]} sotib olish</div>
                    <div style={{ marginTop: 6, display: "inline-flex", background: "rgba(0,0,0,0.3)", borderRadius: 999, padding: "2px 10px", fontWeight: 700, fontSize: 13 }}>🪙 {def.base_cost}</div>
                  </button>
                );
              })}
            </div>

            {/* Milliy xazina — kolleksiya zanjirlari */}
            <div style={{ marginTop: 18, background: PANEL, borderRadius: 18, padding: 14, border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Sparkles size={16} color={GOLD} /><b style={{ fontSize: 15 }}>Milliy xazina</b>
              </div>
              {Object.entries(st.chains).map(([key, def]) => {
                const maxOnBoard = st.board.reduce((m, c) => (c && c.chain === key ? Math.max(m, c.tier) : m), -1);
                const done = maxOnBoard === def.tiers.length - 1;
                const claimed = !!st.claimed[key];
                return (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: "rgba(243,238,226,0.8)" }}>{def.name}</span>
                      {claimed ? <span style={{ fontSize: 12, color: GOLD }}>✓ yig'ildi</span>
                        : done ? <button onClick={() => void claim(key)} disabled={busy} style={{ fontSize: 12, fontWeight: 700, color: INK, background: GOLD, border: "none", borderRadius: 999, padding: "3px 12px", cursor: "pointer" }}>Mukofot: +{def.reward} 🪙</button>
                        : <span style={{ fontSize: 12, color: "rgba(243,238,226,0.4)" }}>{Math.max(maxOnBoard + 1, 0)}/{def.tiers.length}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {def.tiers.map((t, ti) => {
                        const reached = ti <= maxOnBoard || claimed;
                        const ui = chainUi(key);
                        return <div key={ti} title={t} style={{ flex: 1, height: 8, borderRadius: 999,
                          background: reached ? `linear-gradient(90deg, ${ui.c1}, ${ui.c2})` : "rgba(255,255,255,0.08)",
                          boxShadow: reached && ti === def.tiers.length - 1 ? `0 0 6px ${GOLD}` : "none" }} />;
                      })}
                    </div>
                  </div>
                );
              })}
              <p style={{ fontSize: 11.5, color: "rgba(243,238,226,0.45)", margin: "4px 0 0", lineHeight: 1.5 }}>
                Tangani platformada ishlab topasiz (baho, faollik). Buyumlar bepul paydo bo'lmaydi — tanga bilan sotib olinadi.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

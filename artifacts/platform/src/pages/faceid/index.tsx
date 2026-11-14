// Face ID — boshqaruv sahifasi. Dizayn: "Face ID Davomat" (radial menyu, shisha kartalar).
// Ma'lumot: /faceid/overview (bugungi keldi / kechikdi / ketdi / kelmagan, so'nggi harakatlar).

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Send, ShieldCheck, Clock, Settings2, Trash2, Bell, ListChecks, ChevronRight,
  GraduationCap, Users,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/face";
import { MsgPauseCard } from "@/components/msg-pause-card";

interface Settings {
  late_after: string; notify: boolean; threshold: number; min_stay: number; default_end: string;
  open_from?: string; close_after?: string; quarter_start?: string; quarter_end?: string; hour_limit?: number;
}
interface Overview {
  date: string; time: string; settings: Settings;
  students: number; enrolled: number; arrived: number; late: number; left: number; early: number;
  classes: { class_name: string; total: number; enrolled: number; arrived: number; late: number; left: number; early: number }[];
  recent: { student_name: string; class_name: string; kind: "in" | "out"; status: string; time: string }[];
}

const THRESHOLDS = [
  { v: 0.42, label: "Qat'iy", hint: "Adashish kam, ba'zan tanimaydi" },
  { v: 0.48, label: "O'rtacha", hint: "Tavsiya etiladi" },
  { v: 0.54, label: "Yumshoq", hint: "Tez taniydi, adashish ehtimoli bor" },
];

// ── Dizayn (Face_ID_Davomat.html dan) ─────────────────────────────────────────
const CSS = `
.fidp{position:relative;max-width:460px;margin:0 auto;border-radius:30px;padding:20px 16px 18px;color:#f1f5ff;
  background:linear-gradient(165deg,#0f1f2e,#0a1322 70%);border:1px solid rgba(255,255,255,.09);
  box-shadow:0 40px 80px -30px #000,0 0 80px -30px rgba(45,212,191,.55);overflow:hidden;font-family:Inter,system-ui,sans-serif}
.fidp *{box-sizing:border-box}
.fidp .fhead{display:flex;align-items:center;gap:12px}
.fidp .flogo{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;background:linear-gradient(140deg,#fde047,#fb923c 50%,#ec4899);box-shadow:inset 0 2px 0 rgba(255,255,255,.55),inset 0 -6px 12px rgba(160,20,90,.35)}
.fidp h1{margin:0;font-size:21px;font-weight:800;letter-spacing:-.025em;line-height:1.1;color:#fff}
.fidp .fsub{color:#9db0e6;font-size:12px;margin-top:4px}
.fidp .flive{margin-left:auto;display:flex;align-items:center;gap:7px;padding:7px 12px;border-radius:99px;font-size:11px;font-weight:700;color:#34e0a1;background:rgba(52,224,161,.1);border:1px solid rgba(52,224,161,.3)}
.fidp .flive i{width:7px;height:7px;border-radius:50%;background:#34e0a1;box-shadow:0 0 10px #34e0a1}
.fidp .fhours{display:flex;align-items:center;gap:10px;margin-top:16px;padding:11px 16px;border-radius:16px;background:rgba(255,255,255,.045);font-size:13px;color:#9db0e6}
.fidp .fhours b{margin-left:auto;font-size:16px;font-weight:700;color:#f1f5ff;font-variant-numeric:tabular-nums}
.fidp .fstage{margin:14px auto 0;width:100%;aspect-ratio:1;position:relative}
.fidp .fstage svg{width:100%;height:100%;display:block;overflow:visible}
.fidp .seg{cursor:pointer;outline:none}
.fidp .seg:hover .fbody{transform:scale(1.035);filter:brightness(1.3)}
.fidp .fbody{transform-origin:500px 500px;transition:transform .3s cubic-bezier(.2,.9,.2,1),filter .3s}
.fidp .flbl{font-weight:800;font-size:28px;fill:#fff;text-anchor:middle;pointer-events:none;letter-spacing:.01em}
.fidp .flbl.dim{opacity:.88;font-weight:700}
.fidp .fsp{transform-origin:500px 500px;animation:fsp 70s linear infinite}
.fidp .fsp2{animation-duration:34s;animation-direction:reverse}
@keyframes fsp{to{transform:rotate(360deg)}}
.fidp #fcore{cursor:pointer}
.fidp .fpulse{transform-origin:500px 500px;animation:fpl 3s ease-out infinite}
@keyframes fpl{from{transform:scale(.95);opacity:.7}to{transform:scale(1.3);opacity:0}}
.fidp .fcl{fill:#05382c}
.fidp .fcta-shim{animation:fshm 2.8s ease-in-out infinite}
@keyframes fshm{0%{transform:translateX(0)}60%,100%{transform:translateX(330px)}}
.fidp .fstats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:6px}
@media(max-width:560px){.fidp .fstats{grid-template-columns:repeat(2,1fr)}}
.fidp .fstat{padding:13px 12px 12px;border-radius:17px;background:linear-gradient(160deg,color-mix(in srgb,var(--c) 14%,transparent),rgba(255,255,255,.045) 70%);border:1px solid rgba(255,255,255,.09);overflow:hidden}
.fidp .fstat small{display:flex;align-items:center;gap:6px;color:#9db0e6;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
.fidp .fstat small i{width:6px;height:6px;border-radius:50%;background:var(--c);box-shadow:0 0 8px var(--c)}
.fidp .fstat b{display:block;font-size:26px;margin-top:5px;font-weight:800;letter-spacing:-.03em;color:var(--c);font-variant-numeric:tabular-nums}
.fidp .fstat em{display:block;height:4px;border-radius:9px;margin-top:9px;background:rgba(255,255,255,.08);overflow:hidden}
.fidp .fstat em::after{content:"";display:block;height:100%;width:var(--p,0%);border-radius:9px;background:linear-gradient(90deg,color-mix(in srgb,var(--c) 40%,transparent),var(--c));transition:width .6s}
.fidp .fcard{margin-top:12px;padding:17px;border-radius:20px;background:rgba(255,255,255,.045)}
.fidp .fcard h2{margin:0 0 14px;font-size:11.5px;color:#9db0e6;font-weight:700;letter-spacing:.07em;text-transform:uppercase;display:flex;justify-content:space-between}
.fidp .frow{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid rgba(255,255,255,.09)}
.fidp .frow:first-child{border-top:0;padding-top:0}
.fidp .fav{width:38px;height:38px;border-radius:12px;flex-shrink:0;display:grid;place-items:center;font-weight:700;font-size:12px;color:#fff;background:linear-gradient(140deg,var(--c),color-mix(in srgb,var(--c) 40%,#0a1028))}
.fidp .frow .fnm{font-size:14px;font-weight:600;color:#f1f5ff}
.fidp .frow .fsm{display:block;color:#6678ad;font-size:11px;margin-top:2px;font-weight:500}
.fidp .frow .ftm{margin-left:auto;font-size:13px;font-weight:700;color:#9db0e6;font-variant-numeric:tabular-nums}
.fidp .ftag{margin-left:6px;flex-shrink:0;font-size:10.5px;font-weight:700;padding:4px 10px;border-radius:99px;color:var(--c);background:color-mix(in srgb,var(--c) 14%,transparent);border:1px solid color-mix(in srgb,var(--c) 38%,transparent)}
`;

const P = (r: number, a: number): [number, number] => [500 + r * Math.cos((a * Math.PI) / 180), 500 + r * Math.sin((a * Math.PI) / 180)];
const sector = (r1: number, r2: number, a1: number, a2: number) => {
  const [x1, y1] = P(r2, a1), [x2, y2] = P(r2, a2), [x3, y3] = P(r1, a2), [x4, y4] = P(r1, a1);
  return `M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`;
};

type SegKey = "reg" | "fix" | "rep";
const SEGS: { k: SegKey; a1: number; a2: number; lr: number; c: string; c2: string; t: string[]; route: string }[] = [
  { k: "reg", a1: 152, a2: 268, lr: 345, c: "#38bdf8", c2: "#818cf8", t: ["YUZLARNI", "RO’YXATGA", "OLISH"], route: "/faceid/enroll" },
  { k: "fix", a1: 272, a2: 388, lr: 345, c: "#fbbf24", c2: "#fb7185", t: ["DAVOMATNI", "QO’LDA", "TO’G’RILASH"], route: "/faceid/today" },
  { k: "rep", a1: 32, a2: 148, lr: 352, c: "#c084fc", c2: "#f472b6", t: ["HISOBOT", "YUKLASH"], route: "/faceid/today" },
];

const ICONS: Record<SegKey, string> = {
  reg: `<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M19 8v6M16 11h6"/>`,
  fix: `<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>`,
  rep: `<path d="M4 20V14M9 20V8M14 20V11M19 20V5"/><path d="M2 20h20"/>`,
};

function RadialMenu({ onGo, onStart }: { onGo: (route: string) => void; onStart: () => void }) {
  return (
    <svg viewBox="0 0 1000 1000" aria-label="Asosiy menyu">
      <defs>
        <radialGradient id="fcoreG" cx=".5" cy=".3" r=".9"><stop offset="0" stopColor="#0f8a86" /><stop offset=".5" stopColor="#08302f" /><stop offset="1" stopColor="#03120f" /></radialGradient>
        <linearGradient id="fctaG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a3ffd9" /><stop offset=".55" stopColor="#34e0a1" /><stop offset="1" stopColor="#14b8c4" /></linearGradient>
        {SEGS.map((s) => (
          <linearGradient key={s.k} id={`fs-${s.k}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={s.c} /><stop offset="1" stopColor={s.c2} />
          </linearGradient>
        ))}
      </defs>
      <circle cx="500" cy="500" r="494" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="1.5" />
      <g className="fsp"><circle cx="500" cy="500" r="486" fill="none" stroke="rgba(150,190,255,.3)" strokeWidth="2" strokeDasharray="1 14" strokeLinecap="round" /></g>

      {SEGS.map((s) => {
        const mid = (s.a1 + s.a2) / 2;
        const [lx, ly] = P(s.lr, mid);
        const y = ly + 2;
        return (
          <g key={s.k} className="seg" role="button" tabIndex={0} onClick={() => onGo(s.route)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onGo(s.route); } }}>
            <g className="fbody">
              <path d={sector(248, 468, s.a1, s.a2)} fill="rgba(2,16,13,.6)" stroke={`url(#fs-${s.k})`} strokeOpacity=".9" strokeWidth="2" strokeLinejoin="round" />
              <path d={sector(446, 466, s.a1 + 2, s.a2 - 2)} fill={`url(#fs-${s.k})`} fillOpacity=".18" pointerEvents="none" />
            </g>
            <g pointerEvents="none">
              <circle cx={lx} cy={y - 56} r="37" fill={s.c} fillOpacity=".28" stroke={s.c} strokeOpacity=".85" strokeWidth="2" />
              <g transform={`translate(${lx} ${y - 56}) scale(1.65) translate(-12 -12)`} fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
                dangerouslySetInnerHTML={{ __html: ICONS[s.k] }} />
            </g>
            {s.t.map((l, j) => (
              <text key={l} className={`flbl${j ? " dim" : ""}`} x={lx} y={y + 10 + 32 * j} pointerEvents="none">{l}</text>
            ))}
          </g>
        );
      })}

      {/* markaziy tugma */}
      <g id="fcore" role="button" tabIndex={0} onClick={onStart}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onStart(); } }}>
        <circle className="fpulse" cx="500" cy="500" r="218" fill="none" stroke="#5eead4" strokeWidth="3" />
        <g className="fsp fsp2"><circle cx="500" cy="500" r="239" fill="none" stroke="#fbbf24" strokeOpacity=".7" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" /></g>
        <circle cx="500" cy="500" r="218" fill="url(#fcoreG)" />
        <text x="500" y="458" textAnchor="middle" fontSize="20" fontWeight="800" letterSpacing="7" fill="#e6fff8">FACE ID</text>
        <g id="fcta">
          <rect x="385" y="598" width="230" height="90" rx="32" fill="url(#fctaG)" stroke="rgba(255,255,255,.7)" strokeWidth="2" />
          <text className="fcl" x="500" y="630" textAnchor="middle" fontWeight="800" fontSize="17" letterSpacing="7">FACE ID</text>
          <text x="500" y="667" textAnchor="middle" fontWeight="900" fontSize="30" letterSpacing="3" fill="#03251c">BOSHLASH</text>
        </g>
      </g>
    </svg>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="w-full">{children}</div>
      {hint && <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function FaceIdPage() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const ov = useQuery<Overview>({
    queryKey: ["faceid-overview"],
    queryFn: () => api<Overview>("/faceid/overview"),
    refetchInterval: 30_000,
  });

  const [lateAfter, setLateAfter] = useState("08:00");
  const [notify, setNotify] = useState(true);
  const [threshold, setThreshold] = useState("0.48");
  const [defaultEnd, setDefaultEnd] = useState("13:30");
  const [openFrom, setOpenFrom] = useState("06:00");
  const [closeAfter, setCloseAfter] = useState("14:30");
  const [quarterStart, setQuarterStart] = useState("");
  const [quarterEnd, setQuarterEnd] = useState("");
  const [hourLimit, setHourLimit] = useState("36");
  const [isTwoShift, setIsTwoShift] = useState(false);
  const [smena, setSmena] = useState<"1" | "2">("1");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [summing, setSumming] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const mine = await api<{ ikki_smena?: boolean }>("/maktablar/mine");
        setIsTwoShift(!!mine.ikki_smena);
      } catch { /* 1 smenali yoki super-admin */ }
    })();
  }, []);

  const apply = (s: Settings) => {
    setLateAfter(s.late_after);
    setNotify(s.notify);
    setThreshold(String(s.threshold));
    setDefaultEnd(s.default_end ?? "13:30");
    setOpenFrom(s.open_from ?? "06:00");
    setCloseAfter(s.close_after ?? "14:30");
    setQuarterStart(s.quarter_start ?? "");
    setQuarterEnd(s.quarter_end ?? "");
    setHourLimit(String(s.hour_limit ?? 36));
  };

  useEffect(() => {
    const n = isTwoShift ? Number(smena) : 0;
    void (async () => {
      try { apply(await api<Settings>(`/faceid/settings?smena=${n}`)); } catch { /* ignore */ }
    })();
  }, [isTwoShift, smena]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true);
    try {
      await api("/faceid/settings", {
        method: "POST",
        body: JSON.stringify({
          smena: isTwoShift ? Number(smena) : 0,
          late_after: lateAfter, notify, threshold: Number(threshold),
          default_end: defaultEnd, open_from: openFrom, close_after: closeAfter,
          quarter_start: quarterStart, quarter_end: quarterEnd, hour_limit: Number(hourLimit),
        }),
      });
      toast({ title: "✅ Sozlamalar saqlandi" });
      void qc.invalidateQueries({ queryKey: ["faceid-overview"] });
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally { setSaving(false); }
  };

  const notifyAbsent = async () => {
    if (!confirm("Hali kelmaganlar ro'yxati sinf rahbarlariga (va direktorga) yuborilsinmi?")) return;
    setSending(true);
    try {
      const r = await api<{ classes: number; sent: number }>("/faceid/notify-absent", { method: "POST" });
      toast({ title: "Yuborildi", description: `${r.classes} ta sinf · ${r.sent} ta xabar` });
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally { setSending(false); }
  };

  const sendSummary = async () => {
    if (!confirm("Bugungi xulosa har bir sinf guruhiga yuborilsinmi?")) return;
    setSumming(true);
    try {
      const r = await api<{ classes: number; sent: number }>("/faceid/group-summary", { method: "POST" });
      toast({ title: "Yuborildi", description: `${r.sent} ta guruhga xulosa` });
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally { setSumming(false); }
  };

  const resetAll = async () => {
    if (!confirm("DIQQAT: barcha yuz ma'lumotlari o'chadi. Qaytadan ro'yxatga olish kerak bo'ladi. Davom etasizmi?")) return;
    setResetting(true);
    try {
      const r = await api<{ deleted: number }>("/faceid/reset", { method: "POST" });
      toast({ title: "O'chirildi", description: `${r.deleted} ta yuz ma'lumoti` });
      void qc.invalidateQueries({ queryKey: ["faceid-overview"] });
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally { setResetting(false); }
  };

  const d = ov.data;
  const kelmagan = d ? Math.max(0, d.enrolled - d.arrived) : 0;
  const pct = (n: number) => (d && d.enrolled ? Math.min(100, Math.round((n / d.enrolled) * 100)) : 0);
  const classes = useMemo(
    () => (d ? [...d.classes].sort((a, b) => a.class_name.localeCompare(b.class_name, undefined, { numeric: true })) : []),
    [d],
  );
  const hours = `${d?.settings.open_from ?? openFrom} – ${d?.settings.close_after ?? closeAfter}`;

  return (
    <div className="space-y-5">
      <style>{CSS}</style>

      {/* ── Asosiy ko'rinish (dizayn) ── */}
      <section className="fidp">
        <div className="fhead">
          <div className="flogo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2.8l7.2 3v5.4c0 4.6-3 8-7.2 10-4.2-2-7.2-5.4-7.2-10V5.8z" />
              <circle cx="12" cy="10" r="2.4" /><path d="M7.9 16.2c.9-1.9 2.3-2.8 4.1-2.8s3.2.9 4.1 2.8" />
            </svg>
          </div>
          <div><h1>Face ID Davomat</h1><div className="fsub">Yuz orqali keldi/ketdi</div></div>
          <div className="flive"><i />Onlayn</div>
        </div>

        <div className="fhours">
          <Clock className="w-[18px] h-[18px] text-cyan-300" />
          Ish vaqti <b>{hours}</b>
        </div>

        <div className="fstage">
          <RadialMenu onGo={(r) => setLocation(r)} onStart={() => setLocation("/faceid/kiosk")} />
        </div>

        {ov.isLoading && <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-cyan-300" /></div>}
        {ov.isError && <div className="text-rose-300 text-sm mt-3">{(ov.error as Error).message}</div>}

        {d && (
          <>
            <div className="fstats">
              <div className="fstat" style={{ ["--c" as string]: "#34e0a1" }}><small><i />Keldi</small><b>{d.arrived}</b><em style={{ ["--p" as string]: `${pct(d.arrived)}%` }} /></div>
              <div className="fstat" style={{ ["--c" as string]: "#ffc542" }}><small><i />Kechikdi</small><b>{d.late}</b><em style={{ ["--p" as string]: `${pct(d.late)}%` }} /></div>
              <div className="fstat" style={{ ["--c" as string]: "#22e8ff" }}><small><i />Ketdi</small><b>{d.left}</b><em style={{ ["--p" as string]: `${pct(d.left)}%` }} /></div>
              <div className="fstat" style={{ ["--c" as string]: "#ff6b8b" }}><small><i />Kelmagan</small><b>{kelmagan}</b><em style={{ ["--p" as string]: `${pct(kelmagan)}%` }} /></div>
            </div>

            <section className="fcard">
              <h2>So'nggi kelganlar <span>{d.date}</span></h2>
              {d.recent.slice(0, 5).map((r, i) => {
                const late = r.kind === "in" && r.status === "late";
                const early = r.kind === "out" && r.status === "early";
                const excused = r.kind === "out" && r.status === "excused";
                const tag = r.kind === "in"
                  ? (late ? { t: "Kechikdi", c: "#ffc542" } : { t: "Vaqtida", c: "#34e0a1" })
                  : excused ? { t: "Ruxsat bilan", c: "#c084fc" }
                  : early ? { t: "Erta ketdi", c: "#ffc542" }
                  : { t: "Ketdi", c: "#22e8ff" };
                const ini = r.student_name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
                return (
                  <div key={i} className="frow">
                    <div className="fav" style={{ ["--c" as string]: tag.c }}>{ini}</div>
                    <div><div className="fnm">{r.student_name}</div><span className="fsm">{r.class_name}</span></div>
                    <b className="ftm">{r.time}</b>
                    <span className="ftag" style={{ ["--c" as string]: tag.c }}>{tag.t}</span>
                  </div>
                );
              })}
              {d.recent.length === 0 && <div className="text-sm text-slate-400 py-6 text-center">Bugun hali hech kim o'tmadi</div>}
            </section>
          </>
        )}
      </section>

      {d && (
        <>
          {/* Sinflar */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Sinflar bo'yicha — bugun
                <span className="ml-auto text-xs font-normal text-muted-foreground">{classes.length} ta sinf</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[420px] overflow-y-auto">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {classes.map((c) => {
                  const p = c.enrolled ? Math.round((c.arrived / c.enrolled) * 100) : 0;
                  const staff = c.class_name === "Xodimlar";
                  return (
                    <div key={c.class_name} className="rounded-xl border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-semibold text-sm min-w-0">
                          {staff && <GraduationCap className="w-4 h-4 text-violet-500 shrink-0" />}
                          <span className="truncate">{c.class_name}</span>
                        </div>
                        <div className="text-xs tabular-nums text-muted-foreground shrink-0"><b className="text-foreground">{c.arrived}</b>/{c.enrolled}</div>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${staff ? "bg-violet-500" : "bg-gradient-to-r from-cyan-400 to-fuchsia-500"}`} style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Sozlamalar */}
          <div className="grid xl:grid-cols-3 gap-4 items-start">
            <Card className="xl:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" /> Sozlamalar
                  {isTwoShift && <span className="text-xs font-normal text-muted-foreground">· {smena}-smena</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isTwoShift && (
                  <div className="inline-flex rounded-xl bg-muted p-1">
                    {(["1", "2"] as const).map((s) => (
                      <button key={s} type="button" onClick={() => setSmena(s)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${smena === s ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                        {s}-smena
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                  <Field label="Kech qolish vaqti" hint="Shu vaqtdan keyin kelgan — kech.">
                    <Input type="time" value={lateAfter} onChange={(e) => setLateAfter(e.target.value)} />
                  </Field>
                  <Field label="Darslar tugashi" hint="Shu vaqtdan oldin ketsa — erta ketdi.">
                    <Input type="time" value={defaultEnd} onChange={(e) => setDefaultEnd(e.target.value)} />
                  </Field>
                  <Field label="Kamera ochilishi" hint="Shu vaqtdan kamera ishlaydi.">
                    <Input type="time" value={openFrom} onChange={(e) => setOpenFrom(e.target.value)} />
                  </Field>
                  <Field label="Kamera yopilishi" hint="Shu vaqtdan keyin kun yakunlanadi.">
                    <Input type="time" value={closeAfter} onChange={(e) => setCloseAfter(e.target.value)} />
                  </Field>
                  <Field label="Tanish aniqligi" hint={THRESHOLDS.find((t) => String(t.v) === threshold)?.hint ?? ""}>
                    <Select value={threshold} onValueChange={setThreshold}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {THRESHOLDS.map((t) => <SelectItem key={t.v} value={String(t.v)}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Soat chegarasi" hint="Shu soatga yetganda ogohlantiriladi (odatda 36).">
                    <Input type="number" min={1} max={500} value={hourLimit} onChange={(e) => setHourLimit(e.target.value)} />
                  </Field>
                  <Field label="Chorak boshlanishi" hint="Bo'sh bo'lsa avtomatik.">
                    <Input type="date" value={quarterStart} onChange={(e) => setQuarterStart(e.target.value)} />
                  </Field>
                  <Field label="Chorak tugashi" hint="Bo'sh bo'lsa bugungi kungacha.">
                    <Input type="date" value={quarterEnd} onChange={(e) => setQuarterEnd(e.target.value)} />
                  </Field>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t pt-5">
                  <label className="flex items-center gap-3 text-sm cursor-pointer">
                    <Switch checked={notify} onCheckedChange={setNotify} />
                    <span>O'quvchiga Telegramda <b>"Keldingiz / Chiqdingiz"</b> xabari</span>
                  </label>
                  <Button onClick={() => void save()} disabled={saving} className="sm:min-w-36">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Saqlash
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <MsgPauseCard />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-primary" /> Xabarnomalar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <Button variant="outline" className="w-full justify-between h-11" onClick={() => void notifyAbsent()} disabled={sending}>
                    <span className="flex items-center gap-2">{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Kelmaganlar — rahbarlarga</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between h-11" onClick={() => void sendSummary()} disabled={summing}>
                    <span className="flex items-center gap-2">{summing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListChecks className="w-4 h-4" />} Kunlik xulosa — sinf guruhlariga</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </CardContent>
              </Card>
              <div className="flex gap-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-4 text-xs text-muted-foreground">
                <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-500" />
                <span>Rasm saqlanmaydi — faqat yuzning raqamli izi. Ma'lumotni istalgan vaqt o'chirish mumkin.</span>
              </div>
              {isAdmin && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                  <div className="text-sm font-semibold text-destructive flex items-center gap-2"><Trash2 className="w-4 h-4" /> Xavfli amal</div>
                  <Button variant="destructive" size="sm" onClick={() => void resetAll()} disabled={resetting}>
                    {resetting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Hammasini o'chirish
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

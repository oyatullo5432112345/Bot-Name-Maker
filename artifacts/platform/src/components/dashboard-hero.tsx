import { useState, useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { useSeason } from "@/lib/season";
​const A = "/imagine/";
​function useNewYearCountdown() {
const getDiff = () => {
const now = new Date();
const ny = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0);
const diff = Math.max(0, ny.getTime() - now.getTime());
return {
days: Math.floor(diff / 86400000),
hours: Math.floor((diff % 86400000) / 3600000),
minutes: Math.floor((diff % 3600000) / 60000),
seconds: Math.floor((diff % 60000) / 1000),
};
};
​const [time, setTime] = useState(getDiff);
​useEffect(() => {
const timer = setInterval(() => setTime(getDiff()), 1000);
return () => clearInterval(timer);
}, []);
​return time;
}
​function Neon({
children,
from,
to,
className = "",
}: {
children: ReactNode;
from: string;
to: string;
className?: string;
}) {
return (
<div
className={relative rounded-[20px] p-[1.5px] transition-transform active:scale-[0.99] ${className}}
style={{
background: linear-gradient(125deg, ${from}, ${to}, ${from}),
boxShadow: 0 8px 22px -8px ${from},
}}
>
<div
className="relative h-full overflow-hidden rounded-[18.5px] bg-[#0b1530]/92 backdrop-blur-md"
style={{
boxShadow: "inset 0 0 18px rgba(186, 230, 253, 0.14)",
}}
>
{children}
</div>
</div>
);
}
​export interface DashboardHeroProps {
dateWidget: ReactNode;
greeting: string;
motivation: string;
rightSlot?: ReactNode;
canUseFaceId: boolean;
faceIdHref: string;
faceIdSub: string;
stats?: { students: number; classes: number };
}
​export function DashboardHero({
dateWidget,
greeting,
motivation,
rightSlot,
canUseFaceId,
faceIdHref,
faceIdSub,
stats,
}: DashboardHeroProps) {
const { winter, setWinter } = useSeason();
const { days, hours, minutes, seconds } = useNewYearCountdown();
​const countdownUnits = [
{ val: days, label: "kun" },
{ val: hours, label: "soat" },
{ val: minutes, label: "daq" },
{ val: seconds, label: "son" },
];
​return (
<div className="relative space-y-3.5 overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-[#0f1f42] via-[#091226] to-[#070d1d] p-3.5 sm:p-4 shadow-xl">
{/* Sana va sarlavha */}
<div className="relative z-[2] pt-0.5">
<div className="mb-2.5 flex items-center justify-between gap-2">
<div>{dateWidget}</div>
{rightSlot && <div>{rightSlot}</div>}
</div>
<h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
Bosh sahifa
</h1>
<p className="mt-1 text-base font-medium text-slate-100 sm:text-lg">
{greeting}
</p>
<p className="mt-0.5 text-xs text-slate-400 sm:text-sm">{motivation}</p>
</div>
​{/* Kartalar ro'yxati /}
<div className="relative z-[2] space-y-3">
{/ 1. Qishki mavsum */}
{winter !== undefined && (
<Neon
from={winter ? "#38bdf8" : "#334155"}
to={winter ? "#e879f9" : "#475569"}
>
<div className="relative p-3.5 sm:p-4">
<div className="flex items-center justify-between gap-3">
<div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-sky-300/20 bg-sky-500/10 p-1 sm:h-24 sm:w-24">
<img
src={A + "santa-sleigh.png"}
alt="Qorbobo"
className="h-full w-full object-contain mix-blend-lighten"
/>
</div>
​<div className="min-w-0 flex-1">
<div className="mb-2 flex items-center justify-between gap-1">
<span
className="text-[11px] font-extrabold uppercase tracking-wider sm:text-xs"
style={{
background:
"linear-gradient(180deg, #ffffff 15%, #bae6fd 55%, #38bdf8 100%)",
WebkitBackgroundClip: "text",
WebkitTextFillColor: "transparent",
filter: "drop-shadow(0 0 8px rgba(56,189,248,0.45))",
}}
>
❄️ Yangi yilgacha qoldi:
</span>
</div>
​<div className="grid grid-cols-4 gap-1.5">
{countdownUnits.map(({ val, label }) => (
<div
key={label}
className="flex flex-col items-center justify-center rounded-lg border border-sky-200/35 bg-gradient-to-b from-sky-200/20 via-sky-400/10 to-slate-900/60 py-2 backdrop-blur-md"
style={{
boxShadow:
"inset 0 1px 4px rgba(255,255,255,0.4), 0 4px 10px rgba(0,0,0,0.25)",
}}
>
<span
className="text-lg font-black leading-none tabular-nums sm:text-xl"
style={{
background:
"linear-gradient(180deg, #ffffff 20%, #bae6fd 65%, #7dd3fc 100%)",
WebkitBackgroundClip: "text",
WebkitTextFillColor: "transparent",
filter:
"drop-shadow(0 2px 6px rgba(56,189,248,0.6))",
}}
>
{String(val).padStart(2, "0")}
</span>
<span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-200/90 sm:text-[10px]">
{label}
</span>
</div>
))}
</div>
</div>
</div>
​<div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
<span className="text-xs font-semibold text-sky-200/85">
🎄 Qishki mavsum
</span>
<button
type="button"
onClick={() => setWinter(!winter)}
className="text-xs font-medium text-sky-300 transition-colors hover:text-sky-200"
>
{winter
? "Qishki bezakni o‘chirish"
: "Qishki bezakni yoqish"}
</button>
</div>
</div>
</Neon>
)}
​{/* 2. Face ID (Ixchamroq) */}
{canUseFaceId && (
<Link href={faceIdHref} className="block">
<Neon from="#22d3ee" to="#6366f1" className="cursor-pointer">
<div className="relative flex items-center gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3">
<img
src={A + "face-id.png"}
alt=""
aria-hidden
className="h-12 w-12 shrink-0 rounded-xl object-contain mix-blend-lighten sm:h-14 sm:w-14"
/>
<div className="min-w-0 flex-1">
<div className="text-base font-bold text-white sm:text-lg">
Face ID
</div>
<p className="mt-0.5 line-clamp-1 text-xs leading-snug text-slate-300 sm:text-sm">
{faceIdSub}
</p>
</div>
<ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
</div>
</Neon>
</Link>
)}
​{/* 3. Intelektual o'yinlar (Ixchamroq) */}
<Link href="/intellektual" className="block">
<Neon from="#e879f9" to="#6366f1" className="cursor-pointer">
<div className="relative flex items-center gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3">
<img
src={A + "games.png"}
alt=""
aria-hidden
className="h-12 w-12 shrink-0 rounded-xl object-contain mix-blend-lighten sm:h-14 sm:w-14"
/>
<div className="min-w-0 flex-1">
<div className="text-base font-bold text-white sm:text-lg">
Intelektual o‘yinlar
</div>
<p className="mt-0.5 line-clamp-1 text-xs leading-snug text-slate-300 sm:text-sm">
Maktab Olami, Merge — aqlni charxla, kuchaytir
</p>
</div>
<ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
</div>
</Neon>
</Link>
​{/* 4. Statistika */}
{stats && (
<div className="grid grid-cols-2 gap-3">
<Neon from="#60a5fa" to="#818cf8">
<div className="relative flex items-center gap-3 p-3">
<img
src={A + "grad-cap.png"}
alt=""
aria-hidden
className="h-10 w-10 shrink-0 object-contain mix-blend-lighten sm:h-11 sm:w-11"
/>
<div className="min-w-0">
<div className="truncate text-xs font-medium text-slate-300">
Jami O‘quvchilar
</div>
<div className="mt-0.5 text-xl font-extrabold tabular-nums text-amber-200 sm:text-2xl">
{stats.students.toLocaleString("uz-UZ")}
</div>
</div>
</div>
</Neon>
<Neon from="#60a5fa" to="#818cf8">
<div className="relative flex items-center gap-3 p-3">
<img
src={A + "school.png"}
alt=""
aria-hidden
className="h-10 w-10 shrink-0 object-contain mix-blend-lighten sm:h-11 sm:w-11"
/>
<div className="min-w-0">
<div className="truncate text-xs font-medium text-slate-300">
Jami Sinflar
</div>
<div className="mt-0.5 text-xl font-extrabold tabular-nums text-amber-200 sm:text-2xl">
{stats.classes}
</div>
</div>
</div>
</Neon>
</div>
)}
</div>
</div>
);
}

// Bosh sahifa yuqori qismi — rasmdagi ko'rinish. Bezaklar public/dashboard/ dagi
// rasmlardan olinadi (yuklangan dizayn rasmidan kesilgan). Props dashboard.tsx bilan mos.

import { type ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight, Menu, Search, Home, Settings } from "lucide-react";
import { useSeason } from "@/lib/season";

// Rasmlar public/images/ papkasida. Boshqa papka bo'lsa, faqat shu qatorni o'zgartiring.
const A = "/images/";

function daysToNewYear(now = new Date()): number {
  const ny = new Date(now.getFullYear() + 1, 0, 1);
  return Math.max(0, Math.ceil((ny.getTime() - now.getTime()) / 86400000));
}

// Neon chegara: gradient qatlam + qorong'i ichki karta
function Neon({ children, from, to, className = "" }: { children: ReactNode; from: string; to: string; className?: string }) {
  return (
    <div
      className={`relative rounded-[24px] p-[1.5px] ${className}`}
      style={{ background: `linear-gradient(120deg, ${from}, ${to}, ${from})`, boxShadow: `0 0 26px -6px ${from}` }}
    >
      <div className="relative h-full overflow-hidden rounded-[22.5px] bg-[#0b1530]/95">
        {children}
      </div>
    </div>
  );
}

// Qor parchalari (faqat qish rejimida), komponent ichida
const FLAKES = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 53) % 100, delay: -((i * 2.3) % 12), dur: 9 + ((i * 1.7) % 7), size: 10 + ((i * 7) % 14), dx: ((i % 5) - 2) * 12,
}));
const SNOW_CSS = `
@keyframes hero-fall{0%{transform:translate3d(0,-10%,0) rotate(0)}100%{transform:translate3d(var(--dx),110%,0) rotate(360deg)}}
@keyframes hero-fly{0%{transform:translateX(-40%)}9%{transform:translateX(120%)}100%{transform:translateX(120%)}}
@media (prefers-reduced-motion: reduce){.hero-anim{animation:none!important}}
`;
function SnowLayer() {
  return (
    <>
      <style>{SNOW_CSS}</style>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        {FLAKES.map((f, i) => (
          <svg key={i} className="hero-anim absolute top-0 text-sky-100/80" width={f.size} height={f.size} viewBox="0 0 100 100"
            style={{ left: `${f.left}%`, animation: `hero-fall ${f.dur}s linear ${f.delay}s infinite`, ["--dx" as string]: `${f.dx}px` }}>
            <g stroke="currentColor" strokeWidth="7" strokeLinecap="round">
              {[0, 60, 120].map((a) => <line key={a} x1="50" y1="8" x2="50" y2="92" transform={`rotate(${a} 50 50)`} />)}
            </g>
          </svg>
        ))}
        <div className="hero-anim absolute top-[14%] left-0 z-[2]" style={{ animation: "hero-fly 40s linear infinite" }}>
          <img src={A + "santa-sleigh.png"} alt="" className="h-16 w-auto opacity-90" />
        </div>
      </div>
    </>
  );
}

// Muz gul overlay (kartaning burchagi)
const Frost = ({ className = "" }: { className?: string }) => (
  <img src={A + "frost-card.png"} alt="" aria-hidden className={`pointer-events-none absolute w-40 opacity-70 ${className}`} />
);

export interface DashboardHeroProps {
  dateWidget: ReactNode;
  greeting: string;
  motivation: string;
  rightSlot?: ReactNode;
  canUseFaceId: boolean;
  faceIdHref: string;
  faceIdSub: string;
  stats?: { students: number; classes: number };
}

export function DashboardHero({ dateWidget, greeting, motivation, rightSlot, canUseFaceId, faceIdHref, faceIdSub, stats }: DashboardHeroProps) {
  const { winter, setWinter } = useSeason();
  const days = daysToNewYear();

  return (
    <div className="relative space-y-4 overflow-hidden rounded-[28px] bg-[#070d1d] pb-4">
      {/* Shahar foni (yuqori qismi) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px]" style={{ backgroundImage: `url(${A}city-bg.jpg)`, backgroundSize: "cover", backgroundPosition: "center top", opacity: 0.55, maskImage: "linear-gradient(#000 60%, transparent)", WebkitMaskImage: "linear-gradient(#000 60%, transparent)" }} />
      {winter && <SnowLayer />}
      {/* Garland (yuqori burchaklar) — faqat qish rejimida */}
      {winter && <img src={A + "garland-tl.png"} alt="" aria-hidden className="pointer-events-none absolute -left-2 -top-2 z-[2] w-44" />}
      {winter && <img src={A + "garland-tr.png"} alt="" aria-hidden className="pointer-events-none absolute -right-2 -top-2 z-[2] w-44" />}

      {/* Yuqori panel */}
      <div className="relative mx-2 mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0b1426]/85 px-3 py-2.5 backdrop-blur">
        <Menu className="h-5 w-5 text-emerald-400" />
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-amber-200">TP</span>
          <span className="font-semibold text-slate-100">Ta’lim Platform</span>
        </div>
        <div className="ml-auto flex items-center gap-3 text-amber-200/90">
          <Search className="h-5 w-5" /><Home className="h-5 w-5" /><Settings className="h-5 w-5" />
        </div>
      </div>

      {/* Sana, sarlavha */}
      <div className="relative px-4 pt-3">
        <div className="mb-4 inline-flex">{dateWidget}</div>
        <h1 className="text-[36px] font-extrabold leading-tight tracking-tight text-white">Bosh sahifa</h1>
        <p className="mt-1 text-[19px] text-slate-100">{greeting}</p>
        <p className="text-[15px] text-slate-400">{motivation}</p>
        {rightSlot && <div className="absolute right-4 top-3">{rightSlot}</div>}
      </div>

      <div className="relative space-y-4 px-2">
        {/* Qishki mavsum */}
        {winter !== undefined && (
          <Neon from={winter ? "#f472b6" : "#334155"} to={winter ? "#38bdf8" : "#475569"}>
            {winter && <Frost className="-left-3 -top-4 rotate-180" />}
            {winter && <Frost className="-bottom-6 -right-4" />}
            <div className="relative flex items-center gap-2 p-4">
              <img src={A + "santa-sleigh.png"} alt="Qorbobo chanada" className="h-[120px] w-[120px] shrink-0 object-contain" />
              <div className="min-w-0 flex-1">
                <div className="text-[22px] font-semibold text-amber-200">Qishki mavsum</div>
                <p className="mt-1 text-[16px] leading-snug text-slate-100">Ertalab yengil mashq qilish qishda ham quvvat beradi 💪</p>
                <button onClick={() => setWinter(!winter)} className="mt-2 text-[15px] text-sky-300 hover:text-sky-200">
                  {winter ? "Qishki bezakni o'chirish" : "Qishki bezakni yoqish"}
                </button>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[36px] font-black leading-none tabular-nums text-amber-200">{days} kun</div>
                <div className="mt-1 text-[13px] text-sky-300">Yangi yilgacha 🎄</div>
                <img src={A + "ball-red-right.png"} alt="" aria-hidden className="ml-auto mt-2 h-10 w-10 object-contain" />
              </div>
            </div>
          </Neon>
        )}

        {/* Face ID */}
        {canUseFaceId && (
          <Link href={faceIdHref} className="block">
            <Neon from="#22d3ee" to="#6366f1" className="cursor-pointer">
              <Frost className="-right-4 -top-5 rotate-90" />
              <div className="relative flex items-center gap-4 p-4">
                <img src={A + "face-id.png"} alt="" aria-hidden className="h-[84px] w-[84px] shrink-0 object-contain" />
                <div className="min-w-0 flex-1">
                  <div className="text-[22px] font-semibold text-white">Face ID</div>
                  <p className="mt-1 text-[15px] text-slate-300">{faceIdSub}</p>
                </div>
                <ChevronRight className="h-6 w-6 text-slate-400" />
              </div>
            </Neon>
          </Link>
        )}

        {/* Intelektual o'yinlar */}
        <Link href="/intellektual" className="block">
          <Neon from="#e879f9" to="#6366f1" className="cursor-pointer">
            <Frost className="-right-4 -top-5 rotate-90" />
            <div className="relative flex items-center gap-4 p-4">
              <img src={A + "games.png"} alt="" aria-hidden className="h-[100px] w-[100px] shrink-0 object-contain" />
              <div className="min-w-0 flex-1">
                <div className="text-[22px] font-semibold text-white">Intelektual o'yinlar</div>
                <p className="mt-1 text-[15px] leading-snug text-slate-300">Maktab Olami, Merge — aqlni charxla, kuchaytir</p>
              </div>
              <ChevronRight className="h-6 w-6 text-slate-400" />
            </div>
          </Neon>
        </Link>

        {/* Statistika */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <Neon from="#60a5fa" to="#818cf8">
              <Frost className="-bottom-6 -right-6" />
              <div className="relative flex items-center gap-3 p-4">
                <img src={A + "grad-cap.png"} alt="" aria-hidden className="h-12 w-12 object-contain" />
                <div>
                  <div className="text-[14px] text-slate-300">Jami O'quvchilar</div>
                  <div className="text-[26px] font-bold tabular-nums text-amber-200">{stats.students.toLocaleString("uz-UZ")}</div>
                </div>
              </div>
            </Neon>
            <Neon from="#60a5fa" to="#818cf8">
              <Frost className="-bottom-6 -right-6" />
              <div className="relative flex items-center gap-3 p-4">
                <img src={A + "school.png"} alt="" aria-hidden className="h-12 w-12 object-contain" />
                <div>
                  <div className="text-[14px] text-slate-300">Jami Sinflar</div>
                  <div className="text-[26px] font-bold tabular-nums text-amber-200">{stats.classes}</div>
                </div>
              </div>
            </Neon>
          </div>
        )}
      </div>

      {/* Pastki bezaklar */}
      {winter && <img src={A + "ball-blue-left.png"} alt="" aria-hidden className="pointer-events-none absolute -left-1 bottom-2 w-10" />}
      {winter && <img src={A + "ball-blue-bottom.png"} alt="" aria-hidden className="pointer-events-none absolute bottom-3 right-4 w-12" />}
      {winter && <img src={A + "ball-red-bottom.png"} alt="" aria-hidden className="pointer-events-none absolute bottom-1 right-20 w-12" />}
    </div>
  );
}

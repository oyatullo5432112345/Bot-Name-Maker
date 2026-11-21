import { useState, useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight, Search, Home, Settings } from "lucide-react";
import { useSeason } from "@/lib/season";
import { ArchaTree, loadArcha, type Orn } from "@/components/archa-tree";

const A = "/images/";

// Yangi yilgacha jonli orqama-sanoq (Kun, Soat, Daqiqa, Soniya)
function useNewYearCountdown() {
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
  const [time, setTime] = useState(getDiff);
  useEffect(() => {
    const timer = setInterval(() => setTime(getDiff()), 1000);
    return () => clearInterval(timer);
  }, []);
  return time;
}

// Bir xil ko'rinishdagi karta (neon chegara + shisha ichki qism)
function Card({ children, from, to, className = "" }: { children: ReactNode; from: string; to: string; className?: string }) {
  return (
    <div
      className={`relative rounded-[22px] p-[1.5px] ${className}`}
      style={{ background: `linear-gradient(125deg, ${from}, ${to}, ${from})`, boxShadow: `0 8px 22px -10px ${from}` }}
    >
      <div className="relative h-full overflow-hidden rounded-[20.5px] bg-[#0b1530]/92 backdrop-blur-md">{children}</div>
    </div>
  );
}

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
  const { days, hours, minutes, seconds } = useNewYearCountdown();
  const [orn, setOrn] = useState<Orn[]>([]);
  useEffect(() => { setOrn(loadArcha()); }, []);

  const units = [
    { val: days, label: "kun" },
    { val: hours, label: "soat" },
    { val: minutes, label: "daq" },
    { val: seconds, label: "son" },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Yuqori panel: tepada, rasmdagidek (to'q shisha, oltin belgilar) */}
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0a1020]/85 px-3.5 py-2.5 backdrop-blur-md">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-200 to-amber-600 text-sm font-black text-[#1a1204]">TP</div>
        <span className="text-[17px] font-semibold text-slate-100">Ta’lim Platform</span>
        <div className="ml-auto flex items-center gap-4 text-amber-200">
          <Search className="h-5 w-5" />
          <Link href="/"><Home className="h-5 w-5" /></Link>
          <Settings className="h-5 w-5" />
        </div>
      </div>

      {/* 2. Archa: yuqori panel tagida */}
      {winter && (
        <div className="mx-auto w-28">
          <ArchaTree ornaments={orn} showStar className="h-auto w-full" />
        </div>
      )}

      {/* 3. Sana va sarlavha */}
      <div className="px-1">
        <div className="mb-3">{dateWidget}</div>
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight text-white">Bosh sahifa</h1>
        <p className="mt-1 text-[17px] font-medium text-slate-100">{greeting}</p>
        <p className="text-sm text-slate-400">{motivation}</p>
        {rightSlot && <div className="mt-2">{rightSlot}</div>}
      </div>

      {/* 4. Kartalar: bir xil kenglik, bir xil balandlik */}
      {winter !== undefined && (
        <Card from={winter ? "#38bdf8" : "#334155"} to={winter ? "#e879f9" : "#475569"}>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <img src={A + "santa-sleigh.png"} alt="Qorbobo" className="h-20 w-20 shrink-0 rounded-2xl object-contain" />
              <div className="min-w-0 flex-1">
                <div className="mb-2 text-xs font-extrabold uppercase tracking-wider text-sky-200">❄️ Yangi yilgacha qoldi:</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {units.map(({ val, label }) => (
                    <div key={label} className="flex flex-col items-center rounded-xl border border-sky-200/30 bg-sky-400/10 py-2">
                      <span className="text-xl font-black leading-none tabular-nums text-white">{String(val).padStart(2, "0")}</span>
                      <span className="mt-1 text-[10px] font-bold uppercase text-sky-200">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
              <span className="text-xs font-semibold text-sky-200/85">🎄 Qishki mavsum</span>
              <button type="button" onClick={() => setWinter(!winter)} className="text-xs font-medium text-sky-300">
                {winter ? "Qishki bezakni o‘chirish" : "Qishki bezakni yoqish"}
              </button>
            </div>
          </div>
        </Card>
      )}

      {canUseFaceId && (
        <Link href={faceIdHref} className="block">
          <Card from="#22d3ee" to="#6366f1" className="cursor-pointer">
            <div className="flex h-[104px] items-center gap-3.5 px-4">
              <img src={A + "face-id.png"} alt="" aria-hidden className="h-16 w-16 shrink-0 rounded-2xl object-contain" />
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold text-white">Face ID</div>
                <p className="line-clamp-2 text-sm text-slate-300">{faceIdSub}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </div>
          </Card>
        </Link>
      )}

      <Link href="/intellektual" className="block">
        <Card from="#e879f9" to="#6366f1" className="cursor-pointer">
          <div className="flex h-[104px] items-center gap-3.5 px-4">
            <img src={A + "games.png"} alt="" aria-hidden className="h-16 w-16 shrink-0 rounded-2xl object-contain" />
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold text-white">Intelektual o‘yinlar</div>
              <p className="line-clamp-2 text-sm text-slate-300">Maktab Olami, Merge — aqlni charxla, kuchaytir</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
          </div>
        </Card>
      </Link>

      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <Card from="#60a5fa" to="#818cf8">
            <div className="flex h-[92px] items-center gap-3 px-3.5">
              <img src={A + "grad-cap.png"} alt="" aria-hidden className="h-11 w-11 shrink-0 object-contain" />
              <div className="min-w-0">
                <div className="truncate text-xs text-slate-300">Jami O‘quvchilar</div>
                <div className="text-2xl font-extrabold tabular-nums text-amber-200">{stats.students.toLocaleString("uz-UZ")}</div>
              </div>
            </div>
          </Card>
          <Card from="#60a5fa" to="#818cf8">
            <div className="flex h-[92px] items-center gap-3 px-3.5">
              <img src={A + "school.png"} alt="" aria-hidden className="h-11 w-11 shrink-0 object-contain" />
              <div className="min-w-0">
                <div className="truncate text-xs text-slate-300">Jami Sinflar</div>
                <div className="text-2xl font-extrabold tabular-nums text-amber-200">{stats.classes}</div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { useSeason } from "@/lib/season";
import { ArchaTree, loadArcha, type Orn } from "@/components/archa-tree";

const A = "/imagine/";

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

// Neon chegara + muzli shaffof effekt
function Neon({
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
      className={`relative rounded-[24px] p-[1.5px] transition-transform active:scale-[0.99] ${className}`}
      style={{
        background: `linear-gradient(125deg, ${from}, ${to}, ${from})`,
        boxShadow: `0 10px 28px -8px ${from}`,
      }}
    >
      <div
        className="relative h-full overflow-hidden rounded-[22.5px] bg-[#0b1530]/92 backdrop-blur-md"
        style={{
          boxShadow: "inset 0 0 20px rgba(186, 230, 253, 0.15)",
        }}
      >
        {children}
      </div>
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

export function DashboardHero({
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
  const [orn, setOrn] = useState<Orn[]>([]);
  useEffect(() => {
    setOrn(loadArcha());
  }, []);

  const countdownUnits = [
    { val: days, label: "kun" },
    { val: hours, label: "soat" },
    { val: minutes, label: "daq" },
    { val: seconds, label: "son" },
  ];

  return (
    <div className="relative space-y-5 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-[#0f1f42] via-[#091226] to-[#070d1d] p-4 sm:p-5 shadow-xl">
      {/* Ortiqcha fon rasmi (city-bg.jpg) olib tashlandi — endi tepadagi yozuvlar aralashmaydi */}

      {/* Yuqori panel (to'q rang) va archa yonida */}
      <div className="relative z-[2] flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-[#0a1020]/90 px-3.5 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-200 to-amber-600 text-sm font-black text-[#1a1204]">
            TP
          </div>
          <span className="truncate text-base font-semibold text-slate-100">Ta’lim Platform</span>
        </div>
        {winter && (
          <div className="w-16 shrink-0">
            <ArchaTree ornaments={orn} showStar className="h-auto w-full" />
          </div>
        )}
      </div>

      {/* Sana va sarlavha */}
      <div className="relative z-[2] pt-1">
        <div className="mb-3.5 flex items-center justify-between gap-2">
          <div>{dateWidget}</div>
          {rightSlot && <div>{rightSlot}</div>}
        </div>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
          Bosh sahifa
        </h1>
        <p className="mt-1.5 text-lg font-medium text-slate-100 sm:text-xl">
          {greeting}
        </p>
        <p className="mt-0.5 text-sm text-slate-400 sm:text-base">{motivation}</p>
      </div>

      {/* Kartalar ro'yxati (Kattalashtirilgan va bo'ydor) */}
      <div className="relative z-[2] space-y-4">
        {/* 1. Qishki mavsum (Chapda Qorbobo, O'ngda muzli orqama-sanoq) */}
        {winter !== undefined && (
          <Neon
            from={winter ? "#38bdf8" : "#334155"}
            to={winter ? "#e879f9" : "#475569"}
          >
            <div className="relative p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3.5">
                {/* Chap: Qorbobo rasmi */}
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-sky-300/20 bg-sky-500/10 p-1 sm:h-28 sm:w-28">
                  <img
                    src={A + "santa-sleigh.png"}
                    alt="Qorbobo"
                    className="h-full w-full object-contain mix-blend-lighten"
                  />
                </div>

                {/* O'ng: Yangi yilgacha muzli orqama-sanoq */}
                <div className="min-w-0 flex-1">
                  <div className="mb-2.5 flex items-center justify-between gap-1">
                    <span
                      className="text-xs font-extrabold uppercase tracking-wider sm:text-sm"
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

                  {/* 4 ta muzli katakcha: Kun, Soat, Daq, Son */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {countdownUnits.map(({ val, label }) => (
                      <div
                        key={label}
                        className="flex flex-col items-center justify-center rounded-xl border border-sky-200/35 bg-gradient-to-b from-sky-200/20 via-sky-400/10 to-slate-900/60 py-2.5 backdrop-blur-md"
                        style={{
                          boxShadow:
                            "inset 0 1px 4px rgba(255,255,255,0.4), 0 4px 10px rgba(0,0,0,0.25)",
                        }}
                      >
                        <span
                          className="text-xl font-black leading-none tabular-nums sm:text-2xl"
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
                        <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-sky-200/90 sm:text-xs">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pastki qator */}
              <div className="mt-3.5 flex items-center justify-between border-t border-white/10 pt-2.5">
                <span className="text-xs font-semibold text-sky-200/85 sm:text-sm">
                  🎄 Qishki mavsum
                </span>
                <button
                  type="button"
                  onClick={() => setWinter(!winter)}
                  className="text-xs font-medium text-sky-300 transition-colors hover:text-sky-200 sm:text-sm"
                >
                  {winter
                    ? "Qishki bezakni o‘chirish"
                    : "Qishki bezakni yoqish"}
                </button>
              </div>
            </div>
          </Neon>
        )}

        {/* 2. Face ID (Kattalashtirilgan) */}
        {canUseFaceId && (
          <Link href={faceIdHref} className="block">
            <Neon from="#22d3ee" to="#6366f1" className="cursor-pointer">
              <div className="relative flex items-center gap-4 p-4 sm:p-5">
                <img
                  src={A + "face-id.png"}
                  alt=""
                  aria-hidden
                  className="h-20 w-20 shrink-0 rounded-2xl object-contain mix-blend-lighten sm:h-24 sm:w-24"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xl font-bold text-white sm:text-2xl">
                    Face ID
                  </div>
                  <p className="mt-1 text-sm leading-snug text-slate-300 sm:text-base">
                    {faceIdSub}
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 shrink-0 text-slate-400" />
              </div>
            </Neon>
          </Link>
        )}

        {/* 3. Intelektual o'yinlar (Kattalashtirilgan) */}
        <Link href="/intellektual" className="block">
          <Neon from="#e879f9" to="#6366f1" className="cursor-pointer">
            <div className="relative flex items-center gap-4 p-4 sm:p-5">
              <img
                src={A + "games.png"}
                alt=""
                aria-hidden
                className="h-20 w-20 shrink-0 rounded-2xl object-contain mix-blend-lighten sm:h-24 sm:w-24"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xl font-bold text-white sm:text-2xl">
                  Intelektual o‘yinlar
                </div>
                <p className="mt-1 text-sm leading-snug text-slate-300 sm:text-base">
                  Maktab Olami, Merge — aqlni charxla, kuchaytir
                </p>
              </div>
              <ChevronRight className="h-6 w-6 shrink-0 text-slate-400" />
            </div>
          </Neon>
        </Link>

        {/* 4. Statistika (Kattalashtirilgan) */}
        {stats && (
          <div className="grid grid-cols-2 gap-3.5">
            <Neon from="#60a5fa" to="#818cf8">
              <div className="relative flex items-center gap-3.5 p-4 sm:p-5">
                <img
                  src={A + "grad-cap.png"}
                  alt=""
                  aria-hidden
                  className="h-12 w-12 shrink-0 object-contain mix-blend-lighten sm:h-14 sm:w-14"
                />
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-slate-300 sm:text-sm">
                    Jami O‘quvchilar
                  </div>
                  <div className="mt-0.5 text-2xl font-extrabold tabular-nums text-amber-200 sm:text-3xl">
                    {stats.students.toLocaleString("uz-UZ")}
                  </div>
                </div>
              </div>
            </Neon>
            <Neon from="#60a5fa" to="#818cf8">
              <div className="relative flex items-center gap-3.5 p-4 sm:p-5">
                <img
                  src={A + "school.png"}
                  alt=""
                  aria-hidden
                  className="h-12 w-12 shrink-0 object-contain mix-blend-lighten sm:h-14 sm:w-14"
                />
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-slate-300 sm:text-sm">
                    Jami Sinflar
                  </div>
                  <div className="mt-0.5 text-2xl font-extrabold tabular-nums text-amber-200 sm:text-3xl">
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

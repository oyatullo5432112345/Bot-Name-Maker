```react
import { useState, useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { useSeason } from "@/lib/season";

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
      className={`relative rounded-[22px] p-[1.5px] transition-transform active:scale-[0.99] ${className}`}
      style={{
        background: `linear-gradient(125deg, ${from}, ${to}, ${from})`,
        boxShadow: `0 8px 24px -8px ${from}`,
      }}
    >
      <div
        className="relative h-full overflow-hidden rounded-[20.5px] bg-[#0b1530]/90 backdrop-blur-md"
        style={{
          boxShadow: "inset 0 0 18px rgba(186, 230, 253, 0.14)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Toza CSS muz burchak effekti
const Frost = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0"
    style={{
      background:
        "radial-gradient(circle at 0% 0%, rgba(224, 242, 254, 0.22) 0%, transparent 40%), radial-gradient(circle at 100% 100%, rgba(186, 230, 253, 0.18) 0%, transparent 40%)",
    }}
  />
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

  const countdownUnits = [
    { val: days, label: "kun" },
    { val: hours, label: "soat" },
    { val: minutes, label: "daq" },
    { val: seconds, label: "son" },
  ];

  return (
    <div className="relative space-y-4 overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-b from-[#0d1b38] via-[#091226] to-[#070d1d] p-4 shadow-xl">
      {/* Shahar foni */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[280px]"
        style={{
          backgroundImage: `url(${A}city-bg.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          opacity: 0.45,
          maskImage: "linear-gradient(#000 50%, transparent)",
          WebkitMaskImage: "linear-gradient(#000 50%, transparent)",
        }}
      />

      {/* Yuqori burchak bezaklari */}
      {winter && (
        <>
          <img
            src={A + "garland-tl.png"}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -left-2 -top-2 z-[1] w-36 opacity-90 mix-blend-lighten"
          />
          <img
            src={A + "garland-tr.png"}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -right-2 -top-2 z-[1] w-36 opacity-90 mix-blend-lighten"
          />
        </>
      )}

      {/* Sana va sarlavha */}
      <div className="relative z-[2] pt-1">
        <div className="mb-3 flex items-center justify-between gap-2">
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

      {/* Kartalar ro'yxati */}
      <div className="relative z-[2] space-y-3.5">
        {/* 1. Qishki mavsum (Chapda ixcham Qorbobo, O'ngda muzli orqama-sanoq) */}
        {winter !== undefined && (
          <Neon
            from={winter ? "#38bdf8" : "#334155"}
            to={winter ? "#e879f9" : "#475569"}
          >
            {winter && <Frost />}
            <div className="relative p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                {/* Chap: Qorbobo rasmi (kattalashib ketmaydigan aniq o'lcham) */}
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-sky-300/20 bg-sky-500/10 p-1 sm:h-24 sm:w-24">
                  <img
                    src={A + "santa-sleigh.png"}
                    alt="Qorbobo"
                    className="h-full w-full object-contain mix-blend-lighten"
                  />
                </div>

                {/* O'ng: Yangi yilgacha muzli orqama-sanoq */}
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center justify-between gap-1">
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
                        className="flex flex-col items-center justify-center rounded-xl border border-sky-200/35 bg-gradient-to-b from-sky-200/20 via-sky-400/10 to-slate-900/60 py-2 backdrop-blur-md"
                        style={{
                          boxShadow:
                            "inset 0 1px 4px rgba(255,255,255,0.4), 0 4px 10px rgba(0,0,0,0.25)",
                        }}
                      >
                        <span
                          className="text-lg font-black leading-none tabular-nums sm:text-2xl"
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
                        <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-sky-200/90">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pastki qator: Qishki mavsum yorlig'i va bezakni o'chirish tugmasi */}
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
                <span className="text-xs font-semibold text-sky-200/80">
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

        {/* 2. Face ID */}
        {canUseFaceId && (
          <Link href={faceIdHref} className="block">
            <Neon from="#22d3ee" to="#6366f1" className="cursor-pointer">
              {winter && <Frost />}
              <div className="relative flex items-center gap-3.5 p-3.5 sm:p-4">
                <img
                  src={A + "face-id.png"}
                  alt=""
                  aria-hidden
                  className="h-14 w-14 shrink-0 rounded-xl object-contain mix-blend-lighten sm:h-16 sm:w-16"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-bold text-white sm:text-xl">
                    Face ID
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-300 sm:text-sm">
                    {faceIdSub}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
              </div>
            </Neon>
          </Link>
        )}

        {/* 3. Intelektual o'yinlar */}
        <Link href="/intellektual" className="block">
          <Neon from="#e879f9" to="#6366f1" className="cursor-pointer">
            {winter && <Frost />}
            <div className="relative flex items-center gap-3.5 p-3.5 sm:p-4">
              <img
                src={A + "games.png"}
                alt=""
                aria-hidden
                className="h-14 w-14 shrink-0 rounded-xl object-contain mix-blend-lighten sm:h-16 sm:w-16"
              />
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold text-white sm:text-xl">
                  Intelektual o‘yinlar
                </div>
                <p className="mt-0.5 text-xs leading-snug text-slate-300 sm:text-sm">
                  Maktab Olami, Merge — aqlni charxla, kuchaytir
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </div>
          </Neon>
        </Link>

        {/* 4. Statistika */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <Neon from="#60a5fa" to="#818cf8">
              {winter && <Frost />}
              <div className="relative flex items-center gap-2.5 p-3.5">
                <img
                  src={A + "grad-cap.png"}
                  alt=""
                  aria-hidden
                  className="h-10 w-10 shrink-0 object-contain mix-blend-lighten"
                />
                <div className="min-w-0">
                  <div className="truncate text-xs text-slate-300">
                    Jami O‘quvchilar
                  </div>
                  <div className="text-xl font-extrabold tabular-nums text-amber-200">
                    {stats.students.toLocaleString("uz-UZ")}
                  </div>
                </div>
              </div>
            </Neon>
            <Neon from="#60a5fa" to="#818cf8">
              {winter && <Frost />}
              <div className="relative flex items-center gap-2.5 p-3.5">
                <img
                  src={A + "school.png"}
                  alt=""
                  aria-hidden
                  className="h-10 w-10 shrink-0 object-contain mix-blend-lighten"
                />
                <div className="min-w-0">
                  <div className="truncate text-xs text-slate-300">
                    Jami Sinflar
                  </div>
                  <div className="text-xl font-extrabold tabular-nums text-amber-200">
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
```

### Nima o'zgardi:
* **Motivatsion matn olib tashlandi** — karta ichi ortiqcha yozuvlardan tozalandi.
* **Qorbobo o'lchami cheklandi** — chap tomonda `w-20 h-20` (telefonda) / `w-24 h-24` (kattaroq ekranda) ramka ichida turadi, hech qachon kattalashib ketmaydi.
* **Muzli orqama-sanoq (`❄️ Yangi yilgacha qoldi:`)** — o'ng tomonda 4 ta muzdek yaltirab turuvchi katakchada **Kun, Soat, Daqiqa, Soniya** jonli ravishda kamayib boradi.

Buni qo'yib ko'ring, keyin navbatdagi qismga o'tamiz!
```

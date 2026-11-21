// Bosh sahifa yuqori qismi — to'liq tuzatilgan versiya.
// Props dashboard.tsx bilan mos.

import { type ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { useSeason } from "@/lib/season";

const A = "/imagine/";

function daysToNewYear(now = new Date()): number {
  const ny = new Date(now.getFullYear() + 1, 0, 1);
  return Math.max(0, Math.ceil((ny.getTime() - now.getTime()) / 86400000));
}

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
      className={`relative rounded-[24px] p-[1.5px] ${className}`}
      style={{
        background: `linear-gradient(120deg, ${from}, ${to}, ${from})`,
        boxShadow: `0 0 24px -8px ${from}`,
      }}
    >
      <div className="relative h-full overflow-hidden rounded-[22.5px] bg-[#0b1530]/90 backdrop-blur-md">
        {children}
      </div>
    </div>
  );
}

const FLAKES = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 53) % 100,
  delay: -((i * 2.3) % 12),
  dur: 9 + ((i * 1.7) % 7),
  size: 10 + ((i * 7) % 14),
  dx: ((i % 5) - 2) * 12,
}));

const SNOW_CSS = `
@keyframes hero-fall{0%{transform:translate3d(0,-10%,0) rotate(0)}100%{transform:translate3d(var(--dx),110%,0) rotate(360deg)}}
@media (prefers-reduced-motion: reduce){.hero-anim{animation:none!important}}
`;

function SnowLayer() {
  return (
    <>
      <style>{SNOW_CSS}</style>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        {FLAKES.map((f, i) => (
          <svg
            key={i}
            className="hero-anim absolute top-0 text-sky-100/75"
            width={f.size}
            height={f.size}
            viewBox="0 0 100 100"
            style={{
              left: `${f.left}%`,
              animation: `hero-fall ${f.dur}s linear ${f.delay}s infinite`,
              ["--dx" as string]: `${f.dx}px`,
            }}
          >
            <g stroke="currentColor" strokeWidth="7" strokeLinecap="round">
              {[0, 60, 120].map((a) => (
                <line
                  key={a}
                  x1="50"
                  y1="8"
                  x2="50"
                  y2="92"
                  transform={`rotate(${a} 50 50)`}
                />
              ))}
            </g>
          </svg>
        ))}
      </div>
    </>
  );
}

// Kvadrat rasm o'rniga toza muz (frost) effekt
const Frost = ({ className = "" }: { className?: string }) => (
  <div
    aria-hidden
    className={`pointer-events-none absolute h-28 w-28 rounded-full bg-sky-200/15 blur-2xl ${className}`}
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
  const days = daysToNewYear();

  return (
    <div className="relative space-y-4 overflow-hidden rounded-[28px] border border-white/10 bg-[#070d1d] p-4 pb-5 text-white shadow-xl">
      {/* Shahar foni (yuqori qismi) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[320px]"
        style={{
          backgroundImage: `url(${A}city-bg.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          opacity: 0.45,
          maskImage: "linear-gradient(#000 55%, transparent)",
          WebkitMaskImage: "linear-gradient(#000 55%, transparent)",
        }}
      />

      {winter && <SnowLayer />}

      {/* Yuqori burchaklardagi garland bezaklari */}
      {winter && (
        <>
          <img
            src={A + "garland-tl.png"}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -left-2 -top-2 z-[2] w-36 mix-blend-lighten"
          />
          <img
            src={A + "garland-tr.png"}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -right-2 -top-2 z-[2] w-36 mix-blend-lighten"
          />
        </>
      )}

      {/* Sana va salomlashuv */}
      <div className="relative z-[3] pt-1">
        <div className="mb-3 inline-flex">{dateWidget}</div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-white sm:text-[36px]">
              Bosh sahifa
            </h1>
            <p className="mt-1 text-[17px] font-medium text-slate-100 sm:text-[19px]">
              {greeting}
            </p>
            <p className="mt-0.5 text-[14px] text-slate-300/90 sm:text-[15px]">
              {motivation}
            </p>
          </div>
          {rightSlot && <div className="shrink-0">{rightSlot}</div>}
        </div>
      </div>

      {/* Asosiy kartalar */}
      <div className="relative z-[3] space-y-3.5">
        {/* Qishki mavsum */}
        {winter !== undefined && (
          <Neon
            from={winter ? "#f472b6" : "#334155"}
            to={winter ? "#38bdf8" : "#475569"}
          >
            {winter && <Frost className="-left-6 -top-6" />}
            {winter && <Frost className="-bottom-8 -right-6" />}

            <div className="relative flex items-center gap-3 p-3.5 sm:p-4">
              <img
                src={A + "santa-sleigh.png"}
                alt="Qorbobo chanada"
                className="h-20 w-20 shrink-0 rounded-xl object-contain mix-blend-lighten sm:h-24 sm:w-24"
              />

              <div className="min-w-0 flex-1">
                <div className="text-[19px] font-bold leading-snug text-amber-200 sm:text-[21px]">
                  Qishki mavsum
                </div>
                <p className="mt-1 text-[14px] leading-snug text-slate-100 sm:text-[15px]">
                  Ertalab yengil mashq qilish qishda ham quvvat beradi 💪
                </p>
                <button
                  type="button"
                  onClick={() => setWinter(!winter)}
                  className="mt-2 inline-block text-left text-[13px] font-medium text-sky-300 transition-colors hover:text-sky-200"
                >
                  {winter ? "Qishki bezakni o'chirish" : "Qishki bezakni yoqish"}
                </button>
              </div>

              <div className="shrink-0 pl-1 text-right">
                <div className="text-[28px] font-black leading-none tabular-nums text-amber-200 sm:text-[34px]">
                  {days} kun
                </div>
                <div className="mt-1 text-[12px] font-medium text-sky-300">
                  Yangi yilgacha 🎄
                </div>
                {winter && (
                  <img
                    src={A + "ball-red-right.png"}
                    alt=""
                    aria-hidden
                    className="ml-auto mt-1.5 h-8 w-8 rounded-full object-contain mix-blend-lighten"
                  />
                )}
              </div>
            </div>
          </Neon>
        )}

        {/* Face ID */}
        {canUseFaceId && (
          <Link href={faceIdHref} className="block">
            <Neon from="#22d3ee" to="#6366f1" className="cursor-pointer">
              {winter && <Frost className="-right-6 -top-6" />}
              <div className="relative flex items-center gap-3.5 p-3.5 sm:p-4">
                <img
                  src={A + "face-id.png"}
                  alt=""
                  aria-hidden
                  className="h-16 w-16 shrink-0 rounded-xl object-contain mix-blend-lighten sm:h-20 sm:w-20"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[20px] font-bold text-white">Face ID</div>
                  <p className="mt-0.5 text-[14px] leading-snug text-slate-300">
                    {faceIdSub}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
              </div>
            </Neon>
          </Link>
        )}

        {/* Intelektual o'yinlar */}
        <Link href="/intellektual" className="block">
          <Neon from="#e879f9" to="#6366f1" className="cursor-pointer">
            {winter && <Frost className="-right-6 -top-6" />}
            <div className="relative flex items-center gap-3.5 p-3.5 sm:p-4">
              <img
                src={A + "games.png"}
                alt=""
                aria-hidden
                className="h-16 w-16 shrink-0 rounded-xl object-contain mix-blend-lighten sm:h-20 sm:w-20"
              />
              <div className="min-w-0 flex-1">
                <div className="text-[20px] font-bold text-white">
                  Intelektual o&apos;yinlar
                </div>
                <p className="mt-0.5 text-[14px] leading-snug text-slate-300">
                  Maktab Olami, Merge — aqlni charxla, kuchaytir
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
            </div>
          </Neon>
        </Link>

        {/* Statistika (agar stats prop berilsa) */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <Neon from="#60a5fa" to="#818cf8">
              {winter && <Frost className="-bottom-6 -right-6" />}
              <div className="relative flex items-center gap-3 p-3.5">
                <img
                  src={A + "grad-cap.png"}
                  alt=""
                  aria-hidden
                  className="h-11 w-11 shrink-0 object-contain mix-blend-lighten"
                />
                <div className="min-w-0">
                  <div className="truncate text-[13px] text-slate-300">
                    Jami O&apos;quvchilar
                  </div>
                  <div className="text-[24px] font-bold tabular-nums text-amber-200">
                    {stats.students.toLocaleString("uz-UZ")}
                  </div>
                </div>
              </div>
            </Neon>

            <Neon from="#60a5fa" to="#818cf8">
              {winter && <Frost className="-bottom-6 -right-6" />}
              <div className="relative flex items-center gap-3 p-3.5">
                <img
                  src={A + "school.png"}
                  alt=""
                  aria-hidden
                  className="h-11 w-11 shrink-0 object-contain mix-blend-lighten"
                />
                <div className="min-w-0">
                  <div className="truncate text-[13px] text-slate-300">
                    Jami Sinflar
                  </div>
                  <div className="text-[24px] font-bold tabular-nums text-amber-200">
                    {stats.classes}
                  </div>
                </div>
              </div>
            </Neon>
          </div>
        )}
      </div>

      {/* Pastki shar bezaklari */}
      {winter && (
        <div className="pointer-events-none relative z-[3] mt-2 flex items-center justify-between px-1">
          <img
            src={A + "ball-blue-left.png"}
            alt=""
            aria-hidden
            className="h-8 w-8 rounded-full object-contain mix-blend-lighten"
          />
          <div className="flex items-center gap-3">
            <img
              src={A + "ball-red-bottom.png"}
              alt=""
              aria-hidden
              className="h-8 w-8 rounded-full object-contain mix-blend-lighten"
            />
            <img
              src={A + "ball-blue-bottom.png"}
              alt=""
              aria-hidden
              className="h-8 w-8 rounded-full object-contain mix-blend-lighten"
            />
          </div>
        </div>
      )}
    </div>
  );
}

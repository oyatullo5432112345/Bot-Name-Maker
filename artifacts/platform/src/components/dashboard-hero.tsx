// Bosh sahifa yuqori qismi: sarlavha, qishki mavsum kartasi (Yangi yilgacha sanoq),
// Face ID va Intelektual o'yinlar kartalari. Dizayn: to'q "shisha" kartalar.

import { type ReactNode } from "react";
import { Link } from "wouter";
import { ScanFace, ChevronRight, Snowflake } from "lucide-react";
import { useSeason } from "@/lib/season";
import { SantaSleigh, Flake } from "@/components/winter-scene";

function daysToNewYear(now = new Date()): number {
  const ny = new Date(now.getFullYear() + 1, 0, 1);
  return Math.max(0, Math.ceil((ny.getTime() - now.getTime()) / 86400000));
}

const GLASS = "relative overflow-hidden rounded-[22px] border border-white/10 bg-[#0c1a33]/70 backdrop-blur-md shadow-[0_18px_40px_-18px_rgba(0,0,0,.7)]";

export function DashboardHero({
  dateWidget, greeting, motivation, rightSlot, canUseFaceId, faceIdHref, faceIdSub,
}: {
  dateWidget: ReactNode;
  greeting: string;
  motivation: string;
  rightSlot?: ReactNode;
  canUseFaceId: boolean;
  faceIdHref: string;
  faceIdSub: string;
}) {
  const { winter, setWinter } = useSeason();
  const days = daysToNewYear();

  return (
    <div className="space-y-4">
      {/* Sarlavha */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2">{dateWidget}</div>
          <h1 className="text-3xl font-extrabold tracking-tight">Bosh sahifa</h1>
          <p className="mt-1 text-base text-foreground/90">{greeting}</p>
          <p className="mt-0.5 text-xs italic text-muted-foreground">{motivation}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>
      </div>

      {/* Qishki mavsum kartasi */}
      {winter !== undefined && (
        <div className={`${GLASS} p-4 ${winter ? "ring-1 ring-sky-400/30" : "opacity-80"}`}>
          {winter && (
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60">
              <div className="absolute -left-2 -top-2"><Flake size={44} opacity={0.6} /></div>
              <div className="absolute -bottom-2 -right-2"><Flake size={52} opacity={0.5} /></div>
            </div>
          )}
          <div className="relative flex items-center gap-3">
            <div className="w-[118px] shrink-0">
              <SantaSleigh width={118} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold text-amber-200">Qishki mavsum</div>
              <p className="text-sm leading-snug text-foreground/85">
                Ertalab yengil mashq qilish qishda ham quvvat beradi 💪
              </p>
              <button
                onClick={() => setWinter(!winter)}
                className="mt-2 text-xs font-medium text-sky-300 hover:text-sky-200"
              >
                {winter ? "Qishki bezakni o'chirish" : "Qishki bezakni yoqish"}
              </button>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-3xl font-black tabular-nums text-amber-200">{days} kun</div>
              <div className="text-[11px] text-sky-300">Yangi yilgacha 🎄</div>
            </div>
          </div>
        </div>
      )}

      {/* Tezkor kartalar */}
      <div className="grid gap-3 sm:grid-cols-2">
        {canUseFaceId && (
          <Link href={faceIdHref}>
            <div className={`${GLASS} h-full cursor-pointer p-4 transition-transform hover:scale-[1.01]`}>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-sky-500/10 ring-1 ring-cyan-300/40">
                  <ScanFace className="h-7 w-7 text-cyan-300" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-foreground">Face ID</h3>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{faceIdSub}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </div>
            </div>
          </Link>
        )}

        <Link href="/intellektual" className={canUseFaceId ? "" : "sm:col-span-2"}>
          <div className={`${GLASS} h-full cursor-pointer p-4 transition-transform hover:scale-[1.01]`}>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/25 to-violet-500/15 ring-1 ring-fuchsia-300/40 text-2xl">🧩</div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-foreground">Intelektual o'yinlar</h3>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">Maktab Olami, Merge — aqlni charxla, kuchaytir</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

export { Snowflake };

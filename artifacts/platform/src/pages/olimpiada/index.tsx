import { useState } from "react";
import { Trophy, CalendarDays, Medal, Swords, BarChart3, School, Megaphone } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import EventsTab from "./_events";
import GoliblarTab from "./_goliblar";
import ZakovatTab from "./_zakovat";
import StatsTab from "./_stats";
import TumanReyting from "./_tuman-reyting";
import ElonTab from "./_elon";

type Tab = "tanlovlar" | "goliblar" | "zakovat" | "stats" | "tuman" | "elon";

const TABS: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { id: "tanlovlar", label: "Tanlovlar",     icon: <CalendarDays className="w-4 h-4" /> },
  { id: "goliblar",  label: "G'oliblar Zali",icon: <Medal className="w-4 h-4" /> },
  { id: "zakovat",   label: "Zakovat",       icon: <Swords className="w-4 h-4" /> },
  { id: "stats",     label: "Statistika",    icon: <BarChart3 className="w-4 h-4" />, adminOnly: true },
  { id: "tuman",     label: "Tuman Reytingi",icon: <School className="w-4 h-4" /> },
  { id: "elon",      label: "E'lon boshqaruv", icon: <Megaphone className="w-4 h-4" />, adminOnly: true },
];

export default function OlimpiyadaPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("tanlovlar");
  const isAdmin = user?.role === "admin" || user?.role === "mudir";

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Olimpiada.Uz</h1>
          <p className="text-muted-foreground text-sm">2026–2027 o'quv yili · Toshloq tumani</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 flex-wrap p-1 bg-muted/40 rounded-xl border">
        {visibleTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-white dark:bg-card shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {tab === "tanlovlar" && <EventsTab />}
      {tab === "goliblar"  && <GoliblarTab />}
      {tab === "zakovat"   && <ZakovatTab />}
      {tab === "stats"     && isAdmin && <StatsTab />}
      {tab === "tuman"     && <TumanReyting />}
      {tab === "elon"      && isAdmin && <ElonTab />}
    </div>
  );
}

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Play, Sparkles, GraduationCap, Grid } from "lucide-react";

const GRADE_CATEGORIES = [
  {
    id: "5-7",
    title: "5–7-sinflar",
    subtitle: "Boshlang'ich mantiq, topishmoqlar va qiziqarli darsliklar",
    icon: "🌱",
    color: "from-emerald-600 to-teal-800",
    borderColor: "border-emerald-500/30",
    badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  {
    id: "8-9",
    title: "8–9-sinflar",
    subtitle: "Fanlararo chuqurlashtirilgan interaktiv savollar",
    icon: "🚀",
    color: "from-blue-600 to-indigo-800",
    borderColor: "border-blue-500/30",
    badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  {
    id: "10-11",
    title: "10–11-sinflar",
    subtitle: "Murakkab mantiq va ilmiy-amaliy testlar",
    icon: "🎓",
    color: "from-violet-600 to-purple-900",
    borderColor: "border-violet-500/30",
    badgeColor: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  },
];

export default function ZukkoIndex() {
  const [, setLocation] = useLocation();
  const [selectedGrade, setSelectedGrade] = useState("5-7");
  const [viewMode, setViewMode] = useState<"menu" | "levels">("menu");

  const activeCat = GRADE_CATEGORIES.find((c) => c.id === selectedGrade)!;

  return (
    <div className="space-y-6 max-w-2xl pb-8">
      
      {/* Tepadagi Boshqaruv Paneli */}
      <div className="flex items-center justify-between">
        <Link href="/games">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/80 hover:bg-secondary text-xs font-bold transition-all cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            <span>O'yinlarga qaytish</span>
          </button>
        </Link>

        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-amber-400 text-xs font-extrabold">
          <Sparkles className="w-3.5 h-3.5 fill-amber-400" />
          <span>Zukko Intellect</span>
        </div>
      </div>

      {/* 1. SINF TOIFALARINI TANLASH */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">Sinf toifasini tanlang</p>
        
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {GRADE_CATEGORIES.map((cat) => {
            const isActive = selectedGrade === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedGrade(cat.id)}
                className={`relative flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isActive
                    ? `bg-gradient-to-b ${cat.color} border-white/40 shadow-lg text-white scale-[1.02]`
                    : "bg-card/60 hover:bg-card border-border/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-2xl mb-1">{cat.icon}</span>
                <span className="font-black text-xs sm:text-sm tracking-tight">{cat.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. TANLANGAN SINF BANNERI VA TUGMALAR */}
      <div className={`p-5 rounded-3xl border ${activeCat.borderColor} bg-gradient-to-br from-slate-900/90 via-card to-card shadow-xl space-y-5`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-2xl shadow-inner">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg text-white">{activeCat.title}</h2>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${activeCat.badgeColor}`}>
                  Maktab dasturi
                </span>
              </div>
              <p className="text-xs text-slate-300/80 mt-0.5 max-w-sm">{activeCat.subtitle}</p>
            </div>
          </div>
        </div>

        {/* ASOSIY 2 TA TUGMA: PLAY VA BOSQICHLAR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40">
          
          {/* PLAY TUGMASI (To'g'ridan-to'g'ri o'yinga kirish) */}
          <button
            onClick={() => setLocation(`/games/zukko/play?grade=${selectedGrade}&level=1`)}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-sm shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <span>O'YINNI BOSHLASH</span>
            <Play className="w-4 h-4 fill-white" />
          </button>

          {/* BOSQICHLAR TUGMASI */}
          <button
            onClick={() => setViewMode(viewMode === "levels" ? "menu" : "levels")}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-sm border border-border/60 transition-all cursor-pointer"
          >
            <Grid className="w-4 h-4 text-primary" />
            <span>{viewMode === "levels" ? "Yopish" : "Bosqichlarni ko'rish"}</span>
          </button>

        </div>
      </div>

      {/* 3. AGAR "BOSQICHLAR" BOSILSA: 1..15 BOSQICHLAR GRIDI OCHILADI */}
      {viewMode === "levels" && (
        <div className="space-y-3 pt-2">
          <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
            {activeCat.title} — Bosqichlar
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLocation(`/games/zukko/play?grade=${selectedGrade}&level=${lvl}`)}
                className="p-3 rounded-2xl border border-sky-500/20 bg-card/60 hover:bg-sky-500/10 hover:border-sky-500/40 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 group"
              >
                <span className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 font-extrabold text-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                  {lvl}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground">
                  {lvl}-Bosqich
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

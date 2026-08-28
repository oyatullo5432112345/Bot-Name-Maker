import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Play, Sparkles, GraduationCap, Grid, Star, Lock } from "lucide-react";
import { ZUKKO_QUESTIONS } from "./zukkoData";

const GRADE_CATEGORIES = [
  { id: "5-7", title: "5–7-sinflar", icon: "🌱", color: "from-emerald-600 to-teal-800" },
  { id: "8-9", title: "8–9-sinflar", icon: "🚀", color: "from-blue-600 to-indigo-800" },
  { id: "10-11", title: "10–11-sinflar", icon: "🎓", color: "from-violet-600 to-purple-900" },
];

export default function ZukkoIndex() {
  const [, setLocation] = useLocation();
  const [selectedGrade, setSelectedGrade] = useState("5-7");
  const [viewMode, setViewMode] = useState<"menu" | "levels">("menu");
  
  // LocalStorage dan saqlangan natijalarni olish
  const [userProgress, setUserProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    const saved = localStorage.getItem("zukko_progress");
    if (saved) {
      setUserProgress(JSON.parse(saved));
    }
  }, []);

  const levelsList = ZUKKO_QUESTIONS[selectedGrade] || [];

  return (
    <div className="space-y-6 max-w-2xl pb-8">
      <div className="flex items-center justify-between">
        <Link href="/games">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary text-xs font-bold transition-all cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            <span>O'yinlarga qaytish</span>
          </button>
        </Link>
        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-amber-400 text-xs font-extrabold">
          <Sparkles className="w-3.5 h-3.5 fill-amber-400" />
          <span>Zukko Intellect</span>
        </div>
      </div>

      {/* Sinfni tanlash */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-muted-foreground/70 uppercase">Sinf toifasini tanlang</p>
        <div className="grid grid-cols-3 gap-2">
          {GRADE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedGrade(cat.id)}
              className={`p-3.5 rounded-2xl border flex flex-col items-center cursor-pointer transition-all ${
                selectedGrade === cat.id
                  ? `bg-gradient-to-b ${cat.color} border-white/40 text-white shadow-lg`
                  : "bg-card hover:bg-secondary border-border/50 text-muted-foreground"
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="font-black text-xs sm:text-sm mt-1">{cat.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tugmalar */}
      <div className="p-5 rounded-3xl border border-border bg-card shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-2xl">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-black text-lg">{selectedGrade}-sinflar uchun bosqichlar</h2>
            <p className="text-xs text-muted-foreground">Har bir bosqichda 5 ta savol bo'ladi.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => setLocation(`/games/zukko/play?grade=${selectedGrade}&level=1`)}
            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black text-sm cursor-pointer shadow-md active:scale-95 transition-all"
          >
            <span>O'YINNI BOSHLASH</span>
            <Play className="w-4 h-4 fill-white" />
          </button>
          <button
            onClick={() => setViewMode(viewMode === "levels" ? "menu" : "levels")}
            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-secondary font-bold text-sm border border-border/60 cursor-pointer"
          >
            <Grid className="w-4 h-4 text-primary" />
            <span>{viewMode === "levels" ? "Yopish" : "Bosqichlar kartasini ko'rish"}</span>
          </button>
        </div>
      </div>

      {/* Bosqichlar va Yulduzchalar Gridi */}
      {viewMode === "levels" && (
        <div className="space-y-3 pt-2">
          <p className="text-[11px] font-bold text-muted-foreground/70 uppercase">Bosqichlar ro'yxati</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {levelsList.map((lvlItem) => {
              const lvlNum = lvlItem.level;
              const key = `${selectedGrade}_lvl_${lvlNum}`;
              const stars = userProgress[key] || 0; // 0, 2 yoki 3 yulduz

              // Oldingi bosqich o'tilgan bo'lsa yoki 1-bosqich bo'lsa ochiq
              const prevKey = `${selectedGrade}_lvl_${lvlNum - 1}`;
              const isUnlocked = lvlNum === 1 || (userProgress[prevKey] && userProgress[prevKey] >= 2);

              return isUnlocked ? (
                <button
                  key={lvlNum}
                  onClick={() => setLocation(`/games/zukko/play?grade=${selectedGrade}&level=${lvlNum}`)}
                  className="p-3.5 rounded-2xl border border-sky-500/30 bg-card hover:bg-sky-500/10 text-center transition-all cursor-pointer flex flex-col items-center justify-between h-28"
                >
                  <span className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 font-black text-xs flex items-center justify-center">
                    {lvlNum}
                  </span>
                  <span className="text-[10px] font-extrabold text-foreground">{lvlNum}-Bosqich</span>
                  
                  {/* Yulduzchalar */}
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= stars ? "fill-amber-400 text-amber-400" : "text-muted/30"
                        }`}
                      />
                    ))}
                  </div>
                </button>
              ) : (
                <div key={lvlNum} className="p-3.5 rounded-2xl border border-border/40 bg-card/30 text-center opacity-50 flex flex-col items-center justify-center h-28 cursor-not-allowed">
                  <Lock className="w-5 h-5 text-muted-foreground mb-1" />
                  <span className="text-[10px] font-bold text-muted-foreground">{lvlNum}-Bosqich</span>
                  <span className="text-[9px] text-rose-400/80 mt-1">Yopiq</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

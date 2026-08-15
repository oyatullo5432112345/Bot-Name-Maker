import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ClipboardCheck, Gamepad2, Library, ArrowRight, LogIn, UserPlus,
  TrendingUp, Trophy, Sparkles,
} from "lucide-react";

const SLIDES = [
  {
    icon: ClipboardCheck,
    gradient: "from-blue-500 to-indigo-600",
    title: "Chorak Monitoring",
    desc: "Har bir sinf, har bir fan bo'yicha testlar — natijalar, reyting va tahlil bir joyda",
  },
  {
    icon: Gamepad2,
    gradient: "from-pink-500 to-rose-600",
    title: "Guruh o'yinlari",
    desc: "Bilim Arenasi va G'ildirak — sinf bilan birga o'ynab, bilim va zavqni birlashtiring",
  },
  {
    icon: Library,
    gradient: "from-emerald-500 to-teal-600",
    title: "Baholar, Kutubxona, Davomat",
    desc: "O'quvchi, o'qituvchi va ota-onalar uchun barcha ma'lumotlar — bir platformada",
  },
];

export default function Welcome() {
  const [slide, setSlide] = useState(0);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 3500);
    return () => clearInterval(id);
  }, []);

  if (entered) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-secondary/40 via-background to-primary/5 animate-in fade-in duration-300">
        <div className="w-full max-w-sm space-y-3">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="Ta'lim Platform" className="h-14 w-auto object-contain" />
          </div>
          <Link href="/login">
            <button className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all">
              <LogIn className="w-5 h-5" /> Kirish
            </button>
          </Link>
          <Link href="/register">
            <button className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-primary/30 text-primary font-bold text-lg hover:bg-primary/5 hover:-translate-y-0.5 transition-all">
              <UserPlus className="w-5 h-5" /> Ro'yxatdan o'tish
            </button>
          </Link>
          <button onClick={() => setEntered(false)} className="w-full text-center text-sm text-muted-foreground pt-2">
            ← Orqaga
          </button>
        </div>
      </div>
    );
  }

  const Active = SLIDES[slide]!;
  const Icon = Active.icon;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-purple-500/5 relative overflow-hidden">
      {/* Fon bezaklari */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-32 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl" />

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
        <div className="flex items-center gap-1.5 mb-6 animate-in fade-in duration-500">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-muted-foreground tracking-wide uppercase">Toshloq tumani 3-maktab</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <span className="text-foreground">Ta'lim</span> <span className="text-primary">Platform</span>iga
          <br />xush kelibsiz!
        </h1>
        <p className="text-muted-foreground max-w-sm mb-10 animate-in fade-in duration-700">
          O'quvchi, o'qituvchi va ota-onalar uchun — hammasi bitta joyda
        </p>

        {/* Karusel */}
        <div className="w-full max-w-sm">
          <div
            key={slide}
            className="rounded-3xl border bg-card/80 backdrop-blur p-8 shadow-xl animate-in fade-in zoom-in-95 duration-500"
          >
            <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${Active.gradient} flex items-center justify-center mb-4 shadow-lg`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-lg mb-1.5">{Active.title}</h3>
            <p className="text-sm text-muted-foreground">{Active.desc}</p>
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === slide ? "w-6 bg-primary" : "w-1.5 bg-muted"}`}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => setEntered(true)}
          className="mt-10 flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-xl transition-all animate-in fade-in duration-1000"
        >
          Davom etish <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="relative flex items-center justify-center gap-6 pb-8 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Monitoring</span>
        <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> Reyting</span>
        <span className="flex items-center gap-1"><Gamepad2 className="w-3.5 h-3.5" /> O'yinlar</span>
      </div>
    </div>
  );
}

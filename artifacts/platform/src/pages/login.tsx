import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";
import {
  Loader2, ArrowLeft, GraduationCap, Users, KeyRound, Eye, EyeOff,
  RefreshCw, LogIn, ShieldCheck, ChevronRight, School as SchoolIcon, Sparkles, MessageCircleQuestion
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

type Screen =
  | "choice"
  | "student-school"
  | "student-class"
  | "student-name"
  | "student-code"
  | "staff-id";

interface School { id: number; nom: string; }
interface Student { login: string; full_name: string; }

const GLOBAL_CSS = `
  @keyframes tt-fade-up {
    0% { opacity: 0; transform: translateY(16px) scale(0.98); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes tt-shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }
  @keyframes tt-pulse-glow {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.08); }
  }
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 8px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: authLogin } = useAuth();

  const [screen, setScreen] = useState<Screen>("choice");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [className, setClassName] = useState("");
  const [student, setStudent] = useState<Student | null>(null);

  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [staffId, setStaffId] = useState("");

  // ── Maktablarni yuklash ──
  const loadSchools = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/maktablar/public`);
      if (r.ok) setSchools(await r.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  // ── Sinflarni yuklash ──
  const loadClasses = async (s: School) => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/classes/public?maktab_id=${s.id}`);
      if (r.ok) {
        const data = await r.json() as { class_name: string }[];
        setClasses(data.map(c => c.class_name));
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  // ── O'quvchilarni yuklash ──
  const loadStudents = async (s: School, cn: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/students/public?maktab_id=${s.id}&class_name=${encodeURIComponent(cn)}`);
      if (r.ok) setStudents(await r.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  // ── O'quvchi tanlandi → kod so'rash va kod ekraniga o'tish ──
  const handleSelectStudent = async (st: Student) => {
    if (!school || !className) return;
    setStudent(st);
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API_BASE}/auth/student/request-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_login: st.login,
          class_name: className,
          maktab_id: school.id,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Xatolik yuz berdi");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }
      setScreen("student-code");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // ── O'quvchi kodni kiritdi → kirish ──
  const handleVerifyCode = async () => {
    if (!student || code.length !== 4) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API_BASE}/auth/student/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_login: student.login, code }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Kiritilgan kod noto'g'ri");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }
      localStorage.setItem("talim_auth_token", d.token);
      authLogin(d);
      setLocation("/dashboard");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // ── O'qituvchi 5 xonali ID kiritdi → kirish ──
  const handleStaffLogin = async () => {
    if (staffId.length !== 5) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API_BASE}/auth/staff/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_id: staffId }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Bunday ID topilmadi");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }
      localStorage.setItem("talim_auth_token", d.token);
      authLogin(d);
      setLocation("/dashboard");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter") fn();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[#070b14]">
      <style>{GLOBAL_CSS}</style>

      {/* Orqa fon nur effekti (Atmosphere Glows) */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-600/30 via-purple-600/20 to-pink-500/10 rounded-full blur-[120px] pointer-events-none"
        style={{ animation: "tt-pulse-glow 8s infinite ease-in-out" }}
      />
      <div 
        className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none"
      />
      <div 
        className="absolute top-10 right-10 w-[350px] h-[350px] bg-fuchsia-500/15 rounded-full blur-[100px] pointer-events-none"
      />

      {/* Asosiy konteyner */}
      <div className="relative z-10 w-full max-w-md">
        
        {/* Card konteyneri */}
        <div 
          className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/50 transition-all duration-300"
          style={{ animation: "tt-fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        >

          {/* EKRAN 1: Tanlash */}
          {screen === "choice" && (
            <div className="w-full flex flex-col items-center">

              {/* Sarlavha va Brending */}
              <div className="text-center mb-6 w-full">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
                  <Sparkles className="w-3.5 h-3.5" /> Rasmiy Ta'lim Tizimi
                </div>
                <h1
                  className="text-4xl sm:text-5xl font-black tracking-tight"
                  style={{
                    background: "linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  TA'LIM PLATFORM
                </h1>
                <p className="text-cyan-400 text-lg sm:text-xl font-bold tracking-wide mt-1 drop-shadow-sm">
                  Toshloq tumani
                </p>
              </div>

              {/* Ishora paneli */}
              <div className="w-full mb-6">
                <div className="relative rounded-xl border border-white/10 bg-white/[0.03] py-2.5 px-4 text-center overflow-hidden">
                  <p className="text-slate-300 text-xs font-medium tracking-wide flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    Tizimga kirish uchun toifangizni tanlang
                  </p>
                </div>
              </div>

              {/* Asosiy Tugmalar */}
              <div className="w-full space-y-3.5">
                <button
                  onClick={() => { setScreen("student-school"); loadSchools(); }}
                  className="group relative w-full py-4 px-6 rounded-2xl text-white font-bold text-base sm:text-lg flex items-center justify-between transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-pink-500/25 overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #8b5cf6 100%)",
                  }}
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="flex items-center gap-3.5 relative z-10">
                    <div className="p-2 rounded-xl bg-white/15 backdrop-blur-md">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    O'quvchi
                  </span>
                  <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform relative z-10" />
                </button>

                <button
                  onClick={() => setScreen("staff-id")}
                  className="group relative w-full py-4 px-6 rounded-2xl text-white font-bold text-base sm:text-lg flex items-center justify-between transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/25 overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)",
                  }}
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="flex items-center gap-3.5 relative z-10">
                    <div className="p-2 rounded-xl bg-white/15 backdrop-blur-md">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    O'qituvchi / Xodim
                  </span>
                  <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform relative z-10" />
                </button>
              </div>

              {/* Hamkorlar va Logo bo'limi */}
              <div className="mt-8 pt-6 border-t border-white/10 w-full flex flex-col items-center">
                <div className="flex flex-row items-center justify-center gap-3 w-full">
                  <div className="p-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <img
                      src="/tuman-logo.jpg"
                      alt="Toshloq tumani MMTB"
                      className="w-24 sm:w-28 h-12 object-cover rounded-lg"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                  <div className="p-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <img
                      src="/kelajak-logo.jpg"
                      alt="Kelajak markazi"
                      className="w-24 sm:w-28 h-12 object-cover rounded-lg"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                </div>

                <p className="mt-4 text-amber-400/90 text-[11px] leading-relaxed font-semibold tracking-wide text-center uppercase">
                  Toshloq tumani Maktabgacha va maktab ta'limi bo'limi<br />
                  <span className="text-slate-400 font-normal">va</span> "Kelajak" markazi hamkorligida
                </p>
              </div>

            </div>
          )}

          {/* EKRAN 2: Maktab tanlash */}
          {screen === "student-school" && (
            <div>
              <button
                onClick={() => { setScreen("choice"); setError(""); }}
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white mb-4 text-xs font-semibold uppercase tracking-wider transition"
              >
                <ArrowLeft className="w-4 h-4" /> Orqaga
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <SchoolIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-white text-xl font-bold">Maktabingizni tanlang</h2>
                  <p className="text-slate-400 text-xs">Ro'yxatdan o'zingiz o'qiydigan maktabni toping</p>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                  <span className="text-xs">Maktablar ro'yxati yuklanmoqda...</span>
                </div>
              ) : schools.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm bg-white/[0.02] rounded-2xl border border-white/5">
                  Maktablar topilmadi
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                  {schools.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSchool(s); setScreen("student-class"); loadClasses(s); }}
                      className="group w-full p-3.5 rounded-xl text-slate-200 text-left font-medium active:scale-[0.99] transition bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-indigo-500/30 flex items-center justify-between"
                    >
                      <span className="text-sm font-semibold group-hover:text-white">{s.nom}</span>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EKRAN 3: Sinf tanlash */}
          {screen === "student-class" && (
            <div>
              <button
                onClick={() => { setScreen("student-school"); setError(""); }}
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white mb-4 text-xs font-semibold uppercase tracking-wider transition"
              >
                <ArrowLeft className="w-4 h-4" /> Orqaga
              </button>
              
              <div className="mb-4">
                <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
                  {school?.nom}
                </span>
                <h2 className="text-white text-xl font-bold mt-1.5">Sinfingizni tanlang</h2>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                  <span className="text-xs">Sinflar yuklanmoqda...</span>
                </div>
              ) : classes.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm bg-white/[0.02] rounded-2xl border border-white/5">
                  Sinflar topilmadi
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                  {classes.map(c => (
                    <button
                      key={c}
                      onClick={() => { setClassName(c); setScreen("student-name"); loadStudents(school!, c); }}
                      className="p-3.5 rounded-xl text-white font-bold text-center active:scale-95 transition bg-white/[0.04] hover:bg-indigo-600/30 border border-white/10 hover:border-indigo-500/50"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EKRAN 4: O'zini tanlash */}
          {screen === "student-name" && (
            <div>
              <button
                onClick={() => { setScreen("student-class"); setError(""); }}
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white mb-4 text-xs font-semibold uppercase tracking-wider transition"
              >
                <ArrowLeft className="w-4 h-4" /> Orqaga
              </button>
              
              <div className="mb-4">
                <div className="flex items-center gap-2 text-xs text-indigo-300 font-semibold mb-1">
                  <span>{school?.nom}</span> • <span>{className} sinf</span>
                </div>
                <h2 className="text-white text-xl font-bold">Ismingizni tanlang</h2>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                  <span className="text-xs">O'quvchilar ro'yxati yuklanmoqda...</span>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm bg-white/[0.02] rounded-2xl border border-white/5">
                  O'quvchilar topilmadi
                </div>
              ) : (
                <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1 custom-scrollbar">
                  {students.map(st => (
                    <button
                      key={st.login}
                      onClick={() => handleSelectStudent(st)}
                      disabled={loading}
                      className="group w-full p-3.5 rounded-xl text-slate-200 text-left font-medium active:scale-[0.99] transition bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-pink-500/30 flex items-center justify-between disabled:opacity-50"
                    >
                      <span className="text-sm font-semibold group-hover:text-white">{st.full_name}</span>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              )}

              {error && (
                <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* EKRAN 5: Kod kiritish */}
          {screen === "student-code" && (
            <div className="text-center">
              <div className="flex justify-start">
                <button
                  onClick={() => { setScreen("student-name"); setCode(""); setError(""); }}
                  className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white mb-4 text-xs font-semibold uppercase tracking-wider transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Orqaga
                </button>
              </div>

              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-white text-2xl font-bold mb-1">Kodni kiriting</h2>
              <p className="text-slate-400 text-xs mb-5">Telegram guruhga yuborilgan tasdiqlash kodini kiriting</p>

              {/* Telegram Info Box */}
              <div className="rounded-2xl p-4 mb-6 text-left bg-indigo-950/40 border border-indigo-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 text-indigo-400">
                  <MessageCircleQuestion className="w-16 h-16" />
                </div>
                <p className="text-indigo-200 text-xs font-bold mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" /> Kodni qayerdan olasiz?
                </p>
                <p className="text-slate-300 text-xs leading-relaxed">
                  <b className="text-white">{className}</b> sinfining Telegram guruhiga bot tomonidan <b className="text-cyan-400">4 xonali kod</b> yuborildi.
                </p>
                <div className="mt-2 text-[11px] text-slate-400 font-medium">
                  ⏱ Kod amal qilish muddati: <span className="text-amber-400">5 daqiqa</span>
                </div>
              </div>

              {/* Code Input */}
              <div className="relative" style={{ animation: shake ? "tt-shake 0.3s ease-in-out" : "none" }}>
                <input
                  type={showCode ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={4}
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
                  onKeyDown={onKeyDown(handleVerifyCode)}
                  placeholder="••••"
                  autoFocus
                  className="w-full py-4 px-6 text-center text-3xl sm:text-4xl font-black tracking-[0.5em] rounded-2xl text-white bg-white/[0.04] outline-none transition-all duration-200 focus:bg-white/[0.08]"
                  style={{
                    border: error ? "2px solid rgba(239, 68, 68, 0.6)" : "2px solid rgba(255, 255, 255, 0.12)",
                    boxShadow: error ? "0 0 20px rgba(239, 68, 68, 0.2)" : "none"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1"
                >
                  {showCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {error && (
                <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                  {error}
                </div>
              )}

              <button
                onClick={handleVerifyCode}
                disabled={code.length !== 4 || loading}
                className="w-full mt-5 py-4 rounded-2xl text-white font-bold text-base disabled:opacity-40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
                style={{ background: "linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)" }}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                Tizimga kirish
              </button>

              <button
                onClick={() => { setCode(""); setError(""); setScreen("student-name"); }}
                className="mt-4 text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1.5 justify-center mx-auto transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Qaytadan tanlash
              </button>
            </div>
          )}

          {/* EKRAN 6: O'qituvchi — 5 xonali ID */}
          {screen === "staff-id" && (
            <div className="text-center">
              <div className="flex justify-start">
                <button
                  onClick={() => { setScreen("choice"); setError(""); setStaffId(""); }}
                  className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white mb-4 text-xs font-semibold uppercase tracking-wider transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Orqaga
                </button>
              </div>

              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-3">
                <Users className="w-7 h-7" />
              </div>
              <h2 className="text-white text-2xl font-bold mb-1">O'qituvchi / Xodim</h2>
              <p className="text-slate-400 text-xs mb-6">Shaxsiy 5 xonali ID raqamingizni kiriting</p>

              <div style={{ animation: shake ? "tt-shake 0.3s ease-in-out" : "none" }}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={staffId}
                  onChange={(e) => { setStaffId(e.target.value.replace(/\D/g, "")); setError(""); }}
                  onKeyDown={onKeyDown(handleStaffLogin)}
                  placeholder="•••••"
                  autoFocus
                  className="w-full py-4 px-6 text-center text-3xl sm:text-4xl font-black tracking-[0.4em] rounded-2xl text-white bg-white/[0.04] outline-none transition-all duration-200 focus:bg-white/[0.08]"
                  style={{
                    border: error ? "2px solid rgba(239, 68, 68, 0.6)" : "2px solid rgba(255, 255, 255, 0.12)",
                    boxShadow: error ? "0 0 20px rgba(239, 68, 68, 0.2)" : "none"
                  }}
                />
              </div>

              {error && (
                <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                  {error}
                </div>
              )}

              <button
                onClick={handleStaffLogin}
                disabled={staffId.length !== 5 || loading}
                className="w-full mt-5 py-4 rounded-2xl text-white font-bold text-base disabled:opacity-40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30"
                style={{ background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)" }}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                Tizimga kirish
              </button>

              <div className="mt-6 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-slate-400 text-xs flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>ID raqamingiz yo'q bo'lsa, maktab ma'muriyatiga murojaat qiling</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

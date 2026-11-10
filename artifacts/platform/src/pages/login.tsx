import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";
import {
  Loader2, ArrowLeft, GraduationCap, Users, KeyRound, Eye, EyeOff,
  RefreshCw, ShieldCheck, LogIn,
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
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes tt-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  @keyframes tt-shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
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
      if (r.ok) {
        const data = await r.json();
        setSchools(data);
      }
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

  // ── O'quvchi tanlandi → 4 xonali kod yaratish va kod ekraniga o'tish ──
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
        setError(d.error || "Xatolik");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }
      // Kod guruhga yuborildi → to'g'ridan-to'g'ri kod kiritish ekraniga o'tamiz
      setScreen("student-code");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // ── O'quvchi 4 xonali kodni kiritdi → kirish ──
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
        setError(d.error || "Kod noto'g'ri");
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
    <div
      className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden"
      style={{ background: "linear-gradient(145deg, #0a1628 0%, #111f3d 50%, #0d1b2a 100%)" }}
    >
      <style>{GLOBAL_CSS}</style>

      {/* Fon halqalari */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: "absolute", borderRadius: "50%", pointerEvents: "none",
          background: `rgba(99,102,241,${0.06 - i * 0.015})`,
          width: `${300 + i * 200}px`, height: `${300 + i * 200}px`,
          top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        }} />
      ))}

      <div className="relative z-10 w-full max-w-md" style={{ animation: "tt-fade-up 0.5s ease both" }}>

        {/* ═══ EKRAN 1: Tanlash ═══ */}
        {screen === "choice" && (
          <div className="space-y-5 text-center">
            <div style={{ fontSize: 72, marginBottom: 8, animation: "tt-float 3.5s ease-in-out infinite" }}>🏫</div>
            <h1 className="text-white text-3xl font-black tracking-tight">Toshloq tumani</h1>
            <p className="text-white/40 text-sm mb-8">Platformaga kirish</p>

            {/* Tugmalar */}
            <div className="w-full space-y-4 px-2 mt-6">

              {/* O'quvchi (Pushti-sariq gradient va yaltiroq ramka) */}
              <button
                onClick={() => { setScreen("student-school"); loadSchools(); }}
                className="w-full py-4 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-pink-500/30"
                style={{
                  background: "linear-gradient(135deg, #ff0080 0%, #ff8c00 100%)",
                  border: "2px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <GraduationCap className="w-6 h-6" /> O'quvchi
              </button>

              {/* O'qituvchi (Binafsha-ko'k gradient va yaltiroq ramka) */}
              <button
                onClick={() => setScreen("staff-id")}
                className="w-full py-4 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-purple-500/30"
                style={{
                  background: "linear-gradient(135deg, #8a2be2 0%, #00ffff 100%)",
                  border: "2px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <Users className="w-6 h-6" /> O'qituvchi / Xodim
              </button>
            </div>

            {/* Pastki qism: bo'lim va Kelajak logotiplari (yonma-yon) */}
            <div className="pt-8 flex flex-row flex-wrap items-center justify-center gap-3">
              <img
                src="/tuman-logo.jpg"
                alt="Toshloq tumani maktabgacha va maktab ta'limi bo'limi"
                className="w-[46%] max-w-[200px] h-auto rounded-2xl shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <img
                src="/kelajak-logo.jpg"
                alt="Kelajak - Toshloq tumani"
                className="w-[46%] max-w-[200px] h-auto rounded-2xl shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          </div>
        )}

        {/* ═══ EKRAN 2: Maktab tanlash ═══ */}
        {screen === "student-school" && (
          <div>
            <button
              onClick={() => { setScreen("choice"); setError(""); }}
              className="text-white/60 mb-5 flex items-center gap-2 text-sm active:scale-95 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Orqaga
            </button>
            <h2 className="text-white text-2xl font-black mb-1">Maktabingizni tanlang</h2>
            <p className="text-white/40 text-sm mb-5">Ro'yxatdan maktabingizni toping</p>

            {loading ? (
              <div className="text-center py-10"><Loader2 className="w-7 h-7 animate-spin text-indigo-400 mx-auto" /></div>
            ) : schools.length === 0 ? (
              <div className="text-center py-10 text-white/50">Maktablar topilmadi</div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {schools.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSchool(s); setScreen("student-class"); loadClasses(s); }}
                    className="w-full p-4 rounded-xl text-white text-left font-bold active:scale-95 transition border border-white/10 flex items-center justify-between"
                    style={{ background: "rgba(255,255,255,0.07)" }}
                  >
                    <span>{s.nom}</span>
                    <span className="text-white/40">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ EKRAN 3: Sinf tanlash ═══ */}
        {screen === "student-class" && (
          <div>
            <button
              onClick={() => { setScreen("student-school"); setError(""); }}
              className="text-white/60 mb-5 flex items-center gap-2 text-sm active:scale-95 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Orqaga
            </button>
            <h2 className="text-white text-2xl font-black mb-1">{school?.nom}</h2>
            <p className="text-white/40 text-sm mb-5">Sinfingizni tanlang</p>

            {loading ? (
              <div className="text-center py-10"><Loader2 className="w-7 h-7 animate-spin text-indigo-400 mx-auto" /></div>
            ) : classes.length === 0 ? (
              <div className="text-center py-10 text-white/50">Sinflar topilmadi</div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto pr-1">
                {classes.map(c => (
                  <button
                    key={c}
                    onClick={() => { setClassName(c); setScreen("student-name"); loadStudents(school!, c); }}
                    className="p-4 rounded-xl text-white font-bold active:scale-95 transition border border-white/10"
                    style={{ background: "rgba(255,255,255,0.07)" }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ EKRAN 4: O'zini tanlash ═══ */}
        {screen === "student-name" && (
          <div>
            <button
              onClick={() => { setScreen("student-class"); setError(""); }}
              className="text-white/60 mb-5 flex items-center gap-2 text-sm active:scale-95 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Orqaga
            </button>
            <h2 className="text-white text-2xl font-black mb-1">{className} sinf</h2>
            <p className="text-white/40 text-sm mb-5">O'zingizni ro'yxatdan toping</p>

            {loading ? (
              <div className="text-center py-10"><Loader2 className="w-7 h-7 animate-spin text-indigo-400 mx-auto" /></div>
            ) : students.length === 0 ? (
              <div className="text-center py-10 text-white/50">O'quvchilar topilmadi</div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {students.map(st => (
                  <button
                    key={st.login}
                    onClick={() => handleSelectStudent(st)}
                    disabled={loading}
                    className="w-full p-4 rounded-xl text-white text-left font-bold active:scale-95 transition border border-white/10 flex items-center justify-between disabled:opacity-50"
                    style={{ background: "rgba(255,255,255,0.07)" }}
                  >
                    <span>{st.full_name}</span>
                    <span className="text-white/40">→</span>
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-red-200 text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ═══ EKRAN 5: Kod kiritish ═══ */}
        {screen === "student-code" && (
          <div className="text-center">
            <button
              onClick={() => { setScreen("student-name"); setCode(""); setError(""); }}
              className="text-white/60 mb-5 flex items-center gap-2 text-sm active:scale-95 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Orqaga
            </button>

            <div style={{ fontSize: 64, marginBottom: 12 }}>🔑</div>
            <h2 className="text-white text-2xl font-black mb-4">Kodni kiriting</h2>

            <div
              className="rounded-xl p-4 mb-6 text-left"
              style={{
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.3)"
              }}
            >
              <p className="text-white/90 text-sm font-semibold mb-2">
                📱 Kodni qayerdan olasiz?
              </p>
              <p className="text-white/70 text-xs leading-relaxed">
                <b className="text-white">{className}</b> sinfining Telegram guruhiga bot tomonidan
                <b className="text-white"> 4 xonali kod</b> yuborildi.
                Telegram'da sinf guruhingizni oching va shu kodni kiriting.
              </p>
              <p className="text-white/50 text-xs mt-2">
                ⏱ Kod 5 daqiqa amal qiladi
              </p>
            </div>

            <div className={`relative ${shake ? "animate-[tt-shake_0.3s_ease-in-out]" : ""}`} style={{ animation: shake ? "tt-shake 0.3s ease-in-out" : "none" }}>
              <input
                type={showCode ? "text" : "password"}
                inputMode="numeric"
                maxLength={4}
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
                onKeyDown={onKeyDown(handleVerifyCode)}
                placeholder="0000"
                autoFocus
                className="w-full p-6 text-center text-5xl font-black tracking-[0.4em] rounded-2xl text-white outline-none transition"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: error ? "2px solid rgba(239,68,68,0.6)" : "2px solid rgba(255,255,255,0.2)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition"
              >
                {showCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <div className="mt-3 p-2 rounded-lg bg-red-500/20 border border-red-400/40 text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleVerifyCode}
              disabled={code.length !== 4 || loading}
              className="w-full mt-5 p-4 rounded-2xl text-white font-black text-lg disabled:opacity-40 active:scale-95 transition flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #06b6d4, #7c3aed)", boxShadow: "0 8px 32px rgba(99,102,241,0.4)" }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
              Kirish
            </button>

            <button
              onClick={() => { setCode(""); setError(""); setScreen("student-name"); }}
              className="mt-4 text-white/40 text-sm flex items-center gap-1.5 justify-center hover:text-white/60 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Qaytadan tanlash
            </button>
          </div>
        )}

        {/* ═══ EKRAN 6: O'qituvchi — 5 xonali ID ═══ */}
        {screen === "staff-id" && (
          <div className="text-center">
            <button
              onClick={() => { setScreen("choice"); setError(""); setStaffId(""); }}
              className="text-white/60 mb-5 flex items-center gap-2 text-sm active:scale-95 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Orqaga
            </button>

            <div style={{ fontSize: 64, marginBottom: 12 }}>👨‍🏫</div>
            <h2 className="text-white text-2xl font-black mb-1">O'qituvchi / Xodim</h2>
            <p className="text-white/40 text-sm mb-6">5 xonali ID raqamingizni kiriting</p>

            <div style={{ animation: shake ? "tt-shake 0.3s ease-in-out" : "none" }}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={staffId}
                onChange={(e) => { setStaffId(e.target.value.replace(/\D/g, "")); setError(""); }}
                onKeyDown={onKeyDown(handleStaffLogin)}
                placeholder="12345"
                autoFocus
                className="w-full p-6 text-center text-5xl font-black tracking-[0.3em] rounded-2xl text-white outline-none transition"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: error ? "2px solid rgba(239,68,68,0.6)" : "2px solid rgba(255,255,255,0.2)",
                }}
              />
            </div>

            {error && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleStaffLogin}
              disabled={staffId.length !== 5 || loading}
              className="w-full mt-5 p-4 rounded-2xl text-white font-black text-lg disabled:opacity-40 active:scale-95 transition flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #06b6d4, #7c3aed)", boxShadow: "0 8px 32px rgba(99,102,241,0.4)" }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              Kirish
            </button>

            <div className="mt-6 p-3 rounded-xl text-white/50 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <ShieldCheck className="w-4 h-4 inline mr-1.5 text-indigo-400" />
              ID yo'qmi? Maktab ma'muriyatiga murojaat qiling
            </div>
          </div>
        )}

      </div>
    </div>
  );
          }

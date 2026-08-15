import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { WelcomeAnimation } from "@/components/welcome-animation";
import { useAuth } from "@/lib/use-auth";
import {
  Loader2, CheckCircle2, Copy, Shield,
  GraduationCap, Crown, Briefcase, Award, BookMarked, Users2, KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// ─── Fan ro'yxati ─────────────────────────────────────────────────────────────
const COMMON_SUBJECTS = [
  "Matematika", "Ona tili", "Adabiyot", "Ingliz tili", "Rus tili",
  "Fizika", "Kimyo", "Biologiya", "Geografiya", "Tarix",
  "Informatika", "Chizmachilik", "Jismoniy tarbiya", "Musiqa",
  "Texnologiya", "Astronomiya", "Mehnat", "Tarbiya soati",
];

// ─── Rol konfiguratsiyasi ─────────────────────────────────────────────────────
type RoleColor = "blue" | "purple" | "indigo" | "emerald" | "amber" | "rose";

interface RoleConfig {
  color: RoleColor;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}

const ROLE_CONFIG: Record<string, RoleConfig> = {
  teacher: {
    color: "blue",
    icon: GraduationCap,
    label: "Fan o'qituvchisi",
    description: "Biror fandan dars beruvchi o'qituvchi",
  },
  director: {
    color: "purple",
    icon: Crown,
    label: "Direktor",
    description: "Maktab boshqaruvi rahbari",
  },
  mudir: {
    color: "purple",
    icon: Shield,
    label: "Obidov Boburjon",
    description: "Mahfiy kod bilan ro'yxatdan o'ting",
  },
  zam_direktor: {
    color: "indigo",
    icon: Briefcase,
    label: "Direktor o'rinbosari",
    description: "Direktorda o'rinbosar",
  },
  zavuch: {
    color: "emerald",
    icon: Award,
    label: "Zavuch",
    description: "O'quv ishlari bo'yicha mudir",
  },
  kutubxonachi: {
    color: "amber",
    icon: BookMarked,
    label: "Kutubxonachi",
    description: "Maktab kutubxonasini boshqaruvchi",
  },
  sinf_rahbari: {
    color: "rose",
    icon: Users2,
    label: "Sinf rahbari",
    description: "Bitta sinfga mas'ul o'qituvchi",
  },
};

const COLOR_CLASSES: Record<RoleColor, {
  bg: string; border: string; hover: string;
  iconColor: string; titleColor: string; descColor: string;
  badgeBg: string; badgeText: string;
  btnBorder: string; btnText: string; btnHover: string;
}> = {
  blue: {
    bg: "bg-blue-50", border: "border-blue-200", hover: "hover:bg-blue-100",
    iconColor: "text-blue-600", titleColor: "text-blue-800", descColor: "text-blue-600",
    badgeBg: "bg-blue-100", badgeText: "text-blue-700",
    btnBorder: "border-blue-300", btnText: "text-blue-700", btnHover: "hover:bg-blue-200",
  },
  purple: {
    bg: "bg-purple-50", border: "border-purple-200", hover: "hover:bg-purple-100",
    iconColor: "text-purple-600", titleColor: "text-purple-800", descColor: "text-purple-600",
    badgeBg: "bg-purple-100", badgeText: "text-purple-700",
    btnBorder: "border-purple-300", btnText: "text-purple-700", btnHover: "hover:bg-purple-200",
  },
  indigo: {
    bg: "bg-indigo-50", border: "border-indigo-200", hover: "hover:bg-indigo-100",
    iconColor: "text-indigo-600", titleColor: "text-indigo-800", descColor: "text-indigo-600",
    badgeBg: "bg-indigo-100", badgeText: "text-indigo-700",
    btnBorder: "border-indigo-300", btnText: "text-indigo-700", btnHover: "hover:bg-indigo-200",
  },
  emerald: {
    bg: "bg-emerald-50", border: "border-emerald-200", hover: "hover:bg-emerald-100",
    iconColor: "text-emerald-600", titleColor: "text-emerald-800", descColor: "text-emerald-600",
    badgeBg: "bg-emerald-100", badgeText: "text-emerald-700",
    btnBorder: "border-emerald-300", btnText: "text-emerald-700", btnHover: "hover:bg-emerald-200",
  },
  amber: {
    bg: "bg-amber-50", border: "border-amber-200", hover: "hover:bg-amber-100",
    iconColor: "text-amber-600", titleColor: "text-amber-800", descColor: "text-amber-600",
    badgeBg: "bg-amber-100", badgeText: "text-amber-700",
    btnBorder: "border-amber-300", btnText: "text-amber-700", btnHover: "hover:bg-amber-200",
  },
  rose: {
    bg: "bg-rose-50", border: "border-rose-200", hover: "hover:bg-rose-100",
    iconColor: "text-rose-600", titleColor: "text-rose-800", descColor: "text-rose-600",
    badgeBg: "bg-rose-100", badgeText: "text-rose-700",
    btnBorder: "border-rose-300", btnText: "text-rose-700", btnHover: "hover:bg-rose-200",
  },
};

// ─── Yordamchi funksiyalar ────────────────────────────────────────────────────
function getGrade(className: string): number {
  const match = className.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 99;
}

function getSuffix(className: string): string {
  return className.replace(/^\d+/, "").trim().toLowerCase();
}

function copyToClipboardFn(text: string, toast: ReturnType<typeof useToast>["toast"]) {
  navigator.clipboard.writeText(text);
  toast({ title: "Nusxalandi!", description: text });
}

// ─── Konfetti animatsiyasi ─────────────────────────────────────────────────────
const CONFETTI_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#ec4899","#f97316","#8b5cf6"];

function ConfettiPiece({ index }: { index: number }) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const left = `${5 + (index * 9.3) % 90}%`;
  const delay = `${(index * 0.13) % 1.5}s`;
  const size = 6 + (index % 5) * 2;
  const rotate = (index * 37) % 360;
  const shape = index % 3 === 0 ? "50%" : index % 3 === 1 ? "2px" : "0%";
  return (
    <span
      style={{
        position: "absolute",
        left,
        top: "-16px",
        width: size,
        height: size,
        background: color,
        borderRadius: shape,
        transform: `rotate(${rotate}deg)`,
        animation: `confettiFall 1.8s ease-in ${delay} forwards`,
        opacity: 0,
      }}
    />
  );
}

function ConfettiOverlay() {
  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(340px) rotate(720deg); opacity: 0; }
        }
        @keyframes popIn {
          0%   { transform: scale(0.4) rotate(-10deg); opacity: 0; }
          60%  { transform: scale(1.15) rotate(4deg); opacity: 1; }
          80%  { transform: scale(0.95) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 50 }}>
        {Array.from({ length: 32 }, (_, i) => <ConfettiPiece key={i} index={i} />)}
      </div>
    </>
  );
}

// ─── Credentials ko'rinish ────────────────────────────────────────────────────
function CredentialsView({
  credentials,
  subjects,
  onClose,
  onDashboard,
  authToken,
  onCredentialsChange,
}: {
  credentials: { login: string; password: string };
  subjects?: string[];
  onClose?: () => void;
  onDashboard?: () => void;
  authToken?: string;
  onCredentialsChange?: (next: { login: string; password: string }) => void;
}) {
  const { toast } = useToast();
  const [showConfetti, setShowConfetti] = useState(true);
  const [editing, setEditing] = useState<"login" | "password" | null>(null);
  const [loginDraft, setLoginDraft] = useState(credentials.login);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 2200);
    return () => clearTimeout(t);
  }, []);

  const saveEdit = async () => {
    if (!authToken) return;
    const body: { login?: string; password?: string } = {};
    if (editing === "login") {
      if (!loginDraft.trim() || loginDraft.trim() === credentials.login) { setEditing(null); return; }
      body.login = loginDraft.trim();
    } else {
      if (!passwordDraft.trim()) { setEditing(null); return; }
      body.password = passwordDraft.trim();
    }
    setSaving(true);
    try {
      const r = await fetch("/api/auth/update-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(body),
      });
      const json = await r.json();
      if (!r.ok) { toast({ variant: "destructive", title: "Xatolik", description: json.error }); return; }
      onCredentialsChange?.({
        login: body.login ?? credentials.login,
        password: body.password ?? credentials.password,
      });
      toast({ title: "Yangilandi" });
      setEditing(null);
      setPasswordDraft("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4" style={{ position: "relative" }}>
      {showConfetti && <ConfettiOverlay />}
      <div className="text-center" style={{ animation: "popIn 0.6s ease-out forwards" }}>
        <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 8, animation: "shimmer 1s ease-in-out 2" }}>🎉</div>
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
        <p className="text-xl font-bold text-green-700">Tabriklaymiz!</p>
        <p className="text-sm text-muted-foreground mt-1">Akkauntingiz muvaffaqiyatli yaratildi 🥳</p>
        <p className="text-xs text-muted-foreground">Quyidagi ma'lumotlarni saqlang</p>
      </div>
      <div className="space-y-2">
        <div className="rounded-lg border bg-secondary/50 p-3">
          {editing === "login" ? (
            <div className="flex items-center gap-2">
              <Input value={loginDraft} onChange={e => setLoginDraft(e.target.value)} className="h-8 text-sm font-mono" autoFocus />
              <Button size="sm" onClick={saveEdit} disabled={saving}>Saqlash</Button>
              <button onClick={() => { setEditing(null); setLoginDraft(credentials.login); }} className="text-xs text-muted-foreground">Bekor</button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Login</p>
                <p className="font-mono font-semibold">{credentials.login}</p>
              </div>
              <div className="flex items-center gap-1">
                {authToken && (
                  <button onClick={() => { setEditing("login"); setLoginDraft(credentials.login); }} className="text-xs text-primary font-medium px-1.5">Tahrirlash</button>
                )}
                <Button variant="ghost" size="icon" onClick={() => copyToClipboardFn(credentials.login, toast)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="rounded-lg border bg-secondary/50 p-3">
          {editing === "password" ? (
            <div className="flex items-center gap-2">
              <Input value={passwordDraft} onChange={e => setPasswordDraft(e.target.value)} placeholder="Yangi parol" className="h-8 text-sm font-mono" autoFocus />
              <Button size="sm" onClick={saveEdit} disabled={saving}>Saqlash</Button>
              <button onClick={() => { setEditing(null); setPasswordDraft(""); }} className="text-xs text-muted-foreground">Bekor</button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Parol</p>
                <p className="font-mono font-semibold">{credentials.password}</p>
              </div>
              <div className="flex items-center gap-1">
                {authToken && (
                  <button onClick={() => { setEditing("password"); setPasswordDraft(""); }} className="text-xs text-primary font-medium px-1.5">Tahrirlash</button>
                )}
                <Button variant="ghost" size="icon" onClick={() => copyToClipboardFn(credentials.password, toast)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {subjects && subjects.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-semibold text-blue-700 mb-1.5">📚 Tanlagan fanlaringiz:</p>
          <div className="flex flex-wrap gap-1.5">
            {subjects.map(s => (
              <span key={s} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">{s}</span>
            ))}
          </div>
          <p className="text-xs text-blue-600 mt-2">Admin sinflarni biriktirgandan so'ng dars jadvalingiz tayyor bo'ladi.</p>
        </div>
      )}
      {onDashboard && (
        <Button className="w-full" onClick={onDashboard}>Boshqaruv paneliga o'tish</Button>
      )}
      {onClose && (
        <Button className="w-full" onClick={onClose}>Yopish</Button>
      )}
    </div>
  );
}

// ─── Mahfiy kod interfeysi ────────────────────────────────────────────────────
interface CodeData {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  role: string;
  class_id: string | null;
  class_name: string | null;
}

// ─── Xodim/O'qituvchi ro'yxatdan o'tish — YAGONA mahfiy kod orqali ───────────
// Eski sxemada har rol (direktor, zavuch, sinf rahbari...) uchun alohida
// kartochka bo'lardi. Endi rolni kodning o'zi belgilaydi — foydalanuvchi
// faqat mahfiy kodni kiritadi, xolos.
function StaffRegister() {
  const { login: authLogin } = useAuth();
  const [, setLocation] = useLocation();
  const [welcomeStaff, setWelcomeStaff] = useState<{ name: string; role: string } | null>(null);
  const [secretCode, setSecretCode] = useState("");
  const [codeData, setCodeData] = useState<CodeData | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [credentials, setCredentials] = useState<{ login: string; password: string } | null>(null);
  const [pendingAuthData, setPendingAuthData] = useState<Parameters<typeof authLogin>[0] | null>(null);

  const isTeacher = codeData?.role === "teacher" || codeData?.role === "sinf_rahbari";
  const roleCfg = codeData ? ROLE_CONFIG[codeData.role] : undefined;

  const verifyCode = useCallback(async (code: string) => {
    if (code.length < 6) { setCodeData(null); setCodeError(""); return; }
    setCodeLoading(true);
    setCodeError("");
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json() as CodeData & { error?: string };
      if (!res.ok) { setCodeError(data.error ?? "Kod noto'g'ri yoki ishlatilgan"); setCodeData(null); return; }
      if (data.role === "student") { setCodeError("Bu o'quvchi kodi. Chap tarafdagi \"O'quvchi\" bo'limidan ro'yxatdan o'ting."); setCodeData(null); return; }
      setCodeData(data);
    } catch { setCodeError("Serverga ulanishda xatolik"); }
    setCodeLoading(false);
  }, []);

  useEffect(() => {
    const trimmed = secretCode.trim();
    if (trimmed.length < 6) { setCodeData(null); return; }
    const t = setTimeout(() => void verifyCode(trimmed), 350);
    return () => clearTimeout(t);
  }, [secretCode, verifyCode]);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]);
  };

  const canSubmit = !!codeData && (!isTeacher || selectedSubjects.length > 0);

  const handleSubmit = async () => {
    if (!codeData) return;
    setIsLoading(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/auth/register-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          last_name: codeData.last_name.trim(),
          first_name: codeData.first_name.trim(),
          role: codeData.role,
          class_id: codeData.class_id || null,
          subjects: isTeacher ? selectedSubjects : undefined,
          code_id: codeData.id,
        }),
      });
      const data = await res.json() as { error?: string; login?: string; password?: string };
      if (!res.ok) { setSubmitError(data.error ?? "Ro'yxatdan o'tishda xatolik"); return; }
      setCredentials({ login: data.login ?? "", password: data.password ?? "" });
      setPendingAuthData(data as Parameters<typeof authLogin>[0]);
    } catch {
      setSubmitError("Server bilan bog'lanishda muammo. Qayta urinib ko'ring.");
    } finally {
      setIsLoading(false);
    }
  };

  if (welcomeStaff) {
    return (
      <WelcomeAnimation
        name={welcomeStaff.name}
        role={welcomeStaff.role}
        onDone={() => { setWelcomeStaff(null); setLocation("/dashboard"); }}
      />
    );
  }

  if (credentials) {
    return (
      <CredentialsView
        credentials={credentials}
        subjects={isTeacher ? selectedSubjects : undefined}
        authToken={pendingAuthData?.token}
        onCredentialsChange={(next) => {
          setCredentials(next);
          if (pendingAuthData) setPendingAuthData({ ...pendingAuthData, login: next.login });
        }}
        onDashboard={() => {
          if (pendingAuthData) authLogin(pendingAuthData);
          const fullName = `${codeData?.last_name ?? ""} ${codeData?.first_name ?? ""}`.trim();
          setWelcomeStaff({ name: fullName || "Foydalanuvchi", role: codeData?.role ?? "teacher" });
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center py-1">
        <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
          <KeyRound className="w-7 h-7 text-primary" />
        </div>
        <h3 className="font-bold text-lg">Xodim sifatida ro'yxatdan o'tish</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Direktor, zavuch, o'rinbosar, fan o'qituvchisi, sinf rahbari, kutubxonachi — barchasi shu yerdan, admin bergan kod bilan.
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="relative">
          <Input
            placeholder="AB3K9X2M"
            value={secretCode}
            onChange={e => setSecretCode(e.target.value.toUpperCase())}
            className={`text-center text-xl font-mono tracking-[0.3em] h-12 pr-10 transition-colors ${
              codeData ? "border-green-400 bg-green-50/50" : codeError ? "border-destructive" : ""
            }`}
            maxLength={10}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {codeLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            {!codeLoading && codeData && <CheckCircle2 className="w-4 h-4 text-green-600" />}
          </div>
        </div>
        {codeError && <p className="text-sm text-destructive text-center">{codeError}</p>}
      </div>

      <div className={`space-y-4 transition-all duration-300 ${codeData ? "opacity-100" : "opacity-40 pointer-events-none select-none"}`}>
        {codeData && roleCfg && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-green-800">{codeData.full_name}</p>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <roleCfg.icon className="w-3 h-3" /> {roleCfg.label}
                {codeData.class_name && ` • ${codeData.class_name} sinfi`}
              </p>
            </div>
          </div>
        )}

        {isTeacher && (
          <div className="space-y-2">
            <div>
              <Label>Qaysi fandan dars berasiz?</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Kamida 1 ta fan tanlang.</p>
            </div>
            <Input
              placeholder="Fan nomini qidirish..."
              value={subjectSearch}
              onChange={e => setSubjectSearch(e.target.value)}
              className="mb-1"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-3 rounded-lg border border-blue-200 bg-blue-50/50 max-h-56 overflow-y-auto">
              {COMMON_SUBJECTS.filter(s => s.toLowerCase().includes(subjectSearch.trim().toLowerCase())).map(subject => {
                const selected = selectedSubjects.includes(subject);
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleSubject(subject)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all text-left ${
                      selected ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-blue-700 border-blue-200 hover:bg-blue-100"
                    }`}
                  >
                    {selected && <span className="mr-1">✓</span>}
                    {subject}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ro'yxatda yo'q fan nomini yozing..."
                value={customSubject}
                onChange={e => setCustomSubject(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = customSubject.trim();
                    if (val && !selectedSubjects.includes(val)) setSelectedSubjects(prev => [...prev, val]);
                    setCustomSubject("");
                  }
                }}
              />
              <Button
                type="button" variant="outline" size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-100 shrink-0"
                onClick={() => {
                  const val = customSubject.trim();
                  if (val && !selectedSubjects.includes(val)) setSelectedSubjects(prev => [...prev, val]);
                  setCustomSubject("");
                }}
                disabled={!customSubject.trim()}
              >
                + Qo'shish
              </Button>
            </div>
            {selectedSubjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedSubjects.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-medium">
                    {s}
                    <button type="button" onClick={() => setSelectedSubjects(prev => prev.filter(x => x !== s))} className="hover:text-blue-200 ml-0.5">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {submitError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive font-medium">
            ⚠️ {submitError}
          </div>
        )}

        <Button className="w-full h-11" disabled={!canSubmit || isLoading} onClick={handleSubmit}>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Ro'yxatdan o'tish
        </Button>
      </div>
    </div>
  );
}

// Login preview generatsiyasi (frontendda ko'rsatish uchun)
function previewStudentLogin(firstName: string): string {
  return firstName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "student";
}

// ─── O'quvchi ro'yxatdan o'tish ───────────────────────────────────────────────
function StudentRegister() {
  const { login: authLogin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [secretCode, setSecretCode] = useState("");
  const [codeData, setCodeData] = useState<CodeData | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ login: string; password: string } | null>(null);
  const [pendingAuthData, setPendingAuthData] = useState<Parameters<typeof authLogin>[0] | null>(null);
  const [welcomeStudent, setWelcomeStudent] = useState<{ name: string } | null>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const previewLogin = codeData ? previewStudentLogin(codeData.first_name.trim()) : "";
  const previewPassword = codeData?.class_name ? `3maktab${codeData.class_name.toLowerCase().replace(/\s+/g, "")}` : "";

  const verifyCode = useCallback(async (code: string) => {
    if (code.length < 6) { setCodeData(null); setCodeError(""); return; }
    setCodeLoading(true);
    setCodeError("");
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json() as CodeData & { error?: string };
      if (!res.ok) { setCodeError(data.error ?? "Kod noto'g'ri yoki ishlatilgan"); setCodeData(null); return; }
      if (data.role !== "student") { setCodeError("Bu kod o'quvchi uchun emas. O'ng tarafdagi bo'limdan ro'yxatdan o'ting."); setCodeData(null); return; }
      setCodeData(data);
      // Kod to'g'ri chiqishi bilan avtomatik telefon maydoniga o'tish — vaqt tejash uchun
      setTimeout(() => phoneInputRef.current?.focus(), 150);
    } catch { setCodeError("Serverga ulanishda xatolik"); }
    setCodeLoading(false);
  }, []);

  // Kod 8 belgiga yetishi bilan avtomatik tekshiradi — alohida tugma bosish shart emas
  useEffect(() => {
    const trimmed = secretCode.trim();
    if (trimmed.length < 6) { setCodeData(null); return; }
    const t = setTimeout(() => void verifyCode(trimmed), 350);
    return () => clearTimeout(t);
  }, [secretCode, verifyCode]);

  const handlePhoneChange = (val: string) => {
    let digits = val.replace(/\D/g, "");
    if (digits.startsWith("998")) digits = digits.slice(3);
    if (digits.startsWith("0")) digits = digits.slice(1);
    setPhone(digits.slice(0, 9));
  };

  const formatPhone = (digits: string) => {
    if (!digits) return "";
    const d = digits.padEnd(9, "_");
    return `+998 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`.replace(/_+$/, "").trim();
  };

  const canSubmit = !!(codeData && phone.replace(/\D/g, "").length >= 9);

  const handleSubmit = async () => {
    if (!codeData) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          last_name: codeData.last_name,
          first_name: codeData.first_name,
          phone_number: `+998${phone}`,
          class_name: codeData.class_name ?? "",
          code_id: codeData.id,
        }),
      });
      const data = await res.json() as { error?: string; login?: string; password?: string };
      if (!res.ok) {
        toast({ variant: "destructive", title: "Xatolik", description: data.error ?? "Ro'yxatdan o'tishda xatolik" });
        return;
      }
      setCredentials({ login: data.login ?? "", password: data.password ?? previewPassword });
      setPendingAuthData(data as Parameters<typeof authLogin>[0]);
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Server bilan bog'lanishda muammo" });
    } finally {
      setIsLoading(false);
    }
  };

  if (welcomeStudent) {
    return (
      <WelcomeAnimation
        name={welcomeStudent.name}
        role="student"
        onDone={() => {
          setWelcomeStudent(null);
          setLocation("/dashboard");
        }}
      />
    );
  }

  if (credentials) {
    return (
      <CredentialsView
        credentials={credentials}
        authToken={pendingAuthData?.token}
        onCredentialsChange={(next) => {
          setCredentials(next);
          if (pendingAuthData) setPendingAuthData({ ...pendingAuthData, login: next.login });
        }}
        onDashboard={() => {
          if (pendingAuthData) authLogin(pendingAuthData);
          const fullName = codeData ? `${codeData.last_name} ${codeData.first_name}`.trim() : "O'quvchi";
          setWelcomeStudent({ name: fullName });
        }}
      />
    );
  }

  // Bitta uzluksiz ekran: kod va telefon birga — ortiqcha bosqichlarsiz, tezroq
  return (
    <div className="space-y-4">
      <div className="text-center py-1">
        <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
          <KeyRound className="w-7 h-7 text-primary" />
        </div>
        <h3 className="font-bold text-lg">O'quvchi sifatida ro'yxatdan o'tish</h3>
        <p className="text-sm text-muted-foreground mt-1">Admin bergan kodni kiriting — qolganini o'zimiz to'ldiramiz</p>
      </div>

      <div className="space-y-1.5">
        <div className="relative">
          <Input
            placeholder="AB3K9X2M"
            value={secretCode}
            onChange={e => setSecretCode(e.target.value.toUpperCase())}
            className={`text-center text-xl font-mono tracking-[0.3em] h-12 pr-10 transition-colors ${
              codeData ? "border-green-400 bg-green-50/50" : codeError ? "border-destructive" : ""
            }`}
            maxLength={10}
            autoFocus
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {codeLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            {!codeLoading && codeData && <CheckCircle2 className="w-4 h-4 text-green-600" />}
          </div>
        </div>
        {codeError && <p className="text-sm text-destructive text-center">{codeError}</p>}
      </div>

      {/* Kod tasdiqlangach — smooth ravishda pastdagi maydonlar ochiladi */}
      <div className={`space-y-4 transition-all duration-300 ${codeData ? "opacity-100" : "opacity-40 pointer-events-none select-none"}`}>
        {codeData && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-green-800">{codeData.full_name}</p>
              {codeData.class_name && <p className="text-xs text-green-600">{codeData.class_name} sinfi</p>}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Telefon raqam</Label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground select-none">+998</span>
            <Input
              ref={phoneInputRef}
              className="rounded-l-none"
              placeholder="90 123 45 67"
              value={formatPhone(phone).replace("+998 ", "")}
              onChange={e => handlePhoneChange(e.target.value)}
              maxLength={12}
              type="tel"
              onKeyDown={e => e.key === "Enter" && canSubmit && void handleSubmit()}
            />
          </div>
        </div>

        {phone.replace(/\D/g, "").length >= 9 && codeData && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-1.5 animate-in fade-in duration-300">
            <p className="text-xs font-semibold text-green-700">🔑 Sizning login ma'lumotlaringiz (avtomatik)</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-green-600">Login:</span>
              <span className="font-mono text-sm font-semibold text-green-800">{previewLogin}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-green-600">Parol:</span>
              <span className="font-mono text-sm font-semibold text-green-800">{previewPassword}</span>
            </div>
          </div>
        )}
      </div>

      <Button className="w-full h-11" disabled={!canSubmit || isLoading} onClick={handleSubmit}>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        Ro'yxatdan o'tish
      </Button>
    </div>
  );
}

// ─── Rangli rol kartochkasi ───────────────────────────────────────────────────
export default function Register() {
  const [choice, setChoice] = useState<"student" | "staff" | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-secondary/40 via-background to-primary/5">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-4">
          <img src="/logo.png" alt="Ta'lim Platform" className="h-14 w-auto object-contain" />
        </div>
        <p className="text-sm text-muted-foreground text-center mb-6">Toshloq tumani 3-maktab</p>

        {choice === null && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <h2 className="text-xl font-bold text-center mb-5">Kim bo'lib ro'yxatdan o'tmoqchisiz?</h2>
            <button
              onClick={() => setChoice("student")}
              className="w-full flex items-center gap-4 rounded-2xl border-2 border-border hover:border-primary bg-card p-5 text-left transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <GraduationCap className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-lg">O'quvchi</p>
                <p className="text-sm text-muted-foreground">Sinfda o'qiyapsiz</p>
              </div>
            </button>
            <button
              onClick={() => setChoice("staff")}
              className="w-full flex items-center gap-4 rounded-2xl border-2 border-border hover:border-primary bg-card p-5 text-left transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <Shield className="w-7 h-7 text-purple-600" />
              </div>
              <div>
                <p className="font-bold text-lg">O'qituvchi / Xodim</p>
                <p className="text-sm text-muted-foreground">Direktor, zavuch, o'rinbosar, fan o'qituvchisi, sinf rahbari, kutubxonachi</p>
              </div>
            </button>
          </div>
        )}

        {choice !== null && (
          <div className="animate-in fade-in slide-in-from-right-2 duration-300">
            <button onClick={() => setChoice(null)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
              ← Orqaga
            </button>
            {choice === "student" ? <StudentRegister /> : <StaffRegister />}
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          Akkauntingiz bormi?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Tizimga kirish
          </Link>
        </p>
      </div>
    </div>
  );
}

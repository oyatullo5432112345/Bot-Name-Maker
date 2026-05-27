import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { useListClasses, useListStaff } from "@workspace/api-client-react";
import {
  Loader2, CheckCircle2, Copy, UserPlus, Users, Shield,
  GraduationCap, Crown, Briefcase, Award, BookMarked, Users2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

function sortClasses<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const ga = getGrade(a.name);
    const gb = getGrade(b.name);
    if (ga !== gb) return ga - gb;
    return getSuffix(a.name).localeCompare(getSuffix(b.name));
  });
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
}: {
  credentials: { login: string; password: string };
  subjects?: string[];
  onClose?: () => void;
  onDashboard?: () => void;
}) {
  const { toast } = useToast();
  const [showConfetti, setShowConfetti] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 2200);
    return () => clearTimeout(t);
  }, []);

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
        <div className="rounded-lg border bg-secondary/50 p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Login</p>
            <p className="font-mono font-semibold">{credentials.login}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => copyToClipboardFn(credentials.login, toast)}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
        <div className="rounded-lg border bg-secondary/50 p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Parol</p>
            <p className="font-mono font-semibold">{credentials.password}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => copyToClipboardFn(credentials.password, toast)}>
            <Copy className="w-4 h-4" />
          </Button>
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

// ─── Sinf tanlash ─────────────────────────────────────────────────────────────
function ClassPicker({
  classes,
  selected,
  onSelect,
}: {
  classes: { id: string; name: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const sorted = sortClasses(classes);
  const boshlangich = sorted.filter(c => getGrade(c.name) <= 4);
  const yuqori = sorted.filter(c => getGrade(c.name) > 4);

  return (
    <div className="space-y-3">
      {boshlangich.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-2">Boshlang'ich (1–4 sinf)</p>
          <div className="flex flex-wrap gap-2">
            {boshlangich.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors
                  ${selected === c.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-input hover:bg-secondary"
                  }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {yuqori.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-2">Yuqori (5–11 sinf)</p>
          <div className="flex flex-wrap gap-2">
            {yuqori.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors
                  ${selected === c.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-input hover:bg-secondary"
                  }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Staff ro'yxatdan o'tish modali ──────────────────────────────────────────
function StaffRegisterModal({
  open,
  onClose,
  role,
  roleLabel,
  classId,
  className: classNameProp,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  role: string;
  roleLabel: string;
  classId?: string;
  className?: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { login: authLogin } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ login: string; password: string } | null>(null);

  const isTeacher = role === "teacher";
  const cfg = ROLE_CONFIG[role];
  const colors = cfg ? COLOR_CLASSES[cfg.color] : null;
  const [customSubject, setCustomSubject] = useState("");

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

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          role,
          class_id: classId || null,
          phone_number: `+998${phone}`,
          subjects: isTeacher ? selectedSubjects : undefined,
        }),
      });
      const data = await res.json() as { error?: string; login?: string; password?: string };
      if (!res.ok) {
        toast({ variant: "destructive", title: "Xatolik", description: data.error ?? "Ro'yxatdan o'tishda xatolik" });
        return;
      }
      setCredentials({ login: data.login ?? "", password: data.password ?? "" });
      authLogin(data as Parameters<typeof authLogin>[0]);
      onSuccess();
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Server bilan bog'lanishda muammo" });
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = fullName.trim().length >= 2 && phone.replace(/\D/g, "").length >= 9
    && (!isTeacher || selectedSubjects.length > 0);

  const handleClose = () => {
    setFullName("");
    setPhone("");
    setSelectedSubjects([]);
    setCredentials(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {cfg && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors?.bg} ${colors?.border} border w-fit mb-1`}>
              <cfg.icon className={`w-4 h-4 ${colors?.iconColor}`} />
              <span className={`text-sm font-semibold ${colors?.titleColor}`}>{roleLabel}</span>
            </div>
          )}
          <DialogTitle className="text-xl">Ro'yxatdan o'tish</DialogTitle>
          {classNameProp && (
            <DialogDescription>{classNameProp} sinfi sinf rahbari</DialogDescription>
          )}
        </DialogHeader>

        {credentials ? (
          <CredentialsView
            credentials={credentials}
            subjects={isTeacher ? selectedSubjects : undefined}
            onClose={handleClose}
          />
        ) : (
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Ism Familiya</Label>
              <Input
                placeholder="Valiyev Valijon"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Telefon raqam</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground select-none">
                  +998
                </span>
                <Input
                  className="rounded-l-none"
                  placeholder="90 123 45 67"
                  value={formatPhone(phone).replace("+998 ", "")}
                  onChange={e => handlePhoneChange(e.target.value)}
                  maxLength={12}
                  type="tel"
                />
              </div>
            </div>

            {isTeacher && (
              <div className="space-y-2">
                <div>
                  <Label>O'qitiladigan fanlar</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Kamida 1 ta fan tanlang — keyin admin sinflarni biriktiradi
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 p-3 rounded-lg border border-blue-200 bg-blue-50/50">
                  {COMMON_SUBJECTS.map(subject => {
                    const selected = selectedSubjects.includes(subject);
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleSubject(subject)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                          selected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-blue-700 border-blue-200 hover:bg-blue-100"
                        }`}
                      >
                        {selected && <span className="mr-1">✓</span>}
                        {subject}
                      </button>
                    );
                  })}
                </div>

                {/* Qo'lda yozish */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Ro'yxatda yo'q fan nomini yozing..."
                    value={customSubject}
                    onChange={e => setCustomSubject(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = customSubject.trim();
                        if (val && !selectedSubjects.includes(val)) {
                          setSelectedSubjects(prev => [...prev, val]);
                        }
                        setCustomSubject("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100 shrink-0"
                    onClick={() => {
                      const val = customSubject.trim();
                      if (val && !selectedSubjects.includes(val)) {
                        setSelectedSubjects(prev => [...prev, val]);
                      }
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
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-medium"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => setSelectedSubjects(prev => prev.filter(x => x !== s))}
                          className="hover:text-blue-200 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full"
              disabled={!canSubmit || isLoading}
              onClick={handleSubmit}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Ro'yxatdan o'tish
            </Button>

            {isTeacher && selectedSubjects.length === 0 && fullName.length >= 2 && (
              <p className="text-xs text-center text-amber-600">⚠️ Davom etish uchun kamida 1 ta fan tanlang</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── O'quvchi ro'yxatdan o'tish ───────────────────────────────────────────────
function StudentRegister() {
  const { login: authLogin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: classes } = useListClasses({ query: { queryKey: ["classes", "list"] } });

  const [classId, setClassId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loginVal, setLoginVal] = useState("");
  const [passwordVal, setPasswordVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ login: string; password: string } | null>(null);

  const selectedClass = (classes ?? []).find((c: { id: string; name: string }) => c.id === classId);

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

  const canSubmit = !!(
    classId &&
    fullName.trim().length >= 2 &&
    phone.replace(/\D/g, "").length >= 9 &&
    loginVal.trim().length >= 3 &&
    passwordVal.length >= 4
  );

  const handleSubmit = async () => {
    if (!selectedClass) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone_number: `+998${phone}`,
          class_name: selectedClass.name,
          login: loginVal.trim(),
          password: passwordVal,
        }),
      });
      const data = await res.json() as { error?: string; login?: string; password?: string };
      if (!res.ok) {
        toast({ variant: "destructive", title: "Xatolik", description: data.error ?? "Ro'yxatdan o'tishda xatolik" });
        return;
      }
      setCredentials({ login: data.login ?? "", password: data.password ?? "" });
      authLogin(data as Parameters<typeof authLogin>[0]);
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Server bilan bog'lanishda muammo" });
    } finally {
      setIsLoading(false);
    }
  };

  if (credentials) {
    return <CredentialsView credentials={credentials} onDashboard={() => setLocation("/dashboard")} />;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Sinf tanlang</Label>
        {classes && classes.length > 0 ? (
          <ClassPicker classes={classes} selected={classId} onSelect={id => { setClassId(id); }} />
        ) : (
          <div className="text-sm text-muted-foreground italic">Sinflar yuklanmoqda...</div>
        )}
      </div>

      {classId && (
        <>
          <div className="space-y-1.5">
            <Label>Ism Familiya</Label>
            <Input placeholder="Valiyev Valijon" value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>

          {fullName.trim().length >= 2 && (
            <>
              <div className="space-y-1.5">
                <Label>Telefon raqam</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground select-none">
                    +998
                  </span>
                  <Input
                    className="rounded-l-none"
                    placeholder="90 123 45 67"
                    value={formatPhone(phone).replace("+998 ", "")}
                    onChange={e => handlePhoneChange(e.target.value)}
                    maxLength={12}
                    type="tel"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Login</Label>
                <Input placeholder="login123" value={loginVal} onChange={e => setLoginVal(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Parol</Label>
                <Input type="password" placeholder="••••••" value={passwordVal} onChange={e => setPasswordVal(e.target.value)} />
              </div>
            </>
          )}
        </>
      )}

      <Button className="w-full" disabled={!canSubmit || isLoading} onClick={handleSubmit}>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        Ro'yxatdan o'tish
      </Button>
    </div>
  );
}

// ─── Rangli rol kartochkasi ───────────────────────────────────────────────────
function RoleCard({
  role,
  personName,
  isFilled,
  count,
  onClick,
}: {
  role: string;
  personName?: string | null;
  isFilled: boolean;
  count?: number;
  onClick: () => void;
}) {
  const cfg = ROLE_CONFIG[role];
  if (!cfg) return null;
  const c = COLOR_CLASSES[cfg.color];
  const Icon = cfg.icon;

  return (
    <div
      className={`
        rounded-xl border-2 p-4 flex items-center justify-between gap-3
        transition-all duration-200 cursor-pointer
        ${isFilled
          ? `${c.bg} ${c.border} opacity-80`
          : `${c.bg} ${c.border} ${c.hover} hover:shadow-md hover:-translate-y-0.5`
        }
      `}
      onClick={!isFilled ? onClick : undefined}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${c.badgeBg}`}>
          <Icon className={`w-5 h-5 ${c.iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-wide ${c.iconColor}`}>{cfg.label}</p>
          <p className={`text-sm font-medium truncate mt-0.5 ${isFilled ? c.titleColor : "text-muted-foreground italic"}`}>
            {isFilled
              ? (personName ?? (count !== undefined ? `${count} ta ro'yxatdan o'tgan` : "To'ldirilgan"))
              : cfg.description}
          </p>
        </div>
      </div>

      {isFilled ? (
        <CheckCircle2 className={`w-6 h-6 flex-shrink-0 ${c.iconColor}`} />
      ) : (
        <Button
          size="sm"
          variant="outline"
          className={`shrink-0 font-medium border ${c.btnBorder} ${c.btnText} ${c.btnHover} bg-transparent`}
          onClick={e => { e.stopPropagation(); onClick(); }}
        >
          <UserPlus className="w-3 h-3 mr-1" />
          O'tish
        </Button>
      )}
    </div>
  );
}

// ─── Sinf rahbari kartochkasi ─────────────────────────────────────────────────
function SinfRahbariCard({
  cls,
  rahbar,
  onRegister,
}: {
  cls: { id: string; name: string };
  rahbar: { full_name: string } | undefined;
  onRegister: () => void;
}) {
  const c = rahbar ? COLOR_CLASSES.emerald : COLOR_CLASSES.rose;

  return (
    <div
      className={`
        rounded-xl border-2 p-3.5 flex items-center justify-between gap-3
        transition-all duration-200
        ${rahbar
          ? `${c.bg} ${c.border}`
          : `${c.bg} ${c.border} ${c.hover} hover:shadow-sm cursor-pointer`
        }
      `}
      onClick={!rahbar ? onRegister : undefined}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${c.badgeBg}`}>
          <Users2 className={`w-4 h-4 ${c.iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-semibold ${c.iconColor}`}>{cls.name} sinfi</p>
          <p className={`text-sm font-medium truncate ${rahbar ? c.titleColor : "text-muted-foreground italic"}`}>
            {rahbar ? rahbar.full_name : "Sinf rahbari yo'q"}
          </p>
        </div>
      </div>

      {rahbar ? (
        <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${c.iconColor}`} />
      ) : (
        <Button
          size="sm"
          variant="outline"
          className={`shrink-0 border ${c.btnBorder} ${c.btnText} ${c.btnHover} bg-transparent text-xs`}
          onClick={e => { e.stopPropagation(); onRegister(); }}
        >
          <UserPlus className="w-3 h-3 mr-1" />
          O'tish
        </Button>
      )}
    </div>
  );
}

// ─── Asosiy sahifa ────────────────────────────────────────────────────────────
export default function Register() {
  const { data: classes } = useListClasses({ query: { queryKey: ["classes", "list"] } });
  const { data: staffList, refetch: refetchStaff } = useListStaff({ query: { queryKey: ["staff", "list"] } });

  const [modalRole, setModalRole] = useState<string | null>(null);
  const [modalClassId, setModalClassId] = useState<string | undefined>(undefined);

  const allClasses = sortClasses(classes ?? []);

  const getStaffForRole = (role: string) => (staffList ?? []).find((s: { role: string }) => s.role === role);
  const getSinfRahbariForClass = (cId: string) =>
    (staffList ?? []).find((s: { role: string; class_id?: string | null }) => s.role === "sinf_rahbari" && s.class_id === cId);
  const teacherCount = (staffList ?? []).filter((s: { role: string }) => s.role === "teacher").length;

  const openModal = (role: string, cId?: string) => {
    setModalRole(role);
    setModalClassId(cId);
  };

  const closeModal = () => {
    setModalRole(null);
    setModalClassId(undefined);
    void refetchStaff();
  };

  const activeClass = modalClassId ? (classes ?? []).find((c: { id: string; name: string }) => c.id === modalClassId) : undefined;

  const SINGLE_SLOT_ROLES = ["director", "zam_direktor", "zavuch", "kutubxonachi"];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Chap: O'quvchi ro'yxatdan o'tish */}
      <div className="flex-1 flex flex-col justify-start py-10 px-6 sm:px-10 lg:px-14 xl:px-20 border-b lg:border-b-0 lg:border-r bg-secondary/20 overflow-y-auto">
        <div className="mx-auto w-full max-w-sm">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="Talim Platform" className="h-14 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-2 mb-1 justify-center">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">O'quvchi ro'yxatdan o'tish</h2>
          </div>
          <p className="text-sm text-muted-foreground text-center mb-6">Toshloq tumani 3-maktab</p>

          <StudentRegister />

          <p className="text-center text-sm text-muted-foreground mt-5">
            Akkauntingiz bormi?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Tizimga kirish
            </Link>
          </p>
        </div>
      </div>

      {/* O'ng: Mas'ul shaxslar */}
      <div className="flex-1 flex flex-col py-10 px-6 sm:px-10 lg:px-14 xl:px-20 bg-card overflow-y-auto">
        <div className="mx-auto w-full max-w-sm">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Mas'ul shaxslar</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">O'z lavozimingiz kartochkasidan ro'yxatdan o'ting</p>

          <div className="space-y-2.5">
            {/* Fan o'qituvchisi */}
            <RoleCard
              role="teacher"
              isFilled={false}
              count={teacherCount}
              personName={teacherCount > 0 ? `${teacherCount} ta o'qituvchi ro'yxatdan o'tgan` : null}
              onClick={() => openModal("teacher")}
            />

            {/* Rahbariyat */}
            <div className="pt-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Maktab rahbariyati
              </p>
              <div className="space-y-2">
                {SINGLE_SLOT_ROLES.map(role => {
                  const person = getStaffForRole(role) as { full_name: string } | undefined;
                  return (
                    <RoleCard
                      key={role}
                      role={role}
                      isFilled={!!person}
                      personName={person?.full_name}
                      onClick={() => openModal(role)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Sinf rahbarlari */}
            {allClasses.length > 0 && (
              <div className="pt-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  Sinf rahbarlari
                </p>
                <div className="space-y-1.5">
                  {allClasses.map(cls => {
                    const rahbar = getSinfRahbariForClass(cls.id) as { full_name: string } | undefined;
                    return (
                      <SinfRahbariCard
                        key={cls.id}
                        cls={cls}
                        rahbar={rahbar}
                        onRegister={() => openModal("sinf_rahbari", cls.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalRole && (
        <StaffRegisterModal
          open={!!modalRole}
          onClose={closeModal}
          role={modalRole}
          roleLabel={ROLE_CONFIG[modalRole]?.label ?? modalRole}
          classId={modalClassId}
          className={(activeClass as { name?: string } | undefined)?.name}
          onSuccess={() => void refetchStaff()}
        />
      )}
    </div>
  );
}

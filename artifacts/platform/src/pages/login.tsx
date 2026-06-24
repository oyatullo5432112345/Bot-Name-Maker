import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { useLogin } from "@workspace/api-client-react";
import {
  Loader2, LogIn, UserPlus, ArrowRight, MessageCircleQuestion,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { WelcomeAnimation } from "@/components/welcome-animation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  login: z.string().min(1, "Loginni kiriting"),
  password: z.string().min(1, "Parolni kiriting"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

type Stage = "landing" | "platform-welcome" | "school-select" | "user-welcome";

interface OlimpiyadaMaktab {
  id: string; nomi: string; tuman: string; jami_ball: number;
}

const GLOBAL_CSS = `
  @keyframes tt-fade-up {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes tt-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  @keyframes tt-scale-pop {
    0%   { transform: scale(0.6); opacity: 0; }
    65%  { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes tt-slide-up {
    0%   { transform: translateY(28px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }
  @keyframes tt-pulse {
    0%, 100% { transform: scale(1); opacity: 0.4; }
    50% { transform: scale(1.08); opacity: 0.15; }
  }
  @keyframes tt-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes tt-bounce {
    0%, 100% { transform: translateY(0); }
    40%       { transform: translateY(-10px); }
    70%       { transform: translateY(-3px); }
  }
`;

/* ─────────────────────────────────────────────
   1. Platform welcome animatsiyasi
───────────────────────────────────────────── */
function PlatformWelcome({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 150);
    const t2 = setTimeout(() => setPhase("exit"), 2700);
    const t3 = setTimeout(() => doneRef.current(), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const visible = phase !== "enter";
  const fading = phase === "exit";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, overflow: "hidden",
      background: "linear-gradient(145deg, #0f1f3d 0%, #1a2f5e 50%, #0a1628 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "opacity 0.5s ease",
      opacity: fading ? 0 : 1,
    }}>
      <style>{GLOBAL_CSS}</style>

      {/* Halqalar */}
      {[0,1,2,3].map(i => (
        <div key={i} style={{
          position: "absolute", borderRadius: "50%",
          background: "rgba(99,102,241,0.06)",
          width: `${220 + i * 140}px`, height: `${220 + i * 140}px`,
          top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          animation: `tt-pulse ${2.2 + i * 0.4}s ease-in-out infinite`,
        }} />
      ))}

      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 22, padding: "0 24px", textAlign: "center",
      }}>
        {/* Emoji */}
        <div style={{
          fontSize: 80,
          animation: visible ? "tt-scale-pop 0.7s cubic-bezier(0.34,1.56,0.64,1) both" : "none",
          opacity: visible ? 1 : 0,
        }}>🏫</div>

        {/* Location chip */}
        <div style={{
          background: "rgba(255,255,255,0.07)", borderRadius: 24,
          padding: "5px 16px", border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.6)", fontSize: 11, letterSpacing: "0.07em",
          animation: visible ? "tt-slide-up 0.5s ease 0.18s both" : "none",
          opacity: visible ? undefined : 0,
        }}>
          📍 Farg'ona viloyati · Toshloq tumani
        </div>

        {/* Sarlavha */}
        <div style={{
          animation: visible ? "tt-slide-up 0.5s ease 0.32s both" : "none",
          opacity: visible ? undefined : 0,
        }}>
          <div style={{
            color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500,
            letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8,
          }}>
            Toshloq tumani platformasiga
          </div>
          <div style={{
            color: "white", fontSize: "clamp(30px,7vw,52px)",
            fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.02em",
            textShadow: "0 2px 24px rgba(255,255,255,0.15)",
          }}>
            🎉 Xush kelibsiz!
          </div>
        </div>

        {/* Dots */}
        <div style={{
          display: "flex", gap: 8,
          animation: visible ? "tt-slide-up 0.5s ease 0.5s both" : "none",
          opacity: visible ? undefined : 0,
        }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "rgba(255,255,255,0.45)",
              animation: `tt-bounce 0.9s ease-in-out ${i * 0.15}s infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   2. Olimpiada panel (o'ng tomon)
───────────────────────────────────────────── */
function OlimpiyadaPanel() {
  const [maktablar, setMaktablar] = useState<OlimpiyadaMaktab[]>([]);
  const [loading, setLoading] = useState(true);
  const API = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "") + "/api";
  const MEDAL = ["🥇","🥈","🥉"];
  const MEDAL_CLR = ["#F59E0B","#94A3B8","#B45309"];

  useEffect(() => {
    fetch(`${API}/olimpiada/maktablar`)
      .then(r => r.ok ? r.json() : [])
      .then((d: unknown) => { setMaktablar(Array.isArray(d) ? (d as OlimpiyadaMaktab[]) : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [API]);

  const top3 = maktablar.slice(0, 3);
  const rest = maktablar.slice(3);

  return (
    <div style={{
      height: "100%", minHeight: 420, display: "flex", flexDirection: "column",
      background: "linear-gradient(160deg, #0f2027 0%, #1a3344 55%, #203a43 100%)",
      borderRadius: 20, overflow: "hidden",
      border: "1px solid rgba(245,158,11,0.15)",
      boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
    }}>
      {/* Header */}
      <div style={{
        padding: "18px 22px 14px",
        background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))",
        borderBottom: "1px solid rgba(245,158,11,0.15)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, flexShrink: 0,
        }}>🏆</div>
        <div>
          <div style={{ color: "white", fontWeight: 800, fontSize: 18 }}>Olimpiada.uz</div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
            Toshloq tumani · 2026–2027 o'quv yili
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              border: "2px solid rgba(245,158,11,0.25)", borderTopColor: "#f59e0b",
              animation: "tt-spin 0.8s linear infinite",
            }} />
          </div>
        ) : maktablar.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 36, color: "rgba(255,255,255,0.3)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏅</div>
            <p style={{ fontSize: 13 }}>Ma'lumot yo'q</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Jami maktab", val: maktablar.length, clr: "#60a5fa" },
                { label: "Top ball", val: top3[0]?.jami_ball ?? 0, clr: "#f59e0b" },
              ].map(s => (
                <div key={s.label} style={{
                  background: "rgba(255,255,255,0.05)", borderRadius: 12,
                  padding: "10px 12px", border: "1px solid rgba(255,255,255,0.07)",
                }}>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, marginBottom: 2 }}>{s.label}</div>
                  <div style={{ color: s.clr, fontSize: 22, fontWeight: 700 }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Label */}
            <div style={{
              color: "rgba(255,255,255,0.4)", fontSize: 10,
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}>
              Yetakchi maktablar
            </div>

            {/* Top 3 */}
            {top3.map((m, i) => (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.04)", borderRadius: 12,
                padding: "10px 14px", border: `1px solid ${MEDAL_CLR[i]}22`,
              }}>
                <span style={{ fontSize: 20 }}>{MEDAL[i]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: "white", fontSize: 13, fontWeight: 600,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{m.nomi}</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>{m.tuman}</div>
                </div>
                <div style={{ color: MEDAL_CLR[i], fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                  {m.jami_ball}
                </div>
              </div>
            ))}

            {/* Rest */}
            {rest.map((m, i) => (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.025)", borderRadius: 10,
                padding: "8px 14px", border: "1px solid rgba(255,255,255,0.05)",
              }}>
                <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, fontWeight: 600, minWidth: 18 }}>
                  {i + 4}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: "rgba(255,255,255,0.75)", fontSize: 12,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{m.nomi}</div>
                </div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontWeight: 600, fontSize: 13 }}>
                  {m.jami_ball}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "10px 18px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.25)",
        color: "rgba(255,255,255,0.25)", fontSize: 11, textAlign: "center",
      }}>
        To'liq ko'rish uchun tizimga kiring
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   3. Maktab kartasi
───────────────────────────────────────────── */
interface SchoolCardProps {
  name: string;
  active?: boolean;
  selected?: boolean;
  onClick?: () => void;
  onLogin?: () => void;
  onRegister?: () => void;
}

function SchoolCard({ name, active, selected, onClick, onLogin, onRegister }: SchoolCardProps) {
  return (
    <div
      onClick={active ? onClick : undefined}
      style={{
        borderRadius: 16, overflow: "hidden",
        cursor: active ? "pointer" : "default",
        border: selected
          ? "2px solid #6366f1"
          : active
          ? "1px solid rgba(99,102,241,0.35)"
          : "1px solid rgba(255,255,255,0.07)",
        background: selected
          ? "linear-gradient(135deg, #4338ca 0%, #6366f1 55%, #7c3aed 100%)"
          : active
          ? "linear-gradient(135deg, rgba(99,102,241,0.14) 0%, rgba(124,58,237,0.08) 100%)"
          : "rgba(255,255,255,0.025)",
        boxShadow: selected ? "0 8px 32px rgba(99,102,241,0.45)" : "none",
        transform: selected ? "scale(1.02)" : "scale(1)",
        transition: "all 0.22s ease",
      }}
    >
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 22 }}>{active ? "🏫" : "🏗️"}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, lineHeight: 1.3,
                color: selected ? "white" : active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.35)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{name}</div>
              <div style={{
                fontSize: 10, marginTop: 1,
                color: selected ? "rgba(255,255,255,0.65)"
                  : active ? "rgba(255,255,255,0.45)"
                  : "rgba(255,255,255,0.2)",
              }}>
                {active ? "Umumiy o'rta ta'lim maktabi" : "Tez orada ulash rejalashtirilgan"}
              </div>
            </div>
          </div>
          {active ? (
            <div style={{
              padding: "3px 10px", borderRadius: 24, flexShrink: 0,
              background: selected ? "rgba(255,255,255,0.18)" : "rgba(99,102,241,0.22)",
              color: selected ? "white" : "#a5b4fc",
              fontSize: 10, fontWeight: 700,
            }}>
              ✓ Tayyor
            </div>
          ) : (
            <div style={{
              padding: "3px 10px", borderRadius: 24, flexShrink: 0,
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.22)",
              fontSize: 10,
            }}>
              Tez orada
            </div>
          )}
        </div>

        {/* Expand on select */}
        {selected && active && (
          <div style={{
            marginTop: 14, display: "flex", gap: 8,
            animation: "tt-slide-up 0.3s ease both",
          }}>
            <button
              onClick={e => { e.stopPropagation(); onLogin?.(); }}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 10,
                background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)",
                color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <LogIn size={14} /> Kirish
            </button>
            <button
              onClick={e => { e.stopPropagation(); onRegister?.(); }}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 10,
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <UserPlus size={14} /> Ro'yxatdan o'tish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   4. Qo'llab-quvvatlash dialog
───────────────────────────────────────────── */
function SupportDialog({
  open, done, msg, name, loading,
  onClose, onSubmit, onMsg, onName,
}: {
  open: boolean; done: boolean; msg: string; name: string; loading: boolean;
  onClose: () => void; onSubmit: () => void; onMsg: (v: string) => void; onName: (v: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircleQuestion className="w-5 h-5 text-primary" />
            Qo'llab-quvvatlash
          </DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="text-center py-4 space-y-2">
            <p className="text-2xl">✅</p>
            <p className="font-semibold">Xabaringiz yuborildi!</p>
            <p className="text-sm text-muted-foreground">Admin tez orada javob beradi.</p>
            <Button className="w-full mt-2" onClick={onClose}>Yopish</Button>
          </div>
        ) : (
          <div className="space-y-3 mt-1">
            <Input placeholder="Ismingiz (ixtiyoriy)" value={name} onChange={e => onName(e.target.value)} />
            <Textarea placeholder="Savolingiz yoki muammongizni yozing..." rows={4} value={msg} onChange={e => onMsg(e.target.value)} />
            <Button className="w-full" disabled={msg.trim().length < 5 || loading} onClick={onSubmit}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Yuborish
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
   Maktablar ro'yxati
───────────────────────────────────────────── */
const SCHOOLS = [
  { id: "3", name: "Toshloq tumani 3-maktab", active: true },
  { id: "1", name: "Toshloq tumani 1-maktab", active: false },
  { id: "2", name: "Toshloq tumani 2-maktab", active: false },
  { id: "4", name: "Toshloq tumani 4-maktab", active: false },
  { id: "5", name: "Toshloq tumani 5-maktab", active: false },
  { id: "6", name: "Toshloq tumani 6-maktab", active: false },
  { id: "7", name: "Toshloq tumani 7-maktab", active: false },
  { id: "8", name: "Toshloq tumani 8-maktab", active: false },
];

/* ─────────────────────────────────────────────
   Asosiy komponent
───────────────────────────────────────────── */
export default function Login() {
  const [, setLocation] = useLocation();
  const { login: authLogin } = useAuth();
  const { toast } = useToast();

  const [stage, setStage] = useState<Stage>("landing");
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [botLoginLoading, setBotLoginLoading] = useState(false);
  const [welcomeUser, setWelcomeUser] = useState<{ name: string; role: string } | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportMsg, setSupportMsg] = useState("");
  const [supportName, setSupportName] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportDone, setSupportDone] = useState(false);

  const loginMutation = useLogin();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: "", password: "" },
  });

  /* Bot token orqali kirish */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) return;
    setBotLoginLoading(true);
    fetch(`/api/auth/bot-login?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then((data: Record<string, unknown>) => {
        if (data?.token) {
          authLogin(data as Parameters<typeof authLogin>[0]);
          setWelcomeUser({ name: String(data.full_name ?? "Foydalanuvchi"), role: String(data.role ?? "") });
        } else {
          toast({ variant: "destructive", title: "Havola yaroqsiz", description: "Telegram havolasi muddati o'tgan." });
        }
      })
      .catch(() => toast({ variant: "destructive", title: "Serverga ulanishda xatolik" }))
      .finally(() => setBotLoginLoading(false));
  }, []); // eslint-disable-line

  const handleSupportSubmit = async () => {
    if (supportMsg.trim().length < 5) return;
    setSupportLoading(true);
    try {
      await fetch("/api/support", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: supportMsg.trim(), name: supportName.trim() }),
      });
      setSupportDone(true); setSupportMsg(""); setSupportName("");
    } catch {
      toast({ variant: "destructive", title: "Xabar yuborishda xatolik" });
    } finally { setSupportLoading(false); }
  };

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({ data }, {
      onSuccess: (result: Parameters<typeof authLogin>[0]) => {
        authLogin(result);
        setLoginOpen(false);
        setWelcomeUser({ name: String(result.full_name ?? "Foydalanuvchi"), role: String(result.role ?? "") });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Xatolik", description: "Login yoki parol noto'g'ri" });
      },
    });
  };

  /* ── Foydalanuvchi xush kelibsiz animatsiyasi ── */
  if (welcomeUser) {
    return (
      <WelcomeAnimation
        name={welcomeUser.name}
        role={welcomeUser.role}
        onDone={() => { setWelcomeUser(null); setLocation("/dashboard"); }}
      />
    );
  }

  /* ── Bot login kutish ── */
  if (botLoginLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Telegram orqali kirilmoqda...</p>
      </div>
    );
  }

  /* ── Platform xush kelibsiz animatsiyasi ── */
  if (stage === "platform-welcome") {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <PlatformWelcome onDone={() => setStage("school-select")} />
      </>
    );
  }

  /* ── Maktab tanlash sahifasi ── */
  if (stage === "school-select") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #0a1628 0%, #111f3d 50%, #0d1b2a 100%)",
        display: "flex", flexDirection: "column",
      }}>
        <style>{GLOBAL_CSS}</style>

        {/* Top-bar */}
        <div style={{
          padding: "14px 24px",
          background: "rgba(0,0,0,0.25)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        }}>
          <span style={{ fontSize: 22 }}>🏫</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: "white", fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>
              Toshloq Tumani Platformasi
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
              Farg'ona viloyati · Ta'lim boshqaruvi
            </div>
          </div>
          <button
            onClick={() => { setSupportOpen(true); setSupportDone(false); }}
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "6px 12px", color: "rgba(255,255,255,0.55)",
              fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}
          >
            💬 <span>Yordam</span>
          </button>
        </div>

        {/* Asosiy kontent */}
        <div style={{
          flex: 1, display: "flex", flexWrap: "wrap", gap: 20,
          padding: "24px 20px", maxWidth: 1240, margin: "0 auto", width: "100%",
          boxSizing: "border-box", alignItems: "flex-start",
        }}>

          {/* Chap: Maktablar */}
          <div style={{
            flex: "1 1 380px", minWidth: 280,
            display: "flex", flexDirection: "column", gap: 14,
            animation: "tt-fade-up 0.5s ease both",
          }}>
            <div>
              <h2 style={{
                color: "white", fontWeight: 800, fontSize: "clamp(18px,3vw,26px)",
                margin: "0 0 4px", lineHeight: 1.2,
              }}>
                Maktabni tanlang
              </h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>
                Toshloq tumani maktablari · Kirish uchun maktabingizni bosing
              </p>
            </div>

            {/* Kartalar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {SCHOOLS.map(s => (
                <SchoolCard
                  key={s.id}
                  name={s.name}
                  active={s.active}
                  selected={selectedSchool === s.id}
                  onClick={() => setSelectedSchool(prev => prev === s.id ? null : s.id)}
                  onLogin={() => setLoginOpen(true)}
                  onRegister={() => setLocation("/register")}
                />
              ))}
            </div>

            {/* Admin eslatmasi */}
            <div style={{
              padding: "11px 14px", borderRadius: 12,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.3)", fontSize: 12,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>ℹ️</span>
              <span>Boshqa maktablarni ulash admin tomonidan amalga oshiriladi</span>
            </div>
          </div>

          {/* O'ng: Olimpiada paneli */}
          <div style={{
            flex: "0 1 380px", minWidth: 280,
            animation: "tt-fade-up 0.5s ease 0.12s both",
            alignSelf: "stretch",
          }}>
            <OlimpiyadaPanel />
          </div>
        </div>

        {/* Support dialog */}
        <SupportDialog
          open={supportOpen} done={supportDone}
          msg={supportMsg} name={supportName} loading={supportLoading}
          onClose={() => { setSupportOpen(false); setSupportDone(false); }}
          onSubmit={handleSupportSubmit}
          onMsg={setSupportMsg} onName={setSupportName}
        />

        {/* Login modal */}
        <Dialog open={loginOpen} onOpenChange={o => { setLoginOpen(o); if (!o) form.reset(); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5">
                <span className="text-xl">🏫</span>
                <div>
                  <div className="font-bold text-base leading-tight">Toshloq tumani 3-maktab</div>
                  <div className="text-xs text-muted-foreground font-normal">Tizimga kirish</div>
                </div>
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-1">
                <FormField
                  control={form.control}
                  name="login"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Login</FormLabel>
                      <FormControl>
                        <Input placeholder="login123" autoComplete="username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parol</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" size="lg" disabled={loginMutation.isPending}>
                  {loginMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Kirish
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Akkauntingiz yo'qmi?{" "}
                  <Link
                    href="/register"
                    className="font-medium text-primary hover:underline"
                    onClick={() => setLoginOpen(false)}
                  >
                    Ro'yxatdan o'tish
                  </Link>
                </p>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ── Landing sahifasi (boshlang'ich holat) ── */
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #0a1628 0%, #111f3d 50%, #0d1b2a 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      overflow: "hidden", position: "relative",
    }}>
      <style>{GLOBAL_CSS}</style>

      {/* Grid pattern */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04, pointerEvents: "none" }}>
        <defs>
          <pattern id="tt-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tt-grid)" />
      </svg>

      {/* Halqalar */}
      {[0,1,2,3].map(i => (
        <div key={i} style={{
          position: "absolute", borderRadius: "50%", pointerEvents: "none",
          background: `rgba(99,102,241,${0.05 - i * 0.01})`,
          width: `${280 + i * 160}px`, height: `${280 + i * 160}px`,
          top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        }} />
      ))}

      {/* Asosiy kontent */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", padding: "40px 28px", maxWidth: 500,
        animation: "tt-fade-up 0.7s ease both",
      }}>
        {/* Emoji logo */}
        <div style={{
          fontSize: 80, lineHeight: 1,
          animation: "tt-float 3.5s ease-in-out infinite",
          marginBottom: 28,
          filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.5))",
        }}>
          🏫
        </div>

        {/* Location chip */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.06)", borderRadius: 24,
          padding: "6px 16px", border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.55)", fontSize: 12, letterSpacing: "0.05em",
          marginBottom: 22,
        }}>
          📍 Farg'ona viloyati · Toshloq tumani
        </div>

        {/* Sarlavha */}
        <h1 style={{
          color: "white", fontWeight: 900,
          fontSize: "clamp(30px,7vw,54px)",
          margin: "0 0 14px", lineHeight: 1.08, letterSpacing: "-0.025em",
          textShadow: "0 2px 20px rgba(255,255,255,0.08)",
        }}>
          Toshloq Tumani<br />
          <span style={{
            backgroundImage: "linear-gradient(135deg, #818cf8 0%, #c084fc 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            Platformasi
          </span>
        </h1>

        <p style={{
          color: "rgba(255,255,255,0.5)", fontSize: 15, lineHeight: 1.65,
          margin: "0 0 36px", maxWidth: 360,
        }}>
          Toshloq tumani maktablari uchun ta'lim boshqaruvi,
          olimpiada natijalari va statistika platformasi
        </p>

        {/* Feature grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 8, marginBottom: 36, width: "100%", maxWidth: 380,
        }}>
          {[
            { icon: "🎓", text: "Ta'lim boshqaruvi" },
            { icon: "🏆", text: "Olimpiada.uz" },
            { icon: "📚", text: "Kutubxona" },
            { icon: "📊", text: "Statistika" },
          ].map(f => (
            <div key={f.text} style={{
              background: "rgba(255,255,255,0.045)", borderRadius: 12,
              padding: "11px 14px", border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", gap: 9,
            }}>
              <span style={{ fontSize: 20 }}>{f.icon}</span>
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500 }}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* CTA tugmasi */}
        <button
          onClick={() => setStage("platform-welcome")}
          style={{
            background: "linear-gradient(135deg, #6366f1, #7c3aed)",
            border: "none", borderRadius: 16,
            padding: "16px 44px", color: "white",
            fontSize: 16, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 8px 32px rgba(99,102,241,0.45)",
            display: "flex", alignItems: "center", gap: 10,
            letterSpacing: "-0.01em", transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 12px 40px rgba(99,102,241,0.55)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 32px rgba(99,102,241,0.45)";
          }}
        >
          Platforma kirish
          <ArrowRight size={18} />
        </button>

        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 24 }}>
          Toshloq tumani xalq ta'limi bo'limi © 2026
        </p>
      </div>

      {/* Qo'llab-quvvatlash tugmasi */}
      <button
        onClick={() => { setSupportOpen(true); setSupportDone(false); }}
        style={{
          position: "fixed", bottom: 20, right: 20,
          background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, padding: "8px 14px",
          color: "rgba(255,255,255,0.45)", fontSize: 12, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}
      >
        💬 Qo'llab-quvvatlash
      </button>

      <SupportDialog
        open={supportOpen} done={supportDone}
        msg={supportMsg} name={supportName} loading={supportLoading}
        onClose={() => { setSupportOpen(false); setSupportDone(false); }}
        onSubmit={handleSupportSubmit}
        onMsg={setSupportMsg} onName={setSupportName}
      />
    </div>
  );
}

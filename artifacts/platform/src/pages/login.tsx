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

type Stage = "landing" | "platform-welcome" | "auth-choice" | "user-welcome";

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
   Asosiy komponent
───────────────────────────────────────────── */
export default function Login() {
  const [, setLocation] = useLocation();
  const { login: authLogin } = useAuth();
  const { toast } = useToast();

  const [stage, setStage] = useState<Stage>("landing");
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
        <PlatformWelcome onDone={() => setStage("auth-choice")} />
      </>
    );
  }

  /* ── Kirish / Ro'yxatdan o'tish tanlash ── */
  if (stage === "auth-choice") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #0a1628 0%, #111f3d 50%, #0d1b2a 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "24px", position: "relative", overflow: "hidden",
      }}>
        <style>{GLOBAL_CSS}</style>

        {/* Fon halqalari */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: "absolute", borderRadius: "50%", pointerEvents: "none",
            background: `rgba(99,102,241,${0.06 - i * 0.015})`,
            width: `${260 + i * 180}px`, height: `${260 + i * 180}px`,
            top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          }} />
        ))}

        <div style={{
          position: "relative", zIndex: 1, width: "100%", maxWidth: 380,
          animation: "tt-fade-up 0.5s ease both",
        }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 56, marginBottom: 14, filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.4))" }}>🏫</div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Toshloq tumani 3-maktab</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Davom etish uchun tanlang</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              onClick={() => setLoginOpen(true)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                border: "none", borderRadius: 16, padding: "17px 24px",
                color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
              }}
            >
              <LogIn size={19} /> Kirish
            </button>
            <button
              onClick={() => setLocation("/register")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.15)",
                borderRadius: 16, padding: "17px 24px",
                color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer",
              }}
            >
              <UserPlus size={19} /> Ro'yxatdan o'tish
            </button>
          </div>

          <button
            onClick={() => setStage("landing")}
            style={{
              display: "block", margin: "24px auto 0", background: "none", border: "none",
              color: "rgba(255,255,255,0.35)", fontSize: 13, cursor: "pointer",
            }}
          >
            ← Orqaga
          </button>
        </div>

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

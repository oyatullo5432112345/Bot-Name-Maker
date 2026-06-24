import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { useLogin } from "@workspace/api-client-react";
import { Loader2, MessageCircleQuestion, GraduationCap, BookOpen, Users, Award } from "lucide-react";
import { useEffect, useState } from "react";
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

function SchoolLogo() {
  return (
    <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
      <GraduationCap className="w-9 h-9 text-primary-foreground" />
    </div>
  );
}

function RightPanel() {
  return (
    <div className="hidden lg:flex relative w-0 flex-1 overflow-hidden flex-col items-center justify-center">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700" />

      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white/3 rounded-full -translate-x-1/2 -translate-y-1/2" />

      {/* Grid pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Content */}
      <div className="relative z-10 text-white text-center px-12 max-w-md">
        {/* Big icon */}
        <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
          <GraduationCap className="w-14 h-14 text-white" />
        </div>

        <h1 className="text-4xl font-extrabold mb-3 leading-tight">
          Toshloq tumani<br />3-maktab
        </h1>
        <div className="w-16 h-1 bg-white/40 rounded-full mx-auto mb-5" />
        <p className="text-white/75 text-base leading-relaxed mb-10">
          Farg'ona viloyati Toshloq tumani<br />
          ta'lim boshqaruvi platformasi
        </p>

        {/* Feature cards */}
        <div className="grid grid-cols-2 gap-3 text-left">
          {[
            { icon: Users, title: "O'quvchilar", desc: "Ro'yxat va ma'lumotlar" },
            { icon: BookOpen, title: "Darslik", desc: "Elektron resurslar" },
            { icon: Award, title: "Baholash", desc: "Ball va natijalar" },
            { icon: GraduationCap, title: "Davomat", desc: "Kunlik hisobot" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/10 border border-white/15 rounded-xl p-3 backdrop-blur-sm">
              <Icon className="w-5 h-5 mb-1.5 text-white/80" />
              <div className="text-sm font-semibold">{title}</div>
              <div className="text-xs text-white/60">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: authLogin } = useAuth();
  const { toast } = useToast();
  const [botLoginLoading, setBotLoginLoading] = useState(false);
  const [welcomeUser, setWelcomeUser] = useState<{ name: string; role: string } | null>(null);
  const [pendingLocation, setPendingLocation] = useState("/dashboard");
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportMsg, setSupportMsg] = useState("");
  const [supportName, setSupportName] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportDone, setSupportDone] = useState(false);

  const handleSupportSubmit = async () => {
    if (supportMsg.trim().length < 5) return;
    setSupportLoading(true);
    try {
      await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: supportMsg.trim(), name: supportName.trim() }),
      });
      setSupportDone(true);
      setSupportMsg("");
      setSupportName("");
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Xabar yuborishda xatolik yuz berdi" });
    } finally {
      setSupportLoading(false);
    }
  };

  const loginMutation = useLogin();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: "", password: "" },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) return;
    setBotLoginLoading(true);
    fetch(`/api/auth/bot-login?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data?.token) {
          authLogin(data);
          setWelcomeUser({ name: data.full_name ?? "Foydalanuvchi", role: data.role ?? "" });
          setPendingLocation("/dashboard");
        } else {
          toast({ variant: "destructive", title: "Havola yaroqsiz", description: "Telegram havolasi muddati o'tgan." });
        }
        setBotLoginLoading(false);
      })
      .catch(() => {
        toast({ variant: "destructive", title: "Xatolik", description: "Serverga ulanishda xatolik yuz berdi." });
        setBotLoginLoading(false);
      });
  }, []);

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({ data }, {
      onSuccess: (result) => {
        authLogin(result);
        setWelcomeUser({ name: result.full_name ?? "Foydalanuvchi", role: result.role ?? "" });
        setPendingLocation("/dashboard");
      },
      onError: () => {
        toast({ variant: "destructive", title: "Xatolik", description: "Login yoki parol noto'g'ri" });
      },
    });
  };

  if (welcomeUser) {
    return (
      <WelcomeAnimation
        name={welcomeUser.name}
        role={welcomeUser.role}
        onDone={() => { setWelcomeUser(null); setLocation(pendingLocation); }}
      />
    );
  }

  if (botLoginLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <SchoolLogo />
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Telegram orqali kirilmoqda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left: login form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-6 lg:px-16 xl:px-24 lg:max-w-lg xl:max-w-xl">
        <div className="mx-auto w-full max-w-sm">

          <div className="flex items-center gap-3 mb-8">
            <SchoolLogo />
            <div>
              <div className="font-extrabold text-lg text-foreground leading-tight">Talim Platform</div>
              <div className="text-xs text-muted-foreground">Toshloq tumani 3-maktab</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Tizimga kirish</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Login va parolingizni kiriting
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
            </form>
          </Form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Akkauntingiz yo'qmi?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Ro'yxatdan o'tish
            </Link>
          </p>

          <div className="mt-4 pt-4 border-t text-center">
            <button
              type="button"
              onClick={() => { setSupportOpen(true); setSupportDone(false); }}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <MessageCircleQuestion className="w-4 h-4" />
              Qo'llab-quvvatlash
            </button>
          </div>
        </div>
      </div>

      {/* Right: decorative panel */}
      <RightPanel />

      {/* Support dialog */}
      <Dialog open={supportOpen} onOpenChange={o => { setSupportOpen(o); if (!o) setSupportDone(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircleQuestion className="w-5 h-5 text-primary" />
              Qo'llab-quvvatlash
            </DialogTitle>
          </DialogHeader>
          {supportDone ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-2xl">✅</p>
              <p className="font-semibold">Xabaringiz yuborildi!</p>
              <p className="text-sm text-muted-foreground">Admin tez orada javob beradi.</p>
              <Button className="w-full mt-2" onClick={() => { setSupportOpen(false); setSupportDone(false); }}>Yopish</Button>
            </div>
          ) : (
            <div className="space-y-3 mt-1">
              <Input placeholder="Ismingiz (ixtiyoriy)" value={supportName} onChange={e => setSupportName(e.target.value)} />
              <Textarea placeholder="Savolingiz yoki muammongizni yozing..." rows={4} value={supportMsg} onChange={e => setSupportMsg(e.target.value)} />
              <Button className="w-full" disabled={supportMsg.trim().length < 5 || supportLoading} onClick={handleSupportSubmit}>
                {supportLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Yuborish
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

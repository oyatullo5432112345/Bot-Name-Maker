import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { useListClasses, useListStaff } from "@workspace/api-client-react";
import { Loader2, CheckCircle2, Copy, MapPin, School, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const ROLE_LABELS: Record<string, string> = {
  director: "Direktor",
  zam_direktor: "Direktor o'rinbosari",
  zavuch: "Zavuch",
  sinf_rahbari: "Sinf rahbari",
  teacher: "O'qituvchi",
  kutubxonachi: "Kutubxonachi",
};

const ROLES_WITH_CLASS = ["sinf_rahbari", "teacher"];

function getGrade(className: string): number {
  const match = className.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 99;
}

function isBoshlangich(className: string): boolean {
  return getGrade(className) <= 4;
}

export default function Register() {
  const [, setLocation] = useLocation();
  const { login: authLogin } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [classId, setClassId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ login: string; password: string } | null>(null);

  const { data: classes } = useListClasses({ query: { queryKey: ["classes", "list"] } });
  const { data: staffList } = useListStaff({ query: { queryKey: ["staff", "list"] } });

  const boshlangichClasses = (classes ?? []).filter(c => isBoshlangich(c.name));
  const yuqoriClasses = (classes ?? []).filter(c => !isBoshlangich(c.name));

  const selectedClass = classes?.find(c => c.id === classId);
  const sinfRahbari = staffList?.find(s => s.role === "sinf_rahbari" && s.class_id === classId);

  const needsClass = ROLES_WITH_CLASS.includes(role);

  const canProceedStep1 = role !== "";
  const canProceedStep2 = !needsClass || classId !== "";
  const canSubmit = fullName.trim().length >= 2 && phone.replace(/\D/g, "").length >= 9;

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Nusxalandi!", description: text });
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: "Xatolik", description: data.error ?? "Ro'yxatdan o'tishda xatolik" });
        return;
      }
      setCredentials({ login: data.login, password: data.password });
      authLogin(data);
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Server bilan bog'lanishda muammo" });
    } finally {
      setIsLoading(false);
    }
  };

  if (credentials) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
        <div className="w-full max-w-md bg-card border rounded-xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
            <h2 className="text-2xl font-bold">Muvaffaqiyatli!</h2>
            <p className="text-muted-foreground mt-1">Akkauntingiz yaratildi. Quyidagi ma'lumotlarni saqlang.</p>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border bg-secondary/50 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Login</p>
                <p className="font-mono font-semibold text-lg">{credentials.login}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(credentials.login)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="rounded-lg border bg-secondary/50 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Parol</p>
                <p className="font-mono font-semibold text-lg">{credentials.password}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(credentials.password)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Bu ma'lumotlarni eslab qoling. Keyinchalik faqat shu login va parol orqali kirishingiz mumkin.
          </p>
          <Button className="w-full" onClick={() => setLocation("/dashboard")}>
            Boshqaruv paneliga o'tish
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-secondary/30">
      <div className="flex-1 flex flex-col justify-center py-10 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex justify-center mb-5">
            <img src="/logo.png" alt="Talim Platform" className="h-20 w-auto object-contain" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground text-center">Ro'yxatdan o'tish</h2>
          <p className="mt-1 text-sm text-muted-foreground text-center">Xodim sifatida akkaunt yarating</p>

          <div className="mt-6 space-y-5">

            {/* Avto ma'lumotlar */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-card p-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Tuman</p>
                  <p className="text-sm font-medium">Toshloq</p>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3 flex items-center gap-2">
                <School className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Maktab</p>
                  <p className="text-sm font-medium">3-maktab</p>
                </div>
              </div>
            </div>

            {/* Rol */}
            <div className="space-y-1.5">
              <Label>Lavozim</Label>
              <Select value={role} onValueChange={(v) => { setRole(v); setClassId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Lavozimingizni tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sinf (faqat sinf_rahbari va teacher uchun) */}
            {needsClass && (
              <div className="space-y-1.5">
                <Label>Sinf</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sinfni tanlang..." />
                  </SelectTrigger>
                  <SelectContent>
                    {boshlangichClasses.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Boshlang'ich (1–4 sinf)</SelectLabel>
                        {boshlangichClasses
                          .sort((a, b) => getGrade(a.name) - getGrade(b.name) || a.name.localeCompare(b.name))
                          .map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                      </SelectGroup>
                    )}
                    {yuqoriClasses.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Yuqori (5+ sinf)</SelectLabel>
                        {yuqoriClasses
                          .sort((a, b) => getGrade(a.name) - getGrade(b.name) || a.name.localeCompare(b.name))
                          .map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sinf rahbari info */}
            {classId && (
              <div className="rounded-lg border bg-primary/5 border-primary/20 p-3 flex items-center gap-3">
                <Users className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Sinf rahbari</p>
                  <p className="text-sm font-medium">
                    {sinfRahbari ? sinfRahbari.full_name : <span className="text-muted-foreground italic">Belgilanmagan</span>}
                  </p>
                </div>
              </div>
            )}

            {/* Ism Familiya */}
            {(role && (!needsClass || classId)) && (
              <div className="space-y-1.5">
                <Label>Ism Familiya</Label>
                <Input
                  placeholder="Valiyev Valijon"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>
            )}

            {/* Telefon raqam */}
            {fullName.trim().length >= 2 && (
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
            )}

            {/* Submit */}
            {role && (
              <Button
                className="w-full mt-2"
                disabled={!canSubmit || isLoading}
                onClick={handleSubmit}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Ro'yxatdan o'tish
              </Button>
            )}

            <p className="text-center text-sm text-muted-foreground">
              Akkauntingiz bormi?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Tizimga kirish
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex relative w-0 flex-1 bg-primary flex-col items-center justify-center p-12">
        <img src="/logo.png" alt="Talim Platform" className="w-72 h-auto object-contain mb-8 drop-shadow-2xl" />
        <div className="text-primary-foreground text-center max-w-md">
          <h1 className="text-4xl font-bold mb-4">Toshloq tumani 3-maktab</h1>
          <p className="text-lg opacity-80">
            Yagona ta'lim boshqaruvi platformasi. Xodimlar va dars jarayonlarini samarali nazorat qiling.
          </p>
        </div>
      </div>
    </div>
  );
}

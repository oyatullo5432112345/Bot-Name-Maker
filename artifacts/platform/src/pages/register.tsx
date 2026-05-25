import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { useListClasses, useListStaff } from "@workspace/api-client-react";
import { Loader2, CheckCircle2, Copy, UserPlus, Users, Shield } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const ROLE_LABELS: Record<string, string> = {
  director: "Direktor",
  zam_direktor: "Direktor o'rinbosari",
  zavuch: "Zavuch",
  kutubxonachi: "Kutubxonachi",
};

const SINGLE_SLOT_ROLES = ["director", "zam_direktor", "zavuch", "kutubxonachi"];

function getGrade(className: string): number {
  const match = className.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 99;
}

function isBoshlangich(className: string): boolean {
  return getGrade(className) <= 4;
}

function copyToClipboardFn(text: string, toast: ReturnType<typeof useToast>["toast"]) {
  navigator.clipboard.writeText(text);
  toast({ title: "Nusxalandi!", description: text });
}

function CredentialsView({
  credentials,
  onClose,
  onDashboard,
}: {
  credentials: { login: string; password: string };
  onClose?: () => void;
  onDashboard?: () => void;
}) {
  const { toast } = useToast();
  return (
    <div className="space-y-4">
      <div className="text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
        <p className="text-lg font-semibold">Muvaffaqiyatli!</p>
        <p className="text-sm text-muted-foreground">Akkauntingiz yaratildi. Ma'lumotlarni saqlang</p>
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
      {onDashboard && (
        <Button className="w-full" onClick={onDashboard}>
          Boshqaruv paneliga o'tish
        </Button>
      )}
      {onClose && (
        <Button className="w-full" onClick={onClose}>Yopish</Button>
      )}
    </div>
  );
}

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
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ login: string; password: string } | null>(null);

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
      onSuccess();
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Server bilan bog'lanishda muammo" });
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = fullName.trim().length >= 2 && phone.replace(/\D/g, "").length >= 9;

  const handleClose = () => {
    setFullName("");
    setPhone("");
    setCredentials(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{roleLabel} sifatida ro'yxatdan o'tish</DialogTitle>
          {classNameProp && (
            <DialogDescription>{classNameProp} sinfi sinf rahbari</DialogDescription>
          )}
        </DialogHeader>
        {credentials ? (
          <CredentialsView credentials={credentials} onClose={handleClose} />
        ) : (
          <div className="space-y-4">
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
            <Button className="w-full" disabled={!canSubmit || isLoading} onClick={handleSubmit}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Ro'yxatdan o'tish
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StudentRegister() {
  const { login: authLogin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: classes } = useListClasses({ query: { queryKey: ["classes", "list"] } });

  const boshlangichClasses = (classes ?? []).filter(c => isBoshlangich(c.name));
  const yuqoriClasses = (classes ?? []).filter(c => !isBoshlangich(c.name));

  const [classId, setClassId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loginVal, setLoginVal] = useState("");
  const [passwordVal, setPasswordVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ login: string; password: string } | null>(null);

  const selectedClass = classes?.find(c => c.id === classId);

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

  const canSubmit = !!(classId && fullName.trim().length >= 2 && phone.replace(/\D/g, "").length >= 9 && loginVal.trim().length >= 3 && passwordVal.length >= 4);

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
    return <CredentialsView credentials={credentials} onDashboard={() => setLocation("/dashboard")} />;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Sinf</Label>
        <Select value={classId} onValueChange={v => { setClassId(v); }}>
          <SelectTrigger>
            <SelectValue placeholder="Sinfni tanlang..." />
          </SelectTrigger>
          <SelectContent>
            {boshlangichClasses.length > 0 && (
              <SelectGroup>
                <SelectLabel>Boshlang'ich (1–4 sinf)</SelectLabel>
                {boshlangichClasses
                  .sort((a, b) => getGrade(a.name) - getGrade(b.name) || a.name.localeCompare(b.name))
                  .map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectGroup>
            )}
            {yuqoriClasses.length > 0 && (
              <SelectGroup>
                <SelectLabel>Yuqori (5+ sinf)</SelectLabel>
                {yuqoriClasses
                  .sort((a, b) => getGrade(a.name) - getGrade(b.name) || a.name.localeCompare(b.name))
                  .map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
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
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Ro'yxatdan o'tish
      </Button>
    </div>
  );
}

export default function Register() {
  const { data: classes, refetch: refetchClasses } = useListClasses({ query: { queryKey: ["classes", "list"] } });
  const { data: staffList, refetch: refetchStaff } = useListStaff({ query: { queryKey: ["staff", "list"] } });

  const [modalRole, setModalRole] = useState<string | null>(null);
  const [modalClassId, setModalClassId] = useState<string | undefined>(undefined);

  const allClasses = (classes ?? []).sort((a, b) => getGrade(a.name) - getGrade(b.name) || a.name.localeCompare(b.name));

  const takenSingleRoles = new Set(
    (staffList ?? []).filter(s => SINGLE_SLOT_ROLES.includes(s.role)).map(s => s.role)
  );

  const takenClassIds = new Set(
    (staffList ?? []).filter(s => s.role === "sinf_rahbari" && s.class_id).map(s => s.class_id!)
  );

  const getStaffForRole = (role: string) => staffList?.find(s => s.role === role);
  const getSinfRahbariForClass = (cId: string) => staffList?.find(s => s.role === "sinf_rahbari" && s.class_id === cId);

  const openModal = (role: string, cId?: string) => {
    setModalRole(role);
    setModalClassId(cId);
  };

  const closeModal = () => {
    setModalRole(null);
    setModalClassId(undefined);
    void refetchStaff();
  };

  const activeClass = modalClassId ? classes?.find(c => c.id === modalClassId) : undefined;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* LEFT: O'quvchi ro'yxatdan o'tish */}
      <div className="flex-1 flex flex-col justify-center py-10 px-6 sm:px-10 lg:px-14 xl:px-20 border-b lg:border-b-0 lg:border-r bg-secondary/20">
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

      {/* RIGHT: Mas'ul shaxslar ro'yxati */}
      <div className="flex-1 flex flex-col py-10 px-6 sm:px-10 lg:px-14 xl:px-20 bg-card">
        <div className="mx-auto w-full max-w-sm">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Mas'ul shaxslar ro'yxati</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">Bo'sh lavozimga ro'yxatdan o'ting</p>

          <div className="space-y-2">
            {SINGLE_SLOT_ROLES.map(role => {
              const person = getStaffForRole(role);
              return (
                <div
                  key={role}
                  className={`rounded-lg border p-3 flex items-center justify-between gap-2 ${person ? "bg-secondary/30 opacity-80" : "bg-background"}`}
                >
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
                    <p className={`text-sm font-medium truncate ${!person ? "text-muted-foreground italic" : ""}`}>
                      {person ? person.full_name : "Bo'sh"}
                    </p>
                  </div>
                  {!person ? (
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => openModal(role)}>
                      <UserPlus className="w-3 h-3 mr-1" />
                      O'tish
                    </Button>
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  )}
                </div>
              );
            })}

            {allClasses.length > 0 && (
              <>
                <div className="pt-3 pb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sinf rahbarlari</p>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                  {allClasses.map(cls => {
                    const rahbar = getSinfRahbariForClass(cls.id);
                    return (
                      <div
                        key={cls.id}
                        className={`rounded-lg border p-3 flex items-center justify-between gap-2 ${rahbar ? "bg-secondary/30 opacity-80" : "bg-background"}`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{cls.name} sinfi</p>
                          <p className={`text-sm font-medium truncate ${!rahbar ? "text-muted-foreground italic" : ""}`}>
                            {rahbar ? rahbar.full_name : "Bo'sh"}
                          </p>
                        </div>
                        {!rahbar ? (
                          <Button size="sm" variant="outline" className="shrink-0" onClick={() => openModal("sinf_rahbari", cls.id)}>
                            <UserPlus className="w-3 h-3 mr-1" />
                            O'tish
                          </Button>
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {modalRole && (
        <StaffRegisterModal
          open={!!modalRole}
          onClose={closeModal}
          role={modalRole}
          roleLabel={modalRole === "sinf_rahbari" ? "Sinf rahbari" : ROLE_LABELS[modalRole] ?? modalRole}
          classId={modalClassId}
          className={activeClass?.name}
          onSuccess={() => void refetchStaff()}
        />
      )}
    </div>
  );
}

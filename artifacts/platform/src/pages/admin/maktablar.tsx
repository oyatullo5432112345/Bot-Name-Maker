import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Plus, UserPlus, Users, GraduationCap, School, Loader2,
  Copy, Check, Trash2, KeyRound, ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
};

interface Maktab {
  id: string; name: string; slug: string; address: string; created_at: string;
  students: number; classes: number; staff: number;
  director_name: string | null; director_login: string | null; is_default: boolean;
}
interface NewDirector {
  id: string; full_name: string; login: string; password: string; login_id: string;
  maktab_id: string; maktab_name: string;
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ } }}
      className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-muted transition-colors shrink-0"
      title="Nusxa olish"
    >
      {done ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

export default function MaktablarPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [creating, setCreating] = useState(false);

  // Direktor biriktirish dialog holati
  const [dirFor, setDirFor] = useState<Maktab | null>(null);
  const [dirName, setDirName] = useState("");
  const [savingDir, setSavingDir] = useState(false);
  const [newCreds, setNewCreds] = useState<NewDirector | null>(null);

  const { data: maktablar, isLoading } = useQuery<Maktab[]>({
    queryKey: ["maktablar"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/maktablar`, { headers: authH() });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["maktablar"] });

  const addSchool = async () => {
    if (name.trim().length < 2) { toast({ variant: "destructive", title: "Maktab nomini kiriting" }); return; }
    setCreating(true);
    try {
      const r = await fetch(`${API_BASE}/maktablar`, { method: "POST", headers: authH(), body: JSON.stringify({ name: name.trim(), address: address.trim() }) });
      const json = await r.json();
      if (!r.ok) { toast({ variant: "destructive", title: "Xatolik", description: json.error }); return; }
      toast({ title: "Maktab qo'shildi", description: json.name });
      setName(""); setAddress("");
      refresh();
    } finally { setCreating(false); }
  };

  const openDirector = (m: Maktab) => { setDirFor(m); setDirName(""); setNewCreds(null); };

  const saveDirector = async () => {
    if (!dirFor) return;
    if (dirName.trim().length < 3) { toast({ variant: "destructive", title: "Ism-familiyani to'liq kiriting" }); return; }
    setSavingDir(true);
    try {
      const r = await fetch(`${API_BASE}/maktablar/${dirFor.id}/director`, { method: "POST", headers: authH(), body: JSON.stringify({ full_name: dirName.trim() }) });
      const json = await r.json();
      if (!r.ok) { toast({ variant: "destructive", title: "Xatolik", description: json.error }); return; }
      setNewCreds(json as NewDirector);
      refresh();
    } finally { setSavingDir(false); }
  };

  const deleteSchool = async (m: Maktab) => {
    const r = await fetch(`${API_BASE}/maktablar/${m.id}`, { method: "DELETE", headers: authH() });
    if (!r.ok) { const j = await r.json().catch(() => ({})); toast({ variant: "destructive", title: "O'chirib bo'lmadi", description: j.error }); return; }
    toast({ title: "Maktab o'chirildi" });
    refresh();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-600" /> Maktablar
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Har bir maktab o'z o'quvchilari, sinflari va xodimlari bilan alohida ishlaydi. Yangi maktab oching va unga direktor biriktiring — direktor o'z maktabini mustaqil boshqaradi.
        </p>
      </div>

      {/* Yangi maktab */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Yangi maktab qo'shish</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Maktab nomi (masalan: 1-maktab)" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Manzil (ixtiyoriy)" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <Button onClick={addSchool} disabled={creating} className="gap-2">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Qo'shish
          </Button>
        </CardContent>
      </Card>

      {/* Ro'yxat */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {(maktablar ?? []).map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
                    <School className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{m.name}</p>
                      {m.is_default && <Badge variant="secondary" className="text-[10px]">Asosiy</Badge>}
                    </div>
                    {m.address && <p className="text-xs text-muted-foreground">{m.address}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span className="inline-flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> {m.students} o'quvchi</span>
                      <span className="inline-flex items-center gap-1"><School className="w-3.5 h-3.5" /> {m.classes} sinf</span>
                      <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {m.staff} xodim</span>
                    </div>
                  </div>
                  {!m.is_default && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-red-600" title="Maktabni o'chirish">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>"{m.name}"ni o'chirasizmi?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Maktab va uning sinflari/xodimlari o'chiriladi. O'quvchilari bo'lsa, avval ularni o'chirish kerak. Bu amalni ortga qaytarib bo'lmaydi.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteSchool(m)} className="bg-destructive hover:bg-destructive/90">O'chirish</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>

                {/* Direktor qatori */}
                <div className="flex items-center gap-2 border-t pt-3">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                  {m.director_name ? (
                    <p className="text-sm flex-1 min-w-0">
                      Direktor: <span className="font-medium">{m.director_name}</span>
                      <span className="text-muted-foreground"> · login: {m.director_login}</span>
                    </p>
                  ) : (
                    <p className="text-sm flex-1 text-amber-600">Direktor biriktirilmagan</p>
                  )}
                  {!m.director_name && (
                    <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => openDirector(m)}>
                      <UserPlus className="w-3.5 h-3.5" /> Direktor biriktirish
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {(maktablar ?? []).length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">Hali maktab yo'q</p>
          )}
        </div>
      )}

      {/* Direktor biriktirish dialogi */}
      <Dialog open={!!dirFor} onOpenChange={(o) => { if (!o) { setDirFor(null); setNewCreds(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dirFor?.name} — direktor biriktirish</DialogTitle>
            <DialogDescription>
              {newCreds
                ? "Direktor yaratildi. Quyidagi ma'lumotlarni direktorga bering — bu oyna yopilgach parol qayta ko'rsatilmaydi."
                : "Direktorning ism-familiyasini kiriting. Login, parol va 5 xonali ID avtomatik yaratiladi."}
            </DialogDescription>
          </DialogHeader>

          {!newCreds ? (
            <div className="space-y-3">
              <Input placeholder="Direktor ism-familiyasi" value={dirName} onChange={(e) => setDirName(e.target.value)} autoFocus />
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <CredRow label="Login" value={newCreds.login} />
              <CredRow label="Parol" value={newCreds.password} />
              <CredRow label="5 xonali ID" value={newCreds.login_id} />
              <p className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
                <KeyRound className="w-3 h-3" /> Direktor shu login+parol bilan yoki 5 xonali ID bilan tizimga kiradi.
              </p>
            </div>
          )}

          <DialogFooter>
            {!newCreds ? (
              <Button onClick={saveDirector} disabled={savingDir} className="gap-2">
                {savingDir ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Yaratish
              </Button>
            ) : (
              <Button onClick={() => { setDirFor(null); setNewCreds(null); }}>Yopish</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CredRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-24 shrink-0">{label}:</span>
      <span className="font-mono font-semibold flex-1 min-w-0 break-all">{value}</span>
      <CopyBtn text={value} />
    </div>
  );
}

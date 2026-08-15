import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, KeyRound, School, Gamepad2, Users, ClipboardCheck, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const CATEGORIES = [
  { key: "mahfiy_kodlar", label: "Mahfiy kodlar", desc: "Barcha yaratilgan ro'yxatdan o'tish kodlari", icon: KeyRound },
  { key: "sinflar", label: "Sinflar", desc: "Barcha sinflar (xodimlarning sinf biriktiruvi ham tozalanadi)", icon: School },
  { key: "oyinlar", label: "O'yinlar", desc: "Bilim Arenasi va G'ildirak — barcha o'yinlar va ochkolar", icon: Gamepad2 },
  { key: "xodimlar", label: "Xodimlar ro'yxati", desc: "Admin'dan boshqa barcha xodimlar (o'qituvchi, direktor va h.k.)", icon: Users },
  { key: "monitoring", label: "Monitoring testlari", desc: "Barcha testlar, savollar va natijalar", icon: ClipboardCheck },
] as const;

export default function AdminResetPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const { data: counts, isLoading } = useQuery<Record<string, number>>({
    queryKey: ["admin-reset-counts"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/admin/reset/counts`, { headers: authH() });
      if (!r.ok) return {};
      return r.json();
    },
  });

  const handleReset = async (key: string) => {
    setLoadingKey(key);
    try {
      const r = await fetch(`${API_BASE}/admin/reset/${key}`, { method: "POST", headers: authH() });
      const json = await r.json();
      if (!r.ok) { toast({ variant: "destructive", title: "Xatolik", description: json.error }); return; }
      toast({ title: "Tozalandi" });
      qc.invalidateQueries({ queryKey: ["admin-reset-counts"] });
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-500" /> Xavfli zona
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sinov (test) maqsadida ma'lumotlarni tezda tozalash uchun. Har bir tugma faqat o'sha toifani butunlay o'chiradi — ortga qaytarib bo'lmaydi.
        </p>
      </div>

      <div className="space-y-3">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const count = counts?.[cat.key] ?? 0;
          return (
            <Card key={cat.key} className="border-red-100">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">{cat.desc}</p>
                  {!isLoading && <p className="text-xs text-red-500 font-medium mt-0.5">{count} ta yozuv</p>}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={loadingKey === cat.key || count === 0} className="gap-1.5 shrink-0">
                      {loadingKey === cat.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Tozalash
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{cat.label}ni butunlay o'chirasizmi?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {count} ta yozuv butunlay o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleReset(cat.key)} className="bg-destructive hover:bg-destructive/90">
                        Ha, o'chirish
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

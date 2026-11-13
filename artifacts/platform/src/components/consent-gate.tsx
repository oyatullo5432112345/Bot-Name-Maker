// Birinchi kirishda platforma qoidalarini imzolash. Imzolanmaguncha sahifa ochilmaydi.
// Admin uchun ko'rsatilmaydi.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ScrollText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/use-auth";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const authJson = (): HeadersInit => {
  const t = localStorage.getItem("talim_auth_token");
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

export const PLATFORM_RULES: { title: string; items: string[] }[] = [
  {
    title: "1. Umumiy qoidalar",
    items: [
      "Platforma faqat ta'lim jarayoni uchun ishlatiladi.",
      "Hisob ma'lumotlari (login, parol, 5 xonali ID) boshqalarga berilmaydi.",
    ],
  },
  {
    title: "2. Muloqot odobi",
    items: [
      "Barcha xabarlarda hurmatli muloqot qilinadi. So'kinish va haqoratli so'zlar taqiqlanadi.",
      "Boshqa foydalanuvchilarni kamsitish, tahqirlash yoki qo'rqitish taqiqlanadi.",
    ],
  },
  {
    title: "3. Shaxsiy ma'lumotlar",
    items: [
      "Shaxsiy ma'lumotlar faqat tegishli vakolatga ega xodimlar tomonidan ko'riladi.",
      "Boshqa shaxslarning ma'lumotlarini ruxsatsiz tarqatish taqiqlanadi.",
    ],
  },
  {
    title: "4. Face ID (yuz orqali davomat)",
    items: [
      "Yuz ma'lumoti faqat ota-ona (yoki o'quvchining o'zi) roziligi imzolangandan keyin olinadi.",
      "Rasm saqlanmaydi, faqat yuzning raqamli izi saqlanadi.",
      "Rozilik istalgan vaqtda bekor qilinishi va ma'lumot o'chirilishi mumkin.",
    ],
  },
  {
    title: "5. Javobgarlik",
    items: [
      "Qoidani takror buzgan foydalanuvchining kirish huquqi cheklanishi mumkin.",
      "Jiddiy holatlar amaldagi qonun hujjatlariga muvofiq vakolatli organlarga yuboriladi.",
    ],
  },
];

export function RulesBody() {
  return (
    <div className="space-y-4">
      {PLATFORM_RULES.map((sec) => (
        <div key={sec.title}>
          <div className="font-semibold text-sm mb-1">{sec.title}</div>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            {sec.items.map((it) => <li key={it}>{it}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function ConsentGate() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [signerType, setSignerType] = useState<"self" | "parent">("self");
  const [name, setName] = useState("");
  const [sig, setSig] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  const status = useQuery<{ rules_required: boolean; rules_done: boolean }>({
    queryKey: ["consent-status"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/consent/status`, { headers: authJson() });
      return r.json();
    },
    enabled: !!user && user.role !== "admin",
    staleTime: 60_000,
  });

  if (!user || user.role === "admin") return null;
  if (!status.data || status.data.rules_done || !status.data.rules_required) return null;

  const valid = agree && name.trim().length >= 5 && sig.trim().toUpperCase() === name.trim().toUpperCase();

  const submit = async () => {
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/consent/accept`, {
        method: "POST", headers: authJson(),
        body: JSON.stringify({ signer_type: signerType, signer_name: name.trim(), signature: sig.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d as { error?: string }).error ?? `Xatolik (${r.status})`);
      toast({ title: "Qoidalar imzolandi ✅" });
      await qc.invalidateQueries({ queryKey: ["consent-status"] });
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl border bg-card shadow-2xl p-5 sm:p-7 space-y-5 my-auto">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><ScrollText className="w-6 h-6" /></div>
          <div>
            <h2 className="text-lg font-bold">Platforma qoidalari</h2>
            <p className="text-xs text-muted-foreground">Davom etish uchun qoidalarni o'qib, imzolang</p>
          </div>
        </div>

        <div className="max-h-[42vh] overflow-y-auto rounded-xl border bg-muted/30 p-4"><RulesBody /></div>

        <div className="space-y-3">
          <div className="text-sm font-semibold">Kim imzolayapti?</div>
          <div className="grid grid-cols-2 gap-2">
            {([["self", "O'zim (o'quvchi / xodim)"], ["parent", "Ota-ona (vakil)"]] as const).map(([v, label]) => (
              <button key={v} type="button" onClick={() => setSignerType(v)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${signerType === v ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{signerType === "parent" ? "Ota-ona (vakil) ism-familiyasi" : "Ism-familiyangiz"}</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Familiya Ism Otasining ismi" />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Elektron imzo: yuqoridagi ism-familiyani shu yerga aynan yozing</div>
            <Input value={sig} onChange={(e) => setSig(e.target.value)} placeholder="Imzo" className="font-serif italic" />
          </div>
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input type="checkbox" className="mt-1 h-4 w-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>Men qoidalar bilan tanishdim va ularga roziman.</span>
          </label>
        </div>

        <Button className="w-full h-11" disabled={!valid || busy} onClick={() => void submit()}>
          {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Imzolash va davom etish
        </Button>
      </div>
    </div>
  );
}

// Face ID davomat xabarlarini pauza qilish: global (faqat admin) va har maktab uchun.
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { BellOff, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const authJson = (): HeadersInit => {
  const t = localStorage.getItem("talim_auth_token");
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

interface PauseState { global: boolean; school: boolean; can_global: boolean; has_school: boolean }

export function MsgPauseCard() {
  const [st, setSt] = useState<PauseState | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const r = await fetch(`${API_BASE}/faceid/msg-pause`, { headers: authJson() });
      if (r.ok) { setSt(await r.json()); setErr(""); }
      else if (r.status === 404) setErr("Server eski: /faceid/msg-pause topilmadi (404). API (faceid.ts) yangilanmagan yoki qayta ishga tushmagan.");
      else if (r.status === 403) setErr("Ruxsat yo'q (403). Admin yoki direktor akkaunti bilan kiring.");
      else setErr(`Server xatosi (${r.status}). Bazada face_msg_pause jadvali borligini tekshiring.`);
    } catch (e) { setErr("Serverga ulanib bo'lmadi: " + (e as Error).message); }
  };
  useEffect(() => { void load(); }, []);

  const set = async (scope: "global" | "school", paused: boolean) => {
    setBusy(scope);
    try {
      const r = await fetch(`${API_BASE}/faceid/msg-pause`, {
        method: "POST", headers: authJson(), body: JSON.stringify({ scope, paused }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d as { error?: string }).error ?? `Xatolik (${r.status})`);
      toast({ title: paused ? "Xabarlar pauzaga qo'yildi" : "Xabarlar yoqildi" });
      await load();
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally {
      setBusy("");
    }
  };

  if (!st) {
    return (
      <Card className="mb-4 border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BellOff className="w-5 h-5 text-amber-600" /> Davomat xabarlari
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {err ? <span className="text-amber-700 dark:text-amber-300">{err}</span> : <Loader2 className="w-4 h-4 animate-spin" />}
        </CardContent>
      </Card>
    );
  }
  const anyPaused = st.global || st.school;

  return (
    <Card className={`mb-4 ${anyPaused ? "border-amber-500/40 bg-amber-500/5" : ""}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BellOff className="w-5 h-5 text-amber-600" /> Davomat xabarlari
          {anyPaused && <span className="text-xs font-normal text-amber-600">pauzada</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Pauzada bo'lsa, Face ID bo'yicha Telegram xabarlari (keldi/ketdi, sinf guruhi, kunlik xulosa,
          kelmaganlar) yuborilmaydi. Ma'lumotlar baribir saqlanadi.
        </p>

        {st.can_global && (
          <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <div>
              <div className="text-sm font-semibold">Barcha maktablar</div>
              <div className="text-xs text-muted-foreground">Umumiy pauza (faqat admin)</div>
            </div>
            <div className="flex items-center gap-2">
              {busy === "global" && <Loader2 className="w-4 h-4 animate-spin" />}
              <Switch checked={st.global} disabled={busy !== ""} onCheckedChange={(v) => void set("global", v)} />
            </div>
          </div>
        )}

        {st.has_school && (
          <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <div>
              <div className="text-sm font-semibold">Bu maktab</div>
              <div className="text-xs text-muted-foreground">Faqat shu maktab xabarlari</div>
            </div>
            <div className="flex items-center gap-2">
              {busy === "school" && <Loader2 className="w-4 h-4 animate-spin" />}
              <Switch checked={st.school} disabled={busy !== ""} onCheckedChange={(v) => void set("school", v)} />
            </div>
          </div>
        )}

        {st.global && (
          <p className="text-xs text-amber-700 dark:text-amber-300">Umumiy pauza yoqilgan: barcha maktablarda xabarlar to'xtagan.</p>
        )}
      </CardContent>
    </Card>
  );
}

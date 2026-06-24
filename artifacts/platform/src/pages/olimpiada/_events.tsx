import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/use-auth";
import {
  Plus, Search, Filter, CalendarDays, Users, Trophy,
  Pencil, Trash2, ChevronRight, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import EventDetail from "./_event-detail";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const authH = (): HeadersInit => {
  const t = localStorage.getItem("talim_auth_token");
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

export interface OlimpiadEvent {
  id: string; nomi: string; fan: string; bosqich: string; holat: string;
  sana_boshlanish: string | null; sana_tugash: string | null; roy_tugash: string | null;
  joy: string; max_qatnashchi: number; sinf_from: number; sinf_to: number;
  tavsif: string; yil: number; created_by: string; created_at: string;
  qatnashchi_soni: number | string;
}

const FANLAR = [
  "Matematika","Fizika","Kimyo","Biologiya","Informatika","Ingliz tili",
  "Rus tili","Ona tili va adabiyot","Tarix","Geografiya","Huquq","Iqtisodiyot",
  "Astronomiya","Chizmachilik","Texnologiya",
];
const FAN_ICON: Record<string, string> = {
  Matematika: "∑", Fizika: "⚛", Kimyo: "🧪", Biologiya: "🧬",
  Informatika: "💻", "Ingliz tili": "🌐", "Rus tili": "📖",
  "Ona tili va adabiyot": "📝", Tarix: "📜", Geografiya: "🗺",
  Huquq: "⚖", Iqtisodiyot: "📊", Astronomiya: "🔭",
  Chizmachilik: "📐", Texnologiya: "🔧",
};
const BOSQICHLAR = ["maktab", "tuman", "viloyat", "respublika"];
const HOLAT_LABEL: Record<string, { label: string; color: string }> = {
  royhat_ochiq:      { label: "Ro'yxat ochiq",        color: "bg-green-100 text-green-700 border-green-200" },
  tugagan:           { label: "Tugagan",               color: "bg-gray-100 text-gray-600 border-gray-200" },
  natijalar_ellon:   { label: "Natijalar e'lon qilindi", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
};
const BOSQICH_COLOR: Record<string, string> = {
  maktab:     "bg-blue-100 text-blue-700",
  tuman:      "bg-violet-100 text-violet-700",
  viloyat:    "bg-orange-100 text-orange-700",
  respublika: "bg-red-100 text-red-700",
};

function formatDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" });
}

interface FormState {
  nomi: string; fan: string; bosqich: string; holat: string;
  sana_boshlanish: string; sana_tugash: string; roy_tugash: string;
  joy: string; max_qatnashchi: string; sinf_from: string; sinf_to: string;
  tavsif: string; yil: string;
}
const EMPTY_FORM: FormState = {
  nomi: "", fan: FANLAR[0], bosqich: "maktab", holat: "royhat_ochiq",
  sana_boshlanish: "", sana_tugash: "", roy_tugash: "",
  joy: "", max_qatnashchi: "0", sinf_from: "1", sinf_to: "11",
  tavsif: "", yil: String(new Date().getFullYear()),
};

export default function EventsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = user?.role === "admin" || user?.role === "mudir";

  const [events, setEvents] = useState<OlimpiadEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterFan, setFilterFan] = useState("");
  const [filterBosqich, setFilterBosqich] = useState("");
  const [filterHolat, setFilterHolat] = useState("");

  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<OlimpiadEvent | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterFan) params.set("fan", filterFan);
      if (filterBosqich) params.set("bosqich", filterBosqich);
      if (filterHolat) params.set("holat", filterHolat);
      const r = await fetch(`${API}/olimpiada/events?${params}`, { headers: authH() });
      const d = await r.json() as unknown;
      setEvents(Array.isArray(d) ? d as OlimpiadEvent[] : []);
    } catch { toast({ variant: "destructive", title: "Yuklab bo'lmadi" }); }
    finally { setLoading(false); }
  }, [filterFan, filterBosqich, filterHolat, toast]);

  useEffect(() => { void load(); }, [load]);

  const filtered = events.filter(e =>
    !search || e.nomi.toLowerCase().includes(search.toLowerCase()) ||
    e.fan.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setDialog(true); }
  function openEdit(e: OlimpiadEvent) {
    setEditing(e);
    setForm({
      nomi: e.nomi, fan: e.fan, bosqich: e.bosqich, holat: e.holat,
      sana_boshlanish: e.sana_boshlanish ? e.sana_boshlanish.slice(0,10) : "",
      sana_tugash: e.sana_tugash ? e.sana_tugash.slice(0,10) : "",
      roy_tugash: e.roy_tugash ? e.roy_tugash.slice(0,10) : "",
      joy: e.joy, max_qatnashchi: String(e.max_qatnashchi),
      sinf_from: String(e.sinf_from), sinf_to: String(e.sinf_to),
      tavsif: e.tavsif, yil: String(e.yil),
    });
    setDialog(true);
  }

  async function save() {
    if (!form.nomi.trim() || !form.fan) {
      toast({ variant: "destructive", title: "Nomi va fan majburiy" }); return;
    }
    setSaving(true);
    const body = {
      nomi: form.nomi.trim(), fan: form.fan, bosqich: form.bosqich, holat: form.holat,
      sana_boshlanish: form.sana_boshlanish || null, sana_tugash: form.sana_tugash || null,
      roy_tugash: form.roy_tugash || null, joy: form.joy,
      max_qatnashchi: Number(form.max_qatnashchi), sinf_from: Number(form.sinf_from),
      sinf_to: Number(form.sinf_to), tavsif: form.tavsif, yil: Number(form.yil),
    };
    try {
      if (editing) {
        await fetch(`${API}/olimpiada/events/${editing.id}`, { method: "PATCH", headers: authH(), body: JSON.stringify(body) });
        toast({ title: "Yangilandi ✅" });
      } else {
        await fetch(`${API}/olimpiada/events`, { method: "POST", headers: authH(), body: JSON.stringify(body) });
        toast({ title: "Tanlov yaratildi ✅" });
      }
      setDialog(false);
      void load();
    } catch { toast({ variant: "destructive", title: "Xatolik yuz berdi" }); }
    finally { setSaving(false); }
  }

  async function del(e: OlimpiadEvent) {
    if (!confirm(`"${e.nomi}" tanlovini o'chirasizmi? Barcha ro'yxat va natijalar ham o'chadi.`)) return;
    await fetch(`${API}/olimpiada/events/${e.id}`, { method: "DELETE", headers: authH() });
    toast({ title: "O'chirildi" }); void load();
  }

  if (selectedId) {
    return <EventDetail eventId={selectedId} onBack={() => { setSelectedId(null); void load(); }} />;
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Tanlov yoki fan nomi..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select
          className="border rounded-lg px-3 py-2 text-sm bg-background"
          value={filterFan} onChange={e => setFilterFan(e.target.value)}
        >
          <option value="">Barcha fanlar</option>
          {FANLAR.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          className="border rounded-lg px-3 py-2 text-sm bg-background"
          value={filterBosqich} onChange={e => setFilterBosqich(e.target.value)}
        >
          <option value="">Barcha bosqichlar</option>
          {BOSQICHLAR.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select
          className="border rounded-lg px-3 py-2 text-sm bg-background"
          value={filterHolat} onChange={e => setFilterHolat(e.target.value)}
        >
          <option value="">Barcha holatlar</option>
          <option value="royhat_ochiq">Ro'yxat ochiq</option>
          <option value="tugagan">Tugagan</option>
          <option value="natijalar_ellon">Natijalar e'lon</option>
        </select>
        {canEdit && (
          <Button onClick={openAdd} size="sm" className="shrink-0">
            <Plus className="w-4 h-4 mr-1.5" /> Yangi tanlov
          </Button>
        )}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">{search || filterFan || filterBosqich || filterHolat ? "Qidiruv natijalari yo'q" : "Hali tanlov yaratilmagan"}</p>
          {canEdit && !search && !filterFan && (
            <Button className="mt-4" size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1.5" /> Birinchi tanlov qo'shing</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(e => {
            const holatInfo = HOLAT_LABEL[e.holat] ?? { label: e.holat, color: "bg-gray-100 text-gray-600 border-gray-200" };
            const fanIcon = FAN_ICON[e.fan] ?? "🏆";
            return (
              <Card
                key={e.id}
                className="card-hover cursor-pointer group overflow-hidden"
                onClick={() => setSelectedId(e.id)}
              >
                <div className="h-1 bg-gradient-to-r from-yellow-400 to-amber-500" />
                <CardContent className="p-4 space-y-3">
                  {/* Top badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex gap-1.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BOSQICH_COLOR[e.bosqich] ?? "bg-gray-100 text-gray-700"}`}>
                        {e.bosqich}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${holatInfo.color}`}>
                        {holatInfo.label}
                      </span>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={ev => ev.stopPropagation()}>
                        <button className="p-1.5 rounded-md hover:bg-muted transition-colors" onClick={() => openEdit(e)}>
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" onClick={() => del(e)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Title */}
                  <div className="flex items-start gap-2.5">
                    <span className="text-2xl flex-shrink-0">{fanIcon}</span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm leading-tight line-clamp-2">{e.nomi}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{e.fan} · {e.sinf_from}–{e.sinf_to}-sinf</p>
                    </div>
                  </div>
                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {formatDate(e.sana_boshlanish)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {Number(e.qatnashchi_soni)}
                      {e.max_qatnashchi > 0 ? ` / ${e.max_qatnashchi}` : ""}
                    </div>
                    <div className="flex items-center gap-1 text-primary font-medium">
                      Batafsil <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Tanlovni tahrirlash" : "Yangi tanlov yaratish"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Nomi *</label>
              <Input value={form.nomi} onChange={e => setForm(f=>({...f, nomi: e.target.value}))} placeholder="Masalan: Matematika olimpiadasi 2026" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Fan *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm bg-background" value={form.fan} onChange={e => setForm(f=>({...f, fan: e.target.value}))}>
                  {FANLAR.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Bosqich</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm bg-background" value={form.bosqich} onChange={e => setForm(f=>({...f, bosqich: e.target.value}))}>
                  {BOSQICHLAR.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Sinf (dan)</label>
                <Input type="number" min={1} max={11} value={form.sinf_from} onChange={e => setForm(f=>({...f, sinf_from: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Sinf (gacha)</label>
                <Input type="number" min={1} max={11} value={form.sinf_to} onChange={e => setForm(f=>({...f, sinf_to: e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Boshlanish sanasi</label>
                <Input type="date" value={form.sana_boshlanish} onChange={e => setForm(f=>({...f, sana_boshlanish: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tugash sanasi</label>
                <Input type="date" value={form.sana_tugash} onChange={e => setForm(f=>({...f, sana_tugash: e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Ro'yxat tugash muddati</label>
                <Input type="date" value={form.roy_tugash} onChange={e => setForm(f=>({...f, roy_tugash: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Max qatnashchi (0 = cheksiz)</label>
                <Input type="number" min={0} value={form.max_qatnashchi} onChange={e => setForm(f=>({...f, max_qatnashchi: e.target.value}))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Joy (manzil)</label>
              <Input value={form.joy} onChange={e => setForm(f=>({...f, joy: e.target.value}))} placeholder="Masalan: 3-maktab aktsiya zali" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tavsif</label>
              <textarea
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.tavsif}
                onChange={e => setForm(f=>({...f, tavsif: e.target.value}))}
                placeholder="Qo'shimcha ma'lumot..."
              />
            </div>
            {editing && (
              <div>
                <label className="text-sm font-medium mb-1 block">Holat</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm bg-background" value={form.holat} onChange={e => setForm(f=>({...f, holat: e.target.value}))}>
                  <option value="royhat_ochiq">Ro'yxat ochiq</option>
                  <option value="tugagan">Tugagan</option>
                  <option value="natijalar_ellon">Natijalar e'lon qilindi</option>
                </select>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button onClick={save} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                {editing ? "Saqlash" : "Yaratish"}
              </Button>
              <Button variant="outline" onClick={() => setDialog(false)}>
                <X className="w-4 h-4 mr-1" /> Bekor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

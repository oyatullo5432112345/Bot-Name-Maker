import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/use-auth";
import { Loader2, Plus, Pencil, Trash2, Search, Trophy, School, Users, ChevronLeft, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

interface Maktab {
  id: string;
  nomi: string;
  tuman: string;
  jami_ball: number;
  yil: number;
}

interface Ishtirokchi {
  id: string;
  maktab_id: string;
  maktab_nomi: string;
  ism: string;
  fan: string;
  ball: number;
  orin: number | null;
  yil: number;
}

const FANLAR = [
  "Matematika", "Fizika", "Kimyo", "Biologiya", "Informatika",
  "Ingliz tili", "Rus tili", "Ona tili", "Adabiyot", "Tarix",
  "Geografiya", "Huquq", "Iqtisodiyot", "Astronomiya", "Chizmachilik",
];

const MEDAL_COLORS = ["text-yellow-500", "text-gray-400", "text-amber-600"];
const MEDAL_ICONS = ["🥇", "🥈", "🥉"];

export default function OlimpiyadaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin" || user?.role === "mudir";

  const [maktablar, setMaktablar] = useState<Maktab[]>([]);
  const [ishtirokchilar, setIshtirokchilar] = useState<Ishtirokchi[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<"reyting" | "maktab">("reyting");
  const [selectedMaktab, setSelectedMaktab] = useState<Maktab | null>(null);

  const [searchMaktab, setSearchMaktab] = useState("");
  const [searchIsh, setSearchIsh] = useState("");

  // Dialogs
  const [maktabDialog, setMaktabDialog] = useState(false);
  const [maktabEdit, setMaktabEdit] = useState<Maktab | null>(null);
  const [mNomi, setMNomi] = useState("");
  const [mTuman, setMTuman] = useState("");
  const [mSaving, setMSaving] = useState(false);

  const [ishDialog, setIshDialog] = useState(false);
  const [ishEdit, setIshEdit] = useState<Ishtirokchi | null>(null);
  const [iIsm, setIIsm] = useState("");
  const [iFan, setIFan] = useState(FANLAR[0]);
  const [iBall, setIBall] = useState("");
  const [iOrin, setIOrin] = useState("");
  const [iSaving, setISaving] = useState(false);

  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkFan, setBulkFan] = useState(FANLAR[0]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, iRes] = await Promise.all([
        fetch(`${API}/olimpiada/maktablar`, { headers: authH() }),
        fetch(`${API}/olimpiada/ishtirokchilar`, { headers: authH() }),
      ]);
      const mData = await mRes.json();
      const iData = await iRes.json();
      setMaktablar(Array.isArray(mData) ? mData : []);
      setIshtirokchilar(Array.isArray(iData) ? iData : []);
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Ma'lumot yuklanmadi" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // Filtered
  const filteredMaktablar = maktablar.filter(m =>
    m.nomi.toLowerCase().includes(searchMaktab.toLowerCase()) ||
    m.tuman.toLowerCase().includes(searchMaktab.toLowerCase())
  );

  const maktabIshtirokchilar = ishtirokchilar.filter(i =>
    selectedMaktab ? i.maktab_id === selectedMaktab.id : true
  ).filter(i =>
    i.ism.toLowerCase().includes(searchIsh.toLowerCase()) ||
    i.fan.toLowerCase().includes(searchIsh.toLowerCase())
  );

  const top3 = [...maktablar].sort((a, b) => b.jami_ball - a.jami_ball).slice(0, 3);

  // ─── Maktab CRUD ──────────────────────────────────────────────────────────
  function openMaktabAdd() {
    setMaktabEdit(null); setMNomi(""); setMTuman(""); setMaktabDialog(true);
  }
  function openMaktabEdit(m: Maktab) {
    setMaktabEdit(m); setMNomi(m.nomi); setMTuman(m.tuman); setMaktabDialog(true);
  }
  async function saveMaktab() {
    if (mNomi.trim().length < 2) { toast({ variant: "destructive", title: "Maktab nomini kiriting" }); return; }
    setMSaving(true);
    try {
      if (maktabEdit) {
        await fetch(`${API}/olimpiada/maktablar/${maktabEdit.id}`, {
          method: "PATCH", headers: authH(),
          body: JSON.stringify({ nomi: mNomi, tuman: mTuman }),
        });
      } else {
        await fetch(`${API}/olimpiada/maktablar`, {
          method: "POST", headers: authH(),
          body: JSON.stringify({ nomi: mNomi, tuman: mTuman }),
        });
      }
      toast({ title: maktabEdit ? "Yangilandi" : "Maktab qo'shildi" });
      setMaktabDialog(false);
      loadData();
    } catch {
      toast({ variant: "destructive", title: "Xatolik yuz berdi" });
    } finally {
      setMSaving(false);
    }
  }
  async function deleteMaktab(m: Maktab) {
    if (!confirm(`"${m.nomi}" maktabini o'chirasizmi? Barcha ishtirokchilar ham o'chadi.`)) return;
    await fetch(`${API}/olimpiada/maktablar/${m.id}`, { method: "DELETE", headers: authH() });
    toast({ title: "O'chirildi" });
    if (selectedMaktab?.id === m.id) { setSelectedMaktab(null); setView("reyting"); }
    loadData();
  }

  // ─── Ishtirokchi CRUD ─────────────────────────────────────────────────────
  function openIshAdd() {
    setIshEdit(null); setIIsm(""); setIFan(FANLAR[0]); setIBall(""); setIOrin(""); setIshDialog(true);
  }
  function openIshEdit(i: Ishtirokchi) {
    setIshEdit(i); setIIsm(i.ism); setIFan(i.fan); setIBall(String(i.ball)); setIOrin(i.orin ? String(i.orin) : ""); setIshDialog(true);
  }
  async function saveIshtirokchi() {
    if (!iIsm.trim()) { toast({ variant: "destructive", title: "Ism kiriting" }); return; }
    if (!iBall || isNaN(Number(iBall))) { toast({ variant: "destructive", title: "Ball kiriting (raqam)" }); return; }
    setISaving(true);
    try {
      if (ishEdit) {
        await fetch(`${API}/olimpiada/ishtirokchilar/${ishEdit.id}`, {
          method: "PATCH", headers: authH(),
          body: JSON.stringify({ ism: iIsm, fan: iFan, ball: Number(iBall), orin: iOrin ? Number(iOrin) : null }),
        });
      } else {
        await fetch(`${API}/olimpiada/ishtirokchilar`, {
          method: "POST", headers: authH(),
          body: JSON.stringify({
            maktab_id: selectedMaktab!.id,
            maktab_nomi: selectedMaktab!.nomi,
            ism: iIsm, fan: iFan, ball: Number(iBall),
            orin: iOrin ? Number(iOrin) : null,
          }),
        });
      }
      toast({ title: ishEdit ? "Yangilandi" : "Ishtirokchi qo'shildi" });
      setIshDialog(false);
      loadData();
    } catch {
      toast({ variant: "destructive", title: "Xatolik yuz berdi" });
    } finally {
      setISaving(false);
    }
  }
  async function deleteIsh(i: Ishtirokchi) {
    if (!confirm(`"${i.ism}" ni o'chirasizmi?`)) return;
    await fetch(`${API}/olimpiada/ishtirokchilar/${i.id}`, { method: "DELETE", headers: authH() });
    toast({ title: "O'chirildi" });
    loadData();
  }

  async function saveBulk() {
    if (!selectedMaktab) return;
    const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast({ variant: "destructive", title: "Ro'yxat bo'sh" }); return; }

    const ishtirokchilar = lines.map(line => {
      const parts = line.split(/[,;|\t]+/).map(p => p.trim());
      const ism = parts[0] ?? "";
      const fan = parts[1] ?? bulkFan;
      const ball = Number(parts[2] ?? 0);
      const orin = parts[3] ? Number(parts[3]) : null;
      return { ism, fan, ball, orin };
    });

    setBulkSaving(true);
    try {
      const res = await fetch(`${API}/olimpiada/ishtirokchilar/bulk`, {
        method: "POST", headers: authH(),
        body: JSON.stringify({
          maktab_id: selectedMaktab.id,
          maktab_nomi: selectedMaktab.nomi,
          ishtirokchilar,
        }),
      });
      const data = await res.json() as { inserted: number; errors: string[] };
      if (data.inserted > 0) {
        toast({ title: `${data.inserted} ta ishtirokchi qo'shildi` });
        setBulkDialog(false);
        setBulkText("");
        loadData();
      }
      if (data.errors?.length) {
        toast({ variant: "destructive", title: `${data.errors.length} ta xato`, description: data.errors.slice(0, 3).join(", ") });
      }
    } catch {
      toast({ variant: "destructive", title: "Xatolik yuz berdi" });
    } finally {
      setBulkSaving(false);
    }
  }

  // ─── Coming soon (boshqa rollar uchun) ───────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Trophy className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Olimpiada.Uz</h2>
          <p className="text-muted-foreground mt-2 max-w-sm">
            Bu bo'lim tez orada foydalanish uchun ochiladi
          </p>
        </div>
        <Badge variant="secondary" className="text-sm px-4 py-1.5">🚧 Tez orada...</Badge>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {view === "maktab" && selectedMaktab ? (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => { setView("reyting"); setSelectedMaktab(null); }}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{selectedMaktab.nomi}</h1>
                <p className="text-muted-foreground text-sm">{selectedMaktab.tuman} · Jami ball: {selectedMaktab.jami_ball}</p>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Olimpiada.Uz
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">2026–2027 o'quv yili</p>
            </div>
          )}
        </div>

        {view === "reyting" && isAdmin && (
          <Button onClick={openMaktabAdd} size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Maktab qo'shish
          </Button>
        )}
        {view === "maktab" && selectedMaktab && isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkDialog(true)} size="sm">
              <ListPlus className="w-4 h-4 mr-1.5" /> Omaviy qo'shish
            </Button>
            <Button onClick={openIshAdd} size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> Ishtirokchi qo'shish
            </Button>
          </div>
        )}
      </div>

      {/* Reyting ko'rinishi */}
      {view === "reyting" && (
        <div className="space-y-6">
          {/* Top 3 */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {top3.map((m, idx) => (
                <Card key={m.id} className={`border-2 cursor-pointer hover:shadow-md transition-shadow ${idx === 0 ? "border-yellow-400" : idx === 1 ? "border-gray-300" : "border-amber-500"}`}
                  onClick={() => { setSelectedMaktab(m); setView("maktab"); }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="text-2xl">{MEDAL_ICONS[idx]}</span>
                      <span className={MEDAL_COLORS[idx]}>{idx + 1}-o'rin</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold text-sm">{m.nomi}</p>
                    <p className="text-muted-foreground text-xs">{m.tuman}</p>
                    <p className="text-2xl font-bold mt-2">{m.jami_ball} <span className="text-sm font-normal text-muted-foreground">ball</span></p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ishtirokchilar.filter(i => i.maktab_id === m.id).length} ishtirokchi
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Qidiruv */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Maktab yoki tuman nomi bo'yicha qidiring..."
              className="pl-9"
              value={searchMaktab}
              onChange={e => setSearchMaktab(e.target.value)}
            />
          </div>

          {/* Maktablar jadvali */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <School className="w-4 h-4" />
                Barcha maktablar ({filteredMaktablar.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredMaktablar.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {searchMaktab ? "Qidiruv natijalari yo'q" : "Hali maktab qo'shilmagan"}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Maktab nomi</TableHead>
                      <TableHead>Tuman</TableHead>
                      <TableHead className="text-right">Ishtirokchilar</TableHead>
                      <TableHead className="text-right">Jami ball</TableHead>
                      {isAdmin && <TableHead className="w-20"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaktablar.map((m, idx) => (
                      <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSelectedMaktab(m); setView("maktab"); }}>
                        <TableCell className="font-medium">
                          {idx < 3 ? <span>{MEDAL_ICONS[idx]}</span> : idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">{m.nomi}</TableCell>
                        <TableCell className="text-muted-foreground">{m.tuman || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">
                            {ishtirokchilar.filter(i => i.maktab_id === m.id).length}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">{m.jami_ball}</TableCell>
                        {isAdmin && (
                          <TableCell onClick={e => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openMaktabEdit(m)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMaktab(m)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Maktab ishtirokchilari ko'rinishi */}
      {view === "maktab" && selectedMaktab && (
        <div className="space-y-4">
          {/* Statistika */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Ishtirokchilar</p>
                <p className="text-2xl font-bold">{maktabIshtirokchilar.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Jami ball</p>
                <p className="text-2xl font-bold text-primary">{selectedMaktab.jami_ball}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">O'rtacha ball</p>
                <p className="text-2xl font-bold">
                  {maktabIshtirokchilar.length > 0
                    ? Math.round(maktabIshtirokchilar.reduce((s, i) => s + i.ball, 0) / maktabIshtirokchilar.length)
                    : 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Fanlar soni</p>
                <p className="text-2xl font-bold">
                  {new Set(maktabIshtirokchilar.map(i => i.fan)).size}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Qidiruv */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Ism yoki fan bo'yicha qidiring..."
              className="pl-9"
              value={searchIsh}
              onChange={e => setSearchIsh(e.target.value)}
            />
          </div>

          {/* Ishtirokchilar jadvali */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Ishtirokchilar ({maktabIshtirokchilar.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {maktabIshtirokchilar.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {searchIsh ? "Qidiruv natijalari yo'q" : "Hali ishtirokchi qo'shilmagan"}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ism Familiya</TableHead>
                      <TableHead>Fan</TableHead>
                      <TableHead className="text-right">Ball</TableHead>
                      <TableHead className="text-right">O'rin</TableHead>
                      {isAdmin && <TableHead className="w-20"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maktabIshtirokchilar.map(i => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.ism}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{i.fan}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">{i.ball}</TableCell>
                        <TableCell className="text-right">
                          {i.orin ? (
                            <span className={i.orin <= 3 ? "font-bold text-yellow-600" : ""}>
                              {i.orin <= 3 ? MEDAL_ICONS[i.orin - 1] : ""} {i.orin}-o'rin
                            </span>
                          ) : "—"}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openIshEdit(i)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteIsh(i)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Maktab qo'shish/tahrirlash dialogi */}
      <Dialog open={maktabDialog} onOpenChange={setMaktabDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{maktabEdit ? "Maktabni tahrirlash" : "Yangi maktab qo'shish"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Maktab nomi *</label>
              <Input
                placeholder="Masalan: 3-maktab, 15-maktab..."
                value={mNomi}
                onChange={e => setMNomi(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tuman</label>
              <Input
                placeholder="Masalan: Toshloq tumani"
                value={mTuman}
                onChange={e => setMTuman(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setMaktabDialog(false)}>Bekor</Button>
              <Button className="flex-1" onClick={saveMaktab} disabled={mSaving}>
                {mSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Saqlash
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Omaviy ishtirokchi qo'shish dialogi */}
      <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListPlus className="w-5 h-5 text-primary" />
              Omaviy ishtirokchi qo'shish
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Format (har qatorda 1 ishtirokchi):</p>
              <p><code>Ism Familiya, Fan, Ball, O'rin</code></p>
              <p>Fan va o'rin ixtiyoriy — bo'sh qolsa quyidagi tanlangan fan ishlatiladi.</p>
              <p className="text-primary font-medium">Misol:</p>
              <p><code>Karimov Jasur, Matematika, 85, 1</code></p>
              <p><code>Valiyev Ali, Fizika, 92</code></p>
              <p><code>Toshmatova Zulfiya</code> <span className="text-muted-foreground">(faqat ism — fan va ball 0)</span></p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Standart fan (fan ko'rsatilmagan qatorlar uchun)</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={bulkFan}
                onChange={e => setBulkFan(e.target.value)}
              >
                {FANLAR.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ishtirokchilar ro'yxati</label>
              <textarea
                className="w-full border border-input rounded-md px-3 py-2 text-sm font-mono resize-none h-44 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={"Karimov Jasur, Matematika, 85, 1\nValiyev Ali, Fizika, 92\nToshmatova Zulfiya, Ingliz tili, 78, 2"}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {bulkText.split("\n").filter(l => l.trim()).length} ta qator kiritildi
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setBulkDialog(false)}>Bekor</Button>
              <Button className="flex-1" onClick={saveBulk} disabled={bulkSaving || !bulkText.trim()}>
                {bulkSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Qo'shish
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ishtirokchi qo'shish/tahrirlash dialogi */}
      <Dialog open={ishDialog} onOpenChange={setIshDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{ishEdit ? "Ishtirokchini tahrirlash" : "Yangi ishtirokchi"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ism Familiya *</label>
              <Input
                placeholder="Karimov Jasur"
                value={iIsm}
                onChange={e => setIIsm(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fan *</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={iFan}
                onChange={e => setIFan(e.target.value)}
              >
                {FANLAR.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ball *</label>
                <Input
                  type="number"
                  placeholder="85"
                  value={iBall}
                  onChange={e => setIBall(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">O'rin</label>
                <Input
                  type="number"
                  placeholder="1, 2, 3..."
                  value={iOrin}
                  onChange={e => setIOrin(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setIshDialog(false)}>Bekor</Button>
              <Button className="flex-1" onClick={saveIshtirokchi} disabled={iSaving}>
                {iSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Saqlash
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

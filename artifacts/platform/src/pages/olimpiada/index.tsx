import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/use-auth";
import {
  Loader2, Plus, Pencil, Trash2, Search, Trophy, School, Users,
  ChevronLeft, ListPlus, Medal, Star, BarChart3, Filter,
} from "lucide-react";
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

const MEDAL_ICONS = ["🥇", "🥈", "🥉"];
const MEDAL_BG = [
  "from-yellow-400 to-amber-500",
  "from-slate-300 to-slate-400",
  "from-amber-600 to-orange-700",
];

export default function OlimpiyadaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = user?.role === "admin" || user?.role === "mudir";
  const TUMAN = "Toshloq tumani";

  const [maktablar, setMaktablar] = useState<Maktab[]>([]);
  const [ishtirokchilar, setIshtirokchilar] = useState<Ishtirokchi[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<"reyting" | "maktab">("reyting");
  const [selectedMaktab, setSelectedMaktab] = useState<Maktab | null>(null);

  const [searchMaktab, setSearchMaktab] = useState("");
  const [searchIsh, setSearchIsh] = useState("");
  const [fanFilter, setFanFilter] = useState("");

  const [maktabDialog, setMaktabDialog] = useState(false);
  const [maktabEdit, setMaktabEdit] = useState<Maktab | null>(null);
  const [mNomi, setMNomi] = useState("");
  const [mSaving, setMSaving] = useState(false);

  const [ishDialog, setIshDialog] = useState(false);
  const [ishEdit, setIshEdit] = useState<Ishtirokchi | null>(null);
  const [iIsm, setIIsm] = useState("");
  const [iFan, setIFan] = useState("");
  const [iBall, setIBall] = useState("");
  const [iOrin, setIOrin] = useState("");
  const [iSaving, setISaving] = useState(false);

  const [fanDialog, setFanDialog] = useState(false);
  const [fanNomi, setFanNomi] = useState("");
  const [fanStudents, setFanStudents] = useState([
    { ism: "", ball: "", orin: "" },
    { ism: "", ball: "", orin: "" },
    { ism: "", ball: "", orin: "" },
  ]);
  const [fanSaving, setFanSaving] = useState(false);

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

  const sortedMaktablar = [...maktablar].sort((a, b) => b.jami_ball - a.jami_ball);
  const filteredMaktablar = sortedMaktablar.filter(m =>
    m.nomi.toLowerCase().includes(searchMaktab.toLowerCase()) ||
    m.tuman.toLowerCase().includes(searchMaktab.toLowerCase())
  );

  const allFanlar = [...new Set(ishtirokchilar.map(i => i.fan))].sort();

  const maktabIshtirokchilar = ishtirokchilar
    .filter(i => selectedMaktab ? i.maktab_id === selectedMaktab.id : true)
    .filter(i =>
      i.ism.toLowerCase().includes(searchIsh.toLowerCase()) ||
      i.fan.toLowerCase().includes(searchIsh.toLowerCase())
    )
    .filter(i => !fanFilter || i.fan === fanFilter);

  const top3 = sortedMaktablar.slice(0, 3);
  const totalIshtirokchi = ishtirokchilar.length;
  const totalFanlar = new Set(ishtirokchilar.map(i => i.fan)).size;
  const goldMedals = ishtirokchilar.filter(i => i.orin === 1).length;

  // ─── Maktab CRUD ──────────────────────────────────────────────────────────
  function openMaktabAdd() { setMaktabEdit(null); setMNomi(""); setMaktabDialog(true); }
  function openMaktabEdit(m: Maktab) { setMaktabEdit(m); setMNomi(m.nomi); setMaktabDialog(true); }

  async function saveMaktab() {
    if (mNomi.trim().length < 2) { toast({ variant: "destructive", title: "Maktab nomini kiriting" }); return; }
    setMSaving(true);
    try {
      if (maktabEdit) {
        await fetch(`${API}/olimpiada/maktablar/${maktabEdit.id}`, {
          method: "PATCH", headers: authH(),
          body: JSON.stringify({ nomi: mNomi, tuman: TUMAN }),
        });
      } else {
        await fetch(`${API}/olimpiada/maktablar`, {
          method: "POST", headers: authH(),
          body: JSON.stringify({ nomi: mNomi, tuman: TUMAN }),
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

  function openFanAdd() {
    setFanNomi("");
    setFanStudents([
      { ism: "", ball: "", orin: "" },
      { ism: "", ball: "", orin: "" },
      { ism: "", ball: "", orin: "" },
    ]);
    setFanDialog(true);
  }

  async function saveFanStudents() {
    if (!selectedMaktab) return;
    if (!fanNomi.trim()) { toast({ variant: "destructive", title: "Fan nomini kiriting" }); return; }
    const valid = fanStudents.filter(s => s.ism.trim());
    if (!valid.length) { toast({ variant: "destructive", title: "Kamida 1 ta o'quvchi ismini kiriting" }); return; }
    setFanSaving(true);
    try {
      for (const s of valid) {
        await fetch(`${API}/olimpiada/ishtirokchilar`, {
          method: "POST", headers: authH(),
          body: JSON.stringify({
            maktab_id: selectedMaktab.id,
            maktab_nomi: selectedMaktab.nomi,
            ism: s.ism.trim(),
            fan: fanNomi.trim(),
            ball: Number(s.ball) || 0,
            orin: s.orin ? Number(s.orin) : null,
          }),
        });
      }
      toast({ title: `${valid.length} ta ishtirokchi qo'shildi` });
      setFanDialog(false);
      loadData();
    } catch {
      toast({ variant: "destructive", title: "Xatolik yuz berdi" });
    } finally {
      setFanSaving(false);
    }
  }

  async function deleteMaktab(m: Maktab) {
    if (!confirm(`"${m.nomi}" maktabini o'chirasizmi? Barcha ishtirokchilar ham o'chadi.`)) return;
    await fetch(`${API}/olimpiada/maktablar/${m.id}`, { method: "DELETE", headers: authH() });
    toast({ title: "O'chirildi" });
    if (selectedMaktab?.id === m.id) { setSelectedMaktab(null); setView("reyting"); }
    loadData();
  }

  function openIshAdd() {
    setIshEdit(null); setIIsm(""); setIFan(FANLAR[0] ?? ""); setIBall(""); setIOrin(""); setIshDialog(true);
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

    const items = lines.map(line => {
      const parts = line.split(/[,;|\t]+/).map(p => p.trim());
      const ism = parts[0] ?? "";
      const fan = parts[1] ?? bulkFan ?? FANLAR[0];
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
          ishtirokchilar: items,
        }),
      });
      const data = await res.json() as { inserted: number; errors: string[] };
      if (data.inserted > 0) {
        toast({ title: `✅ ${data.inserted} ta ishtirokchi qo'shildi` });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {view === "maktab" && selectedMaktab ? (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => { setView("reyting"); setSelectedMaktab(null); setFanFilter(""); }}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{selectedMaktab.nomi}</h1>
                <p className="text-muted-foreground text-sm">{selectedMaktab.tuman} · Jami ball: <span className="text-primary font-semibold">{selectedMaktab.jami_ball}</span></p>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <span className="gradient-text">Olimpiada.Uz</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">2026–2027 o'quv yili — Toshloq tumani</p>
            </div>
          )}
        </div>

        {view === "reyting" && canEdit && (
          <Button onClick={openMaktabAdd} size="sm" className="shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" /> Maktab qo'shish
          </Button>
        )}
        {view === "maktab" && selectedMaktab && canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkDialog(true)} size="sm">
              <ListPlus className="w-4 h-4 mr-1.5" /> Omaviy qo'shish
            </Button>
            <Button onClick={openFanAdd} size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> Fan qo'shish
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openIshAdd()}>
              <Plus className="w-4 h-4 mr-1.5" /> Bitta qo'shish
            </Button>
          </div>
        )}
      </div>

      {/* ─── Reyting view ────────────────────────────────────────────────────── */}
      {view === "reyting" && (
        <div className="space-y-6">
          {/* Summary stats */}
          {maktablar.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: School, label: "Maktablar", value: maktablar.length, cls: "text-primary" },
                { icon: Users, label: "Ishtirokchilar", value: totalIshtirokchi, cls: "text-violet-600" },
                { icon: BarChart3, label: "Fanlar", value: totalFanlar, cls: "text-teal-600" },
                { icon: Medal, label: "Oltin medallar", value: goldMedals, cls: "text-yellow-600" },
              ].map(({ icon: Icon, label, value, cls }) => (
                <Card key={label} className="card-hover">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${cls}`} />
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className={`text-xl font-bold ${cls}`}>{value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Top 3 podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {top3.map((m, idx) => (
                <Card
                  key={m.id}
                  className="card-hover cursor-pointer overflow-hidden"
                  onClick={() => { setSelectedMaktab(m); setView("maktab"); setFanFilter(""); }}
                >
                  <div className={`h-1.5 bg-gradient-to-r ${MEDAL_BG[idx]}`} />
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="text-2xl">{MEDAL_ICONS[idx]}</span>
                      <span className="font-semibold text-sm truncate">{m.nomi}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <p className="text-muted-foreground text-xs mb-2">{m.tuman}</p>
                    <p className="text-3xl font-bold text-primary">{m.jami_ball}
                      <span className="text-sm font-normal text-muted-foreground ml-1">ball</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ishtirokchilar.filter(i => i.maktab_id === m.id).length} ishtirokchi ·{" "}
                      {new Set(ishtirokchilar.filter(i => i.maktab_id === m.id).map(i => i.fan)).size} fan
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Maktab yoki tuman nomi bo'yicha qidiring..."
              className="pl-9"
              value={searchMaktab}
              onChange={e => setSearchMaktab(e.target.value)}
            />
          </div>

          {/* Table */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <School className="w-4 h-4 text-primary" />
                Barcha maktablar ({filteredMaktablar.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredMaktablar.length === 0 ? (
                <div className="text-center py-14 text-muted-foreground">
                  <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">{searchMaktab ? "Qidiruv natijalari yo'q" : "Hali maktab qo'shilmagan"}</p>
                  {canEdit && !searchMaktab && (
                    <Button className="mt-4" size="sm" onClick={openMaktabAdd}>
                      <Plus className="w-4 h-4 mr-1.5" /> Birinchi maktabni qo'shing
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Maktab nomi</TableHead>
                      <TableHead className="hidden sm:table-cell">Tuman</TableHead>
                      <TableHead className="text-right">Ishtirokchi</TableHead>
                      <TableHead className="text-right">Ball</TableHead>
                      {canEdit && <TableHead className="w-20" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaktablar.map((m, idx) => (
                      <TableRow
                        key={m.id}
                        className="cursor-pointer hover:bg-primary/5 transition-colors"
                        onClick={() => { setSelectedMaktab(m); setView("maktab"); setFanFilter(""); }}
                      >
                        <TableCell className="text-center font-medium">
                          {idx < 3 ? <span className="text-lg">{MEDAL_ICONS[idx]}</span> : (
                            <span className="text-muted-foreground text-sm">{idx + 1}</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{m.nomi}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{m.tuman || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">
                            {ishtirokchilar.filter(i => i.maktab_id === m.id).length}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary text-lg">{m.jami_ball}</TableCell>
                        {canEdit && (
                          <TableCell onClick={e => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openMaktabEdit(m)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteMaktab(m)}>
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

      {/* ─── Maktab detail view ──────────────────────────────────────────────── */}
      {view === "maktab" && selectedMaktab && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground">Ishtirokchilar</p>
                <p className="text-2xl font-bold text-primary">{maktabIshtirokchilar.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground">Jami ball</p>
                <p className="text-2xl font-bold text-yellow-700">{selectedMaktab.jami_ball}</p>
              </CardContent>
            </Card>
            <Card className="bg-violet-50 border-violet-200">
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground">Fanlar soni</p>
                <p className="text-2xl font-bold text-violet-700">
                  {new Set(ishtirokchilar.filter(i => i.maktab_id === selectedMaktab.id).map(i => i.fan)).size}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search + filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Ism yoki fan bo'yicha qidiring..."
                className="pl-9"
                value={searchIsh}
                onChange={e => setSearchIsh(e.target.value)}
              />
            </div>
            <div className="relative min-w-[140px]">
              <Filter className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <select
                className="w-full border border-input rounded-md pl-8 pr-3 py-2 text-sm bg-background appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={fanFilter}
                onChange={e => setFanFilter(e.target.value)}
              >
                <option value="">Barcha fanlar</option>
                {allFanlar.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fan bo'yicha guruhlar */}
          {maktabIshtirokchilar.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground rounded-xl border border-dashed">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Hali ishtirokchi qo'shilmagan</p>
              {canEdit && (
                <Button className="mt-4" size="sm" onClick={openFanAdd}>
                  <Plus className="w-4 h-4 mr-1.5" /> Fan va ishtirokchi qo'shish
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(
                maktabIshtirokchilar.reduce((acc, i) => {
                  if (!acc[i.fan]) acc[i.fan] = [];
                  acc[i.fan]!.push(i);
                  return acc;
                }, {} as Record<string, Ishtirokchi[]>)
              ).map(([fan, students]) => (
                <Card key={fan} className="overflow-hidden">
                  <CardHeader className="pb-2 pt-3 px-4 bg-muted/30">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Star className="w-3.5 h-3.5 text-yellow-500" />
                      <span>{fan}</span>
                      <Badge variant="secondary" className="text-xs ml-auto">{students.length} ishtirokchi</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">Ism Familiya</TableHead>
                          <TableHead className="text-right">Ball</TableHead>
                          <TableHead className="text-right">O'rin</TableHead>
                          {canEdit && <TableHead className="w-16" />}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...students].sort((a, b) => b.ball - a.ball).map(i => (
                          <TableRow key={i.id} className="hover:bg-primary/5 transition-colors">
                            <TableCell className="font-medium pl-4">{i.ism}</TableCell>
                            <TableCell className="text-right font-bold text-primary">{i.ball}</TableCell>
                            <TableCell className="text-right">
                              {i.orin ? (
                                <span className={`font-bold ${i.orin <= 3 ? "text-yellow-600" : "text-muted-foreground"}`}>
                                  {i.orin <= 3 ? `${MEDAL_ICONS[i.orin - 1]} ` : ""}{i.orin}-o'rin
                                </span>
                              ) : "—"}
                            </TableCell>
                            {canEdit && (
                              <TableCell>
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openIshEdit(i)}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteIsh(i)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Dialogs ─────────────────────────────────────────────────────────── */}
      {/* Maktab dialog */}
      <Dialog open={maktabDialog} onOpenChange={setMaktabDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{maktabEdit ? "Maktabni tahrirlash" : "Yangi maktab qo'shish"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Maktab nomi</label>
              <Input
                placeholder="Masalan: 10-maktab"
                value={mNomi}
                onChange={e => setMNomi(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveMaktab()}
              />
            </div>
            <Button className="w-full" disabled={mSaving} onClick={saveMaktab}>
              {mSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {maktabEdit ? "Saqlash" : "Qo'shish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fan + students dialog */}
      <Dialog open={fanDialog} onOpenChange={setFanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fan va ishtirokchilar qo'shish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fan nomi</label>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={fanNomi}
                onChange={e => setFanNomi(e.target.value)}
              >
                <option value="">— Fan tanlang —</option>
                {FANLAR.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ishtirokchilar (Ism · Ball · O'rin)</label>
              {fanStudents.map((s, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2">
                  <Input placeholder="Ism Familiya" value={s.ism} onChange={e => { const n = [...fanStudents]; n[idx] = { ...n[idx]!, ism: e.target.value }; setFanStudents(n); }} className="col-span-1" />
                  <Input placeholder="Ball" type="number" value={s.ball} onChange={e => { const n = [...fanStudents]; n[idx] = { ...n[idx]!, ball: e.target.value }; setFanStudents(n); }} />
                  <Input placeholder="O'rin" type="number" value={s.orin} onChange={e => { const n = [...fanStudents]; n[idx] = { ...n[idx]!, orin: e.target.value }; setFanStudents(n); }} />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setFanStudents(prev => [...prev, { ism: "", ball: "", orin: "" }])}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Yana qo'shish
              </Button>
            </div>
            <Button className="w-full" disabled={fanSaving} onClick={saveFanStudents}>
              {fanSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Saqlash
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Single participant dialog */}
      <Dialog open={ishDialog} onOpenChange={setIshDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{ishEdit ? "Ishtirokchini tahrirlash" : "Ishtirokchi qo'shish"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ism Familiya</label>
              <Input placeholder="Valiyev Valijon" value={iIsm} onChange={e => setIIsm(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fan</label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={iFan}
                  onChange={e => setIFan(e.target.value)}
                >
                  {FANLAR.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ball</label>
                <Input type="number" placeholder="85" value={iBall} onChange={e => setIBall(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">O'rin (ixtiyoriy)</label>
              <Input type="number" placeholder="1, 2, 3..." value={iOrin} onChange={e => setIOrin(e.target.value)} />
            </div>
            <Button className="w-full" disabled={iSaving} onClick={saveIshtirokchi}>
              {iSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {ishEdit ? "Yangilash" : "Qo'shish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk dialog */}
      <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListPlus className="w-5 h-5 text-primary" />
              Omaviy qo'shish
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Standart fan</label>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={bulkFan}
                onChange={e => setBulkFan(e.target.value)}
              >
                {FANLAR.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ro'yxat</label>
              <p className="text-xs text-muted-foreground">
                Format: <code className="bg-muted px-1 rounded">Ism Familiya, Fan (ixtiyoriy), Ball, O'rin</code>
              </p>
              <textarea
                className="w-full border border-input rounded-md px-3 py-2 text-sm font-mono resize-none h-40 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={"Valiyev Valijon, Matematika, 85, 1\nHasanov Xasan, Fizika, 72\nToshmatova Zulfiya, 68, 3"}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {bulkText.split("\n").filter(l => l.trim()).length} ta qator kiritildi
              </p>
            </div>
            <Button className="w-full" disabled={bulkSaving || !bulkText.trim()} onClick={saveBulk}>
              {bulkSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ListPlus className="w-4 h-4 mr-2" />}
              Omaviy saqlash
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

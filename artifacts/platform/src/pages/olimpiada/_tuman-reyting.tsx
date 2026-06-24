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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const authH = (): HeadersInit => {
  const t = localStorage.getItem("talim_auth_token");
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

interface Maktab { id: string; nomi: string; tuman: string; jami_ball: number; yil: number; }
interface Ishtirokchi {
  id: string; maktab_id: string; maktab_nomi: string; ism: string;
  fan: string; ball: number; orin: number | null; yil: number; holat: string;
}

const FANLAR = [
  "Matematika","Fizika","Kimyo","Biologiya","Informatika","Ingliz tili",
  "Rus tili","Ona tili","Adabiyot","Tarix","Geografiya","Huquq",
  "Iqtisodiyot","Astronomiya","Chizmachilik",
];
const MEDAL_ICONS = ["🥇","🥈","🥉"];
const MEDAL_BG = ["from-yellow-400 to-amber-500","from-slate-300 to-slate-400","from-amber-600 to-orange-700"];

export default function TumanReyting() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = user?.role === "admin" || user?.role === "mudir";
  const TUMAN = "Toshloq tumani";

  const [maktablar, setMaktablar] = useState<Maktab[]>([]);
  const [ishtirokchilar, setIshtirokchilar] = useState<Ishtirokchi[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"reyting"|"maktab">("reyting");
  const [selectedMaktab, setSelectedMaktab] = useState<Maktab | null>(null);
  const [searchMaktab, setSearchMaktab] = useState("");
  const [searchIsh, setSearchIsh] = useState("");
  const [fanFilter, setFanFilter] = useState("");

  const [maktabDialog, setMaktabDialog] = useState(false);
  const [maktabEdit, setMaktabEdit] = useState<Maktab | null>(null);
  const [mNomi, setMNomi] = useState(""); const [mSaving, setMSaving] = useState(false);

  const [ishDialog, setIshDialog] = useState(false);
  const [ishEdit, setIshEdit] = useState<Ishtirokchi | null>(null);
  const [iIsm, setIIsm] = useState(""); const [iFan, setIFan] = useState("");
  const [iBall, setIBall] = useState(""); const [iOrin, setIOrin] = useState("");
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
      const mData = await mRes.json() as unknown;
      const iData = await iRes.json() as unknown;
      setMaktablar(Array.isArray(mData) ? mData as Maktab[] : []);
      setIshtirokchilar(Array.isArray(iData) ? iData as Ishtirokchi[] : []);
    } catch { toast({ variant: "destructive", title: "Ma'lumot yuklanmadi" }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { void loadData(); }, [loadData]);

  const sortedMaktablar = [...maktablar].sort((a,b) => b.jami_ball - a.jami_ball);
  const filteredMaktablar = sortedMaktablar.filter(m =>
    m.nomi.toLowerCase().includes(searchMaktab.toLowerCase()) ||
    m.tuman.toLowerCase().includes(searchMaktab.toLowerCase())
  );
  const allFanlar = [...new Set(ishtirokchilar.map(i => i.fan))].sort();
  const maktabIsh = ishtirokchilar
    .filter(i => selectedMaktab ? i.maktab_id === selectedMaktab.id : true)
    .filter(i => i.ism.toLowerCase().includes(searchIsh.toLowerCase()) || i.fan.toLowerCase().includes(searchIsh.toLowerCase()))
    .filter(i => !fanFilter || i.fan === fanFilter);
  const top3 = sortedMaktablar.slice(0,3);
  const totalIsh = ishtirokchilar.length;
  const totalFanlar = new Set(ishtirokchilar.map(i=>i.fan)).size;
  const goldMedals = ishtirokchilar.filter(i=>i.orin===1).length;

  function openMaktabAdd() { setMaktabEdit(null); setMNomi(""); setMaktabDialog(true); }
  function openMaktabEdit(m: Maktab) { setMaktabEdit(m); setMNomi(m.nomi); setMaktabDialog(true); }

  async function saveMaktab() {
    if (mNomi.trim().length < 2) { toast({ variant:"destructive", title:"Maktab nomini kiriting" }); return; }
    setMSaving(true);
    try {
      if (maktabEdit) {
        await fetch(`${API}/olimpiada/maktablar/${maktabEdit.id}`, { method:"PATCH", headers:authH(), body:JSON.stringify({nomi:mNomi,tuman:TUMAN}) });
      } else {
        await fetch(`${API}/olimpiada/maktablar`, { method:"POST", headers:authH(), body:JSON.stringify({nomi:mNomi,tuman:TUMAN}) });
      }
      toast({ title: maktabEdit ? "Yangilandi" : "Maktab qo'shildi" });
      setMaktabDialog(false); void loadData();
    } catch { toast({ variant:"destructive", title:"Xatolik" }); }
    finally { setMSaving(false); }
  }

  async function deleteMaktab(m: Maktab) {
    if (!confirm(`"${m.nomi}" maktabini o'chirasizmi?`)) return;
    await fetch(`${API}/olimpiada/maktablar/${m.id}`, { method:"DELETE", headers:authH() });
    toast({ title:"O'chirildi" });
    if (selectedMaktab?.id===m.id) { setSelectedMaktab(null); setView("reyting"); }
    void loadData();
  }

  function openFanAdd() {
    setFanNomi(""); setFanStudents([{ism:"",ball:"",orin:""},{ism:"",ball:"",orin:""},{ism:"",ball:"",orin:""}]); setFanDialog(true);
  }

  async function saveFanStudents() {
    if (!selectedMaktab) return;
    if (!fanNomi.trim()) { toast({ variant:"destructive", title:"Fan nomini kiriting" }); return; }
    const valid = fanStudents.filter(s=>s.ism.trim());
    if (!valid.length) { toast({ variant:"destructive", title:"Kamida 1 ta ism kiriting" }); return; }
    setFanSaving(true);
    try {
      for (const s of valid) {
        await fetch(`${API}/olimpiada/ishtirokchilar`, {
          method:"POST", headers:authH(),
          body:JSON.stringify({ maktab_id:selectedMaktab.id, maktab_nomi:selectedMaktab.nomi,
            ism:s.ism.trim(), fan:fanNomi.trim(), ball:Number(s.ball)||0, orin:s.orin?Number(s.orin):null }),
        });
      }
      toast({ title:`${valid.length} ta ishtirokchi qo'shildi` });
      setFanDialog(false); void loadData();
    } catch { toast({ variant:"destructive", title:"Xatolik" }); }
    finally { setFanSaving(false); }
  }

  function openIshAdd() { setIshEdit(null); setIIsm(""); setIFan(FANLAR[0]??""); setIBall(""); setIOrin(""); setIshDialog(true); }
  function openIshEdit(i: Ishtirokchi) { setIshEdit(i); setIIsm(i.ism); setIFan(i.fan); setIBall(String(i.ball)); setIOrin(i.orin?String(i.orin):""); setIshDialog(true); }

  async function saveIsh() {
    if (!iIsm.trim()) { toast({ variant:"destructive", title:"Ism kiriting" }); return; }
    if (!iBall||isNaN(Number(iBall))) { toast({ variant:"destructive", title:"Ball kiriting" }); return; }
    setISaving(true);
    try {
      if (ishEdit) {
        await fetch(`${API}/olimpiada/ishtirokchilar/${ishEdit.id}`, {
          method:"PATCH", headers:authH(),
          body:JSON.stringify({ ism:iIsm, fan:iFan, ball:Number(iBall), orin:iOrin?Number(iOrin):null }),
        });
      } else {
        await fetch(`${API}/olimpiada/ishtirokchilar`, {
          method:"POST", headers:authH(),
          body:JSON.stringify({ maktab_id:selectedMaktab!.id, maktab_nomi:selectedMaktab!.nomi,
            ism:iIsm, fan:iFan, ball:Number(iBall), orin:iOrin?Number(iOrin):null }),
        });
      }
      toast({ title: ishEdit?"Yangilandi":"Qo'shildi" });
      setIshDialog(false); void loadData();
    } catch { toast({ variant:"destructive", title:"Xatolik" }); }
    finally { setISaving(false); }
  }

  async function deleteIsh(i: Ishtirokchi) {
    if (!confirm(`"${i.ism}" ni o'chirasizmi?`)) return;
    await fetch(`${API}/olimpiada/ishtirokchilar/${i.id}`, { method:"DELETE", headers:authH() });
    toast({ title:"O'chirildi" }); void loadData();
  }

  async function saveBulk() {
    if (!selectedMaktab) return;
    const lines = bulkText.split("\n").map(l=>l.trim()).filter(Boolean);
    if (!lines.length) { toast({ variant:"destructive", title:"Ro'yxat bo'sh" }); return; }
    const items = lines.map(line => {
      const parts = line.split(/[,;|\t]+/).map(p=>p.trim());
      return { ism:parts[0]??"", fan:parts[1]??bulkFan??FANLAR[0], ball:Number(parts[2]??0), orin:parts[3]?Number(parts[3]):null };
    });
    setBulkSaving(true);
    try {
      const r = await fetch(`${API}/olimpiada/ishtirokchilar/bulk`, {
        method:"POST", headers:authH(),
        body:JSON.stringify({ maktab_id:selectedMaktab.id, maktab_nomi:selectedMaktab.nomi, ishtirokchilar:items }),
      });
      const d = await r.json() as { inserted:number; errors:string[] };
      if (d.inserted>0) { toast({ title:`✅ ${d.inserted} ta qo'shildi` }); setBulkDialog(false); setBulkText(""); void loadData(); }
      if (d.errors?.length) toast({ variant:"destructive", title:`${d.errors.length} ta xato`, description:d.errors.slice(0,3).join(", ") });
    } catch { toast({ variant:"destructive", title:"Xatolik" }); }
    finally { setBulkSaving(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      {/* Sub-header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {view==="maktab" && selectedMaktab ? (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => { setView("reyting"); setSelectedMaktab(null); setFanFilter(""); }}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">{selectedMaktab.nomi}</h2>
                <p className="text-muted-foreground text-sm">{selectedMaktab.tuman} · Ball: <span className="text-primary font-semibold">{selectedMaktab.jami_ball}</span></p>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /> Tuman Reytingi</h2>
              <p className="text-muted-foreground text-sm">Maktablar o'rtasida umumiy reyting</p>
            </div>
          )}
        </div>
        {view==="reyting" && canEdit && (
          <Button onClick={openMaktabAdd} size="sm"><Plus className="w-4 h-4 mr-1.5" /> Maktab qo'shish</Button>
        )}
        {view==="maktab" && selectedMaktab && canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkDialog(true)} size="sm"><ListPlus className="w-4 h-4 mr-1.5" /> Omaviy</Button>
            <Button onClick={openFanAdd} size="sm"><Plus className="w-4 h-4 mr-1.5" /> Fan qo'shish</Button>
            <Button variant="ghost" size="sm" onClick={openIshAdd}><Plus className="w-4 h-4 mr-1.5" /> Bitta</Button>
          </div>
        )}
      </div>

      {view==="reyting" && (
        <div className="space-y-5">
          {maktablar.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon:School, label:"Maktablar", value:maktablar.length, cls:"text-primary" },
                { icon:Users, label:"Ishtirokchilar", value:totalIsh, cls:"text-violet-600" },
                { icon:BarChart3, label:"Fanlar", value:totalFanlar, cls:"text-teal-600" },
                { icon:Medal, label:"Oltin medallar", value:goldMedals, cls:"text-yellow-600" },
              ].map(({ icon:Icon, label, value, cls }) => (
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
          {top3.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {top3.map((m,idx) => (
                <Card key={m.id} className="card-hover cursor-pointer overflow-hidden" onClick={() => { setSelectedMaktab(m); setView("maktab"); setFanFilter(""); }}>
                  <div className={`h-1.5 bg-gradient-to-r ${MEDAL_BG[idx]}`} />
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="text-2xl">{MEDAL_ICONS[idx]}</span>
                      <span className="font-semibold text-sm truncate">{m.nomi}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <p className="text-muted-foreground text-xs mb-2">{m.tuman}</p>
                    <p className="text-3xl font-bold text-primary">{m.jami_ball}<span className="text-sm font-normal text-muted-foreground ml-1">ball</span></p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ishtirokchilar.filter(i=>i.maktab_id===m.id).length} ishtirokchi ·{" "}
                      {new Set(ishtirokchilar.filter(i=>i.maktab_id===m.id).map(i=>i.fan)).size} fan
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Maktab qidiring..." className="pl-9" value={searchMaktab} onChange={e => setSearchMaktab(e.target.value)} />
          </div>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><School className="w-4 h-4 text-primary" /> Barcha maktablar ({filteredMaktablar.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredMaktablar.length === 0 ? (
                <div className="text-center py-14 text-muted-foreground">
                  <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">{searchMaktab?"Qidiruv natijalari yo'q":"Hali maktab qo'shilmagan"}</p>
                  {canEdit && !searchMaktab && <Button className="mt-4" size="sm" onClick={openMaktabAdd}><Plus className="w-4 h-4 mr-1.5" /> Birinchi maktab</Button>}
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
                    {filteredMaktablar.map((m,idx) => (
                      <TableRow key={m.id} className="cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => { setSelectedMaktab(m); setView("maktab"); setFanFilter(""); }}>
                        <TableCell className="text-center font-medium">
                          {idx < 3 ? <span className="text-lg">{MEDAL_ICONS[idx]}</span> : <span className="text-muted-foreground text-sm">{idx+1}</span>}
                        </TableCell>
                        <TableCell className="font-medium">{m.nomi}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{m.tuman||"—"}</TableCell>
                        <TableCell className="text-right"><Badge variant="secondary">{ishtirokchilar.filter(i=>i.maktab_id===m.id).length}</Badge></TableCell>
                        <TableCell className="text-right font-bold text-primary text-lg">{m.jami_ball}</TableCell>
                        {canEdit && (
                          <TableCell onClick={e => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openMaktabEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteMaktab(m)}><Trash2 className="w-3.5 h-3.5" /></Button>
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

      {view==="maktab" && selectedMaktab && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-primary/5 border-primary/20"><CardContent className="pt-4 pb-3 text-center"><p className="text-xs text-muted-foreground">Ishtirokchilar</p><p className="text-2xl font-bold text-primary">{maktabIsh.length}</p></CardContent></Card>
            <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200"><CardContent className="pt-4 pb-3 text-center"><p className="text-xs text-muted-foreground">Jami ball</p><p className="text-2xl font-bold text-yellow-700">{selectedMaktab.jami_ball}</p></CardContent></Card>
            <Card className="bg-violet-50 dark:bg-violet-900/20 border-violet-200"><CardContent className="pt-4 pb-3 text-center"><p className="text-xs text-muted-foreground">Fanlar</p><p className="text-2xl font-bold text-violet-700">{new Set(ishtirokchilar.filter(i=>i.maktab_id===selectedMaktab.id).map(i=>i.fan)).size}</p></CardContent></Card>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Ism yoki fan..." className="pl-9" value={searchIsh} onChange={e => setSearchIsh(e.target.value)} />
            </div>
            <div className="relative min-w-[140px]">
              <Filter className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <select className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm bg-background" value={fanFilter} onChange={e => setFanFilter(e.target.value)}>
                <option value="">Barcha fanlar</option>
                {allFanlar.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <Card>
            <CardContent className="p-0">
              {maktabIsh.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Star className="w-8 h-8 mx-auto mb-2 opacity-20" /><p>Ishtirokchilar yo'q</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Ism</TableHead>
                      <TableHead>Fan</TableHead>
                      <TableHead className="text-center">O'rin</TableHead>
                      <TableHead className="text-right">Ball</TableHead>
                      {canEdit && <TableHead className="w-20" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maktabIsh.map((i,idx) => (
                      <TableRow key={i.id}>
                        <TableCell className="text-muted-foreground">{idx+1}</TableCell>
                        <TableCell className="font-medium">{i.ism}</TableCell>
                        <TableCell className="text-sm">{i.fan}</TableCell>
                        <TableCell className="text-center">{i.orin ? <span className="font-bold text-primary">{MEDAL_ICONS[i.orin-1]??i.orin}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-right font-bold text-primary">{i.ball}</TableCell>
                        {canEdit && (
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openIshEdit(i)}><Pencil className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteIsh(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
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

      {/* Dialogs */}
      <Dialog open={maktabDialog} onOpenChange={setMaktabDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{maktabEdit?"Maktabni tahrirlash":"Yangi maktab"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input value={mNomi} onChange={e => setMNomi(e.target.value)} placeholder="Maktab nomi" />
            <div className="flex gap-2">
              <Button onClick={saveMaktab} disabled={mSaving} className="flex-1">{mSaving&&<Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Saqlash</Button>
              <Button variant="outline" onClick={() => setMaktabDialog(false)}>Bekor</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={fanDialog} onOpenChange={setFanDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fan va ishtirokchilar qo'shish</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Fan nomi</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm bg-background" value={fanNomi} onChange={e => setFanNomi(e.target.value)}>
                <option value="">Tanlang...</option>
                {FANLAR.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            {fanStudents.map((s,i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <Input placeholder={`${i+1}-o'quvchi ismi`} value={s.ism} onChange={e => setFanStudents(fs => fs.map((f,j)=>j===i?{...f,ism:e.target.value}:f))} className="col-span-1" />
                <Input type="number" placeholder="Ball" value={s.ball} onChange={e => setFanStudents(fs => fs.map((f,j)=>j===i?{...f,ball:e.target.value}:f))} />
                <Input type="number" placeholder="O'rin" value={s.orin} onChange={e => setFanStudents(fs => fs.map((f,j)=>j===i?{...f,orin:e.target.value}:f))} />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setFanStudents(fs=>[...fs,{ism:"",ball:"",orin:""}])}><Plus className="w-4 h-4 mr-1" />Qator qo'shish</Button>
            <div className="flex gap-2">
              <Button onClick={saveFanStudents} disabled={fanSaving} className="flex-1">{fanSaving&&<Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Saqlash</Button>
              <Button variant="outline" onClick={() => setFanDialog(false)}>Bekor</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={ishDialog} onOpenChange={setIshDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ishEdit?"Tahrirlash":"Ishtirokchi qo'shish"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Ism" value={iIsm} onChange={e => setIIsm(e.target.value)} />
            <select className="w-full border rounded-lg px-3 py-2 text-sm bg-background" value={iFan} onChange={e => setIFan(e.target.value)}>
              {FANLAR.map(f=><option key={f} value={f}>{f}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Ball" value={iBall} onChange={e => setIBall(e.target.value)} />
              <Input type="number" placeholder="O'rin (ixtiyoriy)" value={iOrin} onChange={e => setIOrin(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveIsh} disabled={iSaving} className="flex-1">{iSaving&&<Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Saqlash</Button>
              <Button variant="outline" onClick={() => setIshDialog(false)}>Bekor</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Omaviy qo'shish</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Har qatorda: Ism, Fan, Ball, O'rin (vergul/nuqta-vergul/tab bilan)</p>
          <div>
            <label className="text-sm font-medium mb-1 block">Standart fan (ism/ball/o'rin formatida bo'lsa)</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm bg-background mb-2" value={bulkFan} onChange={e => setBulkFan(e.target.value)}>
              {FANLAR.map(f=><option key={f} value={f}>{f}</option>)}
            </select>
            <textarea rows={8} className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
              placeholder={"Ali Valiyev, Matematika, 95, 1\nVali Aliyev, Fizika, 87, 2"}
              value={bulkText} onChange={e => setBulkText(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={saveBulk} disabled={bulkSaving} className="flex-1">{bulkSaving&&<Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Qo'shish</Button>
            <Button variant="outline" onClick={() => setBulkDialog(false)}>Bekor</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

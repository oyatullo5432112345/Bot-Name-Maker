import { useState, useEffect } from "react";
import { useAuth } from "@/lib/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  KeyRound, Copy, Trash2, CheckCircle2, Clock, Users,
  GraduationCap, ChevronDown, AlertTriangle, RefreshCw, Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token") ?? "";

interface CodeRow {
  id: string;
  code: string;
  full_name: string;
  first_name: string;
  last_name: string;
  role: string;
  class_id: string | null;
  class_name: string | null;
  used: boolean;
  used_at: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  student: "O'quvchi",
  teacher: "O'qituvchi",
  sinf_rahbari: "Sinf rahbari",
  director: "Direktor",
  mudir: "Obidov Boburjon",
  zam_direktor: "Zam. direktor",
  zavuch: "Zavuch",
  kutubxonachi: "Kutubxonachi",
};

function copyText(text: string, toast: ReturnType<typeof import("@/hooks/use-toast").useToast>["toast"]) {
  navigator.clipboard.writeText(text).then(() => {
    toast({ title: "✅ Nusxalandi!" });
  });
}

export default function AdminCodesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: classes = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["admin-classes-list"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/classes`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return [];
      return res.json() as Promise<{ id: string; name: string }[]>;
    },
    staleTime: 60_000,
  });

  const [tab, setTab] = useState<"generate" | "list">("generate");

  const [selectedRole, setSelectedRole] = useState("student");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [namesText, setNamesText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<CodeRow[]>([]);

  const [allCodes, setAllCodes] = useState<CodeRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [filterClass, setFilterClass] = useState("");
  const [filterRole, setFilterRole] = useState("");

  const [cleanupDialog, setCleanupDialog] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  if (!user || !["admin", "director", "mudir"].includes(user.role)) {
    return <p className="text-muted-foreground p-4">Ruxsat yo'q.</p>;
  }

  const sortedClasses = [...(classes ?? [])].sort((a: { name: string }, b: { name: string }) => {
    const na = parseInt(a.name) || 0, nb = parseInt(b.name) || 0;
    if (na !== nb) return na - nb;
    return a.name.localeCompare(b.name);
  }) as { id: string; name: string }[];

  const selectedClass = sortedClasses.find(c => c.id === selectedClassId);

  const handleGenerate = async () => {
    const names = namesText.split("\n").map(l => l.trim()).filter(Boolean);
    if (!names.length) { toast({ variant: "destructive", title: "Ismlar kiritilmagan" }); return; }
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/admin/codes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          names,
          role: selectedRole,
          class_id: selectedClassId || undefined,
          class_name: selectedClass?.name || undefined,
        }),
      });
      const data = await res.json() as { generated?: CodeRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Xatolik");
      setGenerated(data.generated ?? []);
      setNamesText("");
      toast({ title: `✅ ${data.generated?.length ?? 0} ta kod yaratildi!` });
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    }
    setGenerating(false);
  };

  const loadAllCodes = async () => {
    setListLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterClass) params.set("class_id", filterClass);
      if (filterRole) params.set("role", filterRole);
      const res = await fetch(`${API_BASE}/admin/codes?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json() as CodeRow[];
      setAllCodes(Array.isArray(data) ? data : []);
    } catch {
      toast({ variant: "destructive", title: "Yuklab bo'lmadi" });
    }
    setListLoading(false);
  };

  useEffect(() => { if (tab === "list") void loadAllCodes(); }, [tab, filterClass, filterRole]);

  const handleDelete = async (id: string) => {
    if (!confirm("Kodni o'chirasizmi?")) return;
    await fetch(`${API_BASE}/admin/codes/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    toast({ title: "O'chirildi" });
    if (tab === "list") void loadAllCodes();
    setGenerated(prev => prev.filter(r => r.id !== id));
  };

  const handleCleanupUnused = async () => {
    setCleanupLoading(true);
    try {
      const params: Record<string, unknown> = { unused: true };
      if (filterClass) params.class_id = filterClass;
      const res = await fetch(`${API_BASE}/admin/codes`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(params),
      });
      const data = await res.json() as { deleted: number };
      toast({ title: `🗑️ ${data.deleted} ta ishlatilmagan kod o'chirildi` });
      setCleanupDialog(false);
      void loadAllCodes();
    } catch {
      toast({ variant: "destructive", title: "Xatolik yuz berdi" });
    }
    setCleanupLoading(false);
  };

  const handleCopyOne = (row: CodeRow) => {
    const text = `${row.full_name} — ${row.code}`;
    copyText(text, toast);
  };

  const handleCopyAll = (rows: CodeRow[]) => {
    const className = rows[0]?.class_name ? `${rows[0].class_name} sinfi:\n` : "";
    const text = className + rows.map(r => `${r.full_name} — ${r.code}`).join("\n");
    copyText(text, toast);
  };

  const unusedCount = allCodes.filter(r => !r.used).length;
  const usedCount = allCodes.filter(r => r.used).length;

  const CodeTable = ({ rows, showDelete = true }: { rows: CodeRow[]; showDelete?: boolean }) => (
    <div className="space-y-2">
      {rows.length > 1 && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => handleCopyAll(rows)}>
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Barchasini nusxalash
          </Button>
        </div>
      )}
      <div className="rounded-lg border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Ism Familiya</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Mahfiy kod</th>
              {tab === "list" && <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Sinf / Rol</th>}
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Holat</th>
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className={`transition-colors ${i % 2 === 0 ? "bg-background" : "bg-muted/20"} hover:bg-primary/5`}>
                <td className="px-3 py-2.5 font-medium">{row.full_name}</td>
                <td className="px-3 py-2.5">
                  <code className="bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-md tracking-widest text-xs border border-primary/20">
                    {row.code}
                  </code>
                </td>
                {tab === "list" && (
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">
                    {row.class_name ?? ROLE_LABELS[row.role] ?? row.role}
                  </td>
                )}
                <td className="px-3 py-2.5">
                  {row.used ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Ishlatilgan
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                      <Clock className="w-3 h-3" /> Kutilmoqda
                    </span>
                  )}
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopyOne(row)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    {showDelete && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => void handleDelete(row.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-primary" />
          Mahfiy kodlar boshqaruvi
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          O'quvchi va xodimlarni ro'yxatdan o'tkazish uchun maxsus kodlar yarating
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {([["generate", "✨ Kod yaratish"], ["list", "📋 Mavjud kodlar"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "generate" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Toifa</Label>
              <div className="relative">
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                >
                  {Object.entries(ROLE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Sinf {selectedRole === "student" || selectedRole === "sinf_rahbari" ? "(majburiy)" : "(ixtiyoriy)"}</Label>
              <div className="relative">
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                >
                  <option value="">— sinf tanlanmagan —</option>
                  {sortedClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Familiya va ismlar
              <span className="text-muted-foreground font-normal ml-1">(har bir ism yangi qatorda)</span>
            </Label>
            <textarea
              className="w-full border border-input rounded-md px-3 py-2 text-sm font-mono resize-none h-44 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
              placeholder={"Valiyev Valijon\nHasanov Xasan\nToshmatova Zulfiya\n..."}
              value={namesText}
              onChange={e => setNamesText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {namesText.split("\n").filter(l => l.trim()).length} ta ism kiritildi
            </p>
          </div>

          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={generating || !namesText.trim()}
          >
            {generating ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Yaratilmoqda...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Mahfiy kodlar yaratish</>
            )}
          </Button>

          {generated.length > 0 && (
            <Card className="border-primary/30 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  {generated.length} ta kod yaratildi
                  {selectedClass && <span className="text-muted-foreground font-normal">— {selectedClass.name} sinfi</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CodeTable rows={generated} showDelete={false} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "list" && (
        <div className="space-y-4">
          {/* Stats banners */}
          {allCodes.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold text-primary">{allCodes.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Jami kodlar</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{usedCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Ishlatilgan</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{unusedCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Kutilmoqda</p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[140px]">
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
              >
                <option value="">Barcha sinflar</option>
                {sortedClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative flex-1 min-w-[140px]">
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
              >
                <option value="">Barcha toifalar</option>
                {Object.entries(ROLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            <Button variant="outline" size="icon" onClick={() => void loadAllCodes()} disabled={listLoading} title="Yangilash">
              <RefreshCw className={`w-4 h-4 ${listLoading ? "animate-spin" : ""}`} />
            </Button>
            {unusedCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setCleanupDialog(true)}
                className="whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Ishlatilmaganlarni o'chirish ({unusedCount})
              </Button>
            )}
          </div>

          {listLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : allCodes.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground font-medium">Hech qanday kod topilmadi</p>
              <p className="text-sm text-muted-foreground mt-1">Avval "Kod yaratish" bo'limida kodlar yarating</p>
            </div>
          ) : (
            <CodeTable rows={allCodes} showDelete />
          )}
        </div>
      )}

      {/* Cleanup confirmation dialog */}
      <Dialog open={cleanupDialog} onOpenChange={setCleanupDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Ishlatilmagan kodlarni o'chirish
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              {filterClass
                ? `Tanlangan sinfdagi `
                : `Barcha `}
              <span className="font-bold text-foreground">{unusedCount} ta kutilmoqda</span> holatidagi kod o'chiriladi.
              Bu amal qaytarib bo'lmaydi!
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCleanupDialog(false)}>
                Bekor qilish
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={cleanupLoading}
                onClick={handleCleanupUnused}
              >
                {cleanupLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
                O'chirish
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

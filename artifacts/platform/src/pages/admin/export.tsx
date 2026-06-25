import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, Loader2, FileSpreadsheet, Users, ClipboardList, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

interface ClassItem { id: string; name: string }

const UZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

const STATUS_LABELS: Record<string, string> = {
  present: "Keldi", absent: "Kelmadi", late: "Kech keldi", excused: "Uzrli",
};

type ExportType = "grades" | "attendance" | "students";

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const BOM = "\uFEFF";
  const lines = [
    headers.join(";"),
    ...rows.map(r => r.map(c => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(";")),
  ];
  const blob = new Blob([BOM + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ExportPage() {
  const [type, setType] = useState<ExportType>("grades");
  const [classFilter, setClassFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);

  const { data: classes = [] } = useQuery<ClassItem[]>({
    queryKey: ["classes-export"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/classes`, { headers: authH() });
      if (!r.ok) return [];
      return r.json() as Promise<ClassItem[]>;
    },
    staleTime: 5 * 60_000,
  });

  async function handleExport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (classFilter) params.set("class_name", classFilter);
      if (monthFilter) { params.set("month", monthFilter); params.set("year", yearFilter); }

      const r = await fetch(`${API_BASE}/reyting/export?${params}`, { headers: authH() });
      if (!r.ok) { setLoading(false); return; }
      const json = await r.json() as { type: string; data: Record<string, string>[] };

      const now = new Date().toLocaleDateString("uz-UZ").replace(/\./g, "-");
      const classLabel = classFilter ? `_${classFilter}` : "";
      const monthLabel = monthFilter ? `_${UZ_MONTHS[parseInt(monthFilter) - 1]}` : "";

      if (type === "grades") {
        downloadCsv(
          `baholar${classLabel}${monthLabel}_${now}.csv`,
          ["O'quvchi", "Sinf", "Fan", "Baho", "O'qituvchi", "Sana"],
          json.data.map(r => [r["student_name"] ?? "", r["class_name"] ?? "", r["subject"] ?? "", r["grade"] ?? "", r["teacher_name"] ?? "", r["date"] ?? ""])
        );
      } else if (type === "attendance") {
        downloadCsv(
          `davomat${classLabel}${monthLabel}_${now}.csv`,
          ["O'quvchi", "Sinf", "Sana", "Holat", "Izoh"],
          json.data.map(r => [r["student_name"] ?? "", r["class_name"] ?? "", r["date"] ?? "", STATUS_LABELS[r["status"] ?? ""] ?? (r["status"] ?? ""), r["note"] ?? ""])
        );
      } else {
        downloadCsv(
          `oquvchilar${classLabel}_${now}.csv`,
          ["F.I.O", "Sinf", "Login", "Telefon", "Ro'yxatga olingan"],
          json.data.map(r => [r["full_name"] ?? "", r["class_name"] ?? "", r["login"] ?? "", r["phone_number"] ?? "", r["reg_date"] ?? ""])
        );
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  const exportTypes: { id: ExportType; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: "grades",     label: "Baholar vedomosti", icon: <ClipboardList className="w-5 h-5" />, desc: "Barcha baholar, fan va o'qituvchi bo'yicha" },
    { id: "attendance", label: "Davomat hisoboti",  icon: <CalendarCheck className="w-5 h-5" />,  desc: "O'quvchilarning davomat tarixi" },
    { id: "students",   label: "O'quvchilar ro'yxati", icon: <Users className="w-5 h-5" />,       desc: "To'liq o'quvchilar ma'lumoti" },
  ];

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <FileSpreadsheet className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Hujjat Generator</h1>
          <p className="text-sm text-muted-foreground">CSV formatida yuklab oling</p>
        </div>
      </div>

      {/* Type selection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Hujjat turini tanlang</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {exportTypes.map(et => (
            <button
              key={et.id}
              onClick={() => setType(et.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                type === et.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-accent"
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                type === et.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {et.icon}
              </div>
              <div>
                <p className="font-medium text-sm">{et.label}</p>
                <p className="text-xs text-muted-foreground">{et.desc}</p>
              </div>
              {type === et.id && (
                <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Filtrlar (ixtiyoriy)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Sinf</label>
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">Barcha sinflar</option>
              {classes.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {type !== "students" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Oy</label>
                <select
                  value={monthFilter}
                  onChange={e => setMonthFilter(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Barcha oylar</option>
                  {UZ_MONTHS.map((m, i) => (
                    <option key={i + 1} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Yil</label>
                <select
                  value={yearFilter}
                  onChange={e => setYearFilter(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  {[2024, 2025, 2026].map(y => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export button */}
      <Button onClick={handleExport} disabled={loading} className="w-full gap-2" size="lg">
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Yuklab olinmoqda...</>
          : <><FileDown className="w-4 h-4" /> CSV yuklab olish</>
        }
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Fayl Excel-da ochiladi. Ochishda "Vergul bilan ajratilgan" formatini tanlang.
      </p>
    </div>
  );
}

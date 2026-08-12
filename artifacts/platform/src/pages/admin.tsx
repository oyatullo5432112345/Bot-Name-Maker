import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, PlayCircle, StopCircle, Users, Loader2 } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  const base: Record<string, string> = { "Content-Type": "application/json" };
  return t ? { ...base, Authorization: `Bearer ${t}` } : base;
};

interface TestRow {
  id: string; title: string; subject: string; class_name: string | null;
  quarter: number; academic_year: string; status: string;
  is_anonymous: boolean; attempts_count: number;
}

interface DraftQuestion { question: string; options: string[]; correct_index: number }

const EMPTY_QUESTION = (): DraftQuestion => ({ question: "", options: ["", ""], correct_index: 0 });

export default function MonitoringAdminPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [quarter, setQuarter] = useState(1);
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [duration, setDuration] = useState(30);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [questions, setQuestions] = useState<DraftQuestion[]>([EMPTY_QUESTION()]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [resultsFor, setResultsFor] = useState<string | null>(null);

  const { data: tests = [], isLoading } = useQuery<TestRow[]>({
    queryKey: ["monitoring-tests-admin"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/monitoring/tests`, { headers: authH() });
      if (!r.ok) return [];
      return r.json() as Promise<TestRow[]>;
    },
  });

  const { data: results = [] } = useQuery<Array<{ student_name: string; class_name: string; score: number; total: number }>>({
    queryKey: ["monitoring-results", resultsFor],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/monitoring/tests/${resultsFor}/results`, { headers: authH() });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!resultsFor,
  });

  const resetForm = () => {
    setTitle(""); setSubject(""); setClassName(""); setQuarter(1);
    setDuration(30); setIsAnonymous(false); setQuestions([EMPTY_QUESTION()]);
    setSaveError("");
  };

  const handleCreate = async () => {
    setSaveError("");
    if (!title.trim() || !subject.trim()) { setSaveError("Sarlavha va fanni kiriting"); return; }
    const cleanQuestions = questions.filter(q => q.question.trim() && q.options.every(o => o.trim()));
    if (cleanQuestions.length === 0) { setSaveError("Kamida 1 ta to'liq savol qo'shing"); return; }

    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/monitoring/tests`, {
        method: "POST",
        headers: authH(),
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim(),
          class_name: className.trim() || null,
          quarter,
          academic_year: academicYear,
          duration_minutes: duration,
          is_anonymous: isAnonymous,
          show_result_immediately: true,
          questions: cleanQuestions,
        }),
      });
      const json = await r.json();
      if (!r.ok) { setSaveError(json.error ?? "Xatolik yuz berdi"); return; }
      resetForm();
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["monitoring-tests-admin"] });
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: "open" | "closed") => {
    await fetch(`${API_BASE}/monitoring/tests/${id}/status`, {
      method: "PATCH",
      headers: authH(),
      body: JSON.stringify({ status }),
    });
    qc.invalidateQueries({ queryKey: ["monitoring-tests-admin"] });
  };

  const updateQuestion = (idx: number, patch: Partial<DraftQuestion>) => {
    setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };
  const updateOption = (qIdx: number, oIdx: number, val: string) => {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qIdx) return q;
      const options = [...q.options]; options[oIdx] = val;
      return { ...q, options };
    }));
  };

  const statusLabel: Record<string, string> = { draft: "Qoralama", open: "Ochiq", closed: "Yopiq" };
  const statusColor: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    open: "bg-emerald-100 text-emerald-700",
    closed: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chorak Monitoring — boshqaruv</h1>
          <p className="text-muted-foreground mt-1">Fan bo'yicha chorak testlarini yarating, oching va natijalarni kuzating</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Yangi test
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border p-5 space-y-4 bg-card">
          <div className="grid gap-3 sm:grid-cols-2">
            <input placeholder="Test sarlavhasi" value={title} onChange={e => setTitle(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Fan (masalan: Matematika)" value={subject} onChange={e => setSubject(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Sinf (bo'sh = barcha sinflar)" value={className} onChange={e => setClassName(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="O'quv yili (2025-2026)" value={academicYear} onChange={e => setAcademicYear(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm" />
            <select value={quarter} onChange={e => setQuarter(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm">
              {[1, 2, 3, 4].map(q => <option key={q} value={q}>{q}-chorak</option>)}
            </select>
            <input type="number" min={5} max={180} value={duration} onChange={e => setDuration(Number(e.target.value))}
              placeholder="Davomiyligi (daqiqa)" className="border rounded-lg px-3 py-2 text-sm" />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} />
            Anonim rejim (o'quvchilar bir-birining ismini ko'rmaydi)
          </label>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Savollar</p>
            {questions.map((q, qi) => (
              <div key={qi} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    placeholder={`${qi + 1}-savol matni`}
                    value={q.question}
                    onChange={e => updateQuestion(qi, { question: e.target.value })}
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                  />
                  <button onClick={() => setQuestions(qs => qs.filter((_, i) => i !== qi))} className="text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={q.correct_index === oi}
                      onChange={() => updateQuestion(qi, { correct_index: oi })}
                      title="To'g'ri javob"
                    />
                    <input
                      placeholder={`Variant ${oi + 1}`}
                      value={opt}
                      onChange={e => updateOption(qi, oi, e.target.value)}
                      className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                    />
                  </div>
                ))}
                <button
                  onClick={() => updateQuestion(qi, { options: [...q.options, ""] })}
                  className="text-xs text-primary"
                >
                  + Variant qo'shish
                </button>
              </div>
            ))}
            <button
              onClick={() => setQuestions(qs => [...qs, EMPTY_QUESTION()])}
              className="text-sm text-primary flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Savol qo'shish
            </button>
          </div>

          {saveError && <p className="text-sm text-red-500">{saveError}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Testni saqlash (qoralama sifatida)
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2.5 rounded-lg border text-sm">
              Bekor qilish
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Yuklanmoqda...</div>
      ) : (
        <div className="rounded-xl border divide-y">
          {tests.length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-sm">Hali test yaratilmagan</div>
          )}
          {tests.map((t) => (
            <div key={t.id} className="p-4 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <p className="font-medium">{t.subject} — {t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {t.quarter}-chorak • {t.class_name ?? "Barcha sinflar"} • {t.academic_year}
                  {t.is_anonymous && " • Anonim"}
                </p>
              </div>
              <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${statusColor[t.status]}`}>
                {statusLabel[t.status]}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {t.attempts_count}
              </span>
              {t.status !== "open" && t.status !== "closed" && (
                <button onClick={() => setStatus(t.id, "open")} className="text-emerald-600 flex items-center gap-1 text-xs font-medium">
                  <PlayCircle className="w-4 h-4" /> Ochish
                </button>
              )}
              {t.status === "open" && (
                <button onClick={() => setStatus(t.id, "closed")} className="text-red-600 flex items-center gap-1 text-xs font-medium">
                  <StopCircle className="w-4 h-4" /> Yopish
                </button>
              )}
              <button
                onClick={() => setResultsFor(resultsFor === t.id ? null : t.id)}
                className="text-xs text-primary underline"
              >
                Natijalar
              </button>
              {resultsFor === t.id && (
                <div className="w-full mt-2 rounded-lg bg-muted/40 divide-y">
                  {results.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground">Hali natija yo'q</p>
                  ) : results.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                      <span className="flex-1">{r.student_name}</span>
                      <span className="text-muted-foreground">{r.class_name}</span>
                      <span className="font-semibold">{r.score}/{r.total}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

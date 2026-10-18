import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Delete, Check } from "lucide-react";
import { API_BASE } from "@/lib/face";

// #12: Bosqichma-bosqich o'quvchi kirishi.
//   maktab → (smena — faqat 2 smenali maktabda) → bo'lim → sinf → o'zi → PIN/chizma.

type SchoolRow = { id: number; nom: string; tuman: string; ikki_smena: boolean };
type StudentRow = { login: string; full_name: string; pin_set: boolean };
type Step = "school" | "smena" | "bolim" | "class" | "student" | "pin";

async function jget<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`);
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error((d as { error?: string })?.error || "Xatolik"); }
  return r.json() as Promise<T>;
}

// Sinf nomini tabiiy tartiblash: avval raqam (1..11), keyin harf
const clsGrade = (c: string): number => { const m = c.match(/^\s*(\d{1,2})/); return m ? parseInt(m[1]!, 10) : 999; };
const clsCmp = (a: string, b: string): number => { const ga = clsGrade(a), gb = clsGrade(b); return ga !== gb ? ga - gb : a.localeCompare(b, "uz"); };

export function StudentPickerDialog({
  onSuccess, onClose, tgToken,
}: {
  onSuccess: (r: Record<string, unknown>) => void;
  onClose: () => void;
  tgToken?: string;
}) {
  const [step, setStep] = useState<Step>("school");
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [smena, setSmena] = useState<number | null>(null);
  const [bolim, setBolim] = useState<string>("");
  const [classes, setClasses] = useState<string[]>([]);
  const [cls, setCls] = useState<string>("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // PIN / chizma
  const [method, setMethod] = useState<"pin" | "pattern">("pin");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pattern, setPattern] = useState<number[]>([]);
  const [patternConfirm, setPatternConfirm] = useState<number[]>([]);
  const [phase, setPhase] = useState<"enter" | "confirm">("enter"); // yangi parol uchun
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    jget<SchoolRow[]>("/auth/pick/schools")
      .then(setSchools).catch((e) => setErr((e as Error).message)).finally(() => setLoading(false));
  }, []);

  const resetPinState = () => {
    setMethod("pin"); setPin(""); setPinConfirm(""); setPattern([]); setPatternConfirm([]); setPhase("enter"); setErr("");
  };
  const switchMethod = (m: "pin" | "pattern") => {
    setMethod(m); setPin(""); setPinConfirm(""); setPattern([]); setPatternConfirm([]); setPhase("enter"); setErr("");
  };

  const loadClasses = async (sc: SchoolRow, sm: number | null, bo: string) => {
    setLoading(true); setErr("");
    try {
      const q = new URLSearchParams({ maktab_id: String(sc.id) });
      if (sm) q.set("smena", String(sm));
      if (bo) q.set("bolim", bo);
      setClasses((await jget<string[]>(`/auth/pick/classes?${q.toString()}`)).sort(clsCmp));
      setStep("class");
    } catch (e) { setErr((e as Error).message); } finally { setLoading(false); }
  };

  const pickSchool = (sc: SchoolRow) => {
    setSchool(sc); setSmena(null); setBolim("");
    if (sc.ikki_smena) setStep("smena");
    else setStep("bolim");
  };
  const pickSmena = (sm: number) => { setSmena(sm); setStep("bolim"); };
  const pickBolim = (bo: string) => { setBolim(bo); if (school) void loadClasses(school, smena, bo); };
  const pickClass = async (name: string) => {
    if (!school) return;
    setCls(name); setLoading(true); setErr("");
    try {
      const rows = await jget<StudentRow[]>(`/auth/pick/students?maktab_id=${school.id}&class=${encodeURIComponent(name)}`);
      setStudents(rows); setStep("student");
    } catch (e) { setErr((e as Error).message); } finally { setLoading(false); }
  };
  const pickStudent = (s: StudentRow) => { setStudent(s); resetPinState(); setStep("pin"); };

  const back = () => {
    setErr("");
    if (step === "smena") setStep("school");
    else if (step === "bolim") setStep(school?.ikki_smena ? "smena" : "school");
    else if (step === "class") setStep("bolim");
    else if (step === "student") setStep("class");
    else if (step === "pin") setStep("student");
  };

  // chizma nuqtasini bosish
  const tapDot = (i: number) => {
    const target = phase === "confirm" ? patternConfirm : pattern;
    const setter = phase === "confirm" ? setPatternConfirm : setPattern;
    if (target.includes(i)) return;
    setter([...target, i]);
  };

  const buildSecret = (): string | null => {
    if (method === "pin") {
      const settingNew = !!student && !student.pin_set;
      // Yangi PIN — aniq 4 xonali. Kirishda eski (4-6 xonali) kodlar ham qabul qilinadi.
      const re = settingNew ? /^\d{4}$/ : /^\d{4,6}$/;
      if (!re.test(pin)) { setErr("Kod 4 raqamdan iborat bo'lsin"); return null; }
      if (settingNew) {
        if (pin !== pinConfirm) { setErr("Kodlar mos kelmadi"); return null; }
      }
      return pin;
    }
    // pattern
    if (pattern.length < 4) { setErr("Kamida 4 nuqtani blog'lang"); return null; }
    if (student && !student.pin_set) {
      if (pattern.join("-") !== patternConfirm.join("-")) { setErr("Chizmalar mos kelmadi"); return null; }
    }
    return "P" + pattern.join("-");
  };

  const submit = async () => {
    if (!student) return;
    // yangi parol: avval "enter", keyin "confirm" bosqichi
    if (!student.pin_set && phase === "enter") {
      if (method === "pin" ? /^\d{4}$/.test(pin) : pattern.length >= 4) { setPhase("confirm"); setErr(""); return; }
      setErr(method === "pin" ? "Kod 4 raqamdan iborat bo'lsin" : "Kamida 4 nuqtani bog'lang");
      return;
    }
    const secret = buildSecret();
    if (!secret) return;
    setSubmitting(true); setErr("");
    try {
      const r = await fetch(`${API_BASE}/auth/pin-login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: student.login, pin: secret, ...(tgToken ? { tg: tgToken } : {}) }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((data as { error?: string })?.error || "Kirish amalga oshmadi");
      onSuccess(data as Record<string, unknown>);
    } catch (e) {
      setErr((e as Error).message);
      // confirm bosqichida xato bo'lsa — qaytadan kiritsin
      if (!student.pin_set) { resetPinState(); }
    } finally { setSubmitting(false); }
  };

  const title =
    step === "school" ? "Maktabni tanlang" :
    step === "smena" ? "Smenani tanlang" :
    step === "bolim" ? "Bo'limni tanlang" :
    step === "class" ? "Sinfni tanlang" :
    step === "student" ? "Ismingizni toping" : "Parol";

  const listBtn = "w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-accent transition flex items-center justify-between";

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== "school" && (
              <button onClick={back} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></button>
            )}
            <span>🏫 {title}</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {step === "school" && schools.map((s) => (
              <button key={s.id} className={listBtn} onClick={() => pickSchool(s)}>
                <span>{s.nom}</span>
                <span className="text-xs text-muted-foreground">{s.tuman}</span>
              </button>
            ))}

            {step === "smena" && [1, 2].map((n) => (
              <button key={n} className={listBtn} onClick={() => pickSmena(n)}>
                <span>{n}-smena</span>
                <span className="text-xs text-muted-foreground">{n === 1 ? "ertalabki" : "tushdan keyin"}</span>
              </button>
            ))}

            {step === "bolim" && (
              <>
                <button className={listBtn} onClick={() => pickBolim("boshlangich")}><span>Boshlang'ich (1–4)</span></button>
                <button className={listBtn} onClick={() => pickBolim("yuqori")}><span>Yuqori (5–11)</span></button>
                <button className="w-full text-center text-sm text-muted-foreground py-2" onClick={() => { if (school) void loadClasses(school, smena, ""); }}>Hammasi</button>
              </>
            )}

            {step === "class" && (
              classes.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-6">Sinf topilmadi.</p>
                : classes.map((c) => (
                    <button key={c} className={listBtn} onClick={() => void pickClass(c)}><span>{c}</span></button>
                  ))
            )}

            {step === "student" && (
              students.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-6">O'quvchi topilmadi.</p>
                : students.map((s) => (
                    <button key={s.login} className={listBtn} onClick={() => pickStudent(s)}>
                      <span>{s.full_name}</span>
                      {!s.pin_set && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">yangi</span>}
                    </button>
                  ))
            )}

            {step === "pin" && student && (
              <div className="space-y-3">
                <p className="text-sm text-center">
                  <b>{student.full_name}</b>
                  <br />
                  <span className="text-muted-foreground">
                    {student.pin_set
                      ? "Parolingizni kiriting"
                      : phase === "enter" ? "Yangi parol o'rnating" : "Parolni takrorlang"}
                  </span>
                </p>

                {/* usul tanlash */}
                <div className="flex gap-2">
                  <Button type="button" variant={method === "pin" ? "default" : "outline"} size="sm" className="flex-1"
                    onClick={() => switchMethod("pin")}>🔢 Raqamli kod</Button>
                  <Button type="button" variant={method === "pattern" ? "default" : "outline"} size="sm" className="flex-1"
                    onClick={() => switchMethod("pattern")}>✏️ Chizma</Button>
                </div>

                {method === "pin" ? (
                  <PinPad
                    value={phase === "confirm" ? pinConfirm : pin}
                    onChange={(v) => (phase === "confirm" ? setPinConfirm(v) : setPin(v))}
                    maxLen={student && !student.pin_set ? 4 : 6}
                  />
                ) : (
                  <PatternGrid
                    dots={phase === "confirm" ? patternConfirm : pattern}
                    onTap={tapDot}
                    onClear={() => (phase === "confirm" ? setPatternConfirm([]) : setPattern([]))}
                  />
                )}

                {err && <p className="text-sm text-destructive text-center">{err}</p>}

                <Button className="w-full" onClick={() => void submit()} disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {!student.pin_set && phase === "enter" ? <>Keyingi <Check className="w-4 h-4 ml-1" /></> : "Kirish"}
                </Button>
              </div>
            )}

            {err && step !== "pin" && <p className="text-sm text-destructive text-center">{err}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PinPad({ value, onChange, maxLen = 6 }: { value: string; onChange: (v: string) => void; maxLen?: number }) {
  const press = (d: string) => { if (value.length < maxLen) onChange(value + d); };
  const del = () => onChange(value.slice(0, -1));
  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-2">
        {Array.from({ length: maxLen }, (_, i) => (
          <span key={i} className={`w-3.5 h-3.5 rounded-full ${i < value.length ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} className="py-3 rounded-xl border border-border text-lg font-semibold hover:bg-accent" onClick={() => press(d)}>{d}</button>
        ))}
        <span />
        <button className="py-3 rounded-xl border border-border text-lg font-semibold hover:bg-accent" onClick={() => press("0")}>0</button>
        <button className="py-3 rounded-xl border border-border flex items-center justify-center hover:bg-accent" onClick={del}><Delete className="w-5 h-5" /></button>
      </div>
    </div>
  );
}

function PatternGrid({ dots, onTap, onClear }: { dots: number[]; onTap: (i: number) => void; onClear: () => void }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3 w-44 mx-auto">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
          const order = dots.indexOf(i);
          const active = order >= 0;
          return (
            <button key={i} onClick={() => onTap(i)}
              className={`aspect-square rounded-full border-2 flex items-center justify-center text-sm font-bold transition ${active ? "border-primary bg-primary/15 text-primary" : "border-border"}`}>
              {active ? order + 1 : ""}
            </button>
          );
        })}
      </div>
      <button className="w-full text-center text-xs text-muted-foreground py-1" onClick={onClear}>Tozalash</button>
    </div>
  );
}

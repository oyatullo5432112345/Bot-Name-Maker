// Face ID — o'quvchilar yuzini ro'yxatga olish (sinf rahbari / admin).
// Kamera 3 ta namuna oladi → 128 sonli yuz izlari serverga yuboriladi. Rasm saqlanmaydi.

import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Camera, CheckCircle2, Loader2, ScanFace, ShieldCheck, SwitchCamera, Trash2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/use-auth";
import { api, beep, detectFace, loadFaceApi, startCamera, stopCamera } from "@/lib/face";

interface ClassRow { class_name: string; total: number; enrolled: number }
interface StudentRow { login: string; full_name: string; enrolled: boolean; samples: number; updated_at: string | null }

const SAMPLES = 3;
const HINTS = ["To'g'ri kameraga qarang", "Boshni biroz chapga buring", "Boshni biroz o'ngga buring"];

function CaptureDialog({ student, onClose, onSaved }: { student: StudentRow; onClose: () => void; onSaved: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(false);
  const samplesRef = useRef<number[][]>([]);
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState<"consent" | "loading" | "capture" | "saving" | "similar" | "error">("consent");
  const [progress, setProgress] = useState("");
  const [count, setCount] = useState(0);
  const [hint, setHint] = useState(HINTS[0]!);
  const [error, setError] = useState("");
  const [similar, setSimilar] = useState<{ name: string; class_name: string } | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("environment");

  useEffect(() => () => {
    runningRef.current = false;
    stopCamera(streamRef.current);
  }, []);

  const save = async (force = false) => {
    setStage("saving");
    try {
      await api("/faceid/enroll", {
        method: "POST",
        body: JSON.stringify({ student_login: student.login, descriptors: samplesRef.current, consent: true, force }),
      });
      beep("ok");
      toast({ title: "✅ Yuz ro'yxatga olindi", description: student.full_name });
      onSaved();
    } catch (e) {
      const err = e as Error & { status?: number; data?: { similar?: { name: string; class_name: string } } };
      if (err.status === 409 && err.data?.similar) {
        setSimilar(err.data.similar);
        setStage("similar");
      } else {
        setError(err.message);
        setStage("error");
      }
    }
  };

  const captureLoop = async (fa: unknown) => {
    const video = videoRef.current;
    if (!runningRef.current || !video) return;
    try {
      const face = await detectFace(fa, video, 416);
      const big = face && face.box.width >= video.videoWidth * 0.22;
      if (face && face.score >= 0.75 && big) {
        samplesRef.current.push(Array.from(face.descriptor));
        const n = samplesRef.current.length;
        setCount(n);
        beep("again");
        if (n >= SAMPLES) {
          runningRef.current = false;
          stopCamera(streamRef.current);
          await save();
          return;
        }
        setHint(HINTS[n] ?? HINTS[0]!);
        setTimeout(() => void captureLoop(fa), 900); // namunalar orasida pauza — har xil burchak
        return;
      }
      setHint(!face ? "Yuz ko'rinmayapti — kamerani yuzga qarating" : !big ? "Yaqinroq keling" : HINTS[samplesRef.current.length] ?? HINTS[0]!);
    } catch {
      /* keyingi kadr */
    }
    setTimeout(() => void captureLoop(fa), 250);
  };

  const begin = async (face = facing) => {
    setStage("loading");
    try {
      const fa = await loadFaceApi(setProgress);
      stopCamera(streamRef.current);
      streamRef.current = await startCamera(videoRef.current!, face);
      samplesRef.current = [];
      setCount(0);
      setHint(HINTS[0]!);
      setStage("capture");
      runningRef.current = true;
      void captureLoop(fa);
    } catch (e) {
      setError((e as Error).name === "NotAllowedError" ? "Kameraga ruxsat berilmadi" : (e as Error).message);
      setStage("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <div className="font-semibold">{student.full_name}</div>
            <div className="text-xs text-muted-foreground">Yuzni ro'yxatga olish</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-accent flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>

        <div className="relative aspect-[4/3] bg-black">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: facing === "user" ? "scaleX(-1)" : undefined, opacity: stage === "capture" ? 1 : 0 }}
            muted
            playsInline
          />
          {stage === "capture" && (
            <>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[55%] aspect-[3/4] rounded-[45%] border-4 border-cyan-400/70" />
              </div>
              <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white text-center">
                <div className="font-semibold">{hint}</div>
                <div className="mt-2 flex justify-center gap-2">
                  {Array.from({ length: SAMPLES }, (_, i) => (
                    <div key={i} className={`w-3 h-3 rounded-full ${i < count ? "bg-cyan-400" : "bg-white/30"}`} />
                  ))}
                </div>
              </div>
              <button
                onClick={() => { const n = facing === "user" ? "environment" : "user"; setFacing(n); void begin(n); }}
                className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center"
                title="Kamerani almashtirish"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            </>
          )}
          {stage === "consent" && (
            <div className="absolute inset-0 p-5 flex flex-col justify-center text-white">
              <ShieldCheck className="w-10 h-10 text-cyan-400" />
              <div className="mt-3 text-sm text-slate-300 leading-relaxed">
                Rasm saqlanmaydi — faqat yuzning raqamli izi (128 ta son). U faqat maktabga kirishda davomat uchun ishlatiladi va istalgan vaqtda o'chirilishi mumkin.
              </div>
              <label className="mt-4 flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 h-5 w-5 accent-cyan-400" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span className="text-sm">Ota-onasining (qonuniy vakilining) <b>roziligi olingan</b></span>
              </label>
            </div>
          )}
          {(stage === "loading" || stage === "saving") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
              <div className="mt-3 text-sm">{stage === "saving" ? "Saqlanmoqda…" : progress}</div>
            </div>
          )}
          {stage === "similar" && similar && (
            <div className="absolute inset-0 p-5 flex flex-col justify-center text-white">
              <div className="text-lg font-semibold text-amber-300">Diqqat: o'xshash yuz</div>
              <div className="mt-2 text-sm text-slate-300">
                Bu yuz ro'yxatdagi <b>{similar.name}</b> ({similar.class_name}) ga juda o'xshaydi. Kamerada to'g'ri o'quvchi turganiga ishonch hosil qiling (egizaklar bo'lishi ham mumkin).
              </div>
            </div>
          )}
          {stage === "error" && (
            <div className="absolute inset-0 p-5 flex items-center justify-center text-center text-white">
              <div className="text-red-300">{error}</div>
            </div>
          )}
        </div>

        <div className="p-4 flex gap-2">
          {stage === "consent" && (
            <Button className="flex-1" disabled={!consent} onClick={() => void begin()}>
              <Camera className="w-4 h-4 mr-2" /> Kamerani yoqish
            </Button>
          )}
          {stage === "similar" && (
            <>
              <Button variant="outline" className="flex-1" onClick={() => void begin()}>Qayta olish</Button>
              <Button className="flex-1" onClick={() => void save(true)}>Baribir saqlash</Button>
            </>
          )}
          {stage === "error" && <Button className="flex-1" onClick={() => void begin()}>Qayta urinish</Button>}
          {(stage === "capture" || stage === "loading") && (
            <Button variant="outline" className="flex-1" onClick={onClose}>Bekor qilish</Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FaceEnrollPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isManager = !!user && ["admin", "director", "zam_direktor", "zavuch"].includes(user.role);
  const [cls, setCls] = useState<string>("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<StudentRow | null>(null);

  const classes = useQuery<ClassRow[]>({
    queryKey: ["faceid-classes"],
    queryFn: () => api<ClassRow[]>("/faceid/classes"),
  });

  useEffect(() => {
    if (!cls && classes.data?.length) setCls(classes.data[0]!.class_name);
  }, [classes.data, cls]);

  const students = useQuery<StudentRow[]>({
    queryKey: ["faceid-students", cls],
    queryFn: () => api<StudentRow[]>(`/faceid/students?class_name=${encodeURIComponent(cls)}`),
    enabled: !!cls,
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["faceid-students", cls] });
    void qc.invalidateQueries({ queryKey: ["faceid-classes"] });
  };

  const remove = async (s: StudentRow) => {
    if (!confirm(`${s.full_name} — yuz ma'lumoti butunlay o'chirilsinmi?`)) return;
    try {
      await api(`/faceid/enroll/${encodeURIComponent(s.login)}`, { method: "DELETE" });
      toast({ title: "O'chirildi", description: s.full_name });
      refresh();
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    }
  };

  const list = (students.data ?? []).filter((s) => s.full_name.toLowerCase().includes(search.toLowerCase()));
  const done = (students.data ?? []).filter((s) => s.enrolled).length;
  const total = students.data?.length ?? 0;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        {isManager && <Link href="/faceid"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>}
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><ScanFace className="w-5 h-5 text-primary" /> Yuzlarni ro'yxatga olish</h1>
          <p className="text-sm text-muted-foreground">Har bir o'quvchi uchun bir marta, ~10 soniya</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={cls} onValueChange={setCls}>
              <SelectTrigger className="sm:w-48"><SelectValue placeholder="Sinf" /></SelectTrigger>
              <SelectContent>
                {(classes.data ?? []).map((c) => (
                  <SelectItem key={c.class_name} value={c.class_name}>
                    {c.class_name} · {c.enrolled}/{c.total}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Ism bo'yicha qidirish…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {total > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Ro'yxatga olingan</span>
                <span className="font-semibold">{done} / {total}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${(done / total) * 100}%` }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {(classes.isLoading || students.isLoading) && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>}
      {classes.isError && <div className="text-destructive text-sm">{(classes.error as Error).message}</div>}

      <div className="space-y-2">
        {list.map((s) => (
          <div key={s.login} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${s.enrolled ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
              {s.enrolled ? <CheckCircle2 className="w-5 h-5" /> : <ScanFace className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{s.full_name}</div>
              {s.enrolled ? (
                <Badge variant="secondary" className="mt-0.5 text-[11px]">Ro'yxatda · {s.samples} namuna</Badge>
              ) : (
                <div className="text-xs text-muted-foreground">Ro'yxatga olinmagan</div>
              )}
            </div>
            <Button size="sm" variant={s.enrolled ? "outline" : "default"} onClick={() => setActive(s)}>
              <Camera className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">{s.enrolled ? "Qayta olish" : "Yuzni olish"}</span>
            </Button>
            {s.enrolled && (
              <Button size="icon" variant="ghost" className="text-muted-foreground" onClick={() => void remove(s)} title="O'chirish">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        {!students.isLoading && cls && list.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">O'quvchi topilmadi</div>
        )}
      </div>

      {active && (
        <CaptureDialog
          student={active}
          onClose={() => setActive(null)}
          onSaved={() => { setActive(null); refresh(); }}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  ArrowLeft, HelpCircle, CheckCircle2, XCircle, RotateCcw, ArrowRight,
  Coins, Lightbulb, MapPin, Loader2,
} from "lucide-react";
import { getRegion, REGIONS, isSayohatOpen, type Difficulty } from "./sayohatData";
import {
  loadState, saveState, fetchQuestions, submitAnswers,
  type SayohatState, type PlayQuestion, type SubmitResult,
} from "@/lib/sayohat-progress";
import { Avatar, SceneBg, StarRow, sayohatStyles, LockedScreen } from "./_shared";
import { playSound } from "@/lib/game-sounds";
import { useAuth } from "@/lib/use-auth";

const SORTED = [...REGIONS].sort((a, b) => a.order - b.order);

export default function SayohatPlay() {
  const params = useParams<{ region: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const region = getRegion(params.region ?? "");

  const [state, setState] = useState<SayohatState | null>(null);
  const [questions, setQuestions] = useState<PlayQuestion[] | null>(null);
  const [phase, setPhase] = useState<"intro" | "task" | "done">("intro");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showHint, setShowHint] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    loadState().then((s) => {
      if (!alive) return;
      if (!s.character) { setLocation("/sayohat"); return; }
      setState(s);
    });
    return () => { alive = false; };
  }, [setLocation]);

  // Savollarni serverdan olish (daraja/viloyat bo'yicha)
  useEffect(() => {
    let alive = true;
    if (!state || !region) return;
    setQuestions(null);
    fetchQuestions(region.id, state.difficulty).then((q) => {
      if (alive) setQuestions(q);
    });
    return () => { alive = false; };
  }, [state, region]);

  if (!region) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-3">
        <p className="text-sm text-muted-foreground">Bunday manzil topilmadi.</p>
        <Link href="/sayohat"><button className="px-4 py-2 rounded-xl bg-secondary text-xs font-bold">Xaritaga qaytish</button></Link>
      </div>
    );
  }
  if (!isSayohatOpen(user?.role)) return <LockedScreen />;
  if (!state || questions === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const diff: Difficulty = state.difficulty;
  const char = state.character!;

  // Savol yo'q bo'lsa — "tez kunda" (yoki vaqti kelmagan — server 403 bersa ham bo'sh keladi)
  if (questions.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <style>{sayohatStyles}</style>
        <div className="text-5xl">⏳</div>
        <h2 className="font-black text-xl">{region.name}</h2>
        <p className="text-sm text-muted-foreground">
          Bu manzil uchun «{diff}» darajada savollar hali tayyor emas (yoki vaqti kelmagan). Tez kunda!
        </p>
        <Link href="/sayohat"><button className="px-5 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white text-sm font-black">Xaritaga qaytish</button></Link>
      </div>
    );
  }

  const qById = new Map(questions.map((q) => [q.id, q]));
  const task = questions[idx]!;
  const chosen = answers[task.id];
  const answeredCount = Object.keys(answers).length;

  function choose(optIdx: number) {
    playSound("click");
    setAnswers((a) => ({ ...a, [task.id]: optIdx }));
  }

  function next() {
    playSound("click");
    setShowHint(false);
    if (idx + 1 < questions!.length) setIdx((i) => i + 1);
    else void finish();
  }

  async function finish() {
    if (savedRef.current) return;
    setSubmitting(true);
    setSubmitErr(null);
    const payload = Object.entries(answers).map(([qid, ci]) => ({ question_id: Number(qid), chosen_index: ci }));
    const res = await submitAnswers(region!.id, diff, payload);
    setSubmitting(false);

    if (!res) {
      setSubmitErr("Natijani serverga yuborib bo'lmadi. Internetni tekshirib, qayta urining.");
      playSound("wrong");
      return;
    }
    savedRef.current = true;
    setResult(res);
    setPhase("done");

    if (res.stars >= 1) {
      playSound("win");
      const prev = state!.stars[region!.id] ?? 0;
      const updated: SayohatState = {
        ...state!,
        stars: { ...state!.stars, [region!.id]: Math.max(prev, res.stars) },
        souvenirs: Array.from(new Set([...state!.souvenirs, region!.souvenir.id])),
        tangaEarned: state!.tangaEarned + res.coins_awarded,
      };
      setState(updated);
      await saveState(updated);
    } else {
      playSound("lose");
    }
  }

  function retry() {
    playSound("click");
    setIdx(0);
    setAnswers({});
    setResult(null);
    setSubmitErr(null);
    savedRef.current = false;
    setShowHint(false);
    setPhase("intro");
  }

  // keyingi o'ynasa bo'ladigan manzil (tartib bo'yicha, yakunlanganidan keyingisi)
  const completedSet = new Set(SORTED.filter((r) => (state.stars[r.id] ?? 0) >= 1).map((r) => r.id));
  const nextRegion = SORTED.find(
    (r) => r.order > region.order && (r.order === 0 || completedSet.has(SORTED[r.order - 1]!.id)),
  );

  return (
    <div className="max-w-xl mx-auto pb-10 space-y-4">
      <style>{sayohatStyles}</style>

      <div className="flex items-center justify-between">
        <Link href="/sayohat">
          <button onClick={() => playSound("click")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-xs font-bold cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> <span>Xarita</span>
          </button>
        </Link>
        <span className="text-xs font-black px-3 py-1 rounded-full text-white flex items-center gap-1" style={{ background: `${region.color}` }}>
          <MapPin className="w-3 h-3" /> {region.name}
        </span>
      </div>

      {/* ===== KIRISH ===== */}
      {phase === "intro" && (
        <div className="relative rounded-3xl border border-border overflow-hidden shadow-xl">
          <div className="relative h-56">
            <SceneBg color={region.color} accent={region.accent} />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 s-bobble">
              <Avatar character={char} size={84} wave />
            </div>
            <div className="absolute top-3 right-3 text-4xl s-floaty">{region.emoji}</div>
          </div>
          <div className="p-5 space-y-4 bg-card">
            <div className="relative p-4 rounded-2xl bg-secondary border border-border">
              <div className="absolute -top-2 left-6 w-4 h-4 rotate-45 bg-secondary border-l border-t border-border" />
              <p className="text-[11px] font-bold text-fuchsia-500 mb-1">{state.name || char}</p>
              <p className="text-sm leading-relaxed">{region.intro}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>Diqqatga sazovor: <b className="text-foreground">{region.landmark}</b></span>
            </div>
            <button
              onClick={() => { playSound("click"); setPhase("task"); }}
              className="w-full px-5 py-3.5 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white font-black text-sm cursor-pointer shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Topshiriqlarni boshlash ({questions.length} ta) <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===== TOPSHIRIQ ===== */}
      {phase === "task" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-extrabold text-muted-foreground">
              <span>Savol {idx + 1}/{questions.length}</span>
              <span className="text-fuchsia-400">Belgilangan: {answeredCount}/{questions.length}</span>
            </div>
            <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden p-0.5 border border-border/40">
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${((idx + 1) / questions.length) * 100}%`, background: `linear-gradient(90deg, ${region.accent}, ${region.color})` }} />
            </div>
          </div>

          {task.hint && (
            <div className="flex justify-end">
              <button onClick={() => { playSound("click"); setShowHint((h) => !h); }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs cursor-pointer flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> Maslahat
              </button>
            </div>
          )}
          {showHint && task.hint && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-semibold s-rise">💡 {task.hint}</div>
          )}

          <div className="p-5 rounded-3xl border border-border/80 bg-card shadow-lg text-center">
            <h3 className="font-black text-base sm:text-lg leading-snug">{task.question_text}</h3>
          </div>

          {/* variantlar — tanlanadi, lekin to'g'ri/noto'g'ri KO'RSATILMAYDI (serverda baholanadi) */}
          <div className="grid gap-2.5">
            {task.options.map((opt, i) => {
              const sel = chosen === i;
              return (
                <button key={i} onClick={() => choose(i)}
                  className={`w-full p-4 rounded-2xl border text-left text-sm font-bold transition-all cursor-pointer flex items-center gap-2 active:scale-[0.99] ${
                    sel ? "bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-100" : "bg-card border-border/70 hover:bg-secondary"
                  }`}>
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${sel ? "bg-fuchsia-500 text-white" : "bg-secondary text-muted-foreground"}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          {submitErr && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs font-semibold">{submitErr}</div>
          )}

          <div className="flex gap-2.5">
            {idx > 0 && (
              <button onClick={() => { playSound("click"); setShowHint(false); setIdx((i) => i - 1); }}
                className="px-4 py-3.5 rounded-2xl bg-secondary font-bold text-sm cursor-pointer">
                Orqaga
              </button>
            )}
            <button onClick={next} disabled={chosen === undefined || submitting}
              className="flex-1 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white font-black text-sm cursor-pointer shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Yuborilmoqda…</>
                : idx + 1 < questions.length ? <>Keyingi savol <ArrowRight className="w-4 h-4" /></>
                : <>Yakunlash <CheckCircle2 className="w-4 h-4" /></>}
            </button>
          </div>
          {chosen === undefined && <p className="text-[11px] text-muted-foreground text-center">Davom etish uchun variant tanlang</p>}
        </div>
      )}

      {/* ===== YAKUN ===== */}
      {phase === "done" && result && (
        <div className="space-y-4">
          <div className="relative rounded-3xl border border-border overflow-hidden shadow-2xl">
            <div className="relative h-32"><SceneBg color={region.color} accent={region.accent} /></div>
            <div className="p-6 bg-card text-center space-y-4 -mt-10 relative">
              <div className="s-pop inline-flex"><Avatar character={char} size={72} /></div>

              {result.stars >= 1 ? (
                <>
                  <h2 className="font-black text-2xl">Zo'r! {region.name} zabt etildi 🎉</h2>
                  <div className="flex justify-center my-1"><StarRow value={result.stars} size={34} /></div>
                  <p className="text-xs text-muted-foreground">{result.total} ta savoldan {result.correct} tasi to'g'ri.</p>
                  <div className="s-pop inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-secondary border border-border">
                    <span className="text-2xl">{region.souvenir.emoji}</span>
                    <div className="text-left">
                      <p className="text-[10px] text-muted-foreground font-bold">Yangi esdalik!</p>
                      <p className="text-sm font-black">{region.souvenir.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-sm font-black">
                    <Coins className="w-5 h-5 text-yellow-400" />
                    {result.coins_awarded > 0
                      ? <span className="text-yellow-400">+{result.coins_awarded} tanga qo'shildi!</span>
                      : <span className="text-muted-foreground">Bu manzildan tanga avval olingan</span>}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="font-black text-2xl">Yana bir urinib ko'ring!</h2>
                  <p className="text-xs text-muted-foreground">{result.total} ta savoldan {result.correct} tasi to'g'ri. Kamida yarmini to'g'ri bajaring.</p>
                </>
              )}

              <div className="flex gap-2.5 justify-center pt-1">
                <button onClick={retry} className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-secondary font-extrabold text-xs cursor-pointer">
                  <RotateCcw className="w-4 h-4" /> Qayta o'ynash
                </button>
                {result.stars >= 1 && nextRegion ? (
                  <button onClick={() => { playSound("click"); setLocation(`/sayohat/${nextRegion.id}`); }}
                    className="flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs cursor-pointer shadow-lg">
                    Keyingi manzil <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <Link href="/sayohat">
                    <button onClick={() => playSound("click")} className="flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white font-black text-xs cursor-pointer shadow-lg">
                      Xaritaga qaytish <MapPin className="w-4 h-4" />
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Savollar tahlili (javobdan keyin to'g'ri javob ko'rsatiladi) */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider px-1">Savollar tahlili</p>
            {result.per_question.map((pq, n) => {
              const q = qById.get(pq.question_id);
              if (!q) return null;
              return (
                <div key={pq.question_id} className={`p-3.5 rounded-2xl border text-xs ${pq.is_correct ? "bg-emerald-500/8 border-emerald-500/25" : "bg-rose-500/8 border-rose-500/25"}`}>
                  <div className="flex items-start gap-2">
                    {pq.is_correct ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">{n + 1}. {q.question_text}</p>
                      <p className="mt-1 text-emerald-300">To'g'ri: <b>{q.options[pq.correct_index] ?? "—"}</b></p>
                      {!pq.is_correct && (
                        <p className="text-rose-300">Sizning javob: {pq.chosen_index >= 0 ? (q.options[pq.chosen_index] ?? "—") : "belgilanmagan"}</p>
                      )}
                      {pq.explanation && <p className="mt-1 text-muted-foreground">📘 {pq.explanation}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  ArrowLeft, HelpCircle, CheckCircle2, XCircle, RotateCcw, ArrowRight,
  Coins, Lightbulb, MapPin,
} from "lucide-react";
import {
  getRegion, tasksForLevel, normalizeAnswer, isPlayable, isSayohatOpen,
  REGIONS, type Task, type Difficulty,
} from "./sayohatData";
import {
  loadState, saveState, sendReward, loadUnlocks,
  type SayohatState, type UnlockMap,
} from "@/lib/sayohat-progress";
import { Avatar, SceneBg, StarRow, sayohatStyles, LockedScreen } from "./_shared";
import { playSound } from "@/lib/game-sounds";
import { useAuth } from "@/lib/use-auth";

const SORTED = [...REGIONS].sort((a, b) => a.order - b.order);

function fmtUnlock(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function calcStars(correct: number, total: number): number {
  if (total === 0) return 0;
  const r = correct / total;
  if (r >= 0.999) return 3;
  if (r >= 0.6) return 2;
  if (r >= 0.4) return 1;
  return 0;
}

export default function SayohatPlay() {
  const params = useParams<{ region: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const region = getRegion(params.region ?? "");

  const [state, setState] = useState<SayohatState | null>(null);
  const [unlocks, setUnlocks] = useState<UnlockMap>({});
  const [phase, setPhase] = useState<"intro" | "task" | "done">("intro");
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);

  // joriy topshiriq javob holati
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [pickQuiz, setPickQuiz] = useState<number | null>(null);
  const [pickTF, setPickTF] = useState<boolean | null>(null);
  const [inputVal, setInputVal] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [shake, setShake] = useState(false);

  // yakun
  const [result, setResult] = useState<{ stars: number; awarded: number } | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    Promise.all([loadState(), loadUnlocks()]).then(([s, u]) => {
      if (!alive) return;
      if (!s.character) { setLocation("/sayohat"); return; }
      setState(s);
      setUnlocks(u);
    });
    return () => { alive = false; };
  }, [setLocation]);

  if (!region) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-3">
        <p className="text-sm text-muted-foreground">Bunday manzil topilmadi.</p>
        <Link href="/sayohat"><button className="px-4 py-2 rounded-xl bg-secondary text-xs font-bold">Xaritaga qaytish</button></Link>
      </div>
    );
  }
  if (!isSayohatOpen(user?.role)) {
    return <LockedScreen />;
  }
  if (!state) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const diff: Difficulty = state.difficulty;
  const tasks = tasksForLevel(region, diff);
  const char = state.character!;

  // Admin belgilagan vaqt hali kelmagan bo'lsa — kirishni bloklaymiz
  const lockIso = unlocks[region.id];
  if (lockIso && Date.now() < new Date(lockIso).getTime()) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <style>{sayohatStyles}</style>
        <div className="text-5xl">📅</div>
        <h2 className="font-black text-xl">{region.name}</h2>
        <p className="text-sm text-muted-foreground">
          Bu manzil <b className="text-foreground">{fmtUnlock(lockIso)}</b> da ochiladi. Shu vaqtgacha kuting!
        </p>
        <Link href="/sayohat"><button className="px-5 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white text-sm font-black">Xaritaga qaytish</button></Link>
      </div>
    );
  }

  // Topshiriqlar yo'q bo'lsa — "tez kunda"
  if (!isPlayable(region, diff)) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <style>{sayohatStyles}</style>
        <div className="text-5xl">⏳</div>
        <h2 className="font-black text-xl">{region.name}</h2>
        <p className="text-sm text-muted-foreground">
          Bu manzil uchun «{diff}» darajasida topshiriqlar hali tayyorlanmoqda. Tez kunda qo'shiladi!
        </p>
        <Link href="/sayohat"><button className="px-5 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white text-sm font-black">Xaritaga qaytish</button></Link>
      </div>
    );
  }

  const task = tasks[idx]!;

  function resetTaskState() {
    setAnswered(false);
    setLastCorrect(false);
    setPickQuiz(null);
    setPickTF(null);
    setInputVal("");
    setShowHint(false);
  }

  function grade(ok: boolean) {
    setAnswered(true);
    setLastCorrect(ok);
    if (ok) {
      playSound("correct");
      setCorrect((c) => c + 1);
    } else {
      playSound("wrong");
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
    }
  }

  function answerQuiz(i: number) {
    if (answered) return;
    setPickQuiz(i);
    grade(i === (task as Extract<Task, { type: "quiz" }>).correct);
  }
  function answerTF(v: boolean) {
    if (answered) return;
    setPickTF(v);
    grade(v === (task as Extract<Task, { type: "truefalse" }>).answer);
  }
  function answerInput() {
    if (answered || !inputVal.trim()) return;
    const t = task as Extract<Task, { type: "input" }>;
    const got = normalizeAnswer(inputVal);
    grade(t.answers.some((a) => normalizeAnswer(a) === got));
  }

  function next() {
    playSound("click");
    if (idx + 1 < tasks.length) {
      setIdx((i) => i + 1);
      resetTaskState();
    } else {
      finish();
    }
  }

  async function finish() {
    const finalCorrect = correct; // grade allaqachon oshirgan
    const stars = calcStars(finalCorrect, tasks.length);
    setPhase("done");

    if (stars >= 1 && !savedRef.current) {
      savedRef.current = true;
      playSound("win");
      const prev = state!.stars[region!.id] ?? 0;
      const newStars = Math.max(prev, stars);
      const awarded = await sendReward(region!.id, stars);
      const updated: SayohatState = {
        ...state!,
        stars: { ...state!.stars, [region!.id]: newStars },
        souvenirs: Array.from(new Set([...state!.souvenirs, region!.souvenir.id])),
        tangaEarned: state!.tangaEarned + awarded,
      };
      setState(updated);
      setResult({ stars, awarded });
      await saveState(updated);
    } else {
      playSound("lose");
      setResult({ stars, awarded: 0 });
    }
  }

  function retry() {
    playSound("click");
    setIdx(0);
    setCorrect(0);
    setResult(null);
    savedRef.current = false;
    resetTaskState();
    setPhase("intro");
  }

  // keyingi o'ynasa bo'ladigan manzil
  const completedSet = new Set(SORTED.filter((r) => (state.stars[r.id] ?? 0) >= 1).map((r) => r.id));
  const nextRegion = SORTED.find(
    (r) => r.order > region.order && (r.order === 0 || completedSet.has(SORTED[r.order - 1]!.id)) && isPlayable(r, diff),
  );

  return (
    <div className="max-w-xl mx-auto pb-10 space-y-4">
      <style>{sayohatStyles}</style>

      {/* Tepa panel */}
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

      {/* ===== KIRISH SAHNASI ===== */}
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
              Topshiriqlarni boshlash ({tasks.length} ta) <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===== TOPSHIRIQ ===== */}
      {phase === "task" && (
        <div className="space-y-4">
          {/* progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-extrabold text-muted-foreground">
              <span>Topshiriq {idx + 1}/{tasks.length}</span>
              <span className="text-emerald-400">✅ {correct}</span>
            </div>
            <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden p-0.5 border border-border/40">
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${((idx + (answered ? 1 : 0)) / tasks.length) * 100}%`, background: `linear-gradient(90deg, ${region.accent}, ${region.color})` }} />
            </div>
          </div>

          {/* maslahat tugmasi */}
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

          {/* savol */}
          <div className={`p-5 rounded-3xl border bg-card shadow-lg text-center ${shake ? "border-rose-500" : "border-border/80"}`}
            style={shake ? { animation: "shakeEffect 0.4s ease-in-out" } : undefined}>
            <style>{`@keyframes shakeEffect {0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
            <h3 className="font-black text-base sm:text-lg leading-snug">{task.prompt}</h3>
          </div>

          {/* javob maydonlari — turga qarab */}
          {task.type === "quiz" && (
            <div className="grid gap-2.5">
              {task.options.map((opt, i) => {
                const isCorrect = i === task.correct;
                const isPicked = pickQuiz === i;
                let cls = "bg-card border-border/70 hover:bg-secondary";
                if (answered) {
                  if (isCorrect) cls = "bg-emerald-500/25 border-emerald-500 text-emerald-200 font-black";
                  else if (isPicked) cls = "bg-rose-500/25 border-rose-500 text-rose-200 font-black";
                  else cls = "bg-card border-border/40 opacity-60";
                }
                return (
                  <button key={i} disabled={answered} onClick={() => answerQuiz(i)}
                    className={`w-full p-4 rounded-2xl border text-left text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${cls} ${!answered ? "active:scale-[0.99]" : ""}`}>
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center text-xs font-black shrink-0">{String.fromCharCode(65 + i)}</span>
                      <span>{opt}</span>
                    </span>
                    {answered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                    {answered && isPicked && !isCorrect && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {task.type === "truefalse" && (
            <div className="grid grid-cols-2 gap-3">
              {[true, false].map((v) => {
                const isCorrect = v === task.answer;
                const isPicked = pickTF === v;
                let cls = "bg-card border-border/70 hover:bg-secondary";
                if (answered) {
                  if (isCorrect) cls = "bg-emerald-500/25 border-emerald-500 text-emerald-200";
                  else if (isPicked) cls = "bg-rose-500/25 border-rose-500 text-rose-200";
                  else cls = "opacity-60";
                }
                return (
                  <button key={String(v)} disabled={answered} onClick={() => answerTF(v)}
                    className={`p-5 rounded-2xl border text-base font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${cls} ${!answered ? "active:scale-95" : ""}`}>
                    <span className="text-2xl">{v ? "✅" : "❌"}</span> {v ? "To'g'ri" : "Noto'g'ri"}
                  </button>
                );
              })}
            </div>
          )}

          {task.type === "input" && (
            <div className="space-y-2.5">
              <input
                value={inputVal}
                disabled={answered}
                inputMode={task.numeric ? "numeric" : "text"}
                onChange={(e: { target: { value: string } }) => setInputVal(e.target.value)}
                onKeyDown={(e: { key: string }) => { if (e.key === "Enter") answerInput(); }}
                placeholder="Javobni shu yerga yozing..."
                className={`w-full px-4 py-3.5 rounded-2xl bg-card border text-sm font-bold focus:outline-none transition-all ${
                  answered ? (lastCorrect ? "border-emerald-500" : "border-rose-500") : "border-border focus:border-fuchsia-400"
                }`}
              />
              {!answered && (
                <button onClick={answerInput} disabled={!inputVal.trim()}
                  className="w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white font-black text-sm cursor-pointer disabled:opacity-40">
                  Tekshirish
                </button>
              )}
              {answered && !lastCorrect && (
                <p className="text-xs text-rose-300 font-semibold px-1">To'g'ri javob: <b>{task.answers[0]}</b></p>
              )}
            </div>
          )}

          {/* tushuntirish + keyingi */}
          {answered && (
            <div className="space-y-3 s-rise">
              {task.explain && (
                <div className={`p-3.5 rounded-2xl text-xs font-semibold border ${lastCorrect ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200" : "bg-rose-500/10 border-rose-500/30 text-rose-200"}`}>
                  {lastCorrect ? "✅ To'g'ri! " : "📘 "}{task.explain}
                </div>
              )}
              <button onClick={next}
                className="w-full px-5 py-3.5 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white font-black text-sm cursor-pointer shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                {idx + 1 < tasks.length ? "Keyingi topshiriq" : "Yakunlash"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== YAKUN ===== */}
      {phase === "done" && result && (
        <div className="relative rounded-3xl border border-border overflow-hidden shadow-2xl">
          <div className="relative h-32"><SceneBg color={region.color} accent={region.accent} /></div>
          <div className="p-6 bg-card text-center space-y-4 -mt-10 relative">
            <div className="s-pop inline-flex"><Avatar character={char} size={72} /></div>

            {result.stars >= 1 ? (
              <>
                <h2 className="font-black text-2xl">Zo'r! {region.name} zabt etildi 🎉</h2>
                <div className="flex justify-center my-1"><StarRow value={result.stars} size={34} /></div>
                <p className="text-xs text-muted-foreground">{tasks.length} ta topshiriqdan {correct} tasini to'g'ri bajardingiz.</p>

                {/* esdalik */}
                <div className="s-pop inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-secondary border border-border">
                  <span className="text-2xl">{region.souvenir.emoji}</span>
                  <div className="text-left">
                    <p className="text-[10px] text-muted-foreground font-bold">Yangi esdalik!</p>
                    <p className="text-sm font-black">{region.souvenir.name}</p>
                  </div>
                </div>

                {/* tanga */}
                <div className="flex items-center justify-center gap-1.5 text-sm font-black">
                  <Coins className="w-5 h-5 text-yellow-400" />
                  {result.awarded > 0
                    ? <span className="text-yellow-400">+{result.awarded} tanga qo'shildi!</span>
                    : <span className="text-muted-foreground">Bu manzildan tanga avval olingan</span>}
                </div>
              </>
            ) : (
              <>
                <h2 className="font-black text-2xl">Yana bir urinib ko'ring!</h2>
                <p className="text-xs text-muted-foreground">{tasks.length} ta topshiriqdan {correct} tasi to'g'ri. Kamida yarmini to'g'ri bajaring.</p>
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
      )}
    </div>
  );
}

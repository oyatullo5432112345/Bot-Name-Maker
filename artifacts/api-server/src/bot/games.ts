// ═══════════════════════════════════════════════════════════════════════════
//  🎮 BILIMLAR JANGI — sinf guruhida jonli bellashuv
//
//  O'qituvchi (shaxsiy chatda, 2–3 bosish):
//    🎮 Sinf o'yini → guruh → savollar manbai → 🚀 Boshlash
//    O'yin paytida: ⏭ Keyingi · ⏸ Pauza · ⏹ Tugatish
//
//  O'quvchilar (guruhda): Telegram quiz-savollariga javob beradi.
//    To'g'ri javob = 10 ball, tezlik bonusi = +5 gacha,
//    har 3 ta ketma-ket to'g'ri javob = 🔥 +3.
//    Oxirida 🥇🥈🥉 va botga ulangan o'quvchilarga tanga 🪙.
// ═══════════════════════════════════════════════════════════════════════════

import { Api, Composer, Context, InlineKeyboard, InputFile } from "grammy";
import { query, queryOne } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { esc, isRealTelegramId, getLinkedChat } from "../lib/tg-shared.js";
import { createSessionStore } from "./session-store.js";
import {
  type GQ, type MathLevel,
  MATH_LEVEL_LABEL, generateMath, suggestLevel, parseQuestions, shuffle, shuffleOptions,
  QUESTION_FORMAT_EXAMPLE,
} from "./game-questions.js";
import {
  renderCard, introSVG, questionSVG, standingsSVG, podiumSVG, profileSVG, leagueOf, nextLeague,
} from "./game-cards.js";

// ─── Tashqi bog'liqliklar (features.ts dan beriladi) ─────────────────────────

export interface GameWho {
  kind: "student" | "staff" | "admin" | "guest"; // guest — platformada yo'q guruh admini
  tgId: number;
  full_name?: string;
  login?: string;
  role?: string;
}

export interface GameGroupAuth {
  ok: boolean;
  staff: boolean;
  groupAdmin: boolean;
  anonymous: boolean;
  name: string;
}

export interface GameDeps {
  whoIs(tgId: number): Promise<GameWho | null>;
  /** Guruhda: platforma o'qituvchisi yoki guruh admini/egasi (anonim ham) */
  groupAuth(ctx: Context): Promise<GameGroupAuth>;
  canUseClass(who: GameWho, classId: string): Promise<boolean>;
  isManagement(who: GameWho | null): boolean;
  menuButtons: Set<string>;
  gameButton: string;
  profileButton?: string;
}

let deps: GameDeps;

function isStaff(who: GameWho | null): who is GameWho {
  return !!who && (who.kind === "staff" || who.kind === "admin");
}
function nameOf(who: GameWho): string {
  return who.kind === "admin" ? "Administrator" : who.full_name ?? "O'qituvchi";
}
function loginOf(who: GameWho): string {
  return who.kind === "admin" ? "admin" : who.login ?? "";
}

// ─── Sozlash holati (shaxsiy chat) ───────────────────────────────────────────

type Src =
  | { kind: "math"; level: MathLevel }
  | { kind: "set"; id: string; title: string; total: number }
  | { kind: "mon"; id: string; title: string; total: number }
  | { kind: "rid"; total: number };

type Setup =
  | { type: "idle" }
  | {
      type: "setup";
      chatId: number;
      chatTitle: string;
      className: string;
      classId: string | null;
      src?: Src;
      count: number;
      seconds: number;
      awaiting?: boolean; // o'qituvchi savollarini yozib yuborishini kutyapmiz
      starterName?: string; // o'yinni boshlovchi (guruh admini bo'lsa — Telegram ismi)
      byGroupAdmin?: boolean; // platforma xodimi emas, guruh admini boshlagan
    };

const setups = createSessionStore<Setup>("bot_games", { type: "idle" });
void setups.loadAll();

function getS(id: number): Setup {
  return setups.get(id) ?? { type: "idle" };
}

/** Foydalanuvchi boshqa menyu tugmasini bossa — o'yin sozlashini bekor qilamiz (features.ts dan) */
export function resetGameSetup(userId: number): void {
  if (getS(userId).type !== "idle") setups.set(userId, { type: "idle" });
}

// ─── O'yin holati (xotirada) ─────────────────────────────────────────────────

interface Player {
  id: number;
  name: string;
  login: string | null;
  className: string | null;
  score: number;
  roundStart: number; // raund boshidagi ball (raund yakuni jadvalida +delta uchun)
  correct: number;
  answered: number;
  streak: number;
  best: number;
  fastMs: number | null;
}

type Phase = "lobby" | "question" | "reveal" | "paused" | "finished";

interface Game {
  api: Api;
  chatId: number;
  className: string;
  classId: string | null;
  teacherId: number;
  teacherName: string;
  teacherLogin: string;
  awards: boolean; // tanga faqat maktab o'qituvchisi boshlagan o'yinda beriladi
  title: string;
  questions: GQ[];
  rounds: number[]; // har bir savolning raundi (1, 2, 3)
  seconds: number;
  idx: number;
  phase: Phase;
  pauseRequested: boolean;
  pollId: string | null;
  pollMsgId: number | null;
  cardMsgId: number | null;
  nextCard: Promise<Buffer | null> | null;
  qStart: number;
  qAnswers: Map<number, { correct: boolean; ms: number }>;
  players: Map<number, Player>;
  timer: ReturnType<typeof setTimeout> | null;
  panelMsgId: number | null;
}

const games = new Map<number, Game>(); // chatId → o'yin
const pollToChat = new Map<string, number>(); // pollId → chatId

const MEDALS = ["🥇", "🥈", "🥉"];
const PRIZES = [15, 10, 5];
const PARTICIPATION = 2;
const DAILY_CAP = 30;
const RATING_PLACE_BONUS = [25, 15, 8];

const ROUND_NAME: Record<number, string> = { 1: "I RAUND · ISINISH", 2: "II RAUND · ASOSIY", 3: "FINAL" };
const ROUND_SHORT: Record<number, string> = { 1: "I RAUND", 2: "II RAUND", 3: "FINAL" };

/** Savollarni 3 raundga bo'lish: ~30% isinish (×1), ~40% asosiy (×2), ~30% final (×3) */
export function roundPlan(n: number): number[] {
  const r1 = Math.max(1, Math.round(n * 0.3));
  const r2 = Math.max(r1 + 1, Math.round(n * 0.7));
  return Array.from({ length: n }, (_, i) => (i < r1 ? 1 : i < r2 ? 2 : 3));
}

function srcLabel(src: Src): string {
  switch (src.kind) {
    case "math": return `Tez hisob · ${MATH_LEVEL_LABEL[src.level]}`;
    case "set": return src.title;
    case "mon": return src.title;
    case "rid": return "Topishmoq va mantiq";
  }
}

function ranked(g: Game): Player[] {
  return [...g.players.values()].sort(
    (a, b) => b.score - a.score || b.correct - a.correct || (a.fastMs ?? 1e9) - (b.fastMs ?? 1e9)
  );
}

function shortTop(g: Game, n = 3): string {
  const r = ranked(g).filter((p) => p.score > 0).slice(0, n);
  return r.length ? r.map((p, i) => `${MEDALS[i] ?? ""}${esc(p.name.split(" ")[0])} ${p.score}`).join(" · ") : "—";
}

// ═══════════════════════════════════════════════════════════════════════════
//  O'YIN DVIGATELI
// ═══════════════════════════════════════════════════════════════════════════

function clearTimer(g: Game): void {
  if (g.timer) clearTimeout(g.timer);
  g.timer = null;
}

/** Rasm-kartochka yuborish; rasm chizilmasa — oddiy matn */
async function sendCard(g: Game, png: Buffer | null, caption: string, extra: Record<string, unknown> = {}): Promise<number | null> {
  if (png) {
    try {
      const m = await g.api.sendPhoto(g.chatId, new InputFile(png, "bilimlar-jangi.png"), { caption, parse_mode: "HTML", ...extra });
      return m.message_id;
    } catch (err) {
      logger.warn({ err, chat: g.chatId }, "Kartochka yuborilmadi — matnga o'tamiz");
    }
  }
  try {
    const m = await g.api.sendMessage(g.chatId, caption, { parse_mode: "HTML", ...extra });
    return m.message_id;
  } catch {
    return null;
  }
}

function prepareQuestionCard(g: Game, i: number): Promise<Buffer | null> | null {
  const q = g.questions[i];
  if (!q) return null;
  const round = g.rounds[i] ?? 1;
  return renderCard(
    questionSVG({
      index: i + 1,
      total: g.questions.length,
      roundName: ROUND_NAME[round]!,
      multiplier: round,
      category: g.title,
      text: q.q,
      seconds: g.seconds,
    })
  );
}

async function updatePanel(g: Game): Promise<void> {
  if (!g.panelMsgId) return;
  const status: Record<Phase, string> = {
    lobby: "boshlanishiga oz qoldi",
    question: "savol ketmoqda",
    reveal: g.pauseRequested ? "shu savoldan keyin pauza" : "natija ko'rsatilmoqda",
    paused: "pauza — davom etish uchun ▶️ ni bosing",
    finished: "tugadi",
  };
  const round = g.rounds[Math.max(0, g.idx)] ?? 1;
  const text =
    `🎮 <b>Bilimlar jangi</b> — ${esc(g.className)}\n` +
    `${esc(g.title)} · ${g.seconds} s\n\n` +
    `Savol: <b>${Math.max(0, g.idx + 1)} / ${g.questions.length}</b> · ${ROUND_SHORT[round]} (×${round})\n` +
    `Qatnashchilar: <b>${g.players.size}</b>\n` +
    `Holat: ${status[g.phase]}\n` +
    `Yetakchilar: ${shortTop(g)}`;
  const kb = new InlineKeyboard();
  if (g.phase !== "finished") {
    kb.text("⏭ Keyingi savol", `q:nx:${g.chatId}`)
      .text(g.phase === "paused" ? "▶️ Davom etish" : g.pauseRequested ? "↩️ Pauzani bekor qilish" : "⏸ Pauza", `q:ps:${g.chatId}`)
      .row()
      .text("⏹ O'yinni tugatish", `q:st:${g.chatId}`);
  }
  await g.api
    .editMessageText(g.teacherId, g.panelMsgId, text, { parse_mode: "HTML", reply_markup: kb })
    .catch(() => {});
}

async function askNext(g: Game): Promise<void> {
  clearTimer(g);
  if (g.phase === "finished") return;
  g.idx++;
  if (g.idx >= g.questions.length) {
    await finish(g);
    return;
  }
  const q = g.questions[g.idx]!;
  const round = g.rounds[g.idx] ?? 1;

  // 1) Savol kartochkasi (oldindan chizib qo'yilgan bo'ladi)
  const png = await (g.nextCard ?? prepareQuestionCard(g, g.idx) ?? Promise.resolve(null));
  g.nextCard = null;
  g.cardMsgId = null;
  if (png) {
    g.cardMsgId = await sendCard(g, png, `<b>Savol ${g.idx + 1}/${g.questions.length}</b> · ${ROUND_NAME[round]} · ×${round} ball`);
  }

  // 2) Javob variantlari — Telegram quiz
  const question = `${g.idx + 1}/${g.questions.length}. ${q.q.replace(/^[^\p{L}\p{N}(√−-]+/u, "")}`.slice(0, 300);
  try {
    const msg = await g.api.sendPoll(
      g.chatId,
      question,
      q.options.map((text) => ({ text: text.slice(0, 100) })),
      {
        type: "quiz",
        is_anonymous: false,
        correct_option_id: q.correct,
        open_period: g.seconds,
        explanation: q.explain?.slice(0, 200),
      }
    );
    g.pollId = msg.poll?.id ?? null;
    g.pollMsgId = msg.message_id;
    if (g.pollId) pollToChat.set(g.pollId, g.chatId);
  } catch (err) {
    logger.warn({ err, chat: g.chatId }, "Savol yuborilmadi");
    await g.api.sendMessage(g.teacherId, "❌ Bot guruhga savol yubora olmadi. Guruhda botga so'rovnoma (poll) yuborishga ruxsat borligini tekshiring.").catch(() => {});
    await finish(g, true);
    return;
  }
  g.phase = "question";
  g.qStart = Date.now();
  g.qAnswers = new Map();
  g.timer = setTimeout(() => void reveal(g), g.seconds * 1000 + 1500);
  void updatePanel(g);
}

async function reveal(g: Game): Promise<void> {
  clearTimer(g);
  if (g.phase !== "question") return;
  g.phase = "reveal";
  if (g.pollId) pollToChat.delete(g.pollId);

  // Javob bermaganlarning seriyasi uziladi
  for (const p of g.players.values()) {
    if (!g.qAnswers.has(p.id)) p.streak = 0;
  }

  const answers = [...g.qAnswers.entries()];
  const right = answers.filter(([, a]) => a.correct).sort((a, b) => a[1].ms - b[1].ms);
  const q = g.questions[g.idx]!;
  const last = g.idx + 1 >= g.questions.length;
  const roundEnds = !last && g.rounds[g.idx] !== g.rounds[g.idx + 1];

  // Keyingi kartochkani tanaffus paytida chizib qo'yamiz (savol paytida emas — javoblar kechikmasin)
  if (!last) g.nextCard = prepareQuestionCard(g, g.idx + 1);

  let line = `✅ <b>${g.idx + 1}/${g.questions.length}</b> · To'g'ri javob: <b>${esc(q.options[q.correct])}</b>\n`;
  line += answers.length ? `Topdi: <b>${right.length}</b> / ${answers.length}` : "Hech kim javob bermadi";
  if (right[0]) {
    const p = g.players.get(right[0][0]);
    if (p) line += ` · Eng tez: ${esc(p.name)} (${(right[0][1].ms / 1000).toFixed(1)} s)`;
  }
  const hot = right
    .map(([id]) => g.players.get(id))
    .filter((p): p is Player => !!p && p.streak >= 3)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 2);
  if (hot.length) line += `\nSeriya: ${hot.map((p) => `${esc(p.name)} ×${p.streak}`).join(", ")}`;

  if (g.cardMsgId) {
    await g.api.editMessageCaption(g.chatId, g.cardMsgId, { caption: line, parse_mode: "HTML" }).catch(async () => {
      await g.api.sendMessage(g.chatId, line, { parse_mode: "HTML" }).catch(() => {});
    });
  } else {
    await g.api.sendMessage(g.chatId, line, { parse_mode: "HTML" }).catch(() => {});
  }

  // Raund yakuni jadvali
  if (roundEnds) {
    const r = g.rounds[g.idx]!;
    const next = g.rounds[g.idx + 1]!;
    const list = ranked(g);
    const png = await renderCard(
      standingsSVG(
        `${ROUND_SHORT[r]} YAKUNI`,
        `${g.idx + 1} / ${g.questions.length} savol`,
        list.map((p) => ({ name: p.name, score: p.score, correct: p.correct, delta: p.score - p.roundStart })),
        g.className
      )
    );
    const cap =
      `<b>${ROUND_SHORT[r]} yakunlandi.</b> Keyingisi — <b>${ROUND_NAME[next]}</b>, har bir to'g'ri javob ×${next} ball.` +
      (png ? "" : `\n\n${list.slice(0, 5).map((p, i) => `${i + 1}. ${esc(p.name)} — ${p.score}`).join("\n")}`);
    await sendCard(g, png, cap);
    for (const p of g.players.values()) p.roundStart = p.score;
  }

  if (last) {
    g.timer = setTimeout(() => void finish(g), 2500);
  } else if (g.pauseRequested) {
    g.phase = "paused";
    g.pauseRequested = false;
    await g.api.sendMessage(g.chatId, "⏸ Qisqa tanaffus. O'yin boshlovchisi davom ettiradi.").catch(() => {});
  } else {
    g.timer = setTimeout(() => void askNext(g), roundEnds ? 7000 : 4000);
  }
  void updatePanel(g);
}

async function onAnswer(pollId: string, user: { id: number; first_name: string; last_name?: string }, optionIds: number[]): Promise<void> {
  const chatId = pollToChat.get(pollId);
  if (chatId === undefined) return;
  const g = games.get(chatId);
  if (!g || g.phase !== "question" || g.pollId !== pollId) return;
  if (g.qAnswers.has(user.id) || optionIds.length === 0) return;

  const ms = Date.now() - g.qStart;
  const q = g.questions[g.idx]!;
  const correct = optionIds[0] === q.correct;
  g.qAnswers.set(user.id, { correct, ms });

  let p = g.players.get(user.id);
  if (!p) {
    p = {
      id: user.id,
      name: [user.first_name, user.last_name].filter(Boolean).join(" ").slice(0, 40) || "O'yinchi",
      login: null,
      className: null,
      score: 0, roundStart: 0, correct: 0, answered: 0, streak: 0, best: 0, fastMs: null,
    };
    g.players.set(user.id, p);
    // Platformadagi o'quvchi bo'lsa — haqiqiy ismi, logini va sinfi
    const st = await queryOne<{ login: string; full_name: string; class_name: string }>(
      "SELECT login, full_name, class_name FROM users WHERE telegram_id = $1 LIMIT 1",
      [user.id]
    ).catch(() => null);
    if (st) {
      p.login = st.login;
      p.className = st.class_name || null;
      p.name = st.full_name.split(" ").slice(0, 2).join(" ");
    }
  }

  p.answered++;
  if (correct) {
    const mult = g.rounds[g.idx] ?? 1;
    const speed = Math.max(0, 1 - ms / (g.seconds * 1000));
    p.correct++;
    p.streak++;
    p.best = Math.max(p.best, p.streak);
    p.score += (10 + Math.round(speed * 5)) * mult + (p.streak % 3 === 0 ? 3 : 0);
    if (p.fastMs === null || ms < p.fastMs) p.fastMs = ms;
  } else {
    p.streak = 0;
  }
}

async function awardTanga(g: Game, list: Player[]): Promise<Map<number, number>> {
  const given = new Map<number, number>();
  if (!g.awards) return given;
  const enoughPlayers = list.length >= 3;
  const enoughQuestions = g.idx + 1 >= Math.min(5, g.questions.length);
  if (!enoughPlayers || !enoughQuestions) return given;

  for (let i = 0; i < list.length; i++) {
    const p = list[i]!;
    if (!p.login) continue;
    // Kamida bitta to'g'ri javob bergan o'quvchi mukofot oladi
    const want = p.correct > 0 ? (PRIZES[i] ?? 0) + PARTICIPATION : 0;
    if (want <= 0) continue;
    const today = await queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0)::int AS total FROM tanga_logs
        WHERE user_login = $1 AND source = 'tg_oyin'
          AND (created_at AT TIME ZONE 'Asia/Tashkent')::date = (NOW() AT TIME ZONE 'Asia/Tashkent')::date`,
      [p.login]
    ).catch(() => null);
    const amount = Math.min(want, Math.max(0, DAILY_CAP - (today?.total ?? 0)));
    if (amount <= 0) continue;
    const place = i < 3 ? `${i + 1}-o'rin` : "qatnashgani uchun";
    await query(
      "INSERT INTO tanga_logs (user_login, amount, reason, source) VALUES ($1, $2, $3, 'tg_oyin')",
      [p.login, amount, `Bilimlar jangi (${g.className}) — ${place}`]
    ).catch((err) => logger.warn({ err }, "Tanga yozilmadi"));
    given.set(p.id, amount);
  }
  return given;
}

/** O'yinchilar reytingi va ligasini yangilash. Qaytaradi: id → {oldRating, newRating} */
async function updateRatings(g: Game, list: Player[], asked: number): Promise<Map<number, { before: number; after: number }>> {
  const out = new Map<number, { before: number; after: number }>();
  const rated = list.length >= 2 && asked >= 3;
  const ids = list.map((p) => p.id);
  const prev = await query<{ tg_id: number; rating: number }>(
    "SELECT tg_id, rating FROM tg_player_stats WHERE tg_id = ANY($1::bigint[])",
    [ids]
  ).catch(() => [] as { tg_id: number; rating: number }[]);
  const prevMap = new Map(prev.map((r) => [Number(r.tg_id), Number(r.rating)]));

  for (let i = 0; i < list.length; i++) {
    const p = list[i]!;
    const scored = p.score > 0;
    const delta = rated ? Math.round(p.score / 5) + (scored ? RATING_PLACE_BONUS[i] ?? 0 : 0) : 0;
    const before = prevMap.get(p.id) ?? 0;
    const win = rated && scored && i === 0 ? 1 : 0;
    const podium = rated && scored && i < 3 ? 1 : 0;
    await query(
      `INSERT INTO tg_player_stats (tg_id, name, login, class_name, rating, games, wins, podiums, correct, answered, best_streak, updated_at)
       VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (tg_id) DO UPDATE SET
         name = EXCLUDED.name,
         login = COALESCE(EXCLUDED.login, tg_player_stats.login),
         class_name = CASE WHEN EXCLUDED.class_name <> '' THEN EXCLUDED.class_name ELSE tg_player_stats.class_name END,
         rating = tg_player_stats.rating + EXCLUDED.rating,
         games = tg_player_stats.games + 1,
         wins = tg_player_stats.wins + EXCLUDED.wins,
         podiums = tg_player_stats.podiums + EXCLUDED.podiums,
         correct = tg_player_stats.correct + EXCLUDED.correct,
         answered = tg_player_stats.answered + EXCLUDED.answered,
         best_streak = GREATEST(tg_player_stats.best_streak, EXCLUDED.best_streak),
         updated_at = NOW()`,
      [p.id, p.name, p.login, p.className ?? g.className ?? "", delta, win, podium, p.correct, p.answered, p.best]
    ).catch((err) => logger.warn({ err }, "Reyting yangilanmadi"));
    out.set(p.id, { before, after: before + delta });
  }
  return out;
}

async function finish(g: Game, silent = false): Promise<void> {
  if (g.phase === "finished") return;
  clearTimer(g);
  if (g.phase === "question" && g.pollMsgId) {
    await g.api.stopPoll(g.chatId, g.pollMsgId).catch(() => {});
  }
  if (g.pollId) pollToChat.delete(g.pollId);
  g.phase = "finished";
  g.nextCard = null;
  games.delete(g.chatId);

  const list = ranked(g);
  const asked = Math.max(0, Math.min(g.idx + 1, g.questions.length));

  if (list.length === 0) {
    if (!silent) await g.api.sendMessage(g.chatId, "O'yin tugadi — bu safar hech kim qatnashmadi.").catch(() => {});
    void updatePanel(g);
    return;
  }

  const prizes = await awardTanga(g, list);
  const ratings = await updateRatings(g, list, asked);
  const totalAnswers = list.reduce((a, p) => a + p.answered, 0);
  const totalRight = list.reduce((a, p) => a + p.correct, 0);
  const pct = totalAnswers ? Math.round((totalRight / totalAnswers) * 100) : 0;
  const fastest = list.filter((p) => p.fastMs !== null).sort((a, b) => a.fastMs! - b.fastMs!)[0];
  const longest = [...list].sort((a, b) => b.best - a.best)[0];

  const leagueInfo = (p: Player) => {
    const r = ratings.get(p.id) ?? { before: 0, after: 0 };
    const before = leagueOf(r.before);
    const after = leagueOf(r.after);
    return { league: after, promoted: after.id !== before.id && r.after > r.before, delta: r.after - r.before };
  };

  const png = await renderCard(
    podiumSVG({
      className: g.className,
      source: g.title,
      top: list
        .filter((p) => p.score > 0)
        .slice(0, 3)
        .map((p) => {
          const li = leagueInfo(p);
          return { name: p.name, score: p.score, correct: p.correct, league: li.league, promoted: li.promoted };
        }),
      players: list.length,
      accuracy: pct,
      fastest: fastest?.fastMs != null ? { name: fastest.name, sec: fastest.fastMs / 1000 } : undefined,
      streak: longest ? { name: longest.name, n: longest.best } : undefined,
    })
  );

  let cap = `<b>Bilimlar jangi yakunlandi</b> · ${asked} savol · ${list.length} qatnashchi\n\n`;
  cap += list
    .slice(0, 10)
    .map((p, i) => {
      const prize = prizes.get(p.id);
      const li = leagueInfo(p);
      const place = p.score > 0 ? MEDALS[i] ?? `${i + 1}.` : `${i + 1}.`;
      return `${place} ${esc(p.name)} — <b>${p.score}</b>${li.delta ? ` · +${li.delta} reyting` : ""}${prize ? ` · +${prize} tanga` : ""}`;
    })
    .join("\n");
  const promoted = list.filter((p) => leagueInfo(p).promoted);
  if (promoted.length) {
    cap += `\n\n⬆️ Yangi liga: ${promoted.slice(0, 5).map((p) => `${esc(p.name)} → ${leagueInfo(p).league.name}`).join(", ")}`;
  }
  if (!png) {
    if (fastest?.fastMs != null) cap += `\nEng tez javob: ${esc(fastest.name)} — ${(fastest.fastMs / 1000).toFixed(1)} s`;
    cap += `\nAniqlik: ${pct}%`;
  }
  if (!g.awards) cap += `\n\n<i>Tanga maktab o'qituvchisi boshlagan o'yinlarda beriladi.</i>`;
  else if (list.some((p) => !p.login)) cap += `\n\n<i>Tanga botga ulangan o'quvchilarga beriladi.</i>`;
  cap += `\n\nProfil va liga: /profil · Sinf ligasi: /liga`;
  if (cap.length > 1000) cap = cap.slice(0, 1000) + "…"; // rasm izohi chegarasi — 1024

  const me = await g.api.getMe().catch(() => null);
  await sendCard(g, png, cap, {
    reply_markup: list.some((p) => !p.login) && me
      ? new InlineKeyboard().url("🤖 Botga ulanish (tanga uchun)", `https://t.me/${me.username}?start=oyin`)
      : undefined,
  });

  // Boshlovchiga batafsil hisobot
  let report =
    `📊 <b>O'yin hisoboti — ${esc(g.className)}</b>\n${esc(g.title)} · ${asked} savol · aniqlik ${pct}%\n\n` +
    list.map((p, i) => `${i + 1}. ${esc(p.name)} — ${p.score} ball · ${p.correct}/${asked} to'g'ri${p.login ? "" : " <i>(botga ulanmagan)</i>"}`).join("\n");
  if (g.classId || g.className) {
    const cls = await query<{ full_name: string; telegram_id: number }>(
      "SELECT full_name, telegram_id FROM users WHERE class_name = $1 ORDER BY full_name",
      [g.className]
    ).catch(() => [] as { full_name: string; telegram_id: number }[]);
    const played = new Set(list.map((p) => p.id));
    const missing = cls.filter((s) => isRealTelegramId(s.telegram_id) && !played.has(Number(s.telegram_id)));
    if (missing.length) {
      report += `\n\n<b>Qatnashmadi</b> (botga ulanganlar): ` + missing.slice(0, 40).map((s) => esc(s.full_name)).join(", ");
    }
  }
  if (report.length > 3900) report = report.slice(0, 3900) + "…";
  await g.api.sendMessage(g.teacherId, report, { parse_mode: "HTML" }).catch(() => {});
  void updatePanel(g);

  await query(
    `INSERT INTO tg_games (chat_id, class_name, teacher_login, title, question_count, player_count, results)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      g.chatId, g.className, g.teacherLogin, g.title, asked, list.length,
      JSON.stringify(list.map((p) => ({ name: p.name, login: p.login, score: p.score, correct: p.correct, prize: prizes.get(p.id) ?? 0 }))),
    ]
  ).catch((err) => logger.warn({ err }, "O'yin tarixi saqlanmadi"));
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROFIL VA SINF LIGASI
// ═══════════════════════════════════════════════════════════════════════════

interface StatRow {
  tg_id: number;
  name: string;
  class_name: string;
  rating: number;
  games: number;
  wins: number;
  podiums: number;
  correct: number;
  answered: number;
  best_streak: number;
}

async function sendProfile(ctx: Context, tgId: number): Promise<void> {
  const st = await queryOne<StatRow>("SELECT * FROM tg_player_stats WHERE tg_id = $1", [tgId]).catch(() => null);
  if (!st) {
    await ctx.reply(`Siz hali "Bilimlar jangi"da qatnashmagansiz. Sinf guruhida o'yin boshlanganda javob bering — profilingiz shu yerda paydo bo'ladi.`);
    return;
  }
  const rating = Number(st.rating);
  const [rank, size] = await Promise.all([
    queryOne<{ n: number }>("SELECT COUNT(*)::int + 1 AS n FROM tg_player_stats WHERE class_name = $1 AND rating > $2", [st.class_name, rating]).catch(() => null),
    queryOne<{ n: number }>("SELECT COUNT(*)::int AS n FROM tg_player_stats WHERE class_name = $1", [st.class_name]).catch(() => null),
  ]);
  const accuracy = st.answered ? Math.round((Number(st.correct) / Number(st.answered)) * 100) : 0;
  const png = await renderCard(
    profileSVG({
      name: st.name,
      className: st.class_name ? `${st.class_name}` : "—",
      rating,
      games: Number(st.games),
      wins: Number(st.wins),
      podiums: Number(st.podiums),
      accuracy,
      bestStreak: Number(st.best_streak),
      rankInClass: st.class_name ? rank?.n : undefined,
      classSize: st.class_name ? size?.n : undefined,
    })
  );
  const lg = leagueOf(rating);
  const nx = nextLeague(rating);
  const cap =
    `<b>${esc(st.name)}</b> · ${esc(lg.name)} ligasi · ${rating} reyting\n` +
    `O'yinlar: ${st.games} · G'alabalar: ${st.wins} · Podium: ${st.podiums} · Aniqlik: ${accuracy}%` +
    (nx ? `\n${nx.name} ligasigacha: ${nx.min - rating} reyting` : "");
  if (png) {
    await ctx.replyWithPhoto(new InputFile(png, "profil.png"), { caption: cap, parse_mode: "HTML" }).catch(async () => {
      await ctx.reply(cap, { parse_mode: "HTML" });
    });
  } else {
    await ctx.reply(cap, { parse_mode: "HTML" });
  }
}

async function sendClassLeague(ctx: Context, className: string): Promise<void> {
  const rows = await query<StatRow>(
    "SELECT * FROM tg_player_stats WHERE class_name = $1 ORDER BY rating DESC, wins DESC LIMIT 10",
    [className]
  ).catch(() => [] as StatRow[]);
  if (rows.length === 0) {
    await ctx.reply(`Bu sinfda hali reyting yo'q. Birinchi "Bilimlar jangi"dan keyin paydo bo'ladi: /oyin`);
    return;
  }
  const png = await renderCard(
    standingsSVG(
      "SINF LIGASI",
      "reyting",
      rows.map((r) => ({ name: r.name, score: Number(r.rating), correct: Number(r.correct) })),
      className
    )
  );
  const cap =
    `<b>${esc(className)} — o'yin ligasi</b>\n\n` +
    rows.map((r, i) => `${i + 1}. ${esc(r.name)} — ${r.rating} · ${leagueOf(Number(r.rating)).name}`).join("\n") +
    `\n\nShaxsiy profil: /profil`;
  if (png) {
    await ctx.replyWithPhoto(new InputFile(png, "liga.png"), { caption: cap, parse_mode: "HTML" }).catch(async () => {
      await ctx.reply(cap, { parse_mode: "HTML" });
    });
  } else {
    await ctx.reply(cap, { parse_mode: "HTML" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  SAVOLLARNI YUKLASH
// ═══════════════════════════════════════════════════════════════════════════

const VALID_MON_Q = `
  jsonb_typeof(q.options) = 'array'
  AND jsonb_array_length(q.options) BETWEEN 2 AND 10
  AND q.correct_index IS NOT NULL
  AND q.correct_index < jsonb_array_length(q.options)
  AND (q.correct_indices IS NULL OR COALESCE(array_length(q.correct_indices, 1), 0) <= 1)`;

async function loadQuestions(src: Src, count: number): Promise<GQ[]> {
  if (src.kind === "math") return generateMath(src.level, count);

  if (src.kind === "set") {
    const row = await queryOne<{ questions: GQ[] }>("SELECT questions FROM tg_quiz_sets WHERE id = $1", [src.id]);
    return shuffle(row?.questions ?? []).slice(0, count).map(shuffleOptions);
  }

  if (src.kind === "mon") {
    const rows = await query<{ question: string; options: unknown; correct_index: number }>(
      `SELECT q.question, q.options, q.correct_index FROM monitoring_questions q
        WHERE q.test_id = $1 AND ${VALID_MON_Q}
        ORDER BY q.order_index`,
      [src.id]
    );
    const list: GQ[] = rows.map((r) => ({
      q: String(r.question).slice(0, 280),
      options: (r.options as unknown[]).map((o) => String(o).slice(0, 100)),
      correct: r.correct_index,
    }));
    return shuffle(list).slice(0, count).map(shuffleOptions);
  }

  const rows = await query<{ question: string; options: unknown; correct_index: number }>(
    "SELECT question, options, correct_index FROM riddle_questions ORDER BY random() LIMIT $1",
    [count]
  );
  return rows.map((r) =>
    shuffleOptions({
      q: String(r.question).slice(0, 280),
      options: (r.options as unknown[]).map((o) => String(o).slice(0, 100)),
      correct: r.correct_index,
    })
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  O'QITUVCHI UCHUN SOZLASH OYNALARI
// ═══════════════════════════════════════════════════════════════════════════

interface ChatRow {
  chat_id: number;
  title: string;
  purpose: string;
  class_id: string | null;
  class_name: string | null;
}

async function chatsFor(who: GameWho): Promise<ChatRow[]> {
  const rows = await query<ChatRow>(
    `SELECT t.chat_id, t.title, t.purpose, t.class_id, c.name AS class_name
       FROM tg_chats t LEFT JOIN classes c ON c.id = t.class_id
      WHERE t.purpose IN ('class', 'school') AND t.chat_type <> 'channel'`
  );
  const out: ChatRow[] = [];
  for (const r of rows) {
    if (deps.isManagement(who)) out.push(r);
    else if (r.purpose === "class" && r.class_id && (await deps.canUseClass(who, r.class_id))) out.push(r);
  }
  return out.sort((a, b) => (a.class_name ?? a.title).localeCompare(b.class_name ?? b.title, "uz", { numeric: true }));
}

async function openSetup(
  ctx: Context,
  who: GameWho,
  pre?: ChatRow,
  opts: { byGroupAdmin?: boolean; starterName?: string } = {}
): Promise<void> {
  const tgId = who.tgId;
  let chat = pre;
  if (!chat) {
    const chats = await chatsFor(who);
    if (chats.length === 0) {
      await ctx.api.sendMessage(
        tgId,
        `🎮 <b>Bilimlar jangi</b>\n\nO'yin sinf guruhida o'tadi, lekin sizda hali ulangan guruh yo'q.\n\n` +
          `1. Botni sinf guruhiga qo'shing\n2. Guruhda <code>/boglash</code> yozing\n3. Keyin shu tugmani qayta bosing`,
        { parse_mode: "HTML" }
      );
      return;
    }
    if (chats.length > 1) {
      const kb = new InlineKeyboard();
      chats.slice(0, 30).forEach((c, i) => {
        kb.text(c.class_name ?? c.title.slice(0, 24), `q:grp:${c.chat_id}`);
        if (i % 3 === 2) kb.row();
      });
      kb.row().text("❌ Bekor qilish", "q:cancel");
      await ctx.api.sendMessage(tgId, "🎮 <b>Bilimlar jangi</b>\n\nQaysi guruhda o'ynaymiz?", { parse_mode: "HTML", reply_markup: kb });
      return;
    }
    chat = chats[0]!;
  }
  if (games.has(chat.chat_id)) {
    await ctx.api.sendMessage(tgId, `⚠️ <b>${esc(chat.class_name ?? chat.title)}</b> guruhida o'yin allaqachon ketmoqda.`, { parse_mode: "HTML" });
    return;
  }
  setups.set(tgId, {
    type: "setup",
    chatId: chat.chat_id,
    chatTitle: chat.title,
    className: chat.class_name ?? chat.title,
    classId: chat.class_id,
    count: 10,
    seconds: 20,
    byGroupAdmin: opts.byGroupAdmin,
    starterName: opts.starterName,
  });
  await showSources(ctx, tgId);
}

async function showSources(ctx: Context, tgId: number, editMsg = false): Promise<void> {
  const s = getS(tgId);
  if (s.type !== "setup") return;
  const who = await deps.whoIs(tgId);
  const login = who ? loginOf(who) : "";
  const mgmt = deps.isManagement(who);

  const [sets, mons, rid] = await Promise.all([
    queryOne<{ n: number }>("SELECT COUNT(*)::int AS n FROM tg_quiz_sets WHERE owner_tg = $1", [tgId]).catch(() => null),
    queryOne<{ n: number }>(
      `SELECT COUNT(DISTINCT t.id)::int AS n FROM monitoring_tests t JOIN monitoring_questions q ON q.test_id = t.id
        WHERE t.status <> 'open' AND ($2::boolean OR t.created_by_login = $1) AND ${VALID_MON_Q}`,
      [login, mgmt]
    ).catch(() => null),
    queryOne<{ n: number }>("SELECT COUNT(*)::int AS n FROM riddle_questions").catch(() => null),
  ]);

  const lvl = suggestLevel(s.className);
  const kb = new InlineKeyboard()
    .text(`🧮 Tez hisob — tayyorgarliksiz`, "q:src:math").row()
    .text("✍️ O'z savollarimni yozaman", "q:src:own").row();
  if ((sets?.n ?? 0) > 0) kb.text(`📚 Saqlangan to'plamlarim (${sets!.n})`, "q:src:sets").row();
  if ((mons?.n ?? 0) > 0) kb.text(`📋 Platformadagi testdan (${mons!.n})`, "q:src:mon").row();
  if ((rid?.n ?? 0) >= 5) kb.text("🧠 Topishmoq va mantiq", "q:src:rid").row();
  kb.text("❌ Bekor qilish", "q:cancel");

  const text =
    `🎮 <b>Bilimlar jangi — ${esc(s.className)}</b>\n\n` +
    `Savollarni qayerdan olamiz?\n\n` +
    `🧮 <b>Tez hisob</b> — bot o'zi misol tuzadi (tavsiya: ${MATH_LEVEL_LABEL[lvl]})\n` +
    `✍️ <b>O'z savollaringiz</b> — oddiy matn bilan yozasiz, keyingi safar uchun saqlanadi`;
  if (editMsg) {
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: kb }).catch(async () => {
      await ctx.api.sendMessage(tgId, text, { parse_mode: "HTML", reply_markup: kb });
    });
  } else {
    await ctx.api.sendMessage(tgId, text, { parse_mode: "HTML", reply_markup: kb });
  }
}

function readyKeyboard(s: Extract<Setup, { type: "setup" }>): InlineKeyboard {
  const max = s.src && s.src.kind !== "math" ? s.src.total : 50;
  const kb = new InlineKeyboard().text("🚀 BOSHLASH", "q:go").row();
  const counts = [...new Set([...[5, 10, 15, 20].filter((n) => n < max), Math.min(max, 20)])];
  for (const n of counts) {
    kb.text(`${s.count === n ? "✅ " : ""}${n} ta`, `q:cnt:${n}`);
  }
  kb.row();
  for (const sec of [15, 20, 30, 45]) kb.text(`${s.seconds === sec ? "✅ " : ""}${sec} s`, `q:sec:${sec}`);
  kb.row().text("🔙 Boshqa savollar", "q:back").text("❌ Bekor", "q:cancel");
  return kb;
}

function readyText(s: Extract<Setup, { type: "setup" }>): string {
  const count = s.src && s.src.kind !== "math" ? Math.min(s.count, s.src.total) : s.count;
  const minutes = Math.max(1, Math.round((count * (s.seconds + 6) + 10) / 60));
  return (
    `🎮 <b>Tayyor!</b>\n\n` +
    `👥 Guruh: <b>${esc(s.className)}</b>\n` +
    `📚 Savollar: ${esc(s.src ? srcLabel(s.src) : "—")}\n` +
    `❓ ${count} ta savol · ⏱ har biriga ${s.seconds} soniya\n` +
    `🕐 Taxminan ${minutes} daqiqa\n\n` +
    `<i>Kerak bo'lsa savollar soni va vaqtni o'zgartiring, keyin 🚀 BOSHLASH ni bosing.</i>`
  );
}

async function showReady(ctx: Context, tgId: number, edit: boolean): Promise<void> {
  const s = getS(tgId);
  if (s.type !== "setup" || !s.src) return;
  if (s.src.kind !== "math" && s.count > s.src.total) {
    s.count = Math.max(1, s.src.total);
    setups.set(tgId, s);
  }
  const opts = { parse_mode: "HTML" as const, reply_markup: readyKeyboard(s) };
  if (edit) {
    await ctx.editMessageText(readyText(s), opts).catch(() => {});
  } else {
    await ctx.api.sendMessage(tgId, readyText(s), opts);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  RO'YXATDAN O'TKAZISH
// ═══════════════════════════════════════════════════════════════════════════

export function registerGames(priv: Composer<Context>, group: Composer<Context>, d: GameDeps): void {
  deps = d;

  // ── Javoblar (poll_answer update'larida chat yo'q → shaxsiy composer'ga tushadi)
  priv.on("poll_answer", async (ctx) => {
    const a = ctx.pollAnswer;
    if (!a.user) return;
    await onAnswer(a.poll_id, a.user, a.option_ids);
  });

  // ── Kirish: menyu tugmasi yoki /oyin
  const entry = async (ctx: Context) => {
    if (!ctx.from) return;
    const who = await deps.whoIs(ctx.from.id);
    if (!isStaff(who)) {
      await ctx.reply("🎮 O'yin sinf guruhida boshlanadi: guruh admini yoki o'qituvchi guruhda /oyin yozsin. Savollar o'sha yerda chiqadi!");
      return;
    }
    await openSetup(ctx, who);
  };
  priv.hears(deps.gameButton, entry);
  priv.command("oyin", entry);

  // ── Profil va liga
  const profile = async (ctx: Context) => {
    if (ctx.from) await sendProfile(ctx, ctx.from.id);
  };
  priv.command("profil", profile);
  if (deps.profileButton) priv.hears(deps.profileButton, profile);
  priv.command("liga", async (ctx) => {
    if (!ctx.from) return;
    const st = await queryOne<{ class_name: string }>("SELECT class_name FROM tg_player_stats WHERE tg_id = $1", [ctx.from.id]).catch(() => null);
    const who = await deps.whoIs(ctx.from.id);
    const cls = st?.class_name || (who?.kind === "student" ? (who as GameWho & { class_name?: string }).class_name : "") || "";
    if (!cls) { await ctx.reply("Sinfingiz aniqlanmadi. Sinf guruhida /liga yozing."); return; }
    await sendClassLeague(ctx, cls);
  });

  // Guruhdan "Botni ochish" havolasi: /start oyin_<chatId>
  priv.command("start", async (ctx, next) => {
    const payload = typeof ctx.match === "string" ? ctx.match.trim() : "";
    const m = /^oyin_(-?\d+)$/.exec(payload);
    if (!m || !ctx.from) { await next(); return; }
    const chatId = Number(m[1]);
    const linked = await getLinkedChat(chatId);
    if (!linked) { await ctx.reply("Bu guruh hali ulanmagan. Guruhda /boglash yozing."); return; }
    const who = await deps.whoIs(ctx.from.id);
    let groupAdmin = false;
    try {
      const mem = await ctx.api.getChatMember(chatId, ctx.from.id);
      groupAdmin = mem.status === "creator" || mem.status === "administrator";
    } catch { /* e'tiborsiz */ }
    const staff = isStaff(who);
    if (!staff && !groupAdmin) { await ctx.reply("⛔ O'yinni guruh admini yoki o'qituvchi boshlaydi."); return; }
    const cls = linked.class_id ? await queryOne<{ name: string }>("SELECT name FROM classes WHERE id = $1", [linked.class_id]) : null;
    await openSetup(
      ctx,
      who ?? { kind: "guest", tgId: ctx.from.id },
      { chat_id: chatId, title: linked.title, purpose: linked.purpose, class_id: linked.class_id, class_name: cls?.name ?? null },
      { byGroupAdmin: !staff, starterName: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") }
    );
  });

  priv.callbackQuery("q:cancel", async (ctx) => {
    setups.set(ctx.from.id, { type: "idle" });
    await ctx.answerCallbackQuery("Bekor qilindi");
    await ctx.editMessageText("❌ O'yin sozlash bekor qilindi.").catch(() => {});
  });

  priv.callbackQuery(/^q:grp:(-?\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const who = await deps.whoIs(ctx.from.id);
    if (!isStaff(who)) return;
    const chatId = Number(ctx.match[1]);
    const chat = (await chatsFor(who)).find((c) => c.chat_id === chatId);
    if (!chat) { await ctx.reply("⛔ Bu guruh sizga biriktirilmagan."); return; }
    await ctx.deleteMessage().catch(() => {});
    await openSetup(ctx, who, chat);
  });

  priv.callbackQuery("q:back", async (ctx) => {
    await ctx.answerCallbackQuery();
    const s = getS(ctx.from.id);
    if (s.type !== "setup") return;
    setups.set(ctx.from.id, { ...s, src: undefined, awaiting: false });
    await showSources(ctx, ctx.from.id, true);
  });

  priv.callbackQuery(/^q:src:(math|own|sets|mon|rid)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const s = getS(ctx.from.id);
    if (s.type !== "setup") { await ctx.editMessageText("Sessiya tugagan. Qaytadan: 🎮 Sinf o'yini").catch(() => {}); return; }
    const kind = ctx.match[1];

    if (kind === "math") {
      const sug = suggestLevel(s.className);
      const kb = new InlineKeyboard();
      ([1, 2, 3] as MathLevel[]).forEach((l) => kb.text(`${l === sug ? "⭐ " : ""}${MATH_LEVEL_LABEL[l]}`, `q:lvl:${l}`));
      kb.row().text("🔙 Orqaga", "q:back");
      await ctx.editMessageText(
        `🧮 <b>Tez hisob</b>\n\nQaysi daraja? ⭐ — ${esc(s.className)} uchun tavsiya.\n\n` +
          `1–4 sinf: qo'shish, ayirish, ko'paytirish jadvali\n5–7 sinf: amallar tartibi, foiz, manfiy sonlar\n8–11 sinf: kvadrat, ildiz, tenglama, daraja`,
        { parse_mode: "HTML", reply_markup: kb }
      );
      return;
    }

    if (kind === "own") {
      setups.set(ctx.from.id, { ...s, awaiting: true });
      await ctx.editMessageText(
        `✍️ <b>Savollaringizni yozib yuboring</b>\n\n` +
          `Qoida juda oddiy:\n` +
          `• birinchi qator — savol\n` +
          `• <b>+</b> bilan — to'g'ri javob (bitta)\n` +
          `• <b>−</b> bilan — noto'g'ri javoblar\n` +
          `• savollar orasida bo'sh qator\n` +
          `• birinchi qatorga <code># Nom</code> yozsangiz — to'plam shu nom bilan saqlanadi\n\n` +
          `<b>Namuna</b> (nusxalab o'zgartiring):\n<pre>${esc(QUESTION_FORMAT_EXAMPLE)}</pre>\n` +
          `💡 Javoblarni istalgan tartibda yozing — bot o'yinda o'zi aralashtiradi.`,
        { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("🔙 Orqaga", "q:back") }
      );
      return;
    }

    if (kind === "sets") {
      const rows = await query<{ id: string; title: string; n: number }>(
        `SELECT id, title, jsonb_array_length(questions)::int AS n FROM tg_quiz_sets
          WHERE owner_tg = $1 ORDER BY created_at DESC LIMIT 15`,
        [ctx.from.id]
      );
      const kb = new InlineKeyboard();
      rows.forEach((r) => kb.text(`📚 ${r.title.slice(0, 30)} (${r.n})`, `q:set:${r.id}`).row());
      kb.text("🔙 Orqaga", "q:back");
      await ctx.editMessageText("📚 <b>Saqlangan to'plamlaringiz</b>\n\nBirini tanlang:", { parse_mode: "HTML", reply_markup: kb });
      return;
    }

    if (kind === "mon") {
      const who = await deps.whoIs(ctx.from.id);
      const rows = await query<{ id: string; title: string; subject: string; n: number }>(
        `SELECT t.id, t.title, t.subject, COUNT(q.id)::int AS n
           FROM monitoring_tests t JOIN monitoring_questions q ON q.test_id = t.id
          WHERE t.status <> 'open' AND ($2::boolean OR t.created_by_login = $1) AND ${VALID_MON_Q}
          GROUP BY t.id, t.title, t.subject, t.created_at
          ORDER BY t.created_at DESC LIMIT 15`,
        [who ? loginOf(who) : "", deps.isManagement(who)]
      );
      const kb = new InlineKeyboard();
      rows.forEach((r) => kb.text(`📋 ${r.subject}: ${r.title}`.slice(0, 50) + ` (${r.n})`, `q:mon:${r.id}`).row());
      kb.text("🔙 Orqaga", "q:back");
      await ctx.editMessageText(
        "📋 <b>Platformadagi testlar</b>\n\n<i>Hozir ochiq (o'quvchilar ishlayotgan) testlar ko'rsatilmaydi — javoblar oshkor bo'lmasligi uchun.</i>",
        { parse_mode: "HTML", reply_markup: kb }
      );
      return;
    }

    // rid
    const n = await queryOne<{ n: number }>("SELECT COUNT(*)::int AS n FROM riddle_questions");
    setups.set(ctx.from.id, { ...s, src: { kind: "rid", total: n?.n ?? 0 } });
    await showReady(ctx, ctx.from.id, true);
  });

  priv.callbackQuery(/^q:lvl:([123])$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const s = getS(ctx.from.id);
    if (s.type !== "setup") return;
    setups.set(ctx.from.id, { ...s, src: { kind: "math", level: Number(ctx.match[1]) as MathLevel } });
    await showReady(ctx, ctx.from.id, true);
  });

  priv.callbackQuery(/^q:set:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const s = getS(ctx.from.id);
    if (s.type !== "setup") return;
    const row = await queryOne<{ id: string; title: string; n: number }>(
      "SELECT id, title, jsonb_array_length(questions)::int AS n FROM tg_quiz_sets WHERE id = $1 AND owner_tg = $2",
      [ctx.match[1], ctx.from.id]
    );
    if (!row) return;
    setups.set(ctx.from.id, { ...s, src: { kind: "set", id: row.id, title: row.title, total: row.n } });
    await showReady(ctx, ctx.from.id, true);
  });

  priv.callbackQuery(/^q:mon:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const s = getS(ctx.from.id);
    if (s.type !== "setup") return;
    const row = await queryOne<{ id: string; title: string; n: number }>(
      `SELECT t.id, t.title, COUNT(q.id)::int AS n FROM monitoring_tests t JOIN monitoring_questions q ON q.test_id = t.id
        WHERE t.id = $1 AND t.status <> 'open' AND ${VALID_MON_Q} GROUP BY t.id, t.title`,
      [ctx.match[1]]
    );
    if (!row) return;
    setups.set(ctx.from.id, { ...s, src: { kind: "mon", id: row.id, title: row.title, total: row.n } });
    await showReady(ctx, ctx.from.id, true);
  });

  priv.callbackQuery(/^q:cnt:(\d+)$/, async (ctx) => {
    const s = getS(ctx.from.id);
    if (s.type !== "setup") { await ctx.answerCallbackQuery(); return; }
    const n = Number(ctx.match[1]);
    await ctx.answerCallbackQuery(`${n} ta savol`);
    setups.set(ctx.from.id, { ...s, count: n });
    await showReady(ctx, ctx.from.id, true);
  });

  priv.callbackQuery(/^q:sec:(\d+)$/, async (ctx) => {
    const s = getS(ctx.from.id);
    if (s.type !== "setup") { await ctx.answerCallbackQuery(); return; }
    const sec = Math.min(120, Math.max(10, Number(ctx.match[1])));
    await ctx.answerCallbackQuery(`${sec} soniya`);
    setups.set(ctx.from.id, { ...s, seconds: sec });
    await showReady(ctx, ctx.from.id, true);
  });

  // ── 🚀 Boshlash
  priv.callbackQuery("q:go", async (ctx) => {
    const s = getS(ctx.from.id);
    if (s.type !== "setup" || !s.src) { await ctx.answerCallbackQuery("Sessiya tugagan"); return; }
    const who = await deps.whoIs(ctx.from.id);
    const staffStarter = isStaff(who);
    if (!staffStarter && !s.byGroupAdmin) { await ctx.answerCallbackQuery("⛔"); return; }
    if (games.has(s.chatId)) { await ctx.answerCallbackQuery({ text: "Bu guruhda o'yin allaqachon ketmoqda", show_alert: true }); return; }

    await ctx.answerCallbackQuery("🚀 Boshlandi!");
    const questions = await loadQuestions(s.src, s.count).catch((err) => {
      logger.error({ err }, "Savollarni yuklashda xato");
      return [] as GQ[];
    });
    if (questions.length === 0) {
      await ctx.editMessageText("❌ Savollarni yuklab bo'lmadi. Boshqa manbani tanlang.", {
        reply_markup: new InlineKeyboard().text("🔙 Orqaga", "q:back"),
      }).catch(() => {});
      return;
    }
    setups.set(ctx.from.id, { type: "idle" });

    const g: Game = {
      api: ctx.api,
      chatId: s.chatId,
      className: s.className,
      classId: s.classId,
      teacherId: ctx.from.id,
      teacherName: staffStarter && who ? nameOf(who) : s.starterName ?? ctx.from.first_name,
      teacherLogin: staffStarter && who ? loginOf(who) : `tg:${ctx.from.id}`,
      awards: staffStarter,
      title: srcLabel(s.src),
      questions,
      rounds: roundPlan(questions.length),
      seconds: s.seconds,
      idx: -1,
      phase: "lobby",
      pauseRequested: false,
      pollId: null,
      pollMsgId: null,
      cardMsgId: null,
      nextCard: null,
      qStart: 0,
      qAnswers: new Map(),
      players: new Map(),
      timer: null,
      panelMsgId: ctx.callbackQuery.message?.message_id ?? null,
    };

    // Kirish kartochkasi + birinchi savol kartochkasini oldindan chizamiz
    const roundsCount = new Set(g.rounds).size;
    const introPng = await renderCard(
      introSVG({
        className: g.className,
        source: g.title,
        questions: questions.length,
        seconds: g.seconds,
        rounds: roundsCount,
        host: g.teacherName,
      })
    );
    const introCap =
      `<b>Bilimlar jangi boshlanadi!</b>\n` +
      `${esc(g.title)} · ${questions.length} savol · har biriga ${g.seconds} soniya\n\n` +
      `To'g'ri javob — 10 ball, tezlik uchun +5 gacha, 3 ta ketma-ket — +3.\n` +
      (roundsCount > 1 ? `Raundlar: I ×1 · II ×2 · Final ×3 — oxirgi savollar eng qimmat!\n` : "") +
      `\nBirinchi savol 10 soniyadan keyin. Javob — variantni bosing.`;
    const introId = await sendCard(g, introPng, introCap);
    if (introId === null) {
      await ctx.editMessageText("❌ Bot guruhga yoza olmadi. Bot guruhda borligini va yozish huquqi borligini tekshiring.").catch(() => {});
      return;
    }
    g.nextCard = prepareQuestionCard(g, 0);

    games.set(g.chatId, g);
    await updatePanel(g);
    g.timer = setTimeout(() => void askNext(g), 10_000);
  });

  // ── O'yin paytida boshqaruv (o'qituvchi paneli)
  const control = async (ctx: Context & { match: RegExpMatchArray | string | null | undefined }, action: "nx" | "ps" | "st") => {
    if (!ctx.from || !ctx.match || typeof ctx.match === "string") return;
    const chatId = Number(ctx.match[1]);
    const g = games.get(chatId);
    if (!g) { await ctx.answerCallbackQuery("O'yin allaqachon tugagan"); return; }
    const who = await deps.whoIs(ctx.from.id);
    if (ctx.from.id !== g.teacherId && !deps.isManagement(who)) { await ctx.answerCallbackQuery("⛔"); return; }

    if (action === "nx") {
      await ctx.answerCallbackQuery("⏭");
      if (g.phase === "question") {
        if (g.pollMsgId) await g.api.stopPoll(g.chatId, g.pollMsgId).catch(() => {});
        await reveal(g);
      } else if (g.phase === "reveal" || g.phase === "paused" || g.phase === "lobby") {
        g.pauseRequested = false;
        await askNext(g);
      }
      return;
    }
    if (action === "ps") {
      if (g.phase === "paused") {
        await ctx.answerCallbackQuery("▶️ Davom etamiz");
        await g.api.sendMessage(g.chatId, "▶️ Davom etamiz!").catch(() => {});
        await askNext(g);
      } else {
        g.pauseRequested = !g.pauseRequested;
        await ctx.answerCallbackQuery(g.pauseRequested ? "⏸ Shu savol tugagach to'xtaydi" : "Pauza bekor qilindi");
        await updatePanel(g);
      }
      return;
    }
    await ctx.answerCallbackQuery("⏹ Tugatilmoqda");
    await finish(g);
  };
  priv.callbackQuery(/^q:nx:(-?\d+)$/, (ctx) => control(ctx, "nx"));
  priv.callbackQuery(/^q:ps:(-?\d+)$/, (ctx) => control(ctx, "ps"));
  priv.callbackQuery(/^q:st:(-?\d+)$/, (ctx) => control(ctx, "st"));

  // ── O'qituvchi savollarini yozib yubordi
  priv.on("message", async (ctx, next) => {
    const s = getS(ctx.from.id);
    const text = ctx.message.text ?? "";
    if (s.type !== "setup" || !s.awaiting) { await next(); return; }
    if (text.startsWith("/") || deps.menuButtons.has(text)) {
      setups.set(ctx.from.id, { type: "idle" });
      await next();
      return;
    }
    if (!text) {
      await ctx.reply("Savollarni oddiy matn qilib yuboring (rasm yoki fayl emas).");
      return;
    }
    const parsed = parseQuestions(text);
    if (parsed.questions.length === 0) {
      await ctx.reply(
        `❌ Birorta ham savol o'qilmadi.\n\n${parsed.errors.slice(0, 5).map((e) => "• " + esc(e)).join("\n")}\n\nNamunaga qarab qayta yuboring.`,
        { parse_mode: "HTML" }
      );
      return;
    }
    const title = parsed.title ?? `To'plam — ${new Date().toLocaleDateString("uz-UZ", { timeZone: "Asia/Tashkent" })}`;
    const who = await deps.whoIs(ctx.from.id);
    const row = await queryOne<{ id: string }>(
      "INSERT INTO tg_quiz_sets (owner_tg, owner_login, title, questions) VALUES ($1, $2, $3, $4) RETURNING id",
      [ctx.from.id, who ? loginOf(who) : "", title, JSON.stringify(parsed.questions)]
    );
    if (!row) { await ctx.reply("❌ Saqlashda xato. Qayta urinib ko'ring."); return; }
    setups.set(ctx.from.id, {
      ...s,
      awaiting: false,
      src: { kind: "set", id: row.id, title, total: parsed.questions.length },
      count: Math.min(s.count, parsed.questions.length) || parsed.questions.length,
    });
    let msg = `✅ <b>${parsed.questions.length} ta savol qabul qilindi</b> va "${esc(title)}" nomi bilan saqlandi.`;
    if (parsed.errors.length) {
      msg += `\n\n⚠️ Quyidagilar o'tkazib yuborildi:\n${parsed.errors.slice(0, 8).map((e) => "• " + esc(e)).join("\n")}`;
    }
    await ctx.reply(msg, { parse_mode: "HTML" });
    await showReady(ctx, ctx.from.id, false);
  });

  // ═════════════════════ GURUH ═════════════════════

  /** Guruh admini / o'qituvchiga shaxsiy chatda sozlash oynasini ochish */
  const openFromGroup = async (
    ctx: Context,
    user: { id: number; first_name: string; last_name?: string },
    auth: GameGroupAuth
  ): Promise<boolean> => {
    if (!ctx.chat) return false;
    const linked = await getLinkedChat(ctx.chat.id);
    if (!linked) return false;
    const cls = linked.class_id ? await queryOne<{ name: string }>("SELECT name FROM classes WHERE id = $1", [linked.class_id]) : null;
    const who = (await deps.whoIs(user.id)) ?? { kind: "guest" as const, tgId: user.id };
    const starterName = auth.staff ? undefined : [user.first_name, user.last_name].filter(Boolean).join(" ");
    try {
      await openSetup(
        ctx,
        { ...who, tgId: user.id },
        { chat_id: ctx.chat.id, title: linked.title, purpose: linked.purpose, class_id: linked.class_id, class_name: cls?.name ?? null },
        { byGroupAdmin: !auth.staff, starterName }
      );
      return true;
    } catch {
      return false; // foydalanuvchi botga hali /start yozmagan — shaxsiy xabar yuborib bo'lmaydi
    }
  };

  group.command("oyin", async (ctx) => {
    if (games.has(ctx.chat.id)) {
      await ctx.reply("🎮 O'yin allaqachon ketmoqda! Boshqaruv — boshlovchining shaxsiy chatida.");
      return;
    }
    if (!(await getLinkedChat(ctx.chat.id))) {
      await ctx.reply("Avval guruhni sinfga ulang: /boglash");
      return;
    }
    const auth = await deps.groupAuth(ctx);
    if (!auth.ok) {
      await ctx.reply("🎮 O'yinni guruh admini yoki o'qituvchi boshlaydi. Tayyor turing! 😉");
      return;
    }
    const setupKb = new InlineKeyboard().text("⚙️ O'yinni sozlash", "g:oyin");
    // Anonim admin — kimligini bilmaymiz, tugma orqali aniqlaymiz
    if (auth.anonymous || !ctx.from) {
      await ctx.reply("🎮 <b>Bilimlar jangi</b>\n\nSozlamalarni ochish uchun pastdagi tugmani bosing (faqat adminlar/o'qituvchilar).", {
        parse_mode: "HTML",
        reply_markup: setupKb,
      });
      return;
    }
    if (await openFromGroup(ctx, ctx.from, auth)) {
      await ctx.reply(`🎮 ${esc(auth.name)}, sozlamalarni shaxsiy chatga yubordim — 2 ta tugma va boshlaymiz!`, {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard().url("⚙️ Sozlamalarni ochish", `https://t.me/${ctx.me.username}`),
      });
    } else {
      await ctx.reply("🎮 Sozlash uchun botni oching va START ni bosing 👇", {
        reply_markup: new InlineKeyboard().url("🤖 Botni ochish", `https://t.me/${ctx.me.username}?start=oyin_${ctx.chat.id}`),
      });
    }
  });

  group.callbackQuery("g:oyin", async (ctx) => {
    if (!ctx.chat) { await ctx.answerCallbackQuery(); return; }
    if (games.has(ctx.chat.id)) { await ctx.answerCallbackQuery({ text: "O'yin allaqachon ketmoqda", show_alert: true }); return; }
    const auth = await deps.groupAuth(ctx);
    if (!auth.ok) { await ctx.answerCallbackQuery({ text: "⛔ Faqat guruh admini yoki o'qituvchi", show_alert: true }); return; }
    if (await openFromGroup(ctx, ctx.from, auth)) {
      await ctx.answerCallbackQuery({ text: "✅ Sozlamalar shaxsiy chatda!", show_alert: false });
    } else {
      await ctx.answerCallbackQuery({ url: `https://t.me/${ctx.me.username}?start=oyin_${ctx.chat.id}` });
    }
  });

  group.command("oyin_stop", async (ctx) => {
    const g = games.get(ctx.chat.id);
    if (!g) return;
    const auth = await deps.groupAuth(ctx);
    if (ctx.from?.id !== g.teacherId && !auth.ok) {
      await ctx.reply("⛔ O'yinni faqat boshlovchi, guruh admini yoki o'qituvchi to'xtata oladi.");
      return;
    }
    await finish(g);
  });

  group.command("profil", async (ctx) => {
    if (!ctx.from || ctx.from.id === 1087968824 || ctx.from.is_bot) return;
    await sendProfile(ctx, ctx.from.id);
  });

  group.command("liga", async (ctx) => {
    const linked = await getLinkedChat(ctx.chat.id);
    const cls = linked?.class_id ? await queryOne<{ name: string }>("SELECT name FROM classes WHERE id = $1", [linked.class_id]) : null;
    if (!cls) { await ctx.reply("Bu guruh sinfga ulanmagan: /boglash"); return; }
    await sendClassLeague(ctx, cls.name);
  });

  group.command("natija", async (ctx) => {
    const g = games.get(ctx.chat.id);
    if (!g) { await ctx.reply("Hozir o'yin ketmayapti. O'qituvchi /oyin bilan boshlaydi."); return; }
    const list = ranked(g).slice(0, 10);
    await ctx.reply(
      `🏅 <b>Joriy hisob</b> (${Math.max(0, g.idx + 1)}/${g.questions.length})\n\n` +
        (list.length ? list.map((p, i) => `${p.score > 0 ? MEDALS[i] ?? `${i + 1}.` : `${i + 1}.`} ${esc(p.name)} — ${p.score}`).join("\n") : "Hali hech kim javob bermadi"),
      { parse_mode: "HTML" }
    );
  });

}

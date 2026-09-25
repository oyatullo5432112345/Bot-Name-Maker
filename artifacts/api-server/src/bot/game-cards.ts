// ═══════════════════════════════════════════════════════════════════════════
//  "Bilimlar jangi" kartochkalari — SVG → PNG (resvg)
//  Uslub: qorong'i fon, neon (cyan / binafsha), sport-translyatsiya ko'rinishi.
//  Bu fayldagi SVG quruvchilar sof funksiyalar; PNG ga aylantirish renderCard() da.
// ═══════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const W = 1280;
export const H = 720;

// ─── Ranglar ────────────────────────────────────────────────────────────────
const C = {
  bg0: "#060913",
  bg1: "#0D1430",
  panel: "#111A3A",
  line: "#1E2A55",
  text: "#F1F5F9",
  sub: "#8C9BC0",
  cyan: "#22D3EE",
  violet: "#8B5CF6",
  pink: "#EC4899",
  gold: "#FBBF24",
  silver: "#CBD5E1",
  bronze: "#E08A3C",
  green: "#34D399",
};

const FONT = "Poppins, DejaVu Sans, sans-serif";

// ─── Ligalar ────────────────────────────────────────────────────────────────
export interface League {
  id: string;
  name: string;
  min: number;
  c1: string;
  c2: string;
}

export const LEAGUES: League[] = [
  { id: "bronza", name: "BRONZA", min: 0, c1: "#B87333", c2: "#6B3E1D" },
  { id: "kumush", name: "KUMUSH", min: 150, c1: "#E2E8F0", c2: "#64748B" },
  { id: "oltin", name: "OLTIN", min: 400, c1: "#FDE68A", c2: "#B45309" },
  { id: "platina", name: "PLATINA", min: 800, c1: "#67E8F9", c2: "#0E7490" },
  { id: "olmos", name: "OLMOS", min: 1400, c1: "#C4B5FD", c2: "#6D28D9" },
  { id: "afsona", name: "AFSONA", min: 2200, c1: "#F9A8D4", c2: "#BE123C" },
];

export function leagueOf(rating: number): League {
  let best = LEAGUES[0]!;
  for (const l of LEAGUES) if (rating >= l.min) best = l;
  return best;
}

export function nextLeague(rating: number): League | null {
  return LEAGUES.find((l) => l.min > rating) ?? null;
}

// ─── Matn yordamchilari ─────────────────────────────────────────────────────

export function x(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Kartochkada ko'rinmaydigan belgilarni (emoji va h.k.) olib tashlaymiz */
export function cleanName(s: string, max = 22): string {
  const t = s
    .replace(/\p{Extended_Pictographic}|️|‍/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  const out = t || "O'yinchi";
  return out.length > max ? out.slice(0, max - 1) + "…" : out;
}

// Poppins uchun taxminiy belgi kengligi (shrift o'lchamiga nisbatan)
function charW(ch: string, bold: boolean): number {
  if (/[A-ZÀ-ÝА-Я0-9]/.test(ch)) return bold ? 0.7 : 0.66;
  if (/[iIl.,:;'!|ʻʼ`]/.test(ch)) return 0.28;
  if (/[mwMW]/.test(ch)) return bold ? 0.9 : 0.85;
  if (ch === " ") return 0.28;
  return bold ? 0.6 : 0.56;
}

export function textWidth(s: string, size: number, bold = false): number {
  let w = 0;
  for (const ch of s) w += charW(ch, bold);
  return w * size;
}

export function wrap(text: string, maxW: number, size: number, bold = false): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (textWidth(test, size, bold) <= maxW || !cur) {
      cur = test;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function fitName(s: string, maxW: number, size: number, bold = true): string {
  let t = s;
  while (t.length > 3 && textWidth(t, size, bold) > maxW) t = t.slice(0, -2) + "…";
  return t;
}

// ─── Umumiy ramka ───────────────────────────────────────────────────────────

function defs(extra = ""): string {
  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.bg0}"/><stop offset="1" stop-color="${C.bg1}"/>
    </linearGradient>
    <radialGradient id="glowA" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${C.cyan}" stop-opacity="0.28"/><stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${C.violet}" stop-opacity="0.32"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.violet}"/>
    </linearGradient>
    <linearGradient id="accentV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.violet}"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FDE68A"/><stop offset="1" stop-color="#D97706"/>
    </linearGradient>
    <linearGradient id="silver" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F1F5F9"/><stop offset="1" stop-color="#64748B"/>
    </linearGradient>
    <linearGradient id="bronze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F4B37A"/><stop offset="1" stop-color="#8A4B1B"/>
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#FFFFFF" stroke-opacity="0.035" stroke-width="1"/>
    </pattern>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
    ${extra}
  </defs>`;
}

function frame(inner: string, opts: { chip?: string; extraDefs?: string } = {}): string {
  const chip = opts.chip
    ? (() => {
        const w = textWidth(opts.chip, 20, true) + 44;
        return `<g transform="translate(${W - 56 - w}, 40)">
          <rect width="${w}" height="44" rx="22" fill="${C.panel}" stroke="url(#accent)" stroke-width="2"/>
          <text x="${w / 2}" y="29" text-anchor="middle" font-family="${FONT}" font-size="20" font-weight="700" fill="${C.text}" letter-spacing="1">${x(opts.chip)}</text>
        </g>`;
      })()
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs(opts.extraDefs)}
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <circle cx="1120" cy="90" r="360" fill="url(#glowB)"/>
  <circle cx="140" cy="690" r="380" fill="url(#glowA)"/>
  <g transform="translate(56, 40)">
    <path d="M22 0 L44 12 L44 32 L22 44 L0 32 L0 12 Z" fill="url(#accentV)"/>
    <path d="M22 11 L33 17 L33 27 L22 33 L11 27 L11 17 Z" fill="${C.bg0}"/>
    <text x="62" y="31" font-family="${FONT}" font-size="24" font-weight="700" fill="${C.text}" letter-spacing="4">BILIMLAR JANGI</text>
  </g>
  ${chip}
  ${inner}
  <rect x="0" y="${H - 6}" width="${W}" height="6" fill="url(#accent)"/>
</svg>`;
}

function pill(xp: number, y: number, label: string, opts: { fill?: string; color?: string; size?: number } = {}): string {
  const size = opts.size ?? 18;
  const w = textWidth(label, size, true) + 36;
  return `<g transform="translate(${xp}, ${y})">
    <rect width="${w}" height="${size + 20}" rx="${(size + 20) / 2}" fill="${opts.fill ?? C.panel}" stroke="${C.line}" stroke-width="1.5"/>
    <text x="${w / 2}" y="${size + 4}" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="700" fill="${opts.color ?? C.text}" letter-spacing="1.5">${x(label)}</text>
  </g>`;
}

function leagueBadge(cx: number, cy: number, r: number, league: League, id: string): string {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  const inner = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * 0.62 * Math.cos(a)).toFixed(1)},${(cy + r * 0.62 * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  return `<defs><linearGradient id="lg-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${league.c1}"/><stop offset="1" stop-color="${league.c2}"/></linearGradient></defs>
    <polygon points="${pts}" fill="url(#lg-${id})"/>
    <polygon points="${inner}" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="${Math.max(1.5, r / 14)}"/>`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  KARTOCHKALAR
// ═══════════════════════════════════════════════════════════════════════════

export interface IntroData {
  className: string;
  source: string;
  questions: number;
  seconds: number;
  rounds: number;
  host: string;
}

export function introSVG(d: IntroData): string {
  const tiles = [
    { v: String(d.questions), l: "SAVOL" },
    { v: `${d.seconds}s`, l: "HAR BIRIGA" },
    { v: String(d.rounds), l: "RAUND" },
  ];
  const tw = 250;
  const gap = 28;
  const startX = (W - (tiles.length * tw + (tiles.length - 1) * gap)) / 2;
  const tileSvg = tiles
    .map((t, i) => {
      const tx = startX + i * (tw + gap);
      return `<g transform="translate(${tx}, 330)">
        <rect width="${tw}" height="130" rx="20" fill="${C.panel}" stroke="${C.line}" stroke-width="1.5"/>
        <text x="${tw / 2}" y="72" text-anchor="middle" font-family="${FONT}" font-size="52" font-weight="700" fill="${C.text}">${x(t.v)}</text>
        <text x="${tw / 2}" y="106" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="600" fill="${C.sub}" letter-spacing="3">${x(t.l)}</text>
      </g>`;
    })
    .join("");
  const rules = "To'g'ri javob — 10 ball   ·   Tezlik — +5 gacha   ·   Seriya — +3   ·   Raundlar ×1  ×2  ×3";
  return frame(
    `<text x="${W / 2}" y="190" text-anchor="middle" font-family="${FONT}" font-size="30" font-weight="600" fill="${C.cyan}" letter-spacing="8">${x(d.className.toUpperCase())} · JONLI BELLASHUV</text>
    <text x="${W / 2}" y="268" text-anchor="middle" font-family="${FONT}" font-size="76" font-weight="700" fill="${C.text}" letter-spacing="2">${x(fitName(d.source, 1100, 76))}</text>
    ${tileSvg}
    <text x="${W / 2}" y="530" text-anchor="middle" font-family="${FONT}" font-size="21" font-weight="500" fill="${C.sub}">${x(rules)}</text>
    <rect x="${W / 2 - 170}" y="572" width="340" height="56" rx="28" fill="url(#accent)"/>
    <text x="${W / 2}" y="608" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="700" fill="${C.bg0}" letter-spacing="3">10 SONIYADA START</text>
    <text x="56" y="${H - 34}" font-family="${FONT}" font-size="17" fill="${C.sub}">Boshlovchi: ${x(cleanName(d.host, 40))}</text>`,
    { chip: d.className.toUpperCase() }
  );
}

export interface QuestionData {
  index: number; // 1-dan
  total: number;
  roundName: string;
  multiplier: number;
  category: string;
  text: string;
  seconds: number;
}

export function questionSVG(d: QuestionData): string {
  const maxW = W - 200;
  const plain = d.text.replace(/^[^\p{L}\p{N}(√−-]+/u, "").trim();
  let size = plain.length <= 24 ? 96 : 64;
  let lines = wrap(plain, maxW, size, true);
  while ((lines.length > 3 || lines.some((l) => textWidth(l, size, true) > maxW)) && size > 30) {
    size -= 4;
    lines = wrap(plain, maxW, size, true);
  }
  if (lines.length > 5) lines = [...lines.slice(0, 4), lines.slice(4).join(" ").slice(0, 60) + "…"];
  const lh = size * 1.25;
  const top = 360 - ((lines.length - 1) * lh) / 2;
  const qText = lines
    .map((l, i) => `<text x="${W / 2}" y="${(top + i * lh).toFixed(0)}" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="700" fill="${C.text}">${x(l)}</text>`)
    .join("");

  // Savollar progressi (nuqtalar)
  const n = Math.min(d.total, 30);
  const dotGap = Math.min(34, (W - 240) / n);
  const dotsStart = W / 2 - ((n - 1) * dotGap) / 2;
  const dots = Array.from({ length: n }, (_, i) => {
    const done = i < d.index - 1;
    const cur = i === d.index - 1;
    return `<circle cx="${(dotsStart + i * dotGap).toFixed(1)}" cy="${H - 70}" r="${cur ? 8 : 5}" fill="${cur ? C.cyan : done ? C.violet : C.line}"/>`;
  }).join("");

  const multColor = d.multiplier >= 3 ? C.pink : d.multiplier === 2 ? C.gold : C.cyan;
  return frame(
    `${pill(56, 118, `${d.roundName}`, {})}
    ${pill(56 + textWidth(d.roundName, 18, true) + 50, 118, `×${d.multiplier} BALL`, { color: multColor })}
    <text x="${W - 56}" y="146" text-anchor="end" font-family="${FONT}" font-size="22" font-weight="600" fill="${C.sub}" letter-spacing="3">${x(d.category.toUpperCase())}</text>
    <rect x="80" y="196" width="${W - 160}" height="330" rx="28" fill="${C.panel}" fill-opacity="0.72" stroke="${C.line}" stroke-width="1.5"/>
    ${qText}
    <g transform="translate(${W / 2 - 110}, 552)">
      <rect width="220" height="48" rx="24" fill="${C.bg0}" stroke="url(#accent)" stroke-width="2"/>
      <circle cx="30" cy="24" r="10" fill="none" stroke="${C.cyan}" stroke-width="3"/>
      <path d="M30 17 V24 L35 27" stroke="${C.cyan}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <text x="124" y="32" text-anchor="middle" font-family="${FONT}" font-size="21" font-weight="700" fill="${C.text}" letter-spacing="2">${d.seconds} SONIYA</text>
    </g>
    ${dots}`,
    { chip: `SAVOL ${d.index} / ${d.total}` }
  );
}

export interface StandRow {
  name: string;
  score: number;
  correct: number;
  delta?: number; // shu raundda qo'shilgan ball
}

export function standingsSVG(title: string, subtitle: string, rows: StandRow[], className: string): string {
  const list = rows.slice(0, 8);
  const max = Math.max(1, ...list.map((r) => r.score));
  const rowH = 58;
  const top = 196;
  const barX = 460;
  const barW = 560;
  const medal = [
    { fill: "url(#gold)", t: C.bg0 },
    { fill: "url(#silver)", t: C.bg0 },
    { fill: "url(#bronze)", t: C.bg0 },
  ];
  const body = list.length
    ? list
        .map((r, i) => {
          const y = top + i * rowH;
          const m = medal[i];
          const w = Math.max(8, (r.score / max) * barW);
          return `<g transform="translate(0, ${y})">
            <rect x="80" y="0" width="${W - 160}" height="${rowH - 10}" rx="14" fill="${i % 2 ? "transparent" : C.panel}" fill-opacity="0.55"/>
            <circle cx="120" cy="${(rowH - 10) / 2}" r="18" fill="${m ? m.fill : C.line}"/>
            <text x="120" y="${(rowH - 10) / 2 + 7}" text-anchor="middle" font-family="${FONT}" font-size="19" font-weight="700" fill="${m ? m.t : C.text}">${i + 1}</text>
            <text x="156" y="${(rowH - 10) / 2 + 8}" font-family="${FONT}" font-size="23" font-weight="600" fill="${C.text}">${x(fitName(cleanName(r.name, 28), 280, 23))}</text>
            <rect x="${barX}" y="${(rowH - 10) / 2 - 7}" width="${barW}" height="14" rx="7" fill="${C.line}"/>
            <rect x="${barX}" y="${(rowH - 10) / 2 - 7}" width="${w.toFixed(0)}" height="14" rx="7" fill="url(#accent)"/>
            <text x="${W - 100}" y="${(rowH - 10) / 2 + 9}" text-anchor="end" font-family="${FONT}" font-size="26" font-weight="700" fill="${C.text}">${r.score}</text>
            ${r.delta ? `<text x="${W - 190}" y="${(rowH - 10) / 2 + 8}" text-anchor="end" font-family="${FONT}" font-size="17" font-weight="600" fill="${C.green}">+${r.delta}</text>` : ""}
          </g>`;
        })
        .join("")
    : `<text x="${W / 2}" y="380" text-anchor="middle" font-family="${FONT}" font-size="28" fill="${C.sub}">Hali hech kim ball olmadi</text>`;
  return frame(
    `<text x="80" y="150" font-family="${FONT}" font-size="44" font-weight="700" fill="${C.text}" letter-spacing="1">${x(title)}</text>
    <text x="${W - 80}" y="150" text-anchor="end" font-family="${FONT}" font-size="20" font-weight="600" fill="${C.sub}" letter-spacing="2">${x(subtitle.toUpperCase())}</text>
    ${body}`,
    { chip: className.toUpperCase() }
  );
}

export interface PodiumRow {
  name: string;
  score: number;
  correct: number;
  league: League;
  promoted?: boolean;
}

export interface PodiumData {
  className: string;
  source: string;
  top: PodiumRow[];
  players: number;
  accuracy: number;
  fastest?: { name: string; sec: number };
  streak?: { name: string; n: number };
}

export function podiumSVG(d: PodiumData): string {
  const order = [1, 0, 2]; // 2-o'rin chapda, 1-o'rin markazda, 3-o'rin o'ngda
  const colW = 300;
  const gap = 36;
  const baseY = 588;
  const heights = [210, 160, 125];
  const fills = ["url(#gold)", "url(#silver)", "url(#bronze)"];
  const startX = W / 2 - (colW * 3 + gap * 2) / 2;
  const cols = order
    .map((idx, pos) => {
      const p = d.top[idx];
      const cx = startX + pos * (colW + gap);
      const h = heights[idx]!;
      const top = baseY - h;
      const mid = cx + colW / 2;
      const block = `<rect x="${cx}" y="${top}" width="${colW}" height="${h}" rx="18" fill="${C.panel}" stroke="${C.line}" stroke-width="1.5"/>
        <rect x="${cx}" y="${top}" width="${colW}" height="8" rx="4" fill="${fills[idx]}"/>
        <text x="${mid}" y="${top + (idx === 0 ? 86 : 72)}" text-anchor="middle" font-family="${FONT}" font-size="${idx === 0 ? 64 : 50}" font-weight="700" fill="${fills[idx]}">${idx + 1}</text>`;
      if (!p) return block;
      const nameSize = idx === 0 ? 28 : 24;
      const name = fitName(cleanName(p.name, 26), colW - 20, nameSize);
      const lgText = `${p.league.name}${p.promoted ? "  ↑" : ""}`;
      const lgW = 28 + 8 + textWidth(lgText, 15, true);
      return `<g>
        <text x="${mid}" y="${top - 84}" text-anchor="middle" font-family="${FONT}" font-size="${nameSize}" font-weight="700" fill="${C.text}">${x(name)}</text>
        <text x="${mid}" y="${top - 44}" text-anchor="middle" font-family="${FONT}" font-size="${idx === 0 ? 34 : 28}" font-weight="700" fill="${C.cyan}">${p.score}<tspan font-size="16" fill="${C.sub}" font-weight="600" letter-spacing="2">  BALL</tspan></text>
        <text x="${mid}" y="${top - 16}" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="600" fill="${C.sub}" letter-spacing="2">${p.correct} TO'G'RI JAVOB</text>
        ${block}
        ${leagueBadge(mid - lgW / 2 + 14, baseY - 28, 13, p.league, `p${idx}`)}
        <text x="${mid - lgW / 2 + 36}" y="${baseY - 22}" font-family="${FONT}" font-size="15" font-weight="700" fill="${p.league.c1}" letter-spacing="2">${x(lgText)}</text>
      </g>`;
    })
    .join("");

  const stats = [
    `QATNASHCHI ${d.players}`,
    `ANIQLIK ${d.accuracy}%`,
    d.fastest ? `ENG TEZ: ${cleanName(d.fastest.name, 16).toUpperCase()} ${d.fastest.sec.toFixed(1)}s` : "",
    d.streak && d.streak.n >= 3 ? `SERIYA: ${cleanName(d.streak.name, 14).toUpperCase()} ×${d.streak.n}` : "",
  ].filter(Boolean);
  let sx = 80;
  const statSvg = stats
    .map((s) => {
      const g = pill(sx, 614, s, { size: 16, color: C.sub });
      sx += textWidth(s, 16, true) + 36 + 14;
      return g;
    })
    .join("");

  return frame(
    `<text x="80" y="150" font-family="${FONT}" font-size="44" font-weight="700" fill="${C.text}" letter-spacing="1">G'OLIBLAR</text>
    <text x="${W - 80}" y="150" text-anchor="end" font-family="${FONT}" font-size="20" font-weight="600" fill="${C.sub}" letter-spacing="2">${x(fitName(d.source.toUpperCase(), 620, 20))}</text>
    <circle cx="${W / 2}" cy="400" r="260" fill="url(#glowA)"/>
    ${cols}
    ${statSvg}`,
    { chip: d.className.toUpperCase() }
  );
}

export interface ProfileData {
  name: string;
  className: string;
  rating: number;
  games: number;
  wins: number;
  podiums: number;
  accuracy: number;
  bestStreak: number;
  rankInClass?: number;
  classSize?: number;
}

export function profileSVG(d: ProfileData): string {
  const lg = leagueOf(d.rating);
  const nx = nextLeague(d.rating);
  const progress = nx ? (d.rating - lg.min) / (nx.min - lg.min) : 1;
  const tiles = [
    { v: String(d.games), l: "O'YIN" },
    { v: String(d.wins), l: "G'ALABA" },
    { v: String(d.podiums), l: "PODIUM" },
    { v: `${d.accuracy}%`, l: "ANIQLIK" },
    { v: `×${d.bestStreak}`, l: "SERIYA" },
  ];
  const tw = 196;
  const gap = 18;
  const sx = W / 2 - (tiles.length * tw + (tiles.length - 1) * gap) / 2;
  const tileSvg = tiles
    .map((t, i) => `<g transform="translate(${sx + i * (tw + gap)}, 470)">
        <rect width="${tw}" height="120" rx="18" fill="${C.panel}" stroke="${C.line}" stroke-width="1.5"/>
        <text x="${tw / 2}" y="66" text-anchor="middle" font-family="${FONT}" font-size="42" font-weight="700" fill="${C.text}">${x(t.v)}</text>
        <text x="${tw / 2}" y="98" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="600" fill="${C.sub}" letter-spacing="3">${x(t.l)}</text>
      </g>`)
    .join("");
  return frame(
    `${leagueBadge(220, 300, 110, lg, "pf")}
    <text x="220" y="316" text-anchor="middle" font-family="${FONT}" font-size="44" font-weight="700" fill="${C.bg0}">${d.rating}</text>
    <text x="380" y="236" font-family="${FONT}" font-size="22" font-weight="600" fill="${lg.c1}" letter-spacing="6">${x(lg.name)} LIGASI</text>
    <text x="380" y="300" font-family="${FONT}" font-size="54" font-weight="700" fill="${C.text}">${x(fitName(cleanName(d.name, 30), 820, 54))}</text>
    <text x="380" y="346" font-family="${FONT}" font-size="22" font-weight="500" fill="${C.sub}">${x(d.className)}${d.rankInClass ? `  ·  sinfda ${d.rankInClass}-o'rin${d.classSize ? ` / ${d.classSize}` : ""}` : ""}</text>
    <rect x="380" y="374" width="720" height="14" rx="7" fill="${C.line}"/>
    <rect x="380" y="374" width="${Math.max(14, 720 * Math.min(1, progress)).toFixed(0)}" height="14" rx="7" fill="url(#accent)"/>
    <text x="1100" y="414" text-anchor="end" font-family="${FONT}" font-size="17" font-weight="500" fill="${C.sub}">${nx ? `${nx.name} ligasigacha ${nx.min - d.rating} reyting` : "Eng yuqori liga"}</text>
    ${tileSvg}`,
    { chip: "PROFIL" }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  PNG GA AYLANTIRISH
// ═══════════════════════════════════════════════════════════════════════════

function findFontsDir(): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../assets/fonts"), // dist/ → artifacts/api-server/assets/fonts
    path.resolve(here, "../../assets/fonts"), // src/bot/ → artifacts/api-server/assets/fonts
    path.resolve(process.cwd(), "artifacts/api-server/assets/fonts"),
    path.resolve(process.cwd(), "assets/fonts"),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

let fontFiles: string[] | null = null;
function getFontFiles(): string[] {
  if (fontFiles) return fontFiles;
  const dir = findFontsDir();
  const list: string[] = dir
    ? fs.readdirSync(dir).filter((f: string) => /\.(ttf|otf)$/i.test(f)).map((f: string) => path.join(dir, f))
    : [];
  fontFiles = list;
  return list;
}

/** SVG → PNG. Shrift topilmasa yoki resvg ishlamasa — null (bot matnli rejimga o'tadi). */
export async function renderCard(svg: string): Promise<Buffer | null> {
  try {
    const files = getFontFiles();
    const mod = await import("@resvg/resvg-js");
    const opts = {
      fitTo: { mode: "width" as const, value: 1080 },
      font: {
        fontFiles: files,
        loadSystemFonts: files.length === 0,
        defaultFontFamily: "Poppins",
        sansSerifFamily: "Poppins",
      },
    };
    // renderAsync — alohida oqimda chizadi, bot javoblari kechikmaydi
    const renderAsync = (mod as unknown as { renderAsync?: (s: string, o: unknown) => Promise<{ asPng(): Uint8Array }> }).renderAsync;
    if (typeof renderAsync === "function") {
      const img = await renderAsync(svg, opts);
      return Buffer.from(img.asPng());
    }
    const r = new mod.Resvg(svg, opts);
    return Buffer.from(r.render().asPng());
  } catch {
    return null;
  }
}

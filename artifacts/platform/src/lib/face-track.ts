// Face ID kiosk uchun "kuzatuvchi": bir kadrda bir nechta yuz, tez harakat va yon burilishda
// ham barqaror tanish. Kadrlar orasida har bir yuzni kuzatamiz, ovozlarni yig'amiz,
// ikkita ishonchli kadr (yoki bitta juda aniq kadr) bo'lsa — tasdiqlaymiz.

import { distance, matchIndex, type Box, type FaceIndex, type FaceResult, type Person } from "./face";

export interface Track {
  id: number;
  box: Box;
  desc: Float32Array;
  first: number; // birinchi ko'rilgan vaqt (ms)
  last: number; // oxirgi ko'rilgan vaqt
  frames: number;
  matched: boolean; // hech bo'lmasa bir marta ishonchli mos kelgan
  logins: { login: string; t: number }[]; // shu yuz uchun oxirgi mosliklar
  unknownShown: boolean;
}

let nextTrackId = 1;

function centerDist(a: Box, b: Box): number {
  return Math.hypot(a.x + a.width / 2 - (b.x + b.width / 2), a.y + a.height / 2 - (b.y + b.height / 2));
}

/**
 * Yangi kadrdagi yuzlarni oldingi kuzatuvlarga bog'laydi.
 * Asosiy belgi — yuz izining o'xshashligi (tez harakatda joy keskin o'zgarsa ham ishlaydi),
 * yordamchi belgi — kadrdagi joylashuv (bosh burilib iz o'zgarsa).
 */
export function associate(prev: Track[], faces: FaceResult[], now: number, ttlMs = 1000): { tracks: Track[]; pairs: [FaceResult, Track][]; expired: Track[] } {
  const alive = prev.filter((t) => now - t.last <= ttlMs);
  const expired = prev.filter((t) => now - t.last > ttlMs);
  const cands: { fi: number; ti: number; cost: number }[] = [];
  faces.forEach((f, fi) =>
    alive.forEach((t, ti) => {
      const dd = distance(f.descriptor, t.desc);
      const cd = centerDist(f.box, t.box) / Math.max(f.box.width, t.box.width, 1);
      if (dd < 0.55 || (cd < 2.5 && dd < 0.75)) cands.push({ fi, ti, cost: dd + 0.15 * cd });
    })
  );
  cands.sort((a, b) => a.cost - b.cost);
  const usedF = new Set<number>();
  const usedT = new Set<number>();
  const pairs: [FaceResult, Track][] = [];
  for (const c of cands) {
    if (usedF.has(c.fi) || usedT.has(c.ti)) continue;
    usedF.add(c.fi);
    usedT.add(c.ti);
    const t = alive[c.ti]!;
    const f = faces[c.fi]!;
    t.box = f.box;
    t.desc = f.descriptor;
    t.last = now;
    t.frames++;
    pairs.push([f, t]);
  }
  faces.forEach((f, fi) => {
    if (usedF.has(fi)) return;
    const t: Track = {
      id: nextTrackId++,
      box: f.box,
      desc: f.descriptor,
      first: now,
      last: now,
      frames: 1,
      matched: false,
      logins: [],
      unknownShown: false,
    };
    alive.push(t);
    pairs.push([f, t]);
  });
  return { tracks: alive, pairs, expired };
}

export interface FrameMatch<P extends Person> {
  face: FaceResult;
  p: P | null; // ishonchli mos kelgan odam (yoki null)
  d: number; // eng yaqin masofa
  strong: boolean; // juda aniq — bitta kadr yetarli
}

/**
 * Kadrdagi har bir yuzni bazadan qidiradi.
 * Bir kadrda bitta odam ikki joyda bo'la olmaydi — eng yaqini qoladi.
 * Profil (|yaw| > 0.5) yoki chegaraga yaqin moslik "kuchli" hisoblanmaydi — 2 kadr kerak.
 */
export function matchFrame<P extends Person>(faces: FaceResult[], idx: FaceIndex<P>, threshold: number, margin: number): FrameMatch<P>[] {
  const res: FrameMatch<P>[] = faces.map((f) => {
    const { best, second } = matchIndex(f.descriptor, idx);
    const ok = !!best && best.d < threshold && second - best.d > margin;
    return {
      face: f,
      p: ok ? best!.p : null,
      d: best?.d ?? Infinity,
      strong: ok && best!.d < threshold * 0.8 && Math.abs(f.yaw) < 0.5,
    };
  });
  const byLogin = new Map<string, number>();
  res.forEach((r, i) => {
    if (!r.p) return;
    const login = r.p.login;
    const j = byLogin.get(login);
    if (j === undefined) {
      byLogin.set(login, i);
      return;
    }
    const other = res[j]!;
    if (other.d <= r.d) {
      r.p = null;
      r.strong = false;
    } else {
      other.p = null;
      other.strong = false;
      byLogin.set(login, i);
    }
  });
  return res;
}

/** Oxirgi ~1,5 soniyadagi ovozlar (har bir o'quvchi uchun) */
export class VoteBook {
  private m = new Map<string, { t: number; w: number }[]>();

  constructor(private windowMs = 1500) {}

  add(login: string, w: number, now: number): number {
    const arr = (this.m.get(login) ?? []).filter((v) => now - v.t < this.windowMs);
    arr.push({ t: now, w });
    this.m.set(login, arr);
    return arr.reduce((s, v) => s + v.w, 0);
  }

  clear(login: string): void {
    this.m.delete(login);
  }

  prune(now: number): void {
    for (const [k, arr] of this.m) {
      const a = arr.filter((v) => now - v.t < this.windowMs);
      if (a.length) this.m.set(k, a);
      else this.m.delete(k);
    }
  }
}

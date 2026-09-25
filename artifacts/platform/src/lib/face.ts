// Face ID — brauzerda yuzni aniqlash va tanish (@vladmandic/face-api, CDN orqali).
// Kutubxona va modellar faqat Face ID sahifalari ochilganda yuklanadi (~12 MB, keyin kesh).
// Rasm serverga YUBORILMAYDI — faqat 128 sonli yuz izi (descriptor).
//
// Ikki xil yuz topuvchi:
//  • "ssd"  — SSD MobileNet: bir kadrda bir nechta yuz, yon tomondan (profil) va uzoqdan ham topadi
//  • "tiny" — Tiny detector: juda tez, sekin telefonlar uchun zaxira

/* eslint-disable @typescript-eslint/no-explicit-any */

const VERSION = "1.7.15";
const LIB_URL = `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@${VERSION}/dist/face-api.js`;
const MODEL_URL = `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@${VERSION}/model/`;

export const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

export function authHeaders(): HeadersInit {
  const t = localStorage.getItem("talim_auth_token");
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...authHeaders(), ...(init.headers ?? {}) } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error((data as { error?: string }).error ?? `Xatolik (${r.status})`) as Error & { status?: number; data?: unknown };
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

declare global {
  interface Window {
    faceapi?: any;
  }
}

let loading: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Face ID kutubxonasini yuklab bo'lmadi (internetni tekshiring)"));
    document.head.appendChild(s);
  });
}

/** face-api va modellarni yuklaydi (bir marta, parallel) */
export function loadFaceApi(onProgress?: (msg: string) => void): Promise<any> {
  if (loading) return loading;
  loading = (async () => {
    onProgress?.("Kutubxona yuklanmoqda…");
    if (!window.faceapi) await loadScript(LIB_URL);
    const faceapi = window.faceapi;
    if (!faceapi) throw new Error("Face ID kutubxonasi ishga tushmadi");
    try {
      await faceapi.tf.setBackend("webgl");
      await faceapi.tf.ready();
    } catch {
      /* WebGL bo'lmasa — standart backend */
    }
    onProgress?.("Modellar yuklanmoqda (~12 MB, bir marta)…");
    let done = 0;
    const step = (name: string) => () => {
      done++;
      onProgress?.(`Modellar: ${done}/4 · ${name}`);
    };
    await Promise.all([
      faceapi.nets.tinyFaceDetector.load(MODEL_URL).then(step("tez aniqlash")),
      faceapi.nets.faceLandmark68Net.load(MODEL_URL).then(step("yuz nuqtalari")),
      faceapi.nets.faceRecognitionNet.load(MODEL_URL).then(step("yuzni tanish")),
      // SSD bo'lmasa ham ishlaymiz (Tiny bilan) — xatoni yutamiz
      faceapi.nets.ssdMobilenetv1.load(MODEL_URL).then(step("ko'p yuz / profil"), () => step("ko'p yuz — o'tkazib yuborildi")()),
    ]);
    onProgress?.("Tayyor");
    return faceapi;
  })().catch((e) => {
    loading = null;
    throw e;
  });
  return loading;
}

export type Detector = "ssd" | "tiny";

export function hasSsd(faceapi: any): boolean {
  return !!faceapi?.nets?.ssdMobilenetv1?.isLoaded;
}

/**
 * "Isitish": birinchi aniqlash WebGL shaderlarini kompilyatsiya qiladi (1–4 soniya).
 * Buni kiosk ochilganda bo'sh kadrlarda oldindan qilamiz — birinchi o'quvchi kutmaydi.
 */
export async function warmup(faceapi: any): Promise<void> {
  try {
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = 240;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#777";
      ctx.fillRect(0, 0, 320, 240);
    }
    await faceapi.detectAllFaces(c, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }));
    if (hasSsd(faceapi)) await faceapi.detectAllFaces(c, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }));
    const f = document.createElement("canvas");
    f.width = 150;
    f.height = 150;
    await faceapi.nets.faceLandmark68Net.detectLandmarks(f);
    await faceapi.nets.faceRecognitionNet.computeFaceDescriptor(f);
  } catch {
    /* isitish shart emas — xato bo'lsa ham davom etamiz */
  }
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceResult {
  descriptor: Float32Array;
  score: number;
  box: Box;
  /** Boshning burilishi: 0 — to'g'ri, ±0.3 ≈ 30°, ±0.6 va undan ko'p — profil */
  yaw: number;
  /** Bosh egilishi: taxminan 0.45 — to'g'ri, kichik — yuqoriga, katta — pastga */
  pitch: number;
}

type Pt = { x: number; y: number };

/** 68 nuqtadan boshning burilishi (yaw) va egilishini (pitch) taxminlash */
export function headPose(points: Pt[]): { yaw: number; pitch: number } {
  const nose = points[30];
  const jl = points[0];
  const jr = points[16];
  const el = points[36];
  const er = points[45];
  const chin = points[8];
  if (!nose || !jl || !jr || !el || !er || !chin) return { yaw: 0, pitch: 0.45 };
  const dl = Math.hypot(nose.x - jl.x, nose.y - jl.y);
  const dr = Math.hypot(nose.x - jr.x, nose.y - jr.y);
  const yaw = dl + dr > 0 ? (dl - dr) / (dl + dr) : 0;
  const eyeY = (el.y + er.y) / 2;
  const span = chin.y - eyeY;
  const pitch = span > 0 ? (nose.y - eyeY) / span : 0.45;
  return { yaw, pitch };
}

/**
 * Kadrdagi BARCHA yuzlar (kattasidan kichigiga): joylashuv, 128 sonli iz, bosh holati.
 * SSD — profil va bir nechta odam uchun; Tiny — tez zaxira.
 */
export async function detectFaces(
  faceapi: any,
  input: HTMLVideoElement | HTMLCanvasElement,
  detector: Detector = "ssd",
  opts: { inputSize?: number; minScore?: number; maxFaces?: number } = {}
): Promise<FaceResult[]> {
  const maxFaces = opts.maxFaces ?? 6;
  const useSsd = detector === "ssd" && hasSsd(faceapi);
  const o = useSsd
    ? new faceapi.SsdMobilenetv1Options({ minConfidence: opts.minScore ?? 0.45, maxResults: maxFaces })
    : new faceapi.TinyFaceDetectorOptions({ inputSize: opts.inputSize ?? 416, scoreThreshold: opts.minScore ?? 0.45 });
  const rs: any[] = await faceapi.detectAllFaces(input, o).withFaceLandmarks().withFaceDescriptors();
  return rs
    .map((r) => {
      const b = r.detection.box;
      const pose = headPose(r.landmarks?.positions ?? []);
      return {
        descriptor: r.descriptor as Float32Array,
        score: r.detection.score as number,
        box: { x: b.x, y: b.y, width: b.width, height: b.height },
        yaw: pose.yaw,
        pitch: pose.pitch,
      };
    })
    .sort((a, b) => b.box.width - a.box.width)
    .slice(0, maxFaces);
}

/** Kadrdagi eng katta (bitta) yuz — ro'yxatga olish uchun */
export async function detectFace(faceapi: any, input: HTMLVideoElement, inputSize = 416, detector: Detector = "tiny"): Promise<FaceResult | null> {
  const all = await detectFaces(faceapi, input, detector, { inputSize, maxFaces: 3, minScore: 0.5 });
  return all[0] ?? null;
}

export function distance(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = (a[i] as number) - (b[i] as number);
    s += d * d;
  }
  return Math.sqrt(s);
}

export interface Person {
  login: string;
  name: string;
  class_name: string;
  d: number[][];
  arrived: string | null; // bugun kelgan vaqti "07:52"
  arrived_ms: number | null; // ms (qancha vaqt o'tganini hisoblash uchun)
  left: string | null; // bugun ketgan vaqti
}

/** Eng yaqin 2 ta odamni topadi (ishonch uchun farqni ham tekshiramiz) — oddiy variant */
export function bestMatches(desc: Float32Array, people: Person[]): { best: { p: Person; d: number } | null; second: number } {
  let best: { p: Person; d: number } | null = null;
  let second = Infinity;
  for (const p of people) {
    let m = Infinity;
    for (const d of p.d) {
      const v = distance(desc, d);
      if (v < m) m = v;
    }
    if (!best || m < best.d) {
      if (best) second = Math.min(second, best.d);
      best = { p, d: m };
    } else if (m < second) {
      second = m;
    }
  }
  return { best, second };
}

// ─── Tez qidiruv: hamma yuz izlari bitta Float32Array da (1000+ o'quvchi uchun ham ~1 ms) ───

export interface FaceIndex<P extends Person = Person> {
  people: P[];
  mat: Float32Array; // namunalar ketma-ket: [n × 128]
  start: Int32Array; // har bir odamning birinchi namunasi
  end: Int32Array; // … oxirgisidan keyingi
}

export function buildIndex<P extends Person>(people: P[]): FaceIndex<P> {
  let n = 0;
  for (const p of people) for (const d of p.d) if (d?.length === 128) n++;
  const mat = new Float32Array(n * 128);
  const start = new Int32Array(people.length);
  const end = new Int32Array(people.length);
  let k = 0;
  people.forEach((p, i) => {
    start[i] = k;
    for (const d of p.d) {
      if (d?.length !== 128) continue;
      mat.set(d, k * 128);
      k++;
    }
    end[i] = k;
  });
  return { people, mat, start, end };
}

/** Eng yaqin odam va ikkinchi eng yaqin (boshqa) odamgacha masofa */
export function matchIndex<P extends Person>(desc: ArrayLike<number>, idx: FaceIndex<P>): { best: { p: P; d: number } | null; second: number } {
  const { mat, start, end, people } = idx;
  let bi = -1;
  let bd = Infinity; // kvadrat masofa
  let sd = Infinity;
  for (let i = 0; i < people.length; i++) {
    let m = Infinity;
    for (let k = start[i]!; k < end[i]!; k++) {
      const off = k * 128;
      const bound = m < sd ? m : sd; // bundan uzoq bo'lsa — natijaga ta'sir qilmaydi
      let s = 0;
      for (let j = 0; j < 128; j++) {
        const x = (desc[j] as number) - mat[off + j]!;
        s += x * x;
        if (s >= bound) break; // bu namuna yaqinroq emas — to'xtaymiz
      }
      if (s < m && s < bound) m = s;
    }
    if (m < bd) {
      sd = bd;
      bd = m;
      bi = i;
    } else if (m < sd) {
      sd = m;
    }
  }
  return bi < 0 ? { best: null, second: Infinity } : { best: { p: people[bi]!, d: Math.sqrt(bd) }, second: Math.sqrt(sd) };
}

// ─── Kamera ─────────────────────────────────────────────────────────────────

/**
 * hi = true (kiosk): 1280×720 va 60 kadr/s gacha — uzoqdagi yuzlar aniqroq,
 * tez harakatda surat kamroq "xiralashadi" (qisqa ekspozitsiya).
 */
export async function startCamera(video: HTMLVideoElement, facing: "user" | "environment", hi = false): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Bu brauzer kamerani qo'llab-quvvatlamaydi. Chrome yoki Safari'da oching (https).");
  }
  const want: MediaTrackConstraints = hi
    ? { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } }
    : { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } };
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: want });
  } catch (e) {
    if ((e as Error).name === "NotAllowedError") throw e;
    // Ba'zi eski qurilmalar talabni qabul qilmaydi — oddiy rejim
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: facing } });
  }
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
  return stream;
}

export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}

// ─── Ovoz (fayl kerak emas) ─────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;
let lastBeep = 0;
export function beep(kind: "ok" | "late" | "error" | "again"): void {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    audioCtx ??= new AC();
    const ctx = audioCtx;
    // Bir vaqtda bir nechta o'quvchi tanilsa — ovozlar ustma-ust tushmasin
    const offset = Math.max(0, lastBeep - ctx.currentTime);
    const tones: Record<typeof kind, number[]> = {
      ok: [880, 1320],
      late: [660, 520],
      error: [220],
      again: [990],
    };
    tones[kind].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = ctx.currentTime + offset + i * 0.13;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.13);
    });
    lastBeep = ctx.currentTime + offset + tones[kind].length * 0.13;
  } catch {
    /* ovozsiz davom etamiz */
  }
}

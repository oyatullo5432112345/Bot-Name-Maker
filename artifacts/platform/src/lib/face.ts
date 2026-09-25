// Face ID — brauzerda yuzni aniqlash va tanish (@vladmandic/face-api, CDN orqali).
// Kutubxona va modellar faqat Face ID sahifalari ochilganda yuklanadi (~7 MB, keyin kesh).
// Rasm serverga YUBORILMAYDI — faqat 128 sonli yuz izi (descriptor).

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

/** face-api va 3 ta modelni yuklaydi (bir marta) */
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
    onProgress?.("Yuzni aniqlash modeli…");
    await faceapi.nets.tinyFaceDetector.load(MODEL_URL);
    onProgress?.("Yuz nuqtalari modeli…");
    await faceapi.nets.faceLandmark68Net.load(MODEL_URL);
    onProgress?.("Yuzni tanish modeli (~6 MB)…");
    await faceapi.nets.faceRecognitionNet.load(MODEL_URL);
    onProgress?.("Tayyor");
    return faceapi;
  })().catch((e) => {
    loading = null;
    throw e;
  });
  return loading;
}

export interface FaceResult {
  descriptor: Float32Array;
  score: number;
  box: { x: number; y: number; width: number; height: number };
}

/** Kadrdagi eng aniq (bitta) yuz: joylashuvi + 128 sonli izi */
export async function detectFace(faceapi: any, input: HTMLVideoElement, inputSize = 320): Promise<FaceResult | null> {
  const opts = new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold: 0.5 });
  const r = await faceapi.detectSingleFace(input, opts).withFaceLandmarks().withFaceDescriptor();
  if (!r) return null;
  return { descriptor: r.descriptor, score: r.detection.score, box: r.detection.box };
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
  arrived: string | null;
}

/** Eng yaqin 2 ta odamni topadi (ishonch uchun farqni ham tekshiramiz) */
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

// ─── Kamera ─────────────────────────────────────────────────────────────────

export async function startCamera(video: HTMLVideoElement, facing: "user" | "environment"): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Bu brauzer kamerani qo'llab-quvvatlamaydi. Chrome yoki Safari'da oching (https).");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } },
  });
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
export function beep(kind: "ok" | "late" | "error" | "again"): void {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    audioCtx ??= new AC();
    const ctx = audioCtx;
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
      const t = ctx.currentTime + i * 0.13;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.13);
    });
  } catch {
    /* ovozsiz davom etamiz */
  }
}

// Telegram Mini App integratsiyasi.
// Platforma Telegram ichida ochilganda (bot menyusidagi "Platforma" tugmasi)
// foydalanuvchi login/parolsiz avtomatik kiradi.

type TgWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
  colorScheme?: "light" | "dark";
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  disableVerticalSwipes?: () => void;
  HapticFeedback?: { notificationOccurred: (t: "success" | "error" | "warning") => void };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

const SDK_URL = "https://telegram.org/js/telegram-web-app.js?57";
const FLAG_KEY = "talim_in_telegram";
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

/** Sahifa Telegram Mini App sifatida ochilganmi? (SDK yuklanmasdan oldin ham ishlaydi) */
export function isInTelegram(): boolean {
  try {
    if (window.location.hash.includes("tgWebAppData")) {
      sessionStorage.setItem(FLAG_KEY, "1");
      return true;
    }
    return sessionStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return window.location.hash.includes("tgWebAppData");
  }
}

let sdkPromise: Promise<TgWebApp | null> | null = null;

/** Telegram SDK ni faqat Telegram ichida yuklaymiz (oddiy brauzerda ortiqcha so'rov bo'lmasin). */
export function getTelegramWebApp(): Promise<TgWebApp | null> {
  if (!isInTelegram()) return Promise.resolve(null);
  if (window.Telegram?.WebApp) return Promise.resolve(window.Telegram.WebApp);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    const timer = setTimeout(() => resolve(window.Telegram?.WebApp ?? null), 6000);
    script.onload = () => {
      clearTimeout(timer);
      const wa = window.Telegram?.WebApp ?? null;
      if (wa) {
        try {
          wa.ready();
          wa.expand();
          wa.disableVerticalSwipes?.();
          wa.setHeaderColor?.("#0f1729");
          wa.setBackgroundColor?.("#0f1729");
        } catch { /* eski Telegram versiyalari */ }
      }
      resolve(wa);
    };
    script.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

/**
 * initData orqali avtomatik kirish.
 * Qaytaradi: login natijasi (token bilan) yoki null (akkaunt bog'lanmagan / xato).
 */
export async function telegramAutoLogin<T extends { token?: string | null }>(): Promise<T | null> {
  const wa = await getTelegramWebApp();
  if (!wa?.initData) return null;
  try {
    const r = await fetch(`${API_BASE}/auth/telegram-webapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: wa.initData }),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as T;
    if (!data?.token) return null;
    wa.HapticFeedback?.notificationOccurred("success");
    return data;
  } catch {
    return null;
  }
}

/** Mini App ichida login/parol bilan kirilganda — Telegram akkauntini bog'lab qo'yamiz. */
export async function linkTelegramAccount(token: string): Promise<void> {
  const wa = await getTelegramWebApp();
  if (!wa?.initData) return;
  try {
    await fetch(`${API_BASE}/auth/telegram-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ initData: wa.initData }),
    });
  } catch { /* muhim emas */ }
}

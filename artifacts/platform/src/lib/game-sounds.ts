// Ovozli effektlar (Web Audio API orqali) — Zukko o'yinidagi uslub bilan bir xil,
// barcha o'yinlarda (Zukko, Bamboozle, Omadli Charxpalak) ishlatiladi.
//
// MUHIM: bitta umumiy (singleton) AudioContext ishlatiladi. Har safar yangi
// AudioContext yaratish brauzerda tezda "chegaraga" uriladi (bir necha martadan
// keyin ovoz chiqmay qo'yadi) va agar chaqiruv foydalanuvchi bosishidan tashqarida
// (masalan setTimeout ichida, animatsiya tugagach) bo'lsa, kontekst "suspended"
// holatda qolib, ovoz umuman eshitilmaydi. Shuning uchun bitta kontekst yaratib,
// har chaqiruvda uni resume() qilamiz.
let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx) {
    sharedCtx = new AudioCtx();
  }
  if (sharedCtx.state === "suspended") {
    // Promise'ni kutmaymiz — resume() chaqirilgani kifoya, browser navbatga qo'yadi
    void sharedCtx.resume();
  }
  return sharedCtx;
}

// Sahifa birinchi marta bosilganda/teginilganda kontekstni "uyg'otib" qo'yamiz —
// shunda keyinchalik setTimeout ichidan chaqirilgan tovushlar ham eshitiladi.
if (typeof window !== "undefined") {
  const wake = () => { getAudioContext(); };
  window.addEventListener("pointerdown", wake, { once: true });
  window.addEventListener("keydown", wake, { once: true });
}

export const playSound = (type: "correct" | "wrong" | "freeze" | "win" | "click" | "steal" | "lose" | "spin" | "tick") => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "tick" || type === "spin") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } else if (type === "correct") {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } else if (type === "wrong") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.setValueAtTime(110, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === "win") {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    } else if (type === "lose") {
      // Yutqazish — pastga tushuvchi ohang
      osc.type = "triangle";
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.setValueAtTime(300, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.55);
      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    } else if (type === "steal") {
      // O'g'irlash — chaqqon "zip" ohangi
      osc.type = "square";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === "freeze") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    }
  } catch {
    // Brauzer audio qo'llab-quvvatlamasa jim o'tadi
  }
};

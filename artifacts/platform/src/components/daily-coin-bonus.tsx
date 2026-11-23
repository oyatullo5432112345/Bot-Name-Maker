// Kunlik bonus: har bir foydalanuvchi kuniga 1 marta +2 tanga oladi (server tomonda tekshiriladi).
// Rasmlar public/imagine/ papkasida: plus-2-tanga.jpg va sovga-qop.jpg
import { useEffect, useState } from "react";
import { Sparkles, Gift, X } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/face";

const IMG_TEXT = "/imagine/plus-2-tanga.jpg";
const IMG_SACK = "/imagine/sovga-qop.jpg";
const SHOW_SECONDS = 10;

interface DailyLoginResponse { ok: boolean; amount?: number; message?: string }

export function DailyCoinBonus() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(SHOW_SECONDS);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        // Server bugun tanga berilganini tekshiradi; ok:true bo'lsa yangi tanga berilgan
        const res = await api<DailyLoginResponse>("/tanga/daily-login", { method: "POST" });
        if (cancelled || !res?.ok) return;
        window.dispatchEvent(new CustomEvent("talim:coins-updated", { detail: { added: res.amount ?? 2 } }));
        setSecondsLeft(SHOW_SECONDS);
        setVisible(true);
      } catch (e) {
        console.warn("Kunlik bonus olinmadi:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [visible]);

  useEffect(() => {
    if (visible && secondsLeft <= 0) setVisible(false);
  }, [visible, secondsLeft]);

  if (!visible) return null;

  return (
    <div className="relative z-40 mb-4 overflow-hidden rounded-3xl border-2 border-amber-300/60 bg-gradient-to-b from-[#132347] via-[#0c1733] to-[#080f22] p-4 text-center text-white shadow-[0_14px_40px_rgba(245,158,11,0.35)]">
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Yopish"
        className="absolute top-3 right-3 z-20 rounded-full bg-white/10 p-1.5 text-slate-300 hover:bg-white/20 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="mx-auto max-w-[300px] overflow-hidden rounded-xl">
        <img src={IMG_TEXT} alt="+2 tanga qo'shildi" className="mx-auto h-auto w-full object-contain" />
      </div>

      <div className="relative mx-auto mt-1 max-w-[230px] overflow-hidden rounded-2xl border border-amber-300/30 shadow-[0_0_25px_rgba(251,191,36,0.3)]">
        <img src={IMG_SACK} alt="Sovg'a qopi va tangalar" className="mx-auto h-auto w-full object-cover" />
      </div>

      <div className="mt-3.5 space-y-1.5 px-2">
        <p className="flex items-center justify-center gap-1.5 text-base font-extrabold text-amber-300 sm:text-lg">
          <Sparkles className="h-5 w-5 shrink-0 text-amber-400" />
          <span>Har kuni kiring, sovg'a yuting!</span>
        </p>
        <p className="inline-flex items-center justify-center gap-1.5 rounded-full border border-sky-300/30 bg-sky-500/15 px-3.5 py-1 text-xs font-bold text-sky-100 sm:text-sm">
          <Gift className="h-4 w-4 shrink-0 text-rose-400" />
          <span>31-dekabr kuni sovg'angizni oching!</span>
        </p>
      </div>

      <div className="mt-3.5">
        <div className="mb-1 text-[11px] font-medium text-slate-400">
          {Math.max(secondsLeft, 0)} soniyadan so'ng avtomatik yopiladi
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 transition-all duration-1000 linear"
            style={{ width: `${(Math.max(secondsLeft, 0) / SHOW_SECONDS) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

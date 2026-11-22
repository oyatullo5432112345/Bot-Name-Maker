import { useEffect, useState } from "react";

const A = "/imagine/";

// 8-dekabr — Konstitutsiya kuni. Moddalar har 7 soniyada almashinadi (nuqtalar bilan qo'lda ham).
const ARTICLES = [
  {
    num: "41-MODDA.",
    text: "Har kim bilim olish huquqiga ega. Davlat bepul umumiy ta'lim olishni kafolatlaydi. Maktab ishlari davlat nazoratidadir.",
  },
  {
    num: "50-MODDA.",
    text: "Har kim ta'lim olish huquqiga ega. Davlat uzluksiz ta'lim tizimi, uning har xil turlari va shakllari, davlat va nodavlat ta'lim tashkilotlari rivojlanishini ta'minlaydi. Davlat bepul umumiy o'rta ta'lim olishni kafolatlaydi.",
  },
  {
    num: "1-MODDA.",
    text: "O'zbekiston — boshqaruvning respublika shakliga ega bo'lgan suveren, demokratik, huquqiy, ijtimoiy va dunyoviy davlat.",
  },
  {
    num: "19-MODDA.",
    text: "O'zbekiston Respublikasida barcha fuqarolar bir xil huquq va erkinliklarga ega bo'lib, qonun oldida tengdirlar.",
  },
  {
    num: "53-MODDA.",
    text: "Har kimga ilmiy, texnikaviy va badiiy ijod erkinligi, madaniyat yutuqlaridan foydalanish huquqi kafolatlanadi.",
  },
  {
    num: "79-MODDA.",
    text: "Davlat yoshlarning huquqlari himoya qilinishini ta'minlaydi, ularning jamiyat hayotida faol ishtirok etishini rag'batlantiradi.",
  },
];

function targetDate(now = new Date()) {
  const year = now.getMonth() === 11 && now.getDate() > 8 ? now.getFullYear() + 1 : now.getFullYear();
  return new Date(year, 11, 8, 0, 0, 0);
}

function useCountdown() {
  const calc = () => {
    const diff = Math.max(0, targetDate().getTime() - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      ended: diff <= 0,
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export function CountdownBanner() {
  const { days, hours, minutes, seconds, ended } = useCountdown();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((p) => (p + 1) % ARTICLES.length), 60000);
    return () => clearInterval(id);
  }, []);

  const article = ARTICLES[idx]!;

  return (
    <div
      className="relative overflow-hidden rounded-[22px] border border-sky-200/35 p-4 text-white shadow-2xl"
      style={{
        background: "linear-gradient(135deg, #0b1b36 0%, #102a52 50%, #09152b 100%)",
        boxShadow: "0 12px 32px -8px rgba(14,165,233,0.35), inset 0 0 24px rgba(255,255,255,0.14)",
      }}
    >
      {/* O'zbekiston bayrog'i va gerbi — fonda, xira */}
      <img
        src={A + "uz-bayroq-gerb.png"}
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 w-[120%] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-20"
      />

      <div className="relative z-10 flex flex-col gap-3.5 sm:flex-row sm:items-stretch sm:justify-between">
        {/* Chap: Konstitutsiya kitobi + orqama-sanoq */}
        <div className="flex flex-col justify-between gap-3 sm:w-[46%]">
          <div className="flex items-center gap-2.5">
            <img src={A + "konstitutsiya-kitob.png"} alt="Konstitutsiya" className="h-16 w-auto shrink-0 rounded-md shadow-lg" />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-sky-200">O‘zbekiston Respublikasi</div>
              <div className="text-sm font-extrabold text-amber-200">Konstitutsiyasi kuni</div>
            </div>
          </div>

          {ended ? (
            <div className="rounded-xl border border-amber-300/40 bg-white/10 py-3 text-center text-sm font-bold text-amber-200">
              🇺🇿 8-dekabr — Konstitutsiya kuni muborak!
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5 text-center">
              {[
                { v: days, l: "Kun" },
                { v: hours, l: "Soat" },
                { v: minutes, l: "Daqiqa" },
                { v: seconds, l: "Soniya" },
              ].map(({ v, l }) => (
                <div key={l} className="rounded-xl border border-white/25 bg-slate-950/45 py-2 backdrop-blur-md">
                  <div className="text-lg font-black leading-none tabular-nums text-sky-300 sm:text-xl">
                    {String(v).padStart(2, "0")}
                  </div>
                  <div className="mt-1 text-[10px] font-medium text-slate-200">{l}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* O'ng: 8-dekabr va almashib turuvchi modda */}
        <div className="flex flex-col justify-between sm:w-[52%]">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-base font-extrabold tracking-tight text-amber-200 sm:text-lg">8-dekabr</span>
            <div className="flex items-center gap-1">
              {ARTICLES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`${i + 1}-modda`}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-amber-300" : "w-1.5 bg-white/35 hover:bg-white/60"}`}
                />
              ))}
            </div>
          </div>
          <div
            onClick={() => setIdx((p) => (p + 1) % ARTICLES.length)}
            className="cursor-pointer rounded-2xl border border-white/25 bg-white/10 p-3 backdrop-blur-md transition hover:bg-white/15"
          >
            <div className="text-center text-sm font-black tracking-wide text-amber-200">{article.num}</div>
            <p className="mt-1 text-center text-xs leading-relaxed text-slate-100">{article.text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

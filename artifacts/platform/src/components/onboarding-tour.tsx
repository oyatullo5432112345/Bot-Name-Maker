// Interaktiv yo'riqnoma (onboarding) — ilovadan qanday foydalanishni "keyingisi,
// keyingisi" bosib ko'rsatadi va foydalanuvchini kerakli oynagacha (sinf rahbarini
// Face ID ro'yxatga olish, o'quvchini Sayohat o'yini) olib boradi.
// Rolga qarab qadamlari o'zgaradi. Rasm/fayl yuklanmaydi — hammasi kod bilan.

import { useState, useEffect, type ElementType } from "react";
import { useLocation } from "wouter";
import {
  Sparkles, LayoutDashboard, CalendarCheck, ScanFace, ClipboardList, Wallet,
  Compass, Users, Gamepad2, CalendarDays, ArrowRight, ArrowLeft, X, Check,
} from "lucide-react";

interface Step {
  icon: ElementType;
  title: string;
  text: string;
  color: string;   // asosiy rang
  accent: string;  // ikkinchi rang (gradient)
  cta?: { label: string; href: string };
}

const MGMT = ["admin", "director", "zam_direktor", "zavuch"];

function getSteps(role: string): Step[] {
  if (role === "sinf_rahbari") {
    return [
      { icon: Sparkles, title: "Xush kelibsiz!", text: "Bu — maktabning raqamli platformasi. Keling, 1 daqiqada asosiy joylar bilan tanishtiraman.", color: "#7C3AED", accent: "#A78BFA" },
      { icon: LayoutDashboard, title: "Bosh sahifa", text: "Rahbarlik sinfingiz, dars jadvalingiz va o'quvchilaringiz ro'yxati shu yerda ko'rinadi.", color: "#2563EB", accent: "#60A5FA" },
      { icon: CalendarCheck, title: "Davomat va baholash", text: "Kundalik davomat va baholarni menyudagi «Davomat» va «Baholash» bo'limlaridan kiritasiz.", color: "#059669", accent: "#34D399" },
      { icon: ScanFace, title: "Face ID — eng muhimi", text: "O'z sinfingiz o'quvchilarining yuzini bir marta (7 burchakdan) ro'yxatdan o'tkazasiz. Rasm saqlanmaydi — faqat raqamli iz. Keyin kelib-ketish avtomatik belgilanadi.", color: "#0891B2", accent: "#22D3EE" },
      { icon: ScanFace, title: "Keling, hoziroq boshlaymiz", text: "Quyidagi tugmani bosing — sizni to'g'ridan-to'g'ri o'z sinfingizni ro'yxatga olish oynasiga olib boraman.", color: "#0891B2", accent: "#22D3EE", cta: { label: "Face ID'ga o'tish", href: "/faceid/enroll" } },
    ];
  }
  if (role === "student") {
    return [
      { icon: Sparkles, title: "Xush kelibsiz!", text: "Platformaga xush kelibsiz! Bu yerda nima borligini qisqa ko'rsataman.", color: "#DB2777", accent: "#F472B6" },
      { icon: ClipboardList, title: "Baholar va jadval", text: "Baholaringiz, dars jadvalingiz va sinf ma'lumotlaringiz bosh sahifada.", color: "#2563EB", accent: "#60A5FA" },
      { icon: Wallet, title: "Tanga tizimi", text: "Yaxshi baho va faollik uchun tanga yig'asiz, unvonlar va mukofotlar ochasiz.", color: "#D97706", accent: "#FBBF24" },
      { icon: Compass, title: "Bek va Lola: Sayohat", text: "O'zbekiston bo'ylab sayohat qiling, bosh qotirmalarni yeching, esdalik va tanga yutib oling!", color: "#7C3AED", accent: "#C084FC", cta: { label: "O'yinni boshlash", href: "/sayohat" } },
    ];
  }
  if (role === "teacher") {
    return [
      { icon: Sparkles, title: "Xush kelibsiz!", text: "Platforma bilan qisqa tanishtiraman — bir necha qadam, xolos.", color: "#7C3AED", accent: "#A78BFA" },
      { icon: CalendarDays, title: "Dars jadvalingiz", text: "Jadval, baholash va darslik bo'limlari menyuda. Bosh sahifada kunlik darslaringiz ko'rinadi.", color: "#2563EB", accent: "#60A5FA" },
      { icon: Gamepad2, title: "Interaktiv o'yinlar", text: "Darsda ishlatish uchun o'yinlar bo'limi — savol-javob, charxpalak va boshqalar.", color: "#DB2777", accent: "#F472B6", cta: { label: "O'yinlarni ko'rish", href: "/games" } },
    ];
  }
  if (MGMT.includes(role)) {
    return [
      { icon: Sparkles, title: "Xush kelibsiz!", text: "Rahbariyat paneliga xush kelibsiz. Asosiy bo'limlarni ko'rsataman.", color: "#7C3AED", accent: "#A78BFA" },
      { icon: Users, title: "Boshqaruv", text: "O'quvchilar, sinflar va xodimlarni menyudagi tegishli bo'limlardan boshqarasiz.", color: "#2563EB", accent: "#60A5FA" },
      { icon: ScanFace, title: "Face ID davomat", text: "Kirish eshigidagi kiosk, sinflarni ro'yxatga olish va davomat hisobotlari shu bo'limda.", color: "#0891B2", accent: "#22D3EE", cta: { label: "Face ID bo'limi", href: "/faceid" } },
      { icon: Gamepad2, title: "O'yinlar", text: "O'quvchilar uchun «Bek va Lola: Sayohat» va boshqa interaktiv o'yinlar.", color: "#DB2777", accent: "#C084FC", cta: { label: "O'yinlarni ko'rish", href: "/games" } },
    ];
  }
  // boshqa rollar uchun qisqa
  return [
    { icon: Sparkles, title: "Xush kelibsiz!", text: "Platformaga xush kelibsiz! Menyudan kerakli bo'limni oching.", color: "#7C3AED", accent: "#A78BFA" },
  ];
}

export function OnboardingTour({ open, role, onClose }: { open: boolean; role: string; onClose: () => void }) {
  const [, navigate] = useLocation();
  const [idx, setIdx] = useState(0);
  const steps = getSteps(role);

  useEffect(() => { if (open) setIdx(0); }, [open]);

  if (!open || steps.length === 0) return null;

  const step = steps[Math.min(idx, steps.length - 1)]!;
  const Icon = step.icon;
  const isLast = idx >= steps.length - 1;

  const goCta = () => {
    if (!step.cta) return;
    onClose();
    navigate(step.cta.href);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <style>{`@keyframes obPop{0%{transform:scale(.9);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes obFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`}</style>

      <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl overflow-hidden" style={{ animation: "obPop .3s ease-out" }}>
        {/* Tepa: progress + yopish */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === idx ? 22 : 7, background: i <= idx ? step.color : "hsl(var(--muted-foreground)/0.3)" }} />
            ))}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground cursor-pointer" title="Yopish">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sahna */}
        <div className="px-6 pt-6 pb-2 text-center">
          <div className="mx-auto w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${step.color}, ${step.accent})`, animation: "obFloat 3s ease-in-out infinite" }}>
            <Icon className="w-10 h-10 text-white" strokeWidth={2} />
          </div>
          <h2 className="mt-4 text-xl font-extrabold tracking-tight">{step.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.text}</p>
        </div>

        {/* Tugmalar */}
        <div className="p-5 flex items-center gap-2">
          {idx > 0 ? (
            <button onClick={() => setIdx((i) => Math.max(0, i - 1))} className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-secondary text-sm font-bold cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> Orqaga
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-2.5 rounded-2xl text-sm font-bold text-muted-foreground cursor-pointer">
              O'tkazib yuborish
            </button>
          )}

          <div className="flex-1" />

          {step.cta ? (
            <button onClick={goCta} className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-white font-black text-sm cursor-pointer shadow-lg active:scale-95 transition-all" style={{ background: `linear-gradient(90deg, ${step.color}, ${step.accent})` }}>
              {step.cta.label} <ArrowRight className="w-4 h-4" />
            </button>
          ) : isLast ? (
            <button onClick={onClose} className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-black text-sm cursor-pointer shadow-lg active:scale-95 transition-all">
              <Check className="w-4 h-4" /> Tayyor
            </button>
          ) : (
            <button onClick={() => setIdx((i) => Math.min(steps.length - 1, i + 1))} className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-white font-black text-sm cursor-pointer shadow-lg active:scale-95 transition-all" style={{ background: `linear-gradient(90deg, ${step.color}, ${step.accent})` }}>
              Keyingisi <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* CTA bo'lsa ham "keyingisi" bilan davom etish imkoni */}
        {step.cta && !isLast && (
          <button onClick={() => setIdx((i) => Math.min(steps.length - 1, i + 1))} className="w-full pb-4 -mt-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer">
            Keyingisi →
          </button>
        )}
      </div>
    </div>
  );
}

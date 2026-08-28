import { Check, Crown, X, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

const FREE_FEATURES = ["Zukko — 1 va 2-bosqichlar", "Monitoring testlarida qatnashish", "Baholar va davomatni ko'rish", "Kutubxonadan foydalanish"];
const PRO_FEATURES = ["Zukko — barcha bosqichlar", "Tez orada: ko'proq Pro imkoniyatlar qo'shiladi", "Maxsus Pro belgisi profilda"];

export default function ProPage() {
  const { user } = useAuth();
  const proActive = !!user?.pro_expires_at && new Date(user.pro_expires_at).getTime() > Date.now();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-amber-400 text-xs font-semibold mb-4">
          <Crown className="w-3.5 h-3.5" /> Pro versiya
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Ko'proq imkoniyatlar uchun Pro'ga o'ting</h1>
        <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
          {proActive ? "Sizda hozir Pro versiya faol." : "Barcha bosqichlar va kelajakdagi maxsus imkoniyatlarni oching"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/60 p-6">
          <p className="font-semibold text-lg">Oddiy</p>
          <p className="text-2xl font-bold mt-1">Bepul</p>
          <div className="space-y-2.5 mt-5">
            {FREE_FEATURES.map(f => (
              <div key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" /> {f}
              </div>
            ))}
            <div className="flex items-start gap-2 text-sm text-muted-foreground/50">
              <X className="w-4 h-4 shrink-0 mt-0.5" /> Zukko — 3+ bosqichlar
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-amber-500/30 bg-gradient-to-b from-amber-500/[0.06] to-transparent p-6 relative overflow-hidden">
          <Sparkles className="absolute -top-2 -right-2 w-16 h-16 text-amber-500/10" />
          <p className="font-semibold text-lg flex items-center gap-1.5">Pro <Crown className="w-4 h-4 text-amber-400" /></p>
          <div className="mt-1 space-y-0.5">
            <p className="text-2xl font-bold">5 000 so'm <span className="text-sm font-normal text-muted-foreground">/ yil</span></p>
            <p className="text-sm text-muted-foreground">yoki 2 000 so'm / chorak</p>
          </div>
          <div className="space-y-2.5 mt-5">
            {PRO_FEATURES.map(f => (
              <div key={f} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" /> {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {!proActive && (
        <div className="rounded-xl border border-dashed border-border/60 px-5 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            Pro versiyani faollashtirish uchun maktab administratsiyasiga murojaat qiling.
          </p>
        </div>
      )}
    </div>
  );
}

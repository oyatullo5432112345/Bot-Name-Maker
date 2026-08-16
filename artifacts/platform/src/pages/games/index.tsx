import { Link } from "wouter";
import { Gamepad2, Sparkles, Users, Grid3x3, PlayCircle, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";

const STAFF_ROLES = ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"];

export default function GamesPage() {
  const { user } = useAuth();
  const isStaff = !!user && STAFF_ROLES.includes(user.role);

  if (isStaff) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🎮 Guruh o'yinlari</h1>
          <p className="text-muted-foreground text-sm mt-1">Sinf bilan birga o'ynaladigan jonli o'yinlar</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/games/board">
            <Card className="group hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer h-full overflow-hidden">
              <CardContent className="p-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-3 text-2xl">
                  🏆
                </div>
                <h3 className="font-bold text-lg">Bilim Arenasi</h3>
                <p className="text-sm text-muted-foreground mt-1">Jamoalar bo'lib savol-javob o'ynaydi — bonus, jarima va o'g'irlash katakchalari bilan</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> 2-3 jamoa</span>
                  <span className="flex items-center gap-1"><Grid3x3 className="w-3.5 h-3.5" /> 8-30 katak</span>
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary">
                  Ochish <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/games/wheel">
            <Card className="group hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer h-full overflow-hidden">
              <CardContent className="p-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mb-3 text-2xl">
                  🎡
                </div>
                <h3 className="font-bold text-lg">G'ildirak</h3>
                <p className="text-sm text-muted-foreground mt-1">Aylanadigan g'ildirak — yashirin savollar bilan, javob to'g'ri bo'lsa ball beriladi</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><PlayCircle className="w-3.5 h-3.5" /> Tasodifiy tanlash</span>
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary">
                  Ochish <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="rounded-xl border border-dashed p-5 text-center text-muted-foreground text-sm">
          <Sparkles className="w-6 h-6 mx-auto mb-2" />
          Yana yangi o'yinlar tez orada qo'shiladi
        </div>
      </div>
    );
  }

  // O'quvchilar uchun — eski individual o'yinlar olib tashlandi, yangilari tayyorlanmoqda
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 max-w-md mx-auto">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
          <Gamepad2 className="w-10 h-10 text-primary" />
        </div>
        <div className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>
      <h1 className="text-2xl font-black tracking-tight">Tez kunda</h1>
      <p className="text-muted-foreground mt-2">
        Yangi va qiziqarli o'yinlar ustida ishlanmoqda. Tez orada shu yerda paydo bo'ladi!
      </p>
    </div>
  );
                  }

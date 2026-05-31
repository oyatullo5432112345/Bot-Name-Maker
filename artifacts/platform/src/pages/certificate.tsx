import { useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Download, RefreshCw, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");

const ROLE_LABELS: Record<string, string> = {
  student: "O'quvchi",
  teacher: "O'qituvchi",
  sinf_rahbari: "Sinf rahbari",
  director: "Direktor",
  zam_direktor: "Direktor o'rinbosari",
  zavuch: "Zavuch",
  kutubxonachi: "Kutubxonachi",
  admin: "Administrator",
};

export default function CertificatePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const token = getToken();

  const certUrl = `${API_BASE}/certificate`;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(certUrl, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (!res.ok) throw new Error("Xatolik");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setImgSrc(url);
      setGenerated(true);
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Sertifikat yaratishda xatolik yuz berdi" });
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    const res = await fetch(certUrl, {
      headers: { Authorization: `Bearer ${token ?? ""}` },
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: "Xatolik", description: "Yuklab olishda xatolik" });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sertifikat-${user?.full_name ?? "talim"}.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Yuklab olindi ✅", description: "Sertifikat PNG formatida saqlandi" });
  };

  const handleShare = () => {
    const text = `🎓 Men Toshloq tumani 3-maktab TALIM PLatformasiga a'zoman!\n\nIsm: ${user?.full_name}\nRol: ${ROLE_LABELS[user?.role ?? ""] ?? user?.role}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="w-6 h-6 text-primary" />
          Mening sertifikatim
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Platformada ro'yxatdan o'tganingizni tasdiqlovchi shaxsiy sertifikat
        </p>
      </div>

      {/* User info card */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="py-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
            {(user.full_name ?? "?")[0]}
          </div>
          <div>
            <p className="font-bold text-lg">{user.full_name}</p>
            <p className="text-muted-foreground text-sm">{ROLE_LABELS[user.role] ?? user.role}</p>
            {user.class_name && (
              <p className="text-xs text-primary mt-0.5">{user.class_name} sinf</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Certificate preview area */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {imgSrc ? (
            <div className="relative">
              <img
                src={imgSrc}
                alt="Sertifikat"
                className="w-full rounded-lg shadow-sm"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Award className="w-12 h-12 text-primary opacity-60" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg text-foreground">Sertifikatni yaratish</p>
                <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                  Shaxsiy sertifikatni yaratib, uni yuklab oling yoki Telegram da ulashing
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {!generated ? (
          <Button
            size="lg"
            className="flex-1 sm:flex-none"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Award className="w-4 h-4 mr-2" />
            )}
            {loading ? "Tayyorlanmoqda..." : "Sertifikat yaratish"}
          </Button>
        ) : (
          <>
            <Button size="lg" onClick={handleDownload} className="flex-1 sm:flex-none">
              <Download className="w-4 h-4 mr-2" />
              PNG yuklab olish
            </Button>
            <Button size="lg" variant="outline" onClick={handleShare} className="flex-1 sm:flex-none">
              <Share2 className="w-4 h-4 mr-2" />
              Telegram da ulashish
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => { setGenerated(false); setImgSrc(null); handleGenerate(); }}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Yangilash
            </Button>
          </>
        )}
      </div>

      {/* Bot tip */}
      <div className="rounded-lg border bg-muted/40 px-4 py-3 flex items-start gap-3 text-sm text-muted-foreground">
        <span className="text-lg mt-0.5">💡</span>
        <p>
          Telegram botda <strong>/sertifikat</strong> komandasi orqali ham sertifikatni to'g'ridan-to'g'ri rasm sifatida olishingiz mumkin.
        </p>
      </div>
    </div>
  );
}

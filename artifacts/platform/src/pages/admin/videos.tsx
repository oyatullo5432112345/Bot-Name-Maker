import { useState, useEffect } from "react";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Video, GraduationCap, Users2, Briefcase, Save, ExternalLink } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");

function toEmbedUrl(url: string): string {
  if (!url) return "";
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return url;
}

function VideoPreview({ url }: { url: string }) {
  if (!url) return null;
  const embed = toEmbedUrl(url);
  const isYT = url.includes("youtube.com") || url.includes("youtu.be");
  if (isYT) {
    return (
      <div className="aspect-video rounded-lg overflow-hidden bg-black mt-2">
        <iframe src={embed} className="w-full h-full" allow="fullscreen" />
      </div>
    );
  }
  return (
    <video src={url} controls className="w-full rounded-lg mt-2 max-h-48" />
  );
}

export default function AdminVideosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [urls, setUrls] = useState({ student: "", teacher: "", staff: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/settings/videos`)
      .then(r => r.json())
      .then((data: { student: string; teacher: string; staff: string }) => setUrls(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!user || !["admin", "director"].includes(user.role)) {
    return <p className="text-muted-foreground p-4">Ruxsat yo'q.</p>;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings/videos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken() ?? ""}`,
        },
        body: JSON.stringify(urls),
      });
      if (!res.ok) throw new Error("Xatolik");
      toast({ title: "✅ Saqlandi", description: "Video sozlamalari yangilandi" });
    } catch {
      toast({ variant: "destructive", title: "Xatolik", description: "Saqlashda muammo yuz berdi" });
    }
    setSaving(false);
  };

  const SECTIONS = [
    {
      key: "student" as const,
      label: "O'quvchilar uchun video",
      icon: Users2,
      desc: "Ro'yxatdan o'tish sahifasida o'quvchi bo'limida ko'rsatiladi",
    },
    {
      key: "teacher" as const,
      label: "O'qituvchilar uchun video",
      icon: GraduationCap,
      desc: "O'qituvchi va sinf rahbari ro'yxatdan o'tishda ko'rsatiladi",
    },
    {
      key: "staff" as const,
      label: "Xodimlar uchun video",
      icon: Briefcase,
      desc: "Direktor, zavuch va boshqa xodimlar uchun ko'rsatiladi",
    },
  ] as const;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Video className="w-6 h-6 text-primary" />
          Onboarding videolari
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ro'yxatdan o'tish sahifasida ko'rsatiladigan 3 ta yoriqnoma video URL larini kiriting (YouTube yoki to'g'ridan video URL)
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Yuklanmoqda...</p>
      ) : (
        <div className="space-y-4">
          {SECTIONS.map(({ key, label, icon: Icon, desc }) => (
            <Card key={key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  {label}
                </CardTitle>
                <CardDescription>{desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label>Video URL</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://www.youtube.com/watch?v=... yoki to'g'ridan video URL"
                    value={urls[key]}
                    onChange={e => setUrls(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                  {urls[key] && (
                    <a href={urls[key]} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="icon">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                </div>
                {urls[key] && <VideoPreview url={urls[key]} />}
              </CardContent>
            </Card>
          ))}

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Clock, GraduationCap, Users2, BookOpen } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

interface RoleVideos {
  student: string;
  teacher: string;
  sinfRahbari: string;
}

function toEmbedUrl(url: string): string {
  if (!url) return "";
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return url;
}

function VideoCard({
  title,
  description,
  icon: Icon,
  url,
  badge,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  url: string;
  badge?: string;
}) {
  const embedUrl = toEmbedUrl(url);
  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {url ? (
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            {isYouTube ? (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                title={title}
              />
            ) : (
              <video src={url} controls className="w-full h-full object-contain" />
            )}
          </div>
        ) : (
          <div className="aspect-video rounded-lg bg-muted flex flex-col items-center justify-center gap-3 border-2 border-dashed border-muted-foreground/30">
            <Clock className="w-10 h-10 text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-muted-foreground font-medium">Tez orada</p>
              <p className="text-sm text-muted-foreground/70">Bu video hali yaratilmagan. Admin joylashtiradi.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function QollanmalarPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<RoleVideos>({ student: "", teacher: "", sinfRahbari: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/settings/role-videos`)
      .then((r) => r.json())
      .then((data: RoleVideos) => setVideos(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  const role = user.role;

  const sections = [
    {
      key: "student" as const,
      title: "O'quvchilar uchun yo'riqnoma",
      description: "Platforma asosiy funksiyalari: dars jadvali, o'quv materiallari, o'yinlar",
      icon: GraduationCap,
      badge: "O'quvchi",
      roles: ["student", "admin", "director", "zam_direktor", "zavuch"],
    },
    {
      key: "teacher" as const,
      title: "O'qituvchilar uchun yo'riqnoma",
      description: "Darslik yuklash, jadval ko'rish, baholash va sertifikat olish",
      icon: Users2,
      badge: "O'qituvchi",
      roles: ["teacher", "admin", "director", "zam_direktor", "zavuch"],
    },
    {
      key: "sinfRahbari" as const,
      title: "Sinf rahbarlari uchun yo'riqnoma",
      description: "O'quvchilar ro'yxati, dars jadvali boshqaruvi va hisobotlar",
      icon: BookOpen,
      badge: "Sinf rahbari",
      roles: ["sinf_rahbari", "admin", "director", "zam_direktor", "zavuch"],
    },
  ];

  const visibleSections = sections.filter((s) => s.roles.includes(role));

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PlayCircle className="w-6 h-6 text-primary" />
            Yo'riqnoma videolari
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (visibleSections.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PlayCircle className="w-6 h-6 text-primary" />
            Yo'riqnoma videolari
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Sizning rolingiz uchun yo'riqnomalar hali qo'shilmagan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PlayCircle className="w-6 h-6 text-primary" />
          Yo'riqnoma videolari
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Platformadan foydalanish bo'yicha qo'llanma videolari
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {visibleSections.map((section) => (
          <VideoCard
            key={section.key}
            title={section.title}
            description={section.description}
            icon={section.icon}
            url={videos[section.key]}
            badge={section.badge}
          />
        ))}
      </div>
    </div>
  );
}

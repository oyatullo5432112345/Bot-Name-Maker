import { useState } from "react";
import { Music2, Save, Play, ExternalLink, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_SONGS_META, getSavedMusicUrls, saveMusicUrl } from "@/components/music-player";

interface SongForm {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  defaultSrc: string;
  url: string;
}

export default function AdminMusicPage() {
  const saved = getSavedMusicUrls();

  const [songs, setSongs] = useState<SongForm[]>(
    DEFAULT_SONGS_META.map(s => ({
      ...s,
      url: saved[s.id] ?? s.defaultSrc,
    }))
  );

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [testingId, setTestingId] = useState<string | null>(null);

  function handleChange(id: string, url: string) {
    setSongs(prev => prev.map(s => s.id === id ? { ...s, url } : s));
    setSavedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  }

  function handleSave(song: SongForm) {
    saveMusicUrl(song.id, song.url.trim());
    setSavedIds(prev => new Set(prev).add(song.id));
  }

  function handleSaveAll() {
    songs.forEach(s => saveMusicUrl(s.id, s.url.trim()));
    setSavedIds(new Set(songs.map(s => s.id)));
  }

  function handleReset(id: string) {
    const meta = DEFAULT_SONGS_META.find(s => s.id === id);
    if (!meta) return;
    handleChange(id, meta.defaultSrc);
    saveMusicUrl(id, meta.defaultSrc);
    setSavedIds(prev => new Set(prev).add(id));
  }

  function handleTest(song: SongForm) {
    setTestingId(song.id);
    const audio = new Audio(song.url.trim());
    audio.volume = 0.5;
    void audio.play().catch(() => {});
    setTimeout(() => { audio.pause(); setTestingId(null); }, 4000);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#1C6CA8,#1DB954)" }}>
            <Music2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Musiqa boshqaruvi</h1>
            <p className="text-sm text-muted-foreground">Qo'shiq URL manzillarini sozlang</p>
          </div>
        </div>
        <Button onClick={handleSaveAll} size="sm" className="gap-2">
          <Save className="w-4 h-4" />
          Hammasini saqlash
        </Button>
      </div>

      {/* Info card */}
      <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">📁 Audio fayllarni qo'shish</p>
        <p>
          Fayllarni <code className="bg-background px-1 rounded text-xs font-mono">artifacts/platform/public/audio/</code> papkasiga soling.
          Keyin URL maydoniga <code className="bg-background px-1 rounded text-xs font-mono">/audio/fayl.mp3</code> yozing.
        </p>
        <p>Yoki internetdagi to'g'ridan-to'g'ri MP3 havolasini kiriting.</p>
      </div>

      {/* Song cards */}
      <div className="space-y-4">
        {songs.map(song => {
          const isSaved = savedIds.has(song.id);
          const isTesting = testingId === song.id;
          return (
            <div key={song.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
              {/* Song header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
                <span className="text-2xl">{song.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{song.title}</p>
                  <p className="text-xs text-muted-foreground">{song.subtitle}</p>
                </div>
                {isSaved && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Saqlandi
                  </span>
                )}
              </div>

              {/* URL input */}
              <div className="px-4 py-3 space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Audio URL manzili
                  </label>
                  <Input
                    value={song.url}
                    onChange={e => handleChange(song.id, e.target.value)}
                    placeholder="/audio/fayl.mp3 yoki https://..."
                    className="font-mono text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Standart: <span className="font-mono">{song.defaultSrc}</span>
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={isTesting}
                    onClick={() => handleTest(song)}
                  >
                    <Play className={`w-3.5 h-3.5 ${isTesting ? "animate-pulse text-green-500" : ""}`} />
                    {isTesting ? "Ijro etilmoqda..." : "Sinab ko'rish"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleReset(song.id)}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Standart
                  </Button>

                  {song.url.startsWith("http") && (
                    <a
                      href={song.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md border hover:bg-accent transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ochish
                    </a>
                  )}

                  <div className="flex-1" />

                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleSave(song)}
                  >
                    <Save className="w-3.5 h-3.5" />
                    Saqlash
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center">
        O'zgarishlar saqlangandan keyin sahifani yangilang — yangi URL ishga tushadi.
      </p>
    </div>
  );
}

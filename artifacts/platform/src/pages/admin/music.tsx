import { useState } from "react";
import { Music2, Save, Play, ExternalLink, RefreshCw, CheckCircle2, Plus, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_SONGS_META,
  getSavedMusicUrls,
  saveMusicUrl,
  getCustomSongs,
  saveCustomSong,
  deleteCustomSong,
  type CustomSong,
} from "@/components/music-player";

interface SongForm {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  defaultSrc: string;
  url: string;
}

const EMOJIS = ["🎵", "🎶", "🎸", "🎹", "🎺", "🎻", "🥁", "🎤", "🇺🇿", "⚽", "✨", "🌟", "🔥", "💫", "🎼"];

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

  // Custom songs state
  const [customSongs, setCustomSongs] = useState<CustomSong[]>(getCustomSongs());
  const [newSong, setNewSong] = useState({ title: "", subtitle: "", emoji: "🎵", url: "" });
  const [newSongError, setNewSongError] = useState("");
  const [addedNew, setAddedNew] = useState(false);

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

  function handleTest(id: string, url: string) {
    setTestingId(id);
    const audio = new Audio(url.trim());
    audio.volume = 0.5;
    void audio.play().catch(() => {});
    setTimeout(() => { audio.pause(); setTestingId(null); }, 4000);
  }

  function handleAddSong() {
    setNewSongError("");
    if (!newSong.title.trim()) { setNewSongError("Qo'shiq nomini kiriting"); return; }
    if (!newSong.url.trim()) { setNewSongError("Audio URL manzilini kiriting"); return; }

    const id = `custom_${Date.now()}`;
    const song: CustomSong = {
      id,
      title: newSong.title.trim(),
      subtitle: newSong.subtitle.trim() || "Qo'shiq",
      emoji: newSong.emoji || "🎵",
      src: newSong.url.trim(),
    };
    saveCustomSong(song);
    const updated = getCustomSongs();
    setCustomSongs(updated);
    setNewSong({ title: "", subtitle: "", emoji: "🎵", url: "" });
    setAddedNew(true);
    setTimeout(() => setAddedNew(false), 2500);
  }

  function handleDeleteCustom(id: string) {
    deleteCustomSong(id);
    setCustomSongs(getCustomSongs());
  }

  function handleEditCustomUrl(id: string, url: string) {
    setCustomSongs(prev => prev.map(s => s.id === id ? { ...s, src: url } : s));
  }

  function handleSaveCustom(song: CustomSong) {
    saveCustomSong({ ...song, src: song.src.trim() });
    setSavedIds(prev => new Set(prev).add(song.id));
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
            <p className="text-sm text-muted-foreground">Faqat admin uchun</p>
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

      {/* ── Default songs ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Standart qo'shiqlar
        </h2>
        <div className="space-y-4">
          {songs.map(song => {
            const isSaved = savedIds.has(song.id);
            const isTesting = testingId === song.id;
            return (
              <div key={song.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
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
                <div className="px-4 py-3 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Audio URL manzili</label>
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
                    <Button variant="outline" size="sm" className="gap-1.5" disabled={isTesting}
                      onClick={() => handleTest(song.id, song.url)}>
                      <Play className={`w-3.5 h-3.5 ${isTesting ? "animate-pulse text-green-500" : ""}`} />
                      {isTesting ? "Ijro etilmoqda..." : "Sinab ko'rish"}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleReset(song.id)}>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Standart
                    </Button>
                    {song.url.startsWith("http") && (
                      <a href={song.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md border hover:bg-accent transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" /> Ochish
                      </a>
                    )}
                    <div className="flex-1" />
                    <Button size="sm" className="gap-1.5" onClick={() => handleSave(song)}>
                      <Save className="w-3.5 h-3.5" /> Saqlash
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Add new song ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Yangi qo'shiq qo'shish
        </h2>
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
            <span className="text-2xl">{newSong.emoji}</span>
            <p className="text-sm font-semibold flex-1 text-muted-foreground">
              {newSong.title || "Yangi qo'shiq"}
            </p>
            {addedNew && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Qo'shildi!
              </span>
            )}
          </div>
          <div className="px-4 py-4 space-y-3">
            {/* Emoji picker */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Emoji tanlang</label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setNewSong(p => ({ ...p, emoji: e }))}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border transition-colors ${
                      newSong.emoji === e
                        ? "border-primary bg-primary/10"
                        : "border-transparent hover:border-border hover:bg-accent"
                    }`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Qo'shiq nomi *</label>
                <Input value={newSong.title} onChange={e => setNewSong(p => ({ ...p, title: e.target.value }))}
                  placeholder="Masalan: Yoshlar madhiyasi" className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Qisqa tavsif</label>
                <Input value={newSong.subtitle} onChange={e => setNewSong(p => ({ ...p, subtitle: e.target.value }))}
                  placeholder="Masalan: Muallif · 2024" className="text-sm" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Audio URL manzili *</label>
              <Input value={newSong.url} onChange={e => setNewSong(p => ({ ...p, url: e.target.value }))}
                placeholder="/audio/yangi.mp3 yoki https://..." className="font-mono text-sm" />
            </div>

            {newSongError && (
              <div className="flex items-center gap-2 text-xs text-red-500">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {newSongError}
              </div>
            )}

            <Button className="w-full gap-2" onClick={handleAddSong}>
              <Plus className="w-4 h-4" />
              Qo'shiq qo'shish
            </Button>
          </div>
        </div>
      </div>

      {/* ── Custom songs list ── */}
      {customSongs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Qo'shilgan qo'shiqlar ({customSongs.length})
          </h2>
          <div className="space-y-3">
            {customSongs.map(song => {
              const isSaved = savedIds.has(song.id);
              const isTesting = testingId === song.id;
              return (
                <div key={song.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
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
                    <button onClick={() => handleDeleteCustom(song.id)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="px-4 py-3 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Audio URL manzili</label>
                      <Input value={song.src}
                        onChange={e => handleEditCustomUrl(song.id, e.target.value)}
                        placeholder="/audio/fayl.mp3 yoki https://..."
                        className="font-mono text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" disabled={isTesting}
                        onClick={() => handleTest(song.id, song.src)}>
                        <Play className={`w-3.5 h-3.5 ${isTesting ? "animate-pulse text-green-500" : ""}`} />
                        {isTesting ? "Ijro etilmoqda..." : "Sinab ko'rish"}
                      </Button>
                      {song.src.startsWith("http") && (
                        <a href={song.src} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md border hover:bg-accent transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" /> Ochish
                        </a>
                      )}
                      <div className="flex-1" />
                      <Button size="sm" className="gap-1.5" onClick={() => handleSaveCustom(song)}>
                        <Save className="w-3.5 h-3.5" /> Saqlash
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        O'zgarishlar saqlangandan keyin sahifani yangilang — yangi qo'shiqlar paydo bo'ladi.
      </p>
    </div>
  );
}

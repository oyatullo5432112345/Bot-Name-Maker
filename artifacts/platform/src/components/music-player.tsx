import {
  createContext, useContext, useRef, useState,
  useEffect, useCallback, useReducer,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, X, Music2, Volume2 } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────
   SONGS CONFIG
   Audio fayllarni artifacts/platform/public/audio/ papkasiga soling:
     • madhiya.mp3
     • mundial.mp3
     • yoshlar.mp3
   ──────────────────────────────────────────────────────────────── */
export interface Song {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  src: string;
  pulseColors: [string, string];
}

const MUSIC_URLS_KEY = "talim_music_urls_v1";
export const CUSTOM_SONGS_KEY = "talim_custom_songs_v1";

const PULSE_PALETTE: Array<[string, string]> = [
  ["#1C6CA8", "#1DB954"],
  ["#e63946", "#f4a261"],
  ["#9b5de5", "#f15bb5"],
  ["#00b4d8", "#90e0ef"],
  ["#f77f00", "#d62828"],
  ["#2dc653", "#3a86ff"],
];

function getSongSrc(id: string, defaultSrc: string): string {
  try {
    const saved = JSON.parse(localStorage.getItem(MUSIC_URLS_KEY) ?? "{}") as Record<string, string>;
    return saved[id] || defaultSrc;
  } catch { return defaultSrc; }
}

export function getSavedMusicUrls(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(MUSIC_URLS_KEY) ?? "{}"); } catch { return {}; }
}

export function saveMusicUrl(id: string, url: string) {
  const current = getSavedMusicUrls();
  current[id] = url;
  localStorage.setItem(MUSIC_URLS_KEY, JSON.stringify(current));
}

/* ── Custom songs (admin-added) ──────────────────────────────── */
export interface CustomSong {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  src: string;
}

export function getCustomSongs(): CustomSong[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_SONGS_KEY) ?? "[]"); } catch { return []; }
}

export function saveCustomSong(song: CustomSong) {
  const list = getCustomSongs().filter(s => s.id !== song.id);
  list.push(song);
  localStorage.setItem(CUSTOM_SONGS_KEY, JSON.stringify(list));
}

export function deleteCustomSong(id: string) {
  const list = getCustomSongs().filter(s => s.id !== id);
  localStorage.setItem(CUSTOM_SONGS_KEY, JSON.stringify(list));
}

export const DEFAULT_SONGS_META: Array<Song & { defaultSrc: string }> = [
  {
    id: "madhiya",
    title: "Ulug'imsan Vatanim",
    subtitle: "Vatanparvarlik qo'shig'i",
    emoji: "🎵",
    src: "/audio/madhiya.mp3",
    defaultSrc: "/audio/madhiya.mp3",
    pulseColors: ["#1C6CA8", "#1DB954"],
  },
  {
    id: "mundial",
    title: "Assalomu alaykum Meksika/Kanada",
    subtitle: "Jahongir Foziljonov · JCh 2026",
    emoji: "⚽",
    src: "/audio/mundial.mp3",
    defaultSrc: "/audio/mundial.mp3",
    pulseColors: ["#1C6CA8", "#e63946"],
  },
  {
    id: "yoshlar",
    title: "Yoshlar Ittifoqi Tarannum",
    subtitle: "Rasmiy tarannum · 2024",
    emoji: "✨",
    src: "/audio/yoshlar.mp3",
    defaultSrc: "/audio/yoshlar.mp3",
    pulseColors: ["#1DB954", "#f4a261"],
  },
];

function buildAllSongs(): Song[] {
  const defaults: Song[] = DEFAULT_SONGS_META.map(s => ({
    ...s,
    src: getSongSrc(s.id, s.defaultSrc),
  }));
  const customs: Song[] = getCustomSongs().map((c, i) => ({
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    emoji: c.emoji,
    src: c.src,
    pulseColors: PULSE_PALETTE[i % PULSE_PALETTE.length]!,
  }));
  return [...defaults, ...customs];
}

export const SONGS: Song[] = buildAllSongs();

/* ─── Player state ─────────────────────────────────────────────── */
interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;   // 0-100
  duration: number;   // seconds
  currentTime: number;
  panelVisible: boolean;
  confirmSong: Song | null;
}

type PlayerAction =
  | { type: "SHOW_PANEL" }
  | { type: "HIDE_PANEL" }
  | { type: "CONFIRM_SONG"; song: Song }
  | { type: "CANCEL_CONFIRM" }
  | { type: "PLAY_SONG"; song: Song }
  | { type: "TOGGLE_PAUSE" }
  | { type: "STOP" }
  | { type: "TICK"; currentTime: number; duration: number }
  | { type: "SEEK"; progress: number };

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "SHOW_PANEL":     return { ...state, panelVisible: true };
    case "HIDE_PANEL":     return { ...state, panelVisible: false };
    case "CONFIRM_SONG":   return { ...state, confirmSong: action.song };
    case "CANCEL_CONFIRM": return { ...state, confirmSong: null };
    case "PLAY_SONG":
      return { ...state, confirmSong: null, currentSong: action.song, isPlaying: true, progress: 0, currentTime: 0, duration: 0 };
    case "TOGGLE_PAUSE":   return { ...state, isPlaying: !state.isPlaying };
    case "STOP":           return { ...state, currentSong: null, isPlaying: false, progress: 0, currentTime: 0 };
    case "TICK":
      return {
        ...state,
        currentTime: action.currentTime,
        duration: action.duration,
        progress: action.duration > 0 ? (action.currentTime / action.duration) * 100 : 0,
      };
    case "SEEK":           return { ...state, progress: action.progress };
    default:               return state;
  }
}

/* ─── Context ──────────────────────────────────────────────────── */
interface PlayerContextValue {
  state: PlayerState;
  playSong: (song: Song) => void;
  togglePause: () => void;
  stop: () => void;
  seek: (progress: number) => void;
  confirmSong: (song: Song) => void;
  cancelConfirm: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within MusicProvider");
  return ctx;
}

/* ─── Provider ─────────────────────────────────────────────────── */
const SESSION_KEY = "talim_music_panel_v1";

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, {
    currentSong: null, isPlaying: false, progress: 0,
    duration: 0, currentTime: 0, panelVisible: false, confirmSong: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Show panel once per session after 1.5s */
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const t = setTimeout(() => {
      dispatch({ type: "SHOW_PANEL" });
      /* Auto-hide after 10s if no interaction */
      hideTimerRef.current = setTimeout(() => dispatch({ type: "HIDE_PANEL" }), 10_000);
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  /* Clear auto-hide timer on panel interaction */
  const cancelHideTimer = useCallback(() => {
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
  }, []);

  /* Audio element lifecycle */
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "none";
    }
    const audio = audioRef.current;

    const onTimeUpdate = () => dispatch({ type: "TICK", currentTime: audio.currentTime, duration: audio.duration || 0 });
    const onEnded = () => dispatch({ type: "STOP" });
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  /* React to song/play state changes */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!state.currentSong) { audio.pause(); audio.src = ""; return; }
    if (audio.src !== window.location.origin + state.currentSong.src) {
      audio.src = state.currentSong.src;
    }
    if (state.isPlaying) { void audio.play().catch(() => {}); }
    else { audio.pause(); }
  }, [state.currentSong, state.isPlaying]);

  const playSong = useCallback((song: Song) => {
    sessionStorage.setItem(SESSION_KEY, "1");
    dispatch({ type: "HIDE_PANEL" });
    dispatch({ type: "PLAY_SONG", song });
  }, []);

  const togglePause = useCallback(() => dispatch({ type: "TOGGLE_PAUSE" }), []);
  const stop = useCallback(() => dispatch({ type: "STOP" }), []);
  const seek = useCallback((progress: number) => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = (progress / 100) * audio.duration;
      dispatch({ type: "SEEK", progress });
    }
  }, []);

  const confirmSong = useCallback((song: Song) => {
    cancelHideTimer();
    dispatch({ type: "CONFIRM_SONG", song });
  }, [cancelHideTimer]);

  const cancelConfirm = useCallback(() => dispatch({ type: "CANCEL_CONFIRM" }), []);

  const handleHidePanel = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, "1");
    cancelHideTimer();
    dispatch({ type: "HIDE_PANEL" });
  }, [cancelHideTimer]);

  const handlePanelInteract = useCallback(() => cancelHideTimer(), [cancelHideTimer]);

  const value: PlayerContextValue = { state, playSong, togglePause, stop, seek, confirmSong, cancelConfirm };

  const { currentSong } = state;

  return (
    <PlayerContext.Provider value={value}>
      {/* Pulsating background overlay when playing */}
      <AnimatePresence>
        {currentSong && (
          <motion.div
            key="bg-pulse"
            className="fixed inset-0 pointer-events-none z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: `radial-gradient(ellipse at 50% 100%, ${currentSong.pulseColors[0]}18 0%, transparent 70%),
                           radial-gradient(ellipse at 0% 50%, ${currentSong.pulseColors[1]}12 0%, transparent 60%)`,
            }}
          >
            <motion.div
              className="absolute inset-0"
              animate={{ opacity: [0, 0.6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                background: `radial-gradient(ellipse at 50% 50%, ${currentSong.pulseColors[0]}10 0%, transparent 70%)`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {children}

      {/* Slide-up panel */}
      <MusicPanel
        visible={state.panelVisible}
        onHide={handleHidePanel}
        onInteract={handlePanelInteract}
      />

      {/* Confirm modal */}
      <ConfirmModal />

      {/* Mini player */}
      <MiniPlayer />
    </PlayerContext.Provider>
  );
}

/* ─── Slide-up panel ───────────────────────────────────────────── */
function MusicPanel({
  visible, onHide, onInteract,
}: {
  visible: boolean; onHide: () => void; onInteract: () => void;
}) {
  const { confirmSong } = usePlayer();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="music-panel"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="fixed bottom-20 lg:bottom-6 left-1/2 z-50 w-full max-w-sm"
          style={{ transform: "translateX(-50%)" }}
          onPointerEnter={onInteract}
          onClick={onInteract}
        >
          <div
            className="mx-4 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #0b1f3a 0%, #0e2d50 80%, #0b2a1e 100%)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {/* Top stripe */}
            <div className="h-0.5 flex">
              <div className="flex-1 bg-[#1C6CA8]" />
              <div className="flex-1 bg-white/50" />
              <div className="flex-1 bg-[#1DB954]" />
            </div>

            <div className="px-4 pt-3 pb-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                    <Music2 className="w-3.5 h-3.5 text-white/80" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold leading-none">🎵 Musiqa</p>
                    <p className="text-white/50 text-[10px] mt-0.5">Qo'shiq tanlang</p>
                  </div>
                </div>
                <button
                  onClick={onHide}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Song buttons */}
              <div className="space-y-2">
                {SONGS.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => confirmSong(song)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    <span className="text-xl shrink-0">{song.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{song.title}</p>
                      <p className="text-white/50 text-[10px] truncate">{song.subtitle}</p>
                    </div>
                    <Play className="w-3.5 h-3.5 text-white/50 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Confirm modal ────────────────────────────────────────────── */
function ConfirmModal() {
  const { state, playSong, cancelConfirm } = usePlayer();
  const song = state.confirmSong;

  return (
    <AnimatePresence>
      {song && (
        <>
          {/* Backdrop */}
          <motion.div
            key="confirm-backdrop"
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancelConfirm}
          />
          {/* Modal */}
          <motion.div
            key="confirm-modal"
            className="fixed inset-0 z-[61] flex items-center justify-center px-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div
              className="w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: "linear-gradient(135deg, #0e2d50 0%, #0b2a1e 100%)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <div className="h-0.5 flex">
                <div className="flex-1 bg-[#1C6CA8]" />
                <div className="flex-1 bg-white/40" />
                <div className="flex-1 bg-[#1DB954]" />
              </div>

              <div className="p-5">
                <div className="text-center mb-4">
                  <motion.div
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-4xl mb-2"
                  >
                    {song.emoji}
                  </motion.div>
                  <p className="text-white font-bold text-sm">{song.title}</p>
                  <p className="text-white/60 text-xs mt-0.5">{song.subtitle}</p>
                </div>

                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2 mb-4"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}
                >
                  <Volume2 className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                  <p className="text-white/70 text-[11px]">Ovoz balandligini tekshiring</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={cancelConfirm}
                    className="flex-1 py-2 rounded-xl text-sm font-medium text-white/60 transition-colors hover:text-white/90"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}
                  >
                    ❌ Bekor
                  </button>
                  <button
                    onClick={() => playSong(song)}
                    className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: "linear-gradient(90deg, #1C6CA8, #1DB954)" }}
                  >
                    ✅ Ijro et
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Mini player ──────────────────────────────────────────────── */
function MiniPlayer() {
  const { state, togglePause, stop, seek } = usePlayer();
  const { currentSong, isPlaying, progress, currentTime, duration } = state;

  const fmt = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <AnimatePresence>
      {currentSong && (
        <motion.div
          key="mini-player"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-40 lg:z-50"
        >
          <div
            style={{
              background: `linear-gradient(90deg, ${currentSong.pulseColors[0]}dd 0%, ${currentSong.pulseColors[1]}cc 100%)`,
              borderTop: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {/* Progress bar (clickable) */}
            <div
              className="h-1 w-full cursor-pointer group"
              style={{ background: "rgba(255,255,255,0.2)" }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                seek(((e.clientX - rect.left) / rect.width) * 100);
              }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: "rgba(255,255,255,0.9)",
                  transition: "width 0.5s linear",
                }}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 px-4 py-2.5">
              {/* Animated emoji */}
              <motion.span
                className="text-xl shrink-0"
                animate={
                  currentSong.id === "mundial"
                    ? { rotate: [0, 360] }
                    : currentSong.id === "madhiya"
                    ? { scale: [1, 1.15, 1] }
                    : { opacity: [1, 0.6, 1] }
                }
                transition={{ duration: currentSong.id === "mundial" ? 3 : 2, repeat: Infinity, ease: "linear" }}
              >
                {currentSong.emoji}
              </motion.span>

              {/* Song info */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-bold truncate">{currentSong.title}</p>
                <p className="text-white/70 text-[10px] truncate">
                  {fmt(currentTime)} / {fmt(duration)} · {currentSong.subtitle}
                </p>
              </div>

              {/* Play/Pause */}
              <button
                onClick={togglePause}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-110 active:scale-95"
                style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}
              >
                {isPlaying
                  ? <Pause className="w-3.5 h-3.5 text-white" />
                  : <Play className="w-3.5 h-3.5 text-white ml-0.5" />
                }
              </button>

              {/* Stop / Close */}
              <button
                onClick={stop}
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-110 active:scale-95 text-white/60 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

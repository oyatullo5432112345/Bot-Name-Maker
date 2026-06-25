import {
  createContext, useContext, useRef, useState,
  useEffect, useCallback, useReducer,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, X, Music2, ChevronUp, ChevronDown, Volume2 } from "lucide-react";

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

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  currentTime: number;
  listOpen: boolean;
  confirmSong: Song | null;
}

type PlayerAction =
  | { type: "TOGGLE_LIST" }
  | { type: "CLOSE_LIST" }
  | { type: "CONFIRM_SONG"; song: Song }
  | { type: "CANCEL_CONFIRM" }
  | { type: "PLAY_SONG"; song: Song }
  | { type: "TOGGLE_PAUSE" }
  | { type: "STOP" }
  | { type: "TICK"; currentTime: number; duration: number }
  | { type: "SEEK"; progress: number };

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "TOGGLE_LIST":    return { ...state, listOpen: !state.listOpen };
    case "CLOSE_LIST":     return { ...state, listOpen: false };
    case "CONFIRM_SONG":   return { ...state, confirmSong: action.song, listOpen: false };
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
    case "SEEK": return { ...state, progress: action.progress };
    default:     return state;
  }
}

interface PlayerContextValue {
  state: PlayerState;
  songs: Song[];
  playSong: (song: Song) => void;
  togglePause: () => void;
  stop: () => void;
  seek: (progress: number) => void;
  confirmSong: (song: Song) => void;
  cancelConfirm: () => void;
  toggleList: () => void;
  closeList: () => void;
  reloadSongs: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within MusicProvider");
  return ctx;
}

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, {
    currentSong: null, isPlaying: false, progress: 0,
    duration: 0, currentTime: 0, listOpen: false, confirmSong: null,
  });
  const [songs, setSongs] = useState<Song[]>(() => buildAllSongs());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const reloadSongs = useCallback(() => setSongs(buildAllSongs()), []);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "none";
    }
    const audio = audioRef.current;
    const onTimeUpdate = () =>
      dispatch({ type: "TICK", currentTime: audio.currentTime, duration: audio.duration || 0 });
    const onEnded = () => dispatch({ type: "STOP" });
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

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

  const playSong    = useCallback((song: Song) => dispatch({ type: "PLAY_SONG", song }), []);
  const togglePause = useCallback(() => dispatch({ type: "TOGGLE_PAUSE" }), []);
  const stop        = useCallback(() => dispatch({ type: "STOP" }), []);
  const seek        = useCallback((progress: number) => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = (progress / 100) * audio.duration;
      dispatch({ type: "SEEK", progress });
    }
  }, []);
  const confirmSong  = useCallback((song: Song) => dispatch({ type: "CONFIRM_SONG", song }), []);
  const cancelConfirm = useCallback(() => dispatch({ type: "CANCEL_CONFIRM" }), []);
  const toggleList   = useCallback(() => dispatch({ type: "TOGGLE_LIST" }), []);
  const closeList    = useCallback(() => dispatch({ type: "CLOSE_LIST" }), []);

  const value: PlayerContextValue = {
    state, songs, playSong, togglePause, stop, seek,
    confirmSong, cancelConfirm, toggleList, closeList, reloadSongs,
  };

  return (
    <PlayerContext.Provider value={value}>
      <BgPulse song={state.currentSong} />
      {children}
      <ConfirmModal />
      <BottomMusicBar />
    </PlayerContext.Provider>
  );
}

/* ─── Background pulse ──────────────────────────────────────────── */
function BgPulse({ song }: { song: Song | null }) {
  return (
    <AnimatePresence>
      {song && (
        <motion.div
          key="bg-pulse"
          className="fixed inset-0 pointer-events-none z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            background: `radial-gradient(ellipse at 50% 100%, ${song.pulseColors[0]}18 0%, transparent 70%),
                         radial-gradient(ellipse at 0% 50%, ${song.pulseColors[1]}12 0%, transparent 60%)`,
          }}
        >
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background: `radial-gradient(ellipse at 50% 50%, ${song.pulseColors[0]}10 0%, transparent 70%)`,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Persistent bottom bar ─────────────────────────────────────── */
function BottomMusicBar() {
  const { state, songs, confirmSong, togglePause, stop, seek, toggleList, closeList } = usePlayer();
  const { currentSong, isPlaying, progress, currentTime, duration, listOpen } = state;

  const fmt = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  const barBg = currentSong
    ? `linear-gradient(90deg, ${currentSong.pulseColors[0]}ee 0%, ${currentSong.pulseColors[1]}dd 100%)`
    : "linear-gradient(90deg, #0b1f3a 0%, #0e2d50 100%)";

  return (
    <>
      {/* Song list panel */}
      <AnimatePresence>
        {listOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="list-backdrop"
              className="fixed inset-0 z-[38]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeList}
            />

            {/* Panel */}
            <motion.div
              key="song-list"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="fixed left-1/2 -translate-x-1/2 z-[39] px-3 w-full bottom-[162px] lg:bottom-[52px]"
              style={{ maxWidth: 480 }}
            >
              <div
                className="rounded-2xl shadow-2xl overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #0b1f3a 0%, #0e2d50 80%, #0b2a1e 100%)",
                  border: "1px solid rgba(255,255,255,0.13)",
                }}
              >
                <div className="h-0.5 flex">
                  <div className="flex-1 bg-[#1C6CA8]" />
                  <div className="flex-1 bg-white/40" />
                  <div className="flex-1 bg-[#1DB954]" />
                </div>

                <div className="px-4 pt-3 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Music2 className="w-4 h-4 text-white/70" />
                    <p className="text-white text-sm font-bold">Qo'shiq tanlang</p>
                    <span className="text-white/40 text-[11px] ml-auto">{songs.length} ta</span>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {songs.map((song) => {
                      const isActive = currentSong?.id === song.id;
                      return (
                        <button
                          key={song.id}
                          onClick={() => confirmSong(song)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                          style={{
                            background: isActive
                              ? `linear-gradient(90deg, ${song.pulseColors[0]}55, ${song.pulseColors[1]}44)`
                              : "rgba(255,255,255,0.07)",
                            border: isActive
                              ? `1px solid ${song.pulseColors[0]}88`
                              : "1px solid rgba(255,255,255,0.10)",
                          }}
                        >
                          <motion.span
                            className="text-xl shrink-0"
                            animate={isActive && isPlaying ? { scale: [1, 1.15, 1] } : {}}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            {song.emoji}
                          </motion.span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-semibold truncate">{song.title}</p>
                            <p className="text-white/50 text-[10px] truncate">{song.subtitle}</p>
                          </div>
                          {isActive && isPlaying
                            ? <Pause className="w-3.5 h-3.5 text-white/80 shrink-0" />
                            : <Play  className="w-3.5 h-3.5 text-white/40 shrink-0" />
                          }
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── The bar — always visible, sits above mobile nav on mobile ── */}
      <div className="fixed left-0 right-0 z-40 bottom-14 lg:bottom-0">
        {/* Clickable progress bar */}
        {currentSong && (
          <div
            className="h-1 w-full cursor-pointer"
            style={{ background: "rgba(255,255,255,0.20)" }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seek(((e.clientX - rect.left) / rect.width) * 100);
            }}
          >
            <div
              className="h-full"
              style={{
                width: `${progress}%`,
                background: "rgba(255,255,255,0.90)",
                transition: "width 0.5s linear",
              }}
            />
          </div>
        )}

        {/* Bar body */}
        <div
          className="flex items-center gap-3 px-4 h-[52px]"
          style={{
            background: barBg,
            borderTop: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {/* Left: emoji + info */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {currentSong ? (
              <>
                <motion.span
                  className="text-lg shrink-0"
                  animate={isPlaying ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                >
                  {currentSong.emoji}
                </motion.span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-bold truncate leading-tight">
                    {currentSong.title}
                  </p>
                  <p className="text-white/60 text-[10px] truncate">
                    {fmt(currentTime)} / {fmt(duration)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(255,255,255,0.10)" }}
                >
                  <Music2 className="w-3.5 h-3.5 text-white/60" />
                </div>
                <div>
                  <p className="text-white/80 text-xs font-semibold leading-tight">🎵 Musiqa</p>
                  <p className="text-white/40 text-[10px]">Qo'shiq tanlang ↑</p>
                </div>
              </>
            )}
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {currentSong && (
              <>
                <button
                  onClick={togglePause}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.22)",
                    border: "1px solid rgba(255,255,255,0.30)",
                  }}
                >
                  {isPlaying
                    ? <Pause className="w-3.5 h-3.5 text-white" />
                    : <Play  className="w-3.5 h-3.5 text-white ml-0.5" />
                  }
                </button>
                <button
                  onClick={stop}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Open/close song list */}
            <button
              onClick={toggleList}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{
                background: listOpen
                  ? "rgba(255,255,255,0.28)"
                  : "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              {listOpen
                ? <ChevronDown className="w-4 h-4 text-white" />
                : <ChevronUp   className="w-4 h-4 text-white/70" />
              }
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Confirm modal ─────────────────────────────────────────────── */
function ConfirmModal() {
  const { state, playSong, cancelConfirm } = usePlayer();
  const song = state.confirmSong;

  return (
    <AnimatePresence>
      {song && (
        <>
          <motion.div
            key="confirm-backdrop"
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancelConfirm}
          />
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
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  <Volume2 className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                  <p className="text-white/70 text-[11px]">Ovoz balandligini tekshiring</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={cancelConfirm}
                    className="flex-1 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white/90 transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    ❌ Bekor
                  </button>
                  <button
                    onClick={() => playSong(song)}
                    className="flex-1 py-2 rounded-xl text-sm font-bold text-white hover:scale-[1.02] active:scale-[0.98] transition-all"
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

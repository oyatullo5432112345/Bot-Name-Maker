import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  const base: Record<string, string> = { "Content-Type": "application/json" };
  return t ? { ...base, Authorization: `Bearer ${t}` } : base;
};

interface Segment { label: string; weight: number; color: string }
interface WheelGame { id: string; title: string; segments: Segment[]; time_limit_seconds: number | null }

export default function WheelSpinPage() {
  const params = useParams<{ id: string }>();
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<Segment | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const spinCountRef = useRef(0);

  const { data: game, isLoading } = useQuery<WheelGame>({
    queryKey: ["wheel-game", params.id],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/wheel-games/${params.id}`, { headers: authH() });
      if (!r.ok) throw new Error("Xatolik");
      return r.json();
    },
  });

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft((s) => (s !== null ? s - 1 : s)), 1000);
    return () => clearTimeout(id);
  }, [timeLeft]);

  const handleSpin = async () => {
    if (!game || spinning) return;
    setWinner(null);
    setSpinning(true);
    setTimeLeft(null);

    const r = await fetch(`${API_BASE}/wheel-games/${params.id}/spin`, { method: "POST", headers: authH() });
    const json = await r.json();
    const idx = json.winner_index as number;

    const segAngle = 360 / game.segments.length;
    // G'olib bo'lim tepaga (ko'rsatkichga) kelishi uchun kerakli burchak
    const targetAngle = 360 - (idx * segAngle + segAngle / 2);
    spinCountRef.current += 1;
    const fullSpins = 5 + spinCountRef.current; // har safar sal boshqacha, monoton bo'lmasin
    const finalRotation = rotation + fullSpins * 360 + targetAngle - (rotation % 360);

    setRotation(finalRotation);
    setTimeout(() => {
      setSpinning(false);
      setWinner(json.winner as Segment);
      if (game.time_limit_seconds) setTimeLeft(game.time_limit_seconds);
    }, 4200);
  };

  if (isLoading || !game) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const n = game.segments.length;
  const segAngle = 360 / n;
  const size = 320;
  const r = size / 2;

  const slicePath = (i: number) => {
    const start = (i * segAngle - 90) * (Math.PI / 180);
    const end = ((i + 1) * segAngle - 90) * (Math.PI / 180);
    const x1 = r + r * Math.cos(start), y1 = r + r * Math.sin(start);
    const x2 = r + r * Math.cos(end), y2 = r + r * Math.sin(end);
    const large = segAngle > 180 ? 1 : 0;
    return `M ${r} ${r} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="max-w-md mx-auto space-y-6 text-center pb-10">
      <Link href="/games/wheel" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit">
        <ArrowLeft className="w-4 h-4" /> Orqaga
      </Link>

      <h1 className="text-xl font-bold">{game.title}</h1>

      <div className="relative mx-auto" style={{ width: size, height: size }}>
        {/* Ko'rsatkich */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10" style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}>
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-red-500" />
        </div>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size} height={size}
          style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? "transform 4.2s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : undefined }}
          className="drop-shadow-xl"
        >
          {game.segments.map((s, i) => {
            const mid = (i * segAngle + segAngle / 2 - 90) * (Math.PI / 180);
            const lx = r + (r * 0.62) * Math.cos(mid);
            const ly = r + (r * 0.62) * Math.sin(mid);
            return (
              <g key={i}>
                <path d={slicePath(i)} fill={s.color} stroke="white" strokeWidth={2} />
                <text
                  x={lx} y={ly} fill="white" fontSize={n > 8 ? 10 : 13} fontWeight={700}
                  textAnchor="middle" dominantBaseline="middle"
                  transform={`rotate(${i * segAngle + segAngle / 2}, ${lx}, ${ly})`}
                >
                  {s.label.length > 12 ? s.label.slice(0, 11) + "…" : s.label}
                </text>
              </g>
            );
          })}
          <circle cx={r} cy={r} r={r * 0.09} fill="white" stroke="#e5e7eb" strokeWidth={3} />
        </svg>
      </div>

      <Button size="lg" onClick={handleSpin} disabled={spinning} className="gap-2">
        {spinning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {spinning ? "Aylanmoqda..." : "Aylantirish"}
      </Button>

      {winner && !spinning && (
        <div className="animate-in fade-in zoom-in-95 duration-500 space-y-2">
          <p className="text-sm text-muted-foreground">Natija:</p>
          <p className="text-2xl font-black" style={{ color: winner.color }}>{winner.label}</p>
          {timeLeft !== null && (
            <div className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-mono font-bold text-sm mt-2 ${timeLeft <= 5 ? "bg-red-100 text-red-600 animate-pulse" : "bg-primary/10 text-primary"}`}>
              {timeLeft}s qoldi
            </div>
          )}
        </div>
      )}
    </div>
  );
}

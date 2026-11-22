// Intelektual o'yinlar — bolalar uchun. Qulf yo'q, hamma o'yin ochiq.
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

const GAMES = [
  {
    href: "/oyin",
    title: "Maktab olami",
    img: "/imagine/maktab-bola-tolik.jpg",
    ring: "border-indigo-400/50 shadow-[0_10px_30px_rgba(99,102,241,0.35)]",
  },
  {
    href: "/oyin/merge",
    title: "Merge",
    img: "/imagine/maktab-olami-sahna.jpg",
    ring: "border-fuchsia-400/50 shadow-[0_10px_30px_rgba(236,72,153,0.35)]",
  },
];

export default function IntellektualPage() {
  return (
    <div className="relative z-10 mx-auto max-w-3xl space-y-5 pb-10">
      <Link
        href="/games"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> O'yinlar
      </Link>

      {/* Faqat 3D rasmlarning o'zi — ustida ortiqcha matn va eski tugmalarsiz */}
      <section className="grid gap-5 sm:grid-cols-2">
        {GAMES.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            aria-label={g.title}
            className={`group block overflow-hidden rounded-[26px] border ${g.ring} bg-[#0b1530] transition-transform duration-300 hover:-translate-y-1 active:scale-[0.98]`}
          >
            <img
              src={g.img}
              alt={g.title}
              className="block h-auto w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </Link>
        ))}
      </section>
    </div>
  );
}

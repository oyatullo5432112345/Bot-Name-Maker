export function SkeletonPage() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-white/10" />
        <div className="h-4 w-72 rounded bg-white/6" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-white/8 bg-white/5 p-5 space-y-3">
            <div className="h-4 w-24 rounded bg-white/10" />
            <div className="h-8 w-16 rounded bg-white/15" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-white/8 bg-white/5 p-6 space-y-3">
        <div className="h-5 w-32 rounded bg-white/10" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-full rounded bg-white/6" />
        ))}
      </div>
    </div>
  );
}

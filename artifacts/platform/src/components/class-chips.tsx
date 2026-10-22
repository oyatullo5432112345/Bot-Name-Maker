// Sinf tanlash — bo'lim filtri + tabiiy tartiblangan, bir bosishda tanlanadigan chiplar.
// Uzun dropdown o'rniga (Kirish IDlari, Face ID ro'yxati va h.k.).
import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface ClassOpt { class_name: string; enrolled?: number; total?: number }

const gradeNum = (c: string): number => { const m = c.match(/^\s*(\d{1,2})/); return m ? parseInt(m[1]!, 10) : 999; };
const letterOf = (c: string): string => c.replace(/^\s*\d{1,2}\s*-?\s*/, "");

export function ClassChips({
  classes, value, onChange, allOption,
}: {
  classes: ClassOpt[];
  value: string;
  onChange: (v: string) => void;
  allOption?: { value: string; label: string };
}) {
  const [bolim, setBolim] = useState<"all" | "bosh" | "yuqori">("all");

  // Nom bo'yicha takrorlanishni olib tashlab, tabiiy tartib (5-A, 5-B … 10-A)
  const uniq = Array.from(new Map(classes.map((c) => [c.class_name, c])).values());
  const sorted = uniq.sort((a, b) => {
    const g = gradeNum(a.class_name) - gradeNum(b.class_name);
    return g !== 0 ? g : letterOf(a.class_name).localeCompare(letterOf(b.class_name), "uz");
  });
  const visible = sorted.filter((c) => {
    const g = gradeNum(c.class_name);
    if (bolim === "bosh" && !(g >= 1 && g <= 4)) return false;
    if (bolim === "yuqori" && g < 5) return false;
    return true;
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground mr-1">Bo'lim:</span>
        {([["all", "Hammasi"], ["bosh", "Boshlang'ich (1–4)"], ["yuqori", "Yuqori (5+)"]] as const).map(([v, l]) => (
          <Button key={v} type="button" size="sm" variant={bolim === v ? "secondary" : "ghost"} className="h-7 px-2.5 text-xs" onClick={() => setBolim(v)}>{l}</Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {allOption && (
          <Button type="button" size="sm" variant={value === allOption.value ? "default" : "outline"} className="h-8" onClick={() => onChange(allOption.value)}>
            {allOption.label}
          </Button>
        )}
        {visible.length === 0 ? (
          <span className="text-sm text-muted-foreground py-1.5">Sinf topilmadi</span>
        ) : (
          visible.map((c) => (
            <Button key={c.class_name} type="button" size="sm" variant={value === c.class_name ? "default" : "outline"} className="h-8" onClick={() => onChange(c.class_name)}>
              {c.class_name}
              {typeof c.enrolled === "number" && typeof c.total === "number" && (
                <span className="ml-1 text-xs opacity-70">{c.enrolled}/{c.total}</span>
              )}
            </Button>
          ))
        )}
      </div>
    </div>
  );
}

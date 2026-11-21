// Archa sahifasi: bezak tanlang, archaga bosib joylashtiring, saqlang.
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArchaTree, ORN_LIST, OrnamentIcon, loadArcha, saveArcha, type Orn, type OrnType } from "@/components/archa-tree";
import { ArrowLeft, Trash2, Shuffle, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ArchaPage() {
  const [orn, setOrn] = useState<Orn[]>(() => loadArcha());
  const [pick, setPick] = useState<OrnType>("ball-red");
  const [dirty, setDirty] = useState(false);

  const place = (x: number, y: number) => {
    setOrn((o) => [...o, { t: pick, x, y }]);
    setDirty(true);
  };
  const random = () => {
    const list: Orn[] = Array.from({ length: 14 }, (_, i) => ({
      t: ORN_LIST[i % ORN_LIST.length]!.t,
      x: 50 + Math.round(Math.random() * 100),
      y: 60 + Math.round(Math.random() * 160),
    }));
    setOrn(list); setDirty(true);
  };
  const save = () => {
    saveArcha(orn);
    setDirty(false);
    toast({ title: "Archa saqlandi ✅", description: "Bosh sahifada ko'rinadi" });
  };
  const clear = () => { setOrn([]); setDirty(true); };

  return (
    <div className="space-y-5 max-w-3xl">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Bosh sahifa
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Yangi yil archasi</h1>
        <p className="text-sm text-muted-foreground mt-1">Bezakni tanlang, so'ng archaga bosing. Saqlansa — bosh sahifada qorbobo uchib o'tadi.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-[1fr_260px] items-start">
        <div className="rounded-3xl border bg-gradient-to-b from-[#0b1a33] to-[#050a14] p-5 flex justify-center">
          <div className="w-full max-w-[320px]">
            <ArchaTree ornaments={orn} onPlace={place} className="w-full h-auto cursor-crosshair" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border p-4">
            <div className="text-sm font-semibold mb-3">Bezak</div>
            <div className="grid grid-cols-4 gap-2">
              {ORN_LIST.map((o) => (
                <button key={o.t} onClick={() => setPick(o.t)} title={o.label}
                  className={`rounded-xl border p-2 flex flex-col items-center gap-1 text-[10px] ${pick === o.t ? "border-primary bg-primary/10" : ""}`}>
                  <OrnamentIcon t={o.t} />
                  <span className="truncate w-full text-center">{o.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Button className="w-full" onClick={save} disabled={!dirty && orn.length === 0}><Save className="w-4 h-4 mr-2" />Saqlash</Button>
            <Button variant="outline" className="w-full" onClick={random}><Shuffle className="w-4 h-4 mr-2" />Tasodifiy bezash</Button>
            <Button variant="outline" className="w-full" onClick={clear}><Trash2 className="w-4 h-4 mr-2" />Tozalash</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Bezaklar shu qurilmada saqlanadi. Har bir bezakni o'chirish uchun archani tozalab qayta bezang.</p>
        </div>
      </div>
    </div>
  );
}

